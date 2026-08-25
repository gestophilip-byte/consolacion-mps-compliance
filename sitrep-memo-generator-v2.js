(() => {
  const SITREP_PREFIX = "consolacion-mps-sitrep-v1:";
  const DELAY_PREFIX = "consolacion-mps-sitrep-delay-v1:";
  const DEPLOYMENT_KEY = "consolacion-mps-weekly-deployment-v2";
  const MANILA_TIME_ZONE = "Asia/Manila";
  const HOUR_MS = 60 * 60 * 1000;
  const STATION_LOGO = "https://work-compliance-portal.gestophilip.chatgpt.site/consolacion-mps-logo.jpg";
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
      month: "long",
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
    if (document.querySelector("#sitrep-memo-v2-styles")) return;
    const style = document.createElement("style");
    style.id = "sitrep-memo-v2-styles";
    style.textContent = `
      #sitrep-memo-panel{margin:0 0 14px;border:1px solid #dfe6f0;border-radius:13px;background:#fff;box-shadow:0 6px 18px rgba(16,42,82,.045);overflow:hidden}
      #sitrep-memo-panel .sitrep-memo-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 14px;background:#f8fafc;border-bottom:1px solid #e4eaf2}
      #sitrep-memo-panel .sitrep-memo-head h3{margin:0;color:#071a3d;font-size:13px}#sitrep-memo-panel .sitrep-memo-head p{margin:3px 0 0;color:#728096;font-size:9px}
      .sitrep-memo-counts{display:flex;gap:6px;flex-wrap:wrap}.sitrep-memo-count{padding:6px 8px;border-radius:999px;font:800 9px Inter,sans-serif}.sitrep-memo-count.yellow{background:#fff7d6;color:#765800}.sitrep-memo-count.red{background:#fff1f2;color:#a51d2c}
      .sitrep-memo-actions{display:flex;gap:7px;flex-wrap:wrap;padding:10px 14px;border-bottom:1px solid #edf1f6}.sitrep-memo-actions button{border:1px solid #ced8e5;border-radius:8px;background:#fff;color:#173861;padding:7px 10px;font:800 9px Inter,sans-serif;cursor:pointer}.sitrep-memo-actions button.primary{background:#0f4cbd;border-color:#0f4cbd;color:#fff}.sitrep-memo-actions button:disabled{opacity:.45;cursor:not-allowed}
      .sitrep-memo-list{display:grid}.sitrep-memo-row{display:grid;grid-template-columns:90px minmax(130px,.8fr) minmax(170px,1fr) minmax(170px,1.2fr) auto;gap:8px;align-items:center;padding:9px 14px;border-bottom:1px solid #edf1f6}.sitrep-memo-row:last-child{border-bottom:0}.sitrep-memo-row small{display:block;color:#7c899c;font-size:8px}.sitrep-memo-row strong{display:block;color:#18345f;font-size:9px;line-height:1.35}.sitrep-memo-status{display:inline-flex!important;width:max-content;padding:5px 7px;border-radius:999px;font-size:8px!important}.sitrep-memo-status.yellow{background:#fff7d6;color:#765800!important}.sitrep-memo-status.red{background:#fff1f2;color:#a51d2c!important}.sitrep-memo-row button{border:1px solid #cbd6e4;border-radius:8px;background:#fff;color:#0f4cbd;padding:7px 9px;font:800 8px Inter,sans-serif;cursor:pointer;white-space:nowrap}.sitrep-memo-empty{padding:14px;color:#6e7b90;font-size:10px}
      @media(max-width:820px){#sitrep-memo-panel .sitrep-memo-head{align-items:flex-start;flex-direction:column}.sitrep-memo-row{grid-template-columns:1fr 1fr}.sitrep-memo-row>div:nth-child(3),.sitrep-memo-row>div:nth-child(4){grid-column:1/-1}.sitrep-memo-row button{width:100%}}
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
    (legend || directive).insertAdjacentElement("afterend", panel);
    return panel;
  }

  function memoSubject(incident) {
    return incident.status === "delayed"
      ? "Directive to Explain re Delayed Submission of SITREP"
      : "Directive to Explain re Non-Submission of SITREP";
  }

  function statusNarrative(incident) {
    if (incident.status === "delayed") {
      const lateText = incident.minutesLate
        ? `, or approximately ${incident.minutesLate} minute${incident.minutesLate === 1 ? "" : "s"} after the deadline`
        : "";
      return `The monitoring record was marked <strong>DELAYED REPORTING</strong>. The tracker recorded the report as received at <strong>${safe(formatTime(incident.receivedAt))}</strong>${lateText}.`;
    }
    return `The monitoring record was marked <strong>NOT COMPLIED / NO SITREP RECEIVED</strong>. No SITREP was marked received in the tracker as of the time this memorandum was generated.`;
  }

  function memoBodyHtml(incident) {
    return `
      <article class="memo-page">
        <header class="memo-letterhead">
          <div class="memo-logo-wrap"><img src="${STATION_LOGO}" alt="Consolacion MPS logo" /></div>
          <div class="memo-letterhead-copy">
            <div>Republic of the Philippines</div>
            <div>National Police Commission</div>
            <div class="memo-pnp">PHILIPPINE NATIONAL POLICE</div>
            <div class="memo-unit-line" contenteditable="true">POLICE REGIONAL OFFICE 7</div>
            <div class="memo-unit-line" contenteditable="true">CEBU POLICE PROVINCIAL OFFICE</div>
            <div class="memo-unit-line" contenteditable="true">CONSOLACION MUNICIPAL POLICE STATION</div>
            <div class="memo-address" contenteditable="true">Consolacion, Cebu</div>
            <div class="memo-email" contenteditable="true">Email: ______________________________</div>
          </div>
          <div class="memo-logo-spacer" aria-hidden="true"></div>
        </header>

        <div class="memo-title">MEMORANDUM</div>

        <div class="memo-meta">
          <div class="memo-label">FOR</div><div class="memo-colon">:</div><div class="memo-value" contenteditable="true">${safe(incident.assignment)}</div>
          <div class="memo-label">FROM</div><div class="memo-colon">:</div><div class="memo-value" contenteditable="true">Chief of Police, Consolacion MPS</div>
          <div class="memo-label">SUBJECT</div><div class="memo-colon">:</div><div class="memo-value memo-subject" contenteditable="true">${safe(memoSubject(incident))}</div>
          <div class="memo-label">DATE</div><div class="memo-colon">:</div><div class="memo-value" contenteditable="true">${safe(formatDate(incident.dateKey))}</div>
        </div>

        <div class="memo-rule"></div>

        <div class="memo-body">
          <p><span class="memo-num">1.</span><span><strong>Reference:</strong> Hourly SITREP Reporting Directive and Duty &amp; SITREP Monitoring Record dated ${safe(formatDate(incident.dateKey))}.</span></p>

          <p><span class="memo-num">2.</span><span>In connection with the above reference, please be informed that the personnel assigned to <strong>${safe(incident.unit.deploymentUnit)}</strong>, ${safe(incident.shiftLabel)} (${safe(incident.shiftTime)}), on ${safe(formatDate(incident.dateKey))}, was required to submit an hourly Situation Report (SITREP) for the patrol period <strong>${safe(incident.period)}</strong>, due at <strong>${safe(incident.deadline)}</strong>. ${statusNarrative(incident)}</span></p>

          <p><span class="memo-num">3.</span><span>In view thereof, the concerned personnel is hereby directed to submit a written explanation stating the circumstances surrounding the ${incident.status === "delayed" ? "delayed submission" : "non-submission"} of the required SITREP <strong contenteditable="true">within twenty-four (24) hours from receipt of this memorandum</strong>. The explanation shall be evaluated together with the applicable duty records and official communication logs.</span></p>

          <p><span class="memo-num">4.</span><span><strong>Remarks:</strong> This memorandum is based on the Duty &amp; SITREP Monitoring System entry for the selected duty date. The recorded status and time remain subject to verification against official records before any further administrative action is taken.</span></p>

          <p><span class="memo-num">5.</span><span contenteditable="true">For Information and Appropriate Action.</span></p>
        </div>

        <div class="memo-ending">
          <div class="memo-contact">
            <div contenteditable="true">IOC - ______________________________</div>
            <div contenteditable="true">Contact No.: _______________________</div>
          </div>
          <div class="memo-signature">
            <div class="memo-signature-space"></div>
            <strong contenteditable="true">______________________________</strong>
            <span contenteditable="true">Police Rank / Name</span>
            <span contenteditable="true">Chief of Police</span>
          </div>
        </div>
      </article>`;
  }

  function printDocument(incidents) {
    if (!incidents.length) return;
    const popup = window.open("", "_blank");
    if (!popup) {
      window.alert("The memorandum window was blocked by the browser. Please allow pop-ups for this site, then try again.");
      return;
    }

    popup.document.open();
    popup.document.write(`<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>SITREP Explanation Memorandum</title>
<style>
  *{box-sizing:border-box}
  body{margin:0;background:#e9edf2;color:#111;font-family:Arial,Helvetica,sans-serif}
  .toolbar{position:sticky;top:0;z-index:20;display:flex;justify-content:center;gap:8px;padding:10px;background:#071a3d}
  .toolbar button{border:0;border-radius:7px;padding:9px 14px;font-weight:700;cursor:pointer}
  .toolbar .print{background:#fff;color:#071a3d}.toolbar .close{background:#dce5f3;color:#071a3d}
  .hint{padding:8px 12px;text-align:center;background:#fff4c2;color:#5f4b00;font-size:12px}
  .memo-page{position:relative;width:210mm;min-height:297mm;margin:14px auto;padding:10mm 13mm 14mm;background:#fff;box-shadow:0 5px 25px rgba(0,0,0,.14);page-break-after:always}
  .memo-page:last-child{page-break-after:auto}
  .memo-letterhead{display:grid;grid-template-columns:74px 1fr 74px;gap:8px;align-items:start;text-align:center;min-height:112px}
  .memo-logo-wrap,.memo-logo-spacer{width:74px;height:88px;display:flex;align-items:center;justify-content:center}
  .memo-logo-wrap img{max-width:68px;max-height:82px;object-fit:contain}
  .memo-letterhead-copy{font-size:11.5px;line-height:1.17;padding-top:1px}
  .memo-pnp{font-size:14px;font-weight:800;margin-top:2px}.memo-unit-line{font-size:13px;font-weight:800;line-height:1.12}.memo-address{font-size:11px;margin-top:3px}.memo-email{font-size:10px;margin-top:2px;color:#1476b8}
  .memo-title{margin:2px 0 4px;font-size:17px;font-weight:800;font-style:italic}
  .memo-meta{display:grid;grid-template-columns:92px 14px 1fr;row-gap:0;margin:0 29px 10px 29px;font-size:12px;line-height:1.32}
  .memo-label{padding:7px 0}.memo-colon{padding:7px 0}.memo-value{padding:7px 0;min-height:31px}.memo-subject{font-weight:800}
  .memo-rule{height:3px;background:#111;margin:7px 0 17px}
  .memo-body{padding:0 29px}.memo-body p{display:grid;grid-template-columns:27px 1fr;gap:3px;margin:0 0 16px;font-size:12px;line-height:1.38;text-align:justify}.memo-num{text-align:right;padding-right:5px}
  .memo-ending{display:grid;grid-template-columns:1fr 1fr;gap:24px;align-items:end;margin:33px 0 0;padding:0 2px 0 0}
  .memo-contact{align-self:end;font-size:10.5px;line-height:1.45;padding-left:1px}
  .memo-signature{text-align:left;width:270px;justify-self:end;font-size:11px;line-height:1.25}.memo-signature-space{height:42px}.memo-signature strong,.memo-signature span{display:block}.memo-signature strong{font-size:12px}.memo-signature span{font-size:11px}
  [contenteditable=true]{outline:1px dashed transparent;border-radius:2px}[contenteditable=true]:focus{outline-color:#0f4cbd;background:#f4f8ff}
  @media print{
    body{background:#fff}.toolbar,.hint{display:none!important}.memo-page{margin:0;box-shadow:none;width:auto;min-height:0;padding:8mm 12mm 10mm}.memo-page{page-break-after:always}.memo-page:last-child{page-break-after:auto}@page{size:A4;margin:0}
  }
</style>
</head>
<body>
  <div class="toolbar"><button class="print" onclick="window.print()">PRINT / SAVE AS PDF</button><button class="close" onclick="window.close()">CLOSE</button></div>
  <div class="hint">The memorandum follows the uploaded PNP memo layout. Click any editable field to correct the official unit, addressee, signatory, contact details, or wording before printing.</div>
  ${incidents.map((incident) => memoBodyHtml(incident)).join("\n")}
</body>
</html>`);
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
        <div><h3>Explanation Memorandum Generator</h3><p>PNP memorandum format for delayed and non-complied hourly SITREP entries.</p></div>
        <div class="sitrep-memo-counts"><span class="sitrep-memo-count yellow">${delayedCount} Delayed</span><span class="sitrep-memo-count red">${redCount} Not Complied</span></div>
      </div>
      <div class="sitrep-memo-actions">
        <button type="button" class="primary" data-generate-all-memos ${incidents.length ? "" : "disabled"}>Generate All Memoranda</button>
        <button type="button" data-refresh-memos>Refresh Memo List</button>
      </div>
      <div class="sitrep-memo-list">
        ${incidents.length ? incidents.map((incident, index) => `
          <div class="sitrep-memo-row" data-memo-index="${index}">
            <div><strong>${safe(incident.unit.label)}</strong><small>${safe(incident.shiftLabel)}</small></div>
            <div><strong>${safe(incident.period)}</strong><small>Due ${safe(incident.deadline)}</small></div>
            <div><strong class="sitrep-memo-status ${incident.status === "delayed" ? "yellow" : "red"}">${safe(incident.statusLabel)}</strong><small>${incident.status === "delayed" ? `Recorded: ${safe(formatTime(incident.receivedAt))}` : "No receipt recorded"}</small></div>
            <div><strong>${safe(incident.assignment)}</strong><small>Assigned personnel</small></div>
            <button type="button" data-generate-memo="${index}">Generate Memorandum</button>
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