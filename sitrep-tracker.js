(() => {
  const STORAGE_PREFIX = "consolacion-mps-sitrep-v1:";
  const MANILA_TIME_ZONE = "Asia/Manila";
  const HOUR_MS = 60 * 60 * 1000;

  const units = [
    { id: "mobile-562", label: "Mobile 562", shortLabel: "562" },
    { id: "mobile-2008", label: "Mobile 2008", shortLabel: "2008" },
    { id: "fvp", label: "FVP", shortLabel: "FVP" },
  ];

  const shifts = [
    {
      id: "shift-1",
      name: "1st Shift",
      period: "8:00 AM–8:00 PM",
      startHour: 8,
      description: "Twelve hourly patrol periods from 8:00 AM until turnover at 8:00 PM.",
    },
    {
      id: "shift-2",
      name: "2nd Shift",
      period: "8:00 PM–8:00 AM",
      startHour: 20,
      description: "Twelve hourly patrol periods from 8:00 PM until turnover at 8:00 AM the following day.",
    },
  ];

  const elements = {
    dateInput: document.querySelector("#sitrep-duty-date"),
    dateLabel: document.querySelector("#sitrep-date-label"),
    dayRange: document.querySelector("#sitrep-day-range"),
    overallCount: document.querySelector("#sitrep-overall-count"),
    overallProgress: document.querySelector("#sitrep-overall-progress"),
    tracker: document.querySelector("#sitrep-shifts"),
    todayButton: document.querySelector("#sitrep-today"),
    resetButton: document.querySelector("#sitrep-reset"),
    message: document.querySelector("#sitrep-message"),
  };

  if (!elements.tracker || !elements.dateInput) return;

  function manilaParts(date = new Date()) {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: MANILA_TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      hourCycle: "h23",
    }).formatToParts(date);
    return Object.fromEntries(parts.map((part) => [part.type, part.value]));
  }

  function dateKeyFromDate(date = new Date()) {
    const parts = manilaParts(date);
    return `${parts.year}-${parts.month}-${parts.day}`;
  }

  function addDays(dateKey, amount) {
    const date = new Date(`${dateKey}T12:00:00+08:00`);
    date.setUTCDate(date.getUTCDate() + amount);
    return dateKeyFromDate(date);
  }

  function currentDutyDate() {
    const parts = manilaParts(new Date());
    const today = `${parts.year}-${parts.month}-${parts.day}`;
    return Number(parts.hour) < 8 ? addDays(today, -1) : today;
  }

  function formatDate(dateKey, options = {}) {
    return new Intl.DateTimeFormat("en-PH", {
      timeZone: MANILA_TIME_ZONE,
      month: options.short ? "short" : "long",
      day: "numeric",
      year: "numeric",
    }).format(new Date(`${dateKey}T12:00:00+08:00`));
  }

  function timeLabel(absoluteHour) {
    const hour = ((absoluteHour % 24) + 24) % 24;
    const suffix = hour >= 12 ? "PM" : "AM";
    return `${hour % 12 || 12}:00 ${suffix}`;
  }

  function storageKey(dateKey) {
    return `${STORAGE_PREFIX}${dateKey}`;
  }

  function unitCheckId(shiftId, slotNumber, unitId) {
    return `${shiftId}-${String(slotNumber).padStart(2, "0")}-${unitId}`;
  }

  function migrateLegacyChecks(checks) {
    let changed = false;
    shifts.forEach((shift) => {
      for (let slotNumber = 1; slotNumber <= 12; slotNumber += 1) {
        const legacyId = `${shift.id}-${String(slotNumber).padStart(2, "0")}`;
        if (!checks[legacyId]) continue;
        units.forEach((unit) => {
          checks[unitCheckId(shift.id, slotNumber, unit.id)] = true;
        });
        delete checks[legacyId];
        changed = true;
      }
    });
    return changed;
  }

  function loadRecord(dateKey) {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey(dateKey)) || "{}");
      const record = {
        checks: saved && typeof saved.checks === "object" ? saved.checks : {},
        updatedAt: saved.updatedAt || null,
      };
      if (migrateLegacyChecks(record.checks)) {
        record.updatedAt = new Date().toISOString();
        localStorage.setItem(storageKey(dateKey), JSON.stringify({
          version: 2,
          dutyDate: dateKey,
          checks: record.checks,
          updatedAt: record.updatedAt,
        }));
      }
      return record;
    } catch {
      return { checks: {}, updatedAt: null };
    }
  }

  function saveRecord(dateKey, record) {
    const payload = {
      version: 2,
      dutyDate: dateKey,
      checks: record.checks,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(storageKey(dateKey), JSON.stringify(payload));
    return payload;
  }

  function slotPhase(dateKey, absoluteStartHour) {
    const dutyStart = new Date(`${dateKey}T08:00:00+08:00`).getTime();
    const slotStart = dutyStart + (absoluteStartHour - 8) * HOUR_MS;
    const slotEnd = slotStart + HOUR_MS;
    const now = Date.now();
    if (now < slotStart) return "future";
    if (now < slotEnd) return "current";
    return "overdue";
  }

  function phaseText(phase) {
    if (phase === "future") return "Upcoming";
    if (phase === "current") return "Current hour";
    return "Reporting time passed";
  }

  function unitButtonMarkup(shift, slotNumber, unit, record) {
    const checkId = unitCheckId(shift.id, slotNumber, unit.id);
    const received = Boolean(record.checks[checkId]);
    return `
      <button
        class="sitrep-unit-button ${received ? "is-received" : ""}"
        type="button"
        data-sitrep-toggle="${checkId}"
        data-unit-label="${unit.label}"
        aria-pressed="${received}"
        aria-label="${received ? "Remove green mark for" : "Mark SITREP received from"} ${unit.label}"
      ><span>${unit.shortLabel}</span><strong>${received ? "✓ Green" : "Mark"}</strong></button>`;
  }

  function slotMarkup(shift, index, record, dateKey) {
    const slotNumber = index + 1;
    const absoluteStart = shift.startHour + index;
    const absoluteEnd = absoluteStart + 1;
    const phase = slotPhase(dateKey, absoluteStart);
    const receivedCount = units.filter((unit) => record.checks[unitCheckId(shift.id, slotNumber, unit.id)]).length;
    return `
      <article class="sitrep-row ${receivedCount === units.length ? "is-complete" : ""} ${phase}" data-sitrep-slot="${shift.id}-${slotNumber}">
        <span class="sitrep-slot-number">${String(slotNumber).padStart(2, "0")}</span>
        <div class="sitrep-time-copy">
          <strong>${timeLabel(absoluteStart)}–${timeLabel(absoluteEnd)}</strong>
          <small>SITREP due ${timeLabel(absoluteEnd)} • ${phaseText(phase)}</small>
        </div>
        ${units.map((unit) => unitButtonMarkup(shift, slotNumber, unit, record)).join("")}
      </article>`;
  }

  function countShiftReports(shift, record) {
    let received = 0;
    for (let slotNumber = 1; slotNumber <= 12; slotNumber += 1) {
      units.forEach((unit) => {
        if (record.checks[unitCheckId(shift.id, slotNumber, unit.id)]) received += 1;
      });
    }
    return received;
  }

  function shiftMarkup(shift, record, dateKey) {
    const slots = Array.from({ length: 12 }, (_, index) => index);
    const received = countShiftReports(shift, record);
    return `
      <section class="sitrep-shift-card" aria-labelledby="${shift.id}-title">
        <header class="sitrep-shift-heading">
          <div>
            <p class="kicker">${shift.name}</p>
            <h3 id="${shift.id}-title">${shift.period}</h3>
            <p>${shift.description} Three patrol-unit reports are monitored every hour.</p>
          </div>
          <div class="sitrep-shift-total ${received === 36 ? "complete" : ""}">
            <strong>${received} / 36</strong>
            <span>${received === 36 ? "Complete" : "Reports received"}</span>
          </div>
        </header>
        <div class="sitrep-shift-progress" aria-hidden="true"><i style="width:${(received / 36) * 100}%"></i></div>
        <div class="sitrep-table-head"><span>Hour</span><span>Patrol period</span>${units.map((unit) => `<span>${unit.label}</span>`).join("")}</div>
        <div class="sitrep-rows">${slots.map((index) => slotMarkup(shift, index, record, dateKey)).join("")}</div>
      </section>`;
  }

  function expectedCheckIds() {
    const ids = [];
    shifts.forEach((shift) => {
      for (let slotNumber = 1; slotNumber <= 12; slotNumber += 1) {
        units.forEach((unit) => ids.push(unitCheckId(shift.id, slotNumber, unit.id)));
      }
    });
    return ids;
  }

  function updateSummary(record) {
    const received = expectedCheckIds().filter((id) => Boolean(record.checks[id])).length;
    elements.overallCount.textContent = `${received} / 72`;
    elements.overallProgress.style.width = `${(received / 72) * 100}%`;
    elements.overallCount.closest(".sitrep-overall-card")?.classList.toggle("complete", received === 72);
  }

  function render(message = "") {
    const dateKey = elements.dateInput.value || currentDutyDate();
    const nextDate = addDays(dateKey, 1);
    const record = loadRecord(dateKey);

    elements.dateLabel.textContent = formatDate(dateKey);
    elements.dayRange.textContent = `Coverage: 8:00 AM ${formatDate(dateKey, { short: true })} to 8:00 AM ${formatDate(nextDate, { short: true })}`;
    elements.tracker.innerHTML = shifts.map((shift) => shiftMarkup(shift, record, dateKey)).join("");
    updateSummary(record);

    elements.message.textContent = message || (record.updatedAt
      ? `Last updated on this device: ${new Intl.DateTimeFormat("en-PH", {
          timeZone: MANILA_TIME_ZONE,
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        }).format(new Date(record.updatedAt))}.`
      : "No SITREP has been marked received for this duty date.");

    elements.tracker.querySelectorAll("[data-sitrep-toggle]").forEach((button) => {
      button.addEventListener("click", () => {
        const latest = loadRecord(dateKey);
        const checkId = button.dataset.sitrepToggle;
        latest.checks[checkId] = !latest.checks[checkId];
        const marked = latest.checks[checkId];
        if (!marked) delete latest.checks[checkId];
        saveRecord(dateKey, latest);
        render(marked ? `${button.dataset.unitLabel} SITREP marked received.` : `${button.dataset.unitLabel} green mark removed.`);
      });
    });
  }

  elements.dateInput.value = currentDutyDate();
  elements.dateInput.addEventListener("change", () => render());
  elements.todayButton?.addEventListener("click", () => {
    elements.dateInput.value = currentDutyDate();
    render();
  });
  elements.resetButton?.addEventListener("click", () => {
    const dateKey = elements.dateInput.value;
    if (!window.confirm(`Remove all SITREP green marks for the duty date ${formatDate(dateKey)}?`)) return;
    localStorage.removeItem(storageKey(dateKey));
    render("All SITREP marks for the selected duty date were cleared.");
  });

  window.addEventListener("storage", (event) => {
    if (event.key === storageKey(elements.dateInput.value)) render("SITREP marks were updated in another browser tab.");
  });

  render();
  window.setInterval(() => render(), 60 * 1000);
})();