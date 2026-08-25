(() => {
  const STORAGE_PREFIX = "consolacion-mps-sitrep-delay-v1:";
  const HOUR_MS = 60 * 60 * 1000;
  const tracker = document.querySelector("#sitrep-shifts");
  const dateInput = document.querySelector("#sitrep-duty-date");
  let bypassPicker = false;
  let activeButton = null;

  function storageKey(dateKey) {
    return `${STORAGE_PREFIX}${dateKey}`;
  }

  function loadDelayed(dateKey) {
    try {
      const value = JSON.parse(localStorage.getItem(storageKey(dateKey)) || "{}");
      return value && typeof value === "object" && !Array.isArray(value) ? value : {};
    } catch {
      return {};
    }
  }

  function saveDelayed(dateKey, value) {
    try {
      localStorage.setItem(storageKey(dateKey), JSON.stringify(value));
    } catch {}
  }

  function dueTime(dateKey, checkId) {
    const match = String(checkId || "").match(/^shift-(1|2)-(\d{2})-/);
    if (!match) return null;
    const shiftNumber = Number(match[1]);
    const slotNumber = Number(match[2]);
    if (!slotNumber || slotNumber < 1 || slotNumber > 12) return null;
    const startHour = shiftNumber === 1 ? 8 : 20;
    const absoluteEndHour = startHour + slotNumber;
    const dutyStart = new Date(`${dateKey}T08:00:00+08:00`).getTime();
    return dutyStart + (absoluteEndHour - 8) * HOUR_MS;
  }

  function isOverdueButton(button) {
    return Boolean(button?.closest?.(".sitrep-row")?.classList.contains("overdue"));
  }

  function formatReceivedAt(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat("en-PH", {
      timeZone: "Asia/Manila",
      hour: "numeric",
      minute: "2-digit",
      month: "short",
      day: "numeric",
    }).format(date);
  }

  function applyDelayedStatus() {
    if (!tracker || !dateInput?.value) return;
    const delayed = loadDelayed(dateInput.value);
    tracker.querySelectorAll("[data-sitrep-toggle]").forEach((button) => {
      const checkId = button.dataset.sitrepToggle;
      const record = delayed[checkId];
      const isDelayed = Boolean(record && button.classList.contains("is-received"));
      button.classList.toggle("is-delayed", isDelayed);

      if (isDelayed) {
        const receivedAt = typeof record === "string" ? record : record.receivedAt;
        const label = formatReceivedAt(receivedAt);
        button.title = label ? `Delayed SITREP received at ${label}. Click to change status.` : "Delayed SITREP received after the hourly deadline. Click to change status.";
        button.setAttribute("aria-label", `${button.dataset.unitLabel || "SITREP"} delayed reporting. Click to change status.`);
      } else if (button.classList.contains("is-received")) {
        button.title = isOverdueButton(button)
          ? "On-time / complied. Click to change status."
          : "SITREP received on time.";
      } else if (isOverdueButton(button)) {
        button.title = "Not complied. Click to choose Green, Yellow, or Red status.";
      }
    });
  }

  function injectStyles() {
    if (document.querySelector("#sitrep-delay-status-styles")) return;
    const style = document.createElement("style");
    style.id = "sitrep-delay-status-styles";
    style.textContent = `
      .sitrep-unit-button.is-received:not(.is-delayed) {
        background:#15803d !important;
        border-color:#15803d !important;
        color:#fff !important;
        box-shadow:0 3px 9px rgba(21,128,61,.2) !important;
      }
      .sitrep-unit-button.is-received:not(.is-delayed) strong {
        color:#fff !important;
      }
      .sitrep-unit-button.is-received.is-delayed {
        background:#fff7d6 !important;
        border-color:#e5a500 !important;
        color:#6d5200 !important;
        box-shadow:inset 0 0 0 1px rgba(229,165,0,.18) !important;
      }
      .sitrep-unit-button.is-received.is-delayed span {
        color:#6d5200 !important;
        font-weight:900 !important;
      }
      .sitrep-unit-button.is-received.is-delayed strong {
        font-size:0 !important;
        color:#7a5b00 !important;
      }
      .sitrep-unit-button.is-received.is-delayed strong::after {
        content:"⚠ DELAYED";
        font-size:9px;
        font-weight:900;
        letter-spacing:.02em;
      }
      .sitrep-row:has(.sitrep-unit-button.is-delayed):not(:has(.sitrep-unit-button:not(.is-received))) {
        background:#fffdf2 !important;
        border-left:4px solid #e5a500 !important;
      }
      .sitrep-status-legend {
        display:flex;
        align-items:center;
        gap:12px;
        flex-wrap:wrap;
        margin:0 0 14px;
        padding:9px 12px;
        border:1px solid #e1e7ef;
        border-radius:10px;
        background:#fff;
        color:#5e6b7f;
        font:700 10px Inter,system-ui,sans-serif;
      }
      .sitrep-status-legend span{display:inline-flex;align-items:center;gap:6px}.sitrep-status-legend i{width:10px;height:10px;border-radius:50%;display:inline-block}.sitrep-status-legend .green{background:#15803d}.sitrep-status-legend .yellow{background:#e5a500}.sitrep-status-legend .red{background:#d93025}
      #sitrep-status-picker[hidden]{display:none!important}
      #sitrep-status-picker{position:fixed;inset:0;z-index:2147483000;display:grid;place-items:center;padding:18px;background:rgba(7,26,61,.58);backdrop-filter:blur(3px)}
      .sitrep-picker-card{width:min(460px,100%);padding:20px;border-radius:16px;background:#fff;box-shadow:0 24px 70px rgba(0,0,0,.3);border:1px solid #dce4ef}
      .sitrep-picker-card .kicker{margin:0 0 5px}.sitrep-picker-card h3{margin:0;color:#071a3d;font-size:19px}.sitrep-picker-card p{margin:7px 0 14px;color:#66758b;font-size:11px;line-height:1.5}
      .sitrep-picker-options{display:grid;gap:9px}.sitrep-picker-option{width:100%;min-height:52px;border-radius:11px;padding:10px 12px;text-align:left;cursor:pointer;font:800 11px Inter,system-ui,sans-serif;border:1px solid transparent}.sitrep-picker-option small{display:block;margin-top:3px;font-size:9px;font-weight:600;opacity:.8}.sitrep-picker-option.green{background:#ecfdf3;border-color:#90d5a9;color:#12652f}.sitrep-picker-option.yellow{background:#fff8dc;border-color:#f0cb57;color:#6d5200}.sitrep-picker-option.red{background:#fff1f2;border-color:#efadb3;color:#a51d2c}.sitrep-picker-cancel{width:100%;margin-top:10px;min-height:40px;border:1px solid #dbe3ee;border-radius:9px;background:#fff;color:#506078;font:800 10px Inter,system-ui,sans-serif;cursor:pointer}
    `;
    document.head.appendChild(style);
  }

  function injectLegend() {
    if (document.querySelector("#sitrep-status-legend")) return;
    const directive = document.querySelector(".sitrep-directive");
    if (!directive) return;
    const legend = document.createElement("div");
    legend.id = "sitrep-status-legend";
    legend.className = "sitrep-status-legend";
    legend.innerHTML = `
      <span><i class="green"></i>Green — On-time / complied</span>
      <span><i class="yellow"></i>Yellow — Delayed reporting</span>
      <span><i class="red"></i>Red — Not complied after deadline</span>`;
    directive.insertAdjacentElement("beforebegin", legend);
  }

  function ensurePicker() {
    let picker = document.querySelector("#sitrep-status-picker");
    if (picker) return picker;
    picker = document.createElement("div");
    picker.id = "sitrep-status-picker";
    picker.hidden = true;
    picker.setAttribute("role", "dialog");
    picker.setAttribute("aria-modal", "true");
    picker.innerHTML = `
      <div class="sitrep-picker-card">
        <p class="kicker">Overdue SITREP status</p>
        <h3 id="sitrep-picker-title">Choose report status</h3>
        <p id="sitrep-picker-copy">Select the correct status based on when the SITREP was actually received.</p>
        <div class="sitrep-picker-options">
          <button type="button" class="sitrep-picker-option green" data-sitrep-status-choice="green">🟢 ON TIME / COMPLIED<small>Use this if the SITREP was received before or at the hourly deadline.</small></button>
          <button type="button" class="sitrep-picker-option yellow" data-sitrep-status-choice="yellow">🟡 DELAYED REPORTING<small>Use this if the SITREP was received only after the hourly deadline.</small></button>
          <button type="button" class="sitrep-picker-option red" data-sitrep-status-choice="red">🔴 NOT COMPLIED<small>Use this if the required SITREP was not received.</small></button>
        </div>
        <button type="button" class="sitrep-picker-cancel" data-sitrep-status-cancel>Cancel</button>
      </div>`;
    document.body.appendChild(picker);

    picker.addEventListener("click", (event) => {
      const choice = event.target.closest?.("[data-sitrep-status-choice]");
      if (choice) {
        setStatus(activeButton, choice.dataset.sitrepStatusChoice);
        closePicker();
        return;
      }
      if (event.target === picker || event.target.closest?.("[data-sitrep-status-cancel]")) closePicker();
    });
    return picker;
  }

  function openPicker(button) {
    const picker = ensurePicker();
    activeButton = button;
    const row = button.closest(".sitrep-row");
    const period = row?.querySelector(".sitrep-time-copy strong")?.textContent?.trim() || "this hourly period";
    picker.querySelector("#sitrep-picker-title").textContent = `${button.dataset.unitLabel || "SITREP"} — ${period}`;
    picker.hidden = false;
    document.body.style.overflow = "hidden";
  }

  function closePicker() {
    const picker = document.querySelector("#sitrep-status-picker");
    if (picker) picker.hidden = true;
    activeButton = null;
    document.body.style.removeProperty("overflow");
  }

  function toggleReceived(button) {
    if (!button?.isConnected) return;
    bypassPicker = true;
    try { button.click(); }
    finally { bypassPicker = false; }
  }

  function setStatus(button, status) {
    if (!button || !dateInput?.value) return;
    const dateKey = dateInput.value;
    const checkId = button.dataset.sitrepToggle;
    const delayed = loadDelayed(dateKey);
    const received = button.classList.contains("is-received");

    if (status === "green") {
      delete delayed[checkId];
      saveDelayed(dateKey, delayed);
      if (!received) toggleReceived(button);
      else applyDelayedStatus();
      return;
    }

    if (status === "yellow") {
      const existing = delayed[checkId];
      delayed[checkId] = existing || { receivedAt: new Date().toISOString(), manual: true };
      saveDelayed(dateKey, delayed);
      if (!received) toggleReceived(button);
      else applyDelayedStatus();
      return;
    }

    delete delayed[checkId];
    saveDelayed(dateKey, delayed);
    if (received) toggleReceived(button);
    else applyDelayedStatus();
  }

  document.addEventListener("click", (event) => {
    const button = event.target.closest?.("[data-sitrep-toggle]");
    if (!button || !dateInput?.value || bypassPicker) return;

    if (isOverdueButton(button)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      openPicker(button);
      return;
    }

    const dateKey = dateInput.value;
    const checkId = button.dataset.sitrepToggle;
    const delayed = loadDelayed(dateKey);
    delete delayed[checkId];
    saveDelayed(dateKey, delayed);
    window.setTimeout(applyDelayedStatus, 0);
  }, true);

  dateInput?.addEventListener("change", () => {
    closePicker();
    window.setTimeout(applyDelayedStatus, 0);
  });

  if (tracker) {
    new MutationObserver(() => applyDelayedStatus()).observe(tracker, { childList: true, subtree: true });
  }

  window.addEventListener("storage", (event) => {
    if (dateInput?.value && event.key === storageKey(dateInput.value)) applyDelayedStatus();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closePicker();
  });

  injectStyles();
  injectLegend();
  ensurePicker();
  applyDelayedStatus();
})();