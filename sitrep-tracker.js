(() => {
  const STORAGE_PREFIX = "consolacion-mps-sitrep-v1:";
  const DEPLOYMENT_KEY = "consolacion-mps-weekly-deployment-v2";
  const MANILA_TIME_ZONE = "Asia/Manila";
  const HOUR_MS = 60 * 60 * 1000;

  const units = [
    { id: "mobile-562", label: "Mobile 562", shortLabel: "562", deploymentUnit: "MP 218-562" },
    { id: "mobile-2008", label: "Mobile 2008", shortLabel: "2008", deploymentUnit: "MP 218-2008" },
    { id: "fvp", label: "FVP", shortLabel: "FVP", deploymentUnit: "MP 218-FVP" },
  ];

  const deploymentUnits = [
    ...units.map((unit) => ({
      label: unit.label,
      shortLabel: unit.shortLabel,
      deploymentUnit: unit.deploymentUnit,
      sitrepTracked: true,
    })),
    { label: "TMRU", shortLabel: "TMRU", deploymentUnit: "TMRU", sitrepTracked: false },
  ];

  const shifts = [
    {
      id: "shift-1",
      deploymentShift: "shift1",
      name: "1st Shift",
      period: "8:00 AM–8:00 PM",
      startHour: 8,
      description: "Twelve hourly patrol periods from 8:00 AM until turnover at 8:00 PM.",
    },
    {
      id: "shift-2",
      deploymentShift: "shift2",
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

  function safe(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function multiline(value) {
    return safe(value || "").replaceAll("\n", "<br>");
  }

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

  function currentDutyShift(dateKey) {
    if (dateKey !== currentDutyDate()) return null;
    const hour = Number(manilaParts(new Date()).hour);
    return hour >= 8 && hour < 20 ? "shift1" : "shift2";
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

  function loadDeployments() {
    try {
      const parsed = JSON.parse(localStorage.getItem(DEPLOYMENT_KEY) || "{}");
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }

  function deploymentKey(dateKey, deploymentUnit, deploymentShift) {
    return `${dateKey}|${deploymentUnit}|${deploymentShift}`;
  }

  function deploymentAssignment(dateKey, deploymentUnit, deploymentShift) {
    const saved = loadDeployments();
    return String(saved[deploymentKey(dateKey, deploymentUnit, deploymentShift)] || "").trim();
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

  function injectDutyStyles() {
    if (document.querySelector("#sitrep-duty-combined-styles")) return;
    const style = document.createElement("style");
    style.id = "sitrep-duty-combined-styles";
    style.textContent = `
      .sitrep-duty-board{margin:0 0 18px;background:#fff;border:1px solid #dfe6f0;border-radius:16px;overflow:hidden;box-shadow:0 8px 24px rgba(16,42,82,.05)}
      .sitrep-duty-board-head{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:15px 17px;background:linear-gradient(135deg,#071a3d,#0d3f88);color:#fff}
      .sitrep-duty-board-head .kicker{color:#bcd0ed;margin:0 0 3px}.sitrep-duty-board-head h3{margin:0;font-size:17px}.sitrep-duty-board-head p{margin:4px 0 0;color:#d5e2f4;font-size:11px}
      .sitrep-duty-open{border:1px solid rgba(255,255,255,.45);background:#fff;color:#0a2b61;border-radius:9px;padding:8px 11px;font:800 10px Inter,sans-serif;cursor:pointer;white-space:nowrap}
      .sitrep-duty-status{padding:10px 16px;border-bottom:1px solid #e3e9f1;background:#f7f9fc;color:#516078;font-size:10px}.sitrep-duty-status strong{color:#0b2d63}
      .sitrep-duty-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:0}
      .sitrep-duty-unit{padding:13px;border-right:1px solid #e4eaf2}.sitrep-duty-unit:last-child{border-right:0}.sitrep-duty-unit h4{margin:0 0 9px;color:#0a2b61;font-size:12px;display:flex;align-items:center;justify-content:space-between;gap:7px}.sitrep-duty-unit h4 small{font-size:8px;color:#8190a4;font-weight:700}
      .sitrep-duty-shift{padding:8px;border:1px solid #e0e7f0;background:#fafcff;border-radius:9px;margin-top:6px}.sitrep-duty-shift.current{border-color:#0f9d58;background:#f1fbf5;box-shadow:0 0 0 2px rgba(15,157,88,.08)}
      .sitrep-duty-shift-head{display:flex;justify-content:space-between;gap:7px;margin-bottom:4px}.sitrep-duty-shift-head strong{font-size:9px;color:#1a3b68}.sitrep-duty-shift-head span{font-size:8px;color:#7b899d}.sitrep-duty-shift.current .sitrep-duty-shift-head strong:after{content:" • NOW";color:#0b8a4b}
      .sitrep-duty-assignment{font-size:9px;line-height:1.45;color:#263750;min-height:27px}.sitrep-duty-assignment.empty{color:#9aa6b6;font-style:italic}
      .sitrep-duty-note{margin:0;padding:9px 16px 12px;color:#738096;font-size:9px;border-top:1px solid #edf1f6}
      .sitrep-shift-duty{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;margin-top:10px}.sitrep-shift-duty-item{border:1px solid #dfe6f0;background:#f8faff;border-radius:8px;padding:7px}.sitrep-shift-duty-item strong{display:block;color:#173861;font-size:9px;margin-bottom:3px}.sitrep-shift-duty-item span{display:block;color:#58677e;font-size:8.5px;line-height:1.35;max-height:44px;overflow:auto}.sitrep-shift-duty-item.empty span{color:#9aa6b6;font-style:italic}
      @media(max-width:920px){.sitrep-duty-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.sitrep-duty-unit:nth-child(2){border-right:0}.sitrep-duty-unit:nth-child(-n+2){border-bottom:1px solid #e4eaf2}}
      @media(max-width:650px){.sitrep-duty-board-head{align-items:flex-start;flex-direction:column}.sitrep-duty-open{width:100%}.sitrep-duty-grid{grid-template-columns:1fr}.sitrep-duty-unit{border-right:0!important;border-bottom:1px solid #e4eaf2}.sitrep-duty-unit:last-child{border-bottom:0}.sitrep-shift-duty{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  function patchPageLabels() {
    const navLabel = document.querySelector('.command-nav a[href="#sitrep"] span:last-child');
    if (navLabel) navLabel.textContent = "Duty & SITREP";
    const title = document.querySelector("#sitrep-title");
    if (title) title.textContent = "Duty Deployment & Hourly SITREP";
    const heading = document.querySelector(".sitrep-page-heading p:not(.kicker)");
    if (heading) heading.textContent = "Monitor who is deployed on the selected duty date and track hourly SITREP submissions from Mobile 562, Mobile 2008, and FVP in one view.";
  }

  function dutyShiftLabel(deploymentShift) {
    return deploymentShift === "shift1" ? "1st Shift" : "2nd Shift";
  }

  function dutyShiftTime(deploymentShift) {
    return deploymentShift === "shift1" ? "8 AM–8 PM" : "8 PM–8 AM";
  }

  function dutyUnitMarkup(dateKey, unit, currentShift) {
    const shiftMarkup = ["shift1", "shift2"].map((deploymentShift) => {
      const assignment = deploymentAssignment(dateKey, unit.deploymentUnit, deploymentShift);
      return `
        <div class="sitrep-duty-shift ${currentShift === deploymentShift ? "current" : ""}">
          <div class="sitrep-duty-shift-head"><strong>${dutyShiftLabel(deploymentShift)}</strong><span>${dutyShiftTime(deploymentShift)}</span></div>
          <div class="sitrep-duty-assignment ${assignment ? "" : "empty"}">${assignment ? multiline(assignment) : "No personnel assigned"}</div>
        </div>`;
    }).join("");
    return `
      <article class="sitrep-duty-unit">
        <h4>${safe(unit.label)} <small>${unit.sitrepTracked ? "SITREP TRACKED" : "DEPLOYMENT"}</small></h4>
        ${shiftMarkup}
      </article>`;
  }

  function openDeployment() {
    const control = document.querySelector('.command-nav a[href="#deployment"], [data-command-page="deployment"]');
    if (control) {
      control.click();
      return;
    }
    window.location.hash = "deployment";
  }

  function ensureDutyBoard() {
    injectDutyStyles();
    patchPageLabels();
    let host = document.querySelector("#sitrep-duty-board");
    if (host) return host;
    const toolbar = document.querySelector(".sitrep-date-toolbar");
    if (!toolbar) return null;
    host = document.createElement("section");
    host.id = "sitrep-duty-board";
    host.className = "sitrep-duty-board";
    toolbar.insertAdjacentElement("afterend", host);
    return host;
  }

  function renderDutyBoard(dateKey) {
    const host = ensureDutyBoard();
    if (!host) return;
    const currentShift = currentDutyShift(dateKey);
    const assignments = loadDeployments();
    const assignedCells = deploymentUnits.reduce((count, unit) => count + ["shift1", "shift2"].filter((deploymentShift) => {
      return Boolean(String(assignments[deploymentKey(dateKey, unit.deploymentUnit, deploymentShift)] || "").trim());
    }).length, 0);
    host.innerHTML = `
      <div class="sitrep-duty-board-head">
        <div>
          <p class="kicker">Selected duty date</p>
          <h3>Duty Deployment — ${safe(formatDate(dateKey))}</h3>
          <p>See the personnel responsible for each unit before checking the hourly SITREP status below.</p>
        </div>
        <button type="button" class="sitrep-duty-open" id="sitrep-open-deployment">Open / Edit Deployment</button>
      </div>
      <div class="sitrep-duty-status"><strong>${assignedCells} / 8 shift assignments populated.</strong>${currentShift ? ` Current duty shift: ${dutyShiftLabel(currentShift)}.` : " Historical/future duty date selected."}</div>
      <div class="sitrep-duty-grid">${deploymentUnits.map((unit) => dutyUnitMarkup(dateKey, unit, currentShift)).join("")}</div>
      <p class="sitrep-duty-note">TMRU is shown for duty awareness only. The hourly SITREP completion total remains based on Mobile 562, Mobile 2008, and FVP.</p>`;
    host.querySelector("#sitrep-open-deployment")?.addEventListener("click", openDeployment);
  }

  function shiftDutyMarkup(shift, dateKey) {
    return `<div class="sitrep-shift-duty" aria-label="Personnel deployed for ${safe(shift.name)}">
      ${units.map((unit) => {
        const assignment = deploymentAssignment(dateKey, unit.deploymentUnit, shift.deploymentShift);
        return `<div class="sitrep-shift-duty-item ${assignment ? "" : "empty"}"><strong>${safe(unit.label)}</strong><span>${assignment ? multiline(assignment) : "No personnel assigned"}</span></div>`;
      }).join("")}
    </div>`;
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
            ${shiftDutyMarkup(shift, dateKey)}
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

    patchPageLabels();
    elements.dateLabel.textContent = formatDate(dateKey);
    elements.dayRange.textContent = `Coverage: 8:00 AM ${formatDate(dateKey, { short: true })} to 8:00 AM ${formatDate(nextDate, { short: true })}`;
    renderDutyBoard(dateKey);
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
    if (event.key === storageKey(elements.dateInput.value)) {
      render("SITREP marks were updated in another browser tab.");
      return;
    }
    if (event.key === DEPLOYMENT_KEY) render();
  });

  window.addEventListener("hashchange", () => {
    if (window.location.hash === "#sitrep") render();
  });

  render();
  window.setInterval(() => render(), 60 * 1000);
})();