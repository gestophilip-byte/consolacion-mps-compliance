(() => {
  const STORAGE_PREFIX = "consolacion-mps-sitrep-delay-v1:";
  const HOUR_MS = 60 * 60 * 1000;
  const tracker = document.querySelector("#sitrep-shifts");
  const dateInput = document.querySelector("#sitrep-duty-date");

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
        button.title = label ? `Delayed SITREP received at ${label}` : "Delayed SITREP received after the hourly deadline";
        button.setAttribute("aria-label", `${button.dataset.unitLabel || "SITREP"} delayed reporting received after deadline`);
      }
    });
  }

  function injectStyles() {
    if (document.querySelector("#sitrep-delay-status-styles")) return;
    const style = document.createElement("style");
    style.id = "sitrep-delay-status-styles";
    style.textContent = `
      .sitrep-unit-button.is-received.is-delayed {
        background: #fff7d6 !important;
        border-color: #e5a500 !important;
        color: #6d5200 !important;
        box-shadow: inset 0 0 0 1px rgba(229,165,0,.18) !important;
      }
      .sitrep-unit-button.is-received.is-delayed span {
        color: #6d5200 !important;
        font-weight: 900 !important;
      }
      .sitrep-unit-button.is-received.is-delayed strong {
        font-size: 0 !important;
        color: #7a5b00 !important;
      }
      .sitrep-unit-button.is-received.is-delayed strong::after {
        content: "⚠ DELAYED";
        font-size: 9px;
        font-weight: 900;
        letter-spacing: .02em;
      }
      .sitrep-row:has(.sitrep-unit-button.is-delayed):not(:has(.sitrep-unit-button:not(.is-received))) {
        background: #fffdf2 !important;
        border-left: 4px solid #e5a500 !important;
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
      .sitrep-status-legend span { display:inline-flex;align-items:center;gap:6px; }
      .sitrep-status-legend i { width:10px;height:10px;border-radius:50%;display:inline-block; }
      .sitrep-status-legend .green { background:#179957; }
      .sitrep-status-legend .yellow { background:#e5a500; }
      .sitrep-status-legend .red { background:#d93025; }
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

  document.addEventListener("click", (event) => {
    const button = event.target.closest?.("[data-sitrep-toggle]");
    if (!button || !dateInput?.value) return;

    const dateKey = dateInput.value;
    const checkId = button.dataset.sitrepToggle;
    const delayed = loadDelayed(dateKey);
    const wasReceived = button.classList.contains("is-received");

    if (wasReceived) {
      delete delayed[checkId];
    } else {
      const due = dueTime(dateKey, checkId);
      if (due && Date.now() > due) {
        delayed[checkId] = { receivedAt: new Date().toISOString() };
      } else {
        delete delayed[checkId];
      }
    }

    saveDelayed(dateKey, delayed);
    window.setTimeout(applyDelayedStatus, 0);
  }, true);

  dateInput?.addEventListener("change", () => window.setTimeout(applyDelayedStatus, 0));

  if (tracker) {
    new MutationObserver(() => applyDelayedStatus()).observe(tracker, { childList: true, subtree: true });
  }

  window.addEventListener("storage", (event) => {
    if (dateInput?.value && event.key === storageKey(dateInput.value)) applyDelayedStatus();
  });

  injectStyles();
  injectLegend();
  applyDelayedStatus();
})();