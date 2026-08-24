(() => {
  const STORAGE_PREFIX = "consolacion-mps-sitrep-v1:";
  const MANILA_TIME_ZONE = "Asia/Manila";
  const HOUR_MS = 60 * 60 * 1000;

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
    const now = new Date();
    const parts = manilaParts(now);
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
    const displayHour = hour % 12 || 12;
    return `${displayHour}:00 ${suffix}`;
  }

  function storageKey(dateKey) {
    return `${STORAGE_PREFIX}${dateKey}`;
  }

  function loadRecord(dateKey) {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey(dateKey)) || "{}");
      return {
        checks: saved && typeof saved.checks === "object" ? saved.checks : {},
        updatedAt: saved.updatedAt || null,
      };
    } catch {
      return { checks: {}, updatedAt: null };
    }
  }

  function saveRecord(dateKey, record) {
    const payload = {
      version: 1,
      dutyDate: dateKey,
      checks: record.checks,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(storageKey(dateKey), JSON.stringify(payload));
    return payload;
  }

  function slotState(dateKey, absoluteStartHour) {
    const dutyStart = new Date(`${dateKey}T08:00:00+08:00`).getTime();
    const slotStart = dutyStart + (absoluteStartHour - 8) * HOUR_MS;
    const slotEnd = slotStart + HOUR_MS;
    const now = Date.now();
    if (now < slotStart) return "future";
    if (now < slotEnd) return "current";
    return "overdue";
  }

  function slotStatusText(isReceived, phase) {
    if (isReceived) return "SITREP received";
    if (phase === "future") return "Upcoming";
    if (phase === "current") return "Awaiting SITREP";
    return "Not received";
  }

  function slotMarkup(shift, index, record, dateKey) {
    const absoluteStart = shift.startHour + index;
    const absoluteEnd = absoluteStart + 1;
    const slotId = `${shift.id}-${String(index + 1).padStart(2, "0")}`;
    const received = Boolean(record.checks[slotId]);
    const phase = slotState(dateKey, absoluteStart);
    const status = slotStatusText(received, phase);
    return `
      <article class="sitrep-row ${received ? "is-received" : ""} ${phase}" data-sitrep-slot="${slotId}">
        <span class="sitrep-slot-number">${String(index + 1).padStart(2, "0")}</span>
        <div class="sitrep-time-copy">
          <strong>${timeLabel(absoluteStart)}–${timeLabel(absoluteEnd)}</strong>
          <small>Hourly SITREP due at ${timeLabel(absoluteEnd)}</small>
        </div>
        <span class="sitrep-state-label">${received ? "✓" : "●"} ${status}</span>
        <button
          class="sitrep-check-button"
          type="button"
          data-sitrep-toggle="${slotId}"
          aria-pressed="${received}"
          aria-label="${received ? "Remove green mark" : "Mark SITREP received"} for ${timeLabel(absoluteStart)} to ${timeLabel(absoluteEnd)}"
        >${received ? "✓ Green" : "Mark received"}</button>
      </article>`;
  }

  function shiftMarkup(shift, record, dateKey) {
    const slots = Array.from({ length: 12 }, (_, index) => index);
    const received = slots.filter((index) => record.checks[`${shift.id}-${String(index + 1).padStart(2, "0")}`]).length;
    return `
      <section class="sitrep-shift-card" aria-labelledby="${shift.id}-title">
        <header class="sitrep-shift-heading">
          <div>
            <p class="kicker">${shift.name}</p>
            <h3 id="${shift.id}-title">${shift.period}</h3>
            <p>${shift.description}</p>
          </div>
          <div class="sitrep-shift-total ${received === 12 ? "complete" : ""}">
            <strong>${received} / 12</strong>
            <span>${received === 12 ? "Complete" : "Received"}</span>
          </div>
        </header>
        <div class="sitrep-shift-progress" aria-hidden="true"><i style="width:${(received / 12) * 100}%"></i></div>
        <div class="sitrep-table-head"><span>Hour</span><span>Patrol period</span><span>Status</span><span>Action</span></div>
        <div class="sitrep-rows">${slots.map((index) => slotMarkup(shift, index, record, dateKey)).join("")}</div>
      </section>`;
  }

  function updateSummary(record) {
    const received = Object.values(record.checks).filter(Boolean).length;
    elements.overallCount.textContent = `${received} / 24`;
    elements.overallProgress.style.width = `${(received / 24) * 100}%`;
    elements.overallCount.closest(".sitrep-overall-card")?.classList.toggle("complete", received === 24);
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
        const slotId = button.dataset.sitrepToggle;
        latest.checks[slotId] = !latest.checks[slotId];
        if (!latest.checks[slotId]) delete latest.checks[slotId];
        saveRecord(dateKey, latest);
        render(latest.checks[slotId] ? "SITREP marked received and saved on this device." : "Green mark removed.");
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