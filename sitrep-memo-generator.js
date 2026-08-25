(() => {
  const SITREP_PREFIX = "consolacion-mps-sitrep-v1:";
  const DELAY_PREFIX = "consolacion-mps-sitrep-delay-v1:";
  const DEPLOYMENT_KEY = "consolacion-mps-weekly-deployment-v2";
  const MANILA_TIME_ZONE = "Asia/Manila";
  const HOUR_MS = 60 * 60 * 1000;
  const tracker = document.querySelector("#sitrep-shifts");
  const dateInput = document.querySelector("#sitrep-duty-date");

  if (!tracker || !dateInput) return;

  const unitMap = {
    "mobile-562": { label: "Mobile 562", deploymentUnit: "MP 218-562" },
    "mobile-2008": { label: "Mobile 2008", deploymentUnit: "MP 218-2008" },
    "fvp": { label: "FVP", deploymentUnit: "MP 218-FVP" },
  };

  function safe(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function readJson(key, fallback = {}) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || "null");
      return value ?? fallback;
    } catch {
      return fallback;
    }
  }

  function formatDate(dateKey) {
    return new Intl.DateTimeFormat("en-PH", {
      timeZone: MANILA_TIME_ZONE,
      month: "long",
      day: "numeric",
      year: "numeric",
    }).format(new Date(`${dateKey}T12:00:00+08:00`));
  }

  function formatTime(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Not recorded";
    return new Intl.DateTimeFormat("en-PH", {
      timeZone: MANILA_TIME_ZONE,
      hour: "numeric",
      minute: "2-digit",
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date);
  }

  function timeLabel(absoluteHour) {
    const hour = ((absoluteHour % 24) + 24) % 24;
    const suffix = hour >= 12 ? "PM" : "AM";
    return `${hour % 12 || 12}:00 ${suffix}`;
  }

  function parseCheckId(checkId) {
    const match = String(checkId || "").match(/^shift-(1|2)-(\d{2})-(mobile-562|mobile-2008|fvp)$/);
    if (!match) return null;
    const shiftNumber = Number(match[1]);
    const slotNumber = Number(match[2]);
    const unitId = match[3];
    const startHour = shiftNumber === 1 ? 8 : 20;
    const periodStart = startHour + slotNumber - 1;
    const periodEnd = periodStart + 1;
    return {
      shiftNumber,
      deploymentShift: shiftNumber === 1 ? "shift1" : "shift2",
      shiftLabel: shiftNumber === 1 ? "1st Shift" : "2nd Shift",
      shiftTime: shiftNumber === 1 ? "8:00 AM – 8:00 PM" : "8:00 PM – 8:00 AM",
      slotNumber,
      unitId,
      unit: unitMap[unitId],
      period: `${timeLabel(periodStart)}–${timeLabel(periodEnd)}`,
      deadline: timeLabel(periodEnd),
      absoluteEndHour: periodEnd,
    };
  }

  function dueTime(dateKey, info) {
    const dutyStart = new Date(`${dateKey}T08:00:00+08:00`).getTime();
    return dutyStart + (info.absoluteEndHour - 8) * HOUR_MS;
  }

  function loadSitrep(dateKey) {
    const saved = readJson(`${SITREP_PREFIX}${dateKey}`, {});
    return saved && typeof saved === "object" ? saved : {};
  }

  function loadDelayed(dateKey) {
    const saved = readJson(`${DELAY_PREFIX}${dateKey}`, {});
    return saved && typeof saved === "object" ? saved : {};
  }

  function loadDeployments() {
    const saved = readJson(DEPLOYMENT_KEY, {});
    return saved && typeof saved === "object" ? saved : {};
  }

  function assignmentFor(dateKey, info) {
    const deployments = loadDeployments();
    const key = `${dateKey}|${info.unit.deploymentUnit}|${info.deploymentShift}`;
    return String(deployments[key] || "").trim() || `Assigned Personnel – ${info.unit.deploymentUnit}`;
  }

  function delayedMeta(record) {
    if (!record) return null;
    if (typeof record === "string") return { receivedAt: record };
    return record;
  }

  function collectIncidents(dateKey) {
    const sitrep = loadSitrep(dateKey);
    const checks = sitrep.checks && typeof sitrep.checks === "object" ? sitrep.checks : {};
    const delayed = loadDelayed(dateKey);
    const incidents = [];

    for (const shiftNumber of [1, 2]) {
      for (let slotNumber = 1; slotNumber <= 12; slotNumber += 1) {
        for (const unitId of Object.keys(unitMap)) {
          const checkId = `shift-${shiftNumber}-${String(slotNumber).padStart(2, "0")}-${unitId}`;
          const info = parseCheckId(checkId);
          if (!info) continue;
          const received = Boolean(checks[checkId]);
          const delay = delayedMeta(delayed[checkId]);
          const due = dueTime(dateKey, info);

          if (received && delay) {
            const receivedAt = delay.receivedAt || null;
            const receivedMs = receivedAt ? new Date(receivedAt).getTime() : NaN;
            const minutesLate = Number.isFinite(receivedMs) ? Math.max(1, Math.ceil((receivedMs - due) / 60000)) : null;
            incidents.push({
              checkId,
              dateKey,
              ...info,
              status: "delayed",
              statusLabel: "DELAYED REPORTING",
              receivedAt,
              minutesLate,
              assignment: assignmentFor(dateKey, info),
            });
            continue;
          }

          if (!received && Date.now() > due) {
            incidents.push({
              checkId,
              dateKey,
              ...info,
              status: "not-complied",
              statusLabel: "NOT COMPLIED / NO SITREP RECEIVED",
              receivedAt: null,
              minutesLate: null,
              assignment: assignmentFor(dateKey, info),
            });
          }
        }
      }
    }

    return incidents;
  }

  function injectStyles() {
    if (document.querySelector("#sitrep-memo-styles")) return;
    const style = document.createElement("style");
    style.id = "sitrep-memo-styles";
    style.textContent = `
      .sitrep-memo-panel{margin:0 0 14px;border:1px solid #dfe6f0;border-radius:13px;background:#fff;box-shadow:0 6px 18px rgba(16,42,82,.045);overflow:hidden}
      .sitrep-memo-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 14px;background:#f8fafc;border-bottom:1px solid #e4eaf2}
      .sitrep-memo-head h3{margin:0;color:#071a3d;font-size:13px}.sitrep-memo-head p{margin:3px 0 0;color:#728096;font-size:9px}.sitrep-memo-counts{display:flex;gap:6px;flex-wrap:wrap}.sitrep-memo-count{padding:6px 8px;border-radius:999px;font:800 9px Inter,sans-serif}.sitrep-memo-count.yellow{background:#fff7d6;color:#765800}.sitrep-memo-count.red{background:#fff1f2;color:#a51d2c}
      .sitrep-memo-actions{display:flex;gap:7px;flex-wrap:wrap;padding:10px 14px;border-bottom:1px solid #edf1f6}.sitrep-memo-actions button{border:1px solid #ced8e5;border-radius:8px;background:#fff;color:#173861;padding:7px 10px;font:800 9px Inter,sans-serif;cursor:pointer}.sitrep-memo-actions button.primary{background:#0f4cbd;border-color:#0f4cbd;color:#fff}.sitrep-memo-actions button:disabled{opacity:.45;cursor:not-allowed}
      .sitrep-memo-list{display:grid}.sitrep-memo-row{display:grid;grid-template-columns:90px minmax(130px,.8fr) minmax(170px,1fr) minmax(170px,1.2fr) auto;gap:8px;align-items:center;padding:9px 14px;border-bottom:1px solid #edf1f6}.sitrep-memo-row:last-child{border-bottom:0}.sitrep-memo-row small{display:block;color:#7c899c;font-size:8px}.sitrep-memo-row strong{display:block;color:#18345f;font-size:9px;line-height:1.35}.sitrep-memo-status{display:inline-flex!important;width:max-content;padding:5px 7px;border-radius:999px;font-size:8px!important}.sitrep-memo-status.yellow{background:#fff7d6;color:#765800!important}.sitrep-memo-status.red{background:#fff1f2;color:#a51d2c!important}.sitrep-memo-row button{border:1px solid #cbd6e4;border-radius:8px;background:#fff;color:#0f4cbd;padding:7px 9px;font:800 8px Inter,sans-serif;cursor:pointer;white-space:nowrap}.sitrep-memo-empty{padding:14px;color:#6e7b90;font-size:10px}
      @media(max-width:820px){.sitrep-memo-head{align-items:flex-start;flex-direction:column}.sitrep-memo-row{grid-template-columns:1fr 1fr}.sitrep-memo-row>div:nth-child(3),.sitrep-memo-row>div:nth-child(4){grid-column:1/-1}.sitrep-memo-row button{width:100%}}
      @media(max-width:520px){.sitrep-memo-row{grid-template-columns:1fr}.sitrep-memo-row>*{grid-column:1!important}.sitrep-memo-actions button{flex:1 1 100%}}
    `;
    document.head.appendChild(style);
  }

  function ensurePanel() {
    injectStyles();
    let panel = document.querySelector("#sitrep-memo-panel");
    if (panel) return panel;
    const legend = document.querySelector("#sitrep-status-legend");
    const directive = document.querySelector(".sitrep-directive");
    if (!legend && !directive) return null;
    panel = document.createElement("section");
    panel.id = "sitrep-memo-panel";
    panel.className = "sitrep-memo-panel";
    (legend || directive).insertAdjacentElement("afterend", panel);
    return panel;
  }

  function memoSubject(incident) {
    return incident.status === "delayed"
      ? "Explanation Regarding Delayed Submission of SITREP"
      : "Explanation Regarding Non-Submission of SITREP";
  }

  function memoBodyHtml(incident, index = 1) {
    const delayLine = incident.status === "delayed"
      ? `<tr><th>Recorded time received</th><td contenteditable="true">${safe(formatTime(incident.receivedAt))}</td></tr>\n         <tr><th>Recorded delay</th><td contenteditable="true">${incident.minutesLate ? `${incident.minutesLate} minute${incident.minutesLate === 1 ? "" : "s"}` : "To be verified"}</td></tr>`
      : `<tr><th>Recorded receipt</th><td contenteditable="true">No SITREP marked received as of memo generation</td></tr>`;

    return `
      <article class="memo-page">
        <div class="memo-letterhead">
          <div class="memo-republic">Republic of the Philippines</div>
          <div class="memo-office" contenteditable="true">CONSOLACION MUNICIPAL POLICE STATION</div>
          <div class="memo-suboffice" contenteditable="true">Consolacion, Cebu</div>
        </div>
        <h1>MEMORANDUM</h1>
        <table class="memo-meta">
          <tr><th>FOR</th><td contenteditable="true">${safe(incident.assignment)}</td></tr>
          <tr><th>FROM</th><td contenteditable="true">Chief of Police, Consolacion MPS</td></tr>
          <tr><th>SUBJECT</th><td contenteditable="true">${safe(memoSubject(incident))}</td></tr>
          <tr><th>DATE</th><td contenteditable="true">${safe(formatDate(incident.dateKey))}</td></tr>
          <tr><th>MEMO NO.</th><td contenteditable="true">____________________________</td></tr>
        </table>
        <p>1. Records of the Duty and SITREP Monitoring System show that the personnel indicated above was assigned to <strong>${safe(incident.unit.deploymentUnit)}</strong>, <strong>${safe(incident.shiftLabel)}</strong> (${safe(incident.shiftTime)}) on <strong>${safe(formatDate(incident.dateKey))}</strong>.</p>
        <p>2. The required Situation Report (SITREP) for the patrol period <strong>${safe(incident.period)}</strong>, due at <strong>${safe(incident.deadline)}</strong>, was recorded with the following status:</p>
        <table class="memo-facts">
          <tr><th>Unit</th><td>${safe(incident.unit.label)}</td></tr>
          <tr><th>Duty shift</th><td>${safe(incident.shiftLabel)} — ${safe(incident.shiftTime)}</td></tr>
          <tr><th>Reporting period</th><td>${safe(incident.period)}</td></tr>
          <tr><th>Deadline</th><td>${safe(incident.deadline)}</td></tr>
          <tr><th>Status</th><td><strong>${safe(incident.statusLabel)}</strong></td></tr>
          ${delayLine}
        </table>
        <p>3. You are hereby directed to submit a written explanation stating the circumstances surrounding the ${incident.status === "delayed" ? "delayed submission" : "non-submission"} of the required SITREP. This memorandum documents the monitoring record and requests an explanation; any further administrative action, if warranted, remains subject to proper review and applicable rules.</p>
        <p>4. Submit your written explanation <span contenteditable="true"><strong>within twenty-four (24) hours from receipt of this memorandum</strong></span>.</p>
        <div class="memo-explanation">
          <strong>EXPLANATION / RESPONSE:</strong>
          <div contenteditable="true">____________________________________________________________________________<br><br>____________________________________________________________________________<br><br>____________________________________________________________________________<br><br>____________________________________________________________________________</div>
        </div>
        <div class="memo-signatures">
          <div><span>Prepared / Issued by:</span><strong contenteditable="true">____________________________</strong><small contenteditable="true">Name / Rank / Position</small></div>
          <div><span>Received by:</span><strong contenteditable="true">____________________________</strong><small contenteditable="true">Signature over printed name / Date & Time</small></div>
        </div>
        <div class="memo-foot">Generated from the Consolacion MPS Duty & SITREP Monitoring System • Memo ${index}</div>
      </article>`;
  }

  function printDocument(incidents) {
    if (!incidents.length) return;
    const popup = window.open("", "_blank");
    if (!popup) {
      window.alert("The memo window was blocked by the browser. Please allow pop-ups for this site, then try again.");
      return;
    }

    popup.document.open();
    popup.document.write(`<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SITREP Explanation Memo</title>
<style>
  *{box-sizing:border-box}body{margin:0;background:#eef1f5;color:#111;font-family:Arial,Helvetica,sans-serif}.toolbar{position:sticky;top:0;z-index:10;display:flex;gap:8px;justify-content:center;padding:10px;background:#071a3d}.toolbar button{border:0;border-radius:7px;padding:9px 13px;font-weight:700;cursor:pointer}.toolbar .print{background:#fff;color:#071a3d}.toolbar .close{background:#dbe4f2;color:#071a3d}.hint{padding:8px;text-align:center;background:#fff5c2;color:#5d4a00;font-size:12px}.memo-page{width:210mm;min-height:297mm;margin:14px auto;padding:18mm 18mm 16mm;background:#fff;box-shadow:0 4px 24px rgba(0,0,0,.12);page-break-after:always}.memo-page:last-child{page-break-after:auto}.memo-letterhead{text-align:center;margin-bottom:18px}.memo-republic{font-size:12px}.memo-office{font-size:15px;font-weight:700;margin-top:5px}.memo-suboffice{font-size:12px;margin-top:2px}.memo-page h1{text-align:center;font-size:17px;letter-spacing:.08em;margin:18px 0}.memo-meta,.memo-facts{width:100%;border-collapse:collapse;margin:0 0 18px}.memo-meta th{width:95px;text-align:left;vertical-align:top;padding:3px 7px 3px 0;font-size:12px}.memo-meta td{padding:3px 0;font-size:12px}.memo-facts{border:1px solid #555}.memo-facts th,.memo-facts td{border:1px solid #777;padding:6px 8px;text-align:left;font-size:11px}.memo-facts th{width:155px;background:#f4f4f4}.memo-page p{font-size:12px;line-height:1.6;text-align:justify;margin:12px 0}.memo-explanation{margin-top:18px;font-size:12px}.memo-explanation>div{margin-top:10px;line-height:1.4;min-height:105px}.memo-signatures{display:grid;grid-template-columns:1fr 1fr;gap:28px;margin-top:34px}.memo-signatures div{display:grid;gap:7px;font-size:11px}.memo-signatures strong{margin-top:18px;font-size:12px}.memo-signatures small{font-size:10px;color:#444}.memo-foot{margin-top:28px;padding-top:7px;border-top:1px solid #aaa;text-align:center;font-size:8px;color:#666}[contenteditable=true]{outline:1px dashed transparent}[contenteditable=true]:focus{outline-color:#0f4cbd;background:#f5f9ff}
  @media print{body{background:#fff}.toolbar,.hint{display:none!important}.memo-page{margin:0;box-shadow:none;width:auto;min-height:auto;padding:15mm 16mm}.memo-page{page-break-after:always}.memo-page:last-child{page-break-after:auto}@page{size:A4;margin:0}}
</style></head><body>
<div class="toolbar"><button class="print" onclick="window.print()">PRINT / SAVE AS PDF</button><button class="close" onclick="window.close()">CLOSE</button></div>
<div class="hint">Fields with editable text can be changed before printing. Use your browser's Print dialog and choose “Save as PDF” if needed.</div>
${incidents.map((incident, index) => memoBodyHtml(incident, index + 1)).join("\n")}
</body></html>`);
    popup.document.close();
    popup.focus();
  }

  function renderPanel() {
    const panel = ensurePanel();
    if (!panel || !dateInput.value) return;
    const incidents = collectIncidents(dateInput.value);
    const delayedCount = incidents.filter((item) => item.status === "delayed").length;
    const redCount = incidents.filter((item) => item.status === "not-complied").length;

    panel.innerHTML = `
      <div class="sitrep-memo-head">
        <div><h3>Explanation Memo Generator</h3><p>Generate individual or consolidated explanation memos for delayed and non-complied SITREP entries.</p></div>
        <div class="sitrep-memo-counts"><span class="sitrep-memo-count yellow">${delayedCount} Delayed</span><span class="sitrep-memo-count red">${redCount} Not Complied</span></div>
      </div>
      <div class="sitrep-memo-actions">
        <button type="button" class="primary" data-generate-all-memos ${incidents.length ? "" : "disabled"}>Generate All Explanation Memos</button>
        <button type="button" data-refresh-memos>Refresh Memo List</button>
      </div>
      <div class="sitrep-memo-list">
        ${incidents.length ? incidents.map((incident, index) => `
          <div class="sitrep-memo-row" data-memo-index="${index}">
            <div><strong>${safe(incident.unit.label)}</strong><small>${safe(incident.shiftLabel)}</small></div>
            <div><strong>${safe(incident.period)}</strong><small>Due ${safe(incident.deadline)}</small></div>
            <div><strong class="sitrep-memo-status ${incident.status === "delayed" ? "yellow" : "red"}">${safe(incident.statusLabel)}</strong><small>${incident.status === "delayed" ? `Recorded: ${safe(formatTime(incident.receivedAt))}` : "No receipt recorded"}</small></div>
            <div><strong>${safe(incident.assignment)}</strong><small>Assigned personnel</small></div>
            <button type="button" data-generate-memo="${index}">Generate Memo</button>
          </div>`).join("") : '<div class="sitrep-memo-empty">No delayed or non-complied SITREP entries for this duty date.</div>'}
      </div>`;

    panel.querySelector("[data-generate-all-memos]")?.addEventListener("click", () => printDocument(collectIncidents(dateInput.value)));
    panel.querySelector("[data-refresh-memos]")?.addEventListener("click", renderPanel);
    panel.querySelectorAll("[data-generate-memo]").forEach((button) => {
      button.addEventListener("click", () => {
        const latest = collectIncidents(dateInput.value);
        const incident = latest[Number(button.dataset.generateMemo)];
        if (incident) printDocument([incident]);
      });
    });
  }

  let renderQueued = false;
  function queueRender() {
    if (renderQueued) return;
    renderQueued = true;
    window.setTimeout(() => {
      renderQueued = false;
      renderPanel();
    }, 60);
  }

  dateInput.addEventListener("change", queueRender);
  window.addEventListener("storage", (event) => {
    if (!dateInput.value) return;
    if (event.key === `${SITREP_PREFIX}${dateInput.value}` || event.key === `${DELAY_PREFIX}${dateInput.value}` || event.key === DEPLOYMENT_KEY) queueRender();
  });

  new MutationObserver(queueRender).observe(tracker, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
  document.addEventListener("click", (event) => {
    if (event.target.closest?.("[data-sitrep-status-choice], [data-sitrep-toggle]")) queueRender();
  }, true);

  injectStyles();
  queueRender();
})();