(() => {
  const DEPLOYMENT_KEY = "consolacion-mps-weekly-deployment-v2";
  const ROSTER_KEY = "consolacion-mps-local-roster-v2";
  const START_KEY = "consolacion-mps-deployment-start-v2";
  const UNITS = ["MP 218-562", "MP 218-2008", "MP 218-FVP", "TMRU"];
  const SHIFT_ONE = "1st Shift";
  const SHIFT_TWO = "2nd Shift";
  const SHIFT_ONE_TIME = "8:00 AM – 8:00 PM";
  const SHIFT_TWO_TIME = "8:00 PM – 8:00 AM";

  let activeUnit = UNITS[0];
  let selectedPerson = null;
  let section = null;

  function phDate() {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Manila",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date());
    const p = Object.fromEntries(parts.map((x) => [x.type, x.value]));
    return new Date(`${p.year}-${p.month}-${p.day}T00:00:00`);
  }

  function startOfWeek(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  function addDays(date, days) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
  }

  function dateKey(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  function parseDateKey(value) {
    const [y, m, d] = String(value || "").split("-").map(Number);
    if (!y || !m || !d) return null;
    const out = new Date(y, m - 1, d);
    out.setHours(0, 0, 0, 0);
    return out;
  }

  function configuredStart() {
    return parseDateKey(localStorage.getItem(START_KEY)) || startOfWeek(phDate());
  }

  function setConfiguredStart(date) {
    localStorage.setItem(START_KEY, dateKey(date));
  }

  function dayLabel(date) {
    return new Intl.DateTimeFormat("en-PH", { weekday: "short", month: "short", day: "numeric" }).format(date);
  }

  function weekLabel(start) {
    const end = addDays(start, 6);
    const a = new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric" }).format(start);
    const b = new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric", year: "numeric" }).format(end);
    return `${a} – ${b}`;
  }

  function safe(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function loadAssignments() {
    try { return JSON.parse(localStorage.getItem(DEPLOYMENT_KEY) || "{}"); }
    catch { return {}; }
  }

  function saveAssignment(key, value) {
    const saved = loadAssignments();
    saved[key] = value;
    localStorage.setItem(DEPLOYMENT_KEY, JSON.stringify(saved));
  }

  function loadRoster() {
    try {
      const value = JSON.parse(localStorage.getItem(ROSTER_KEY) || "[]");
      return Array.isArray(value) ? value : [];
    } catch {
      return [];
    }
  }

  function saveRoster(list) {
    localStorage.setItem(ROSTER_KEY, JSON.stringify(list));
  }

  function normalizeRoster(data) {
    const source = Array.isArray(data) ? data : Array.isArray(data?.personnel) ? data.personnel : [];
    return source.map((person) => ({
      name: String(person.name || "").trim(),
      unit: String(person.unit || "").trim(),
      role: String(person.role || "").trim(),
      number: String(person.number || person.phone || "").trim(),
    })).filter((person) => person.name && UNITS.includes(person.unit));
  }

  function personLine(person) {
    return [person.name, person.role, person.number].filter(Boolean).join(" • ");
  }

  function injectStyles() {
    if (document.querySelector("#deployment-board-styles")) return;
    const style = document.createElement("style");
    style.id = "deployment-board-styles";
    style.textContent = `
      .deployment-board-page{padding-bottom:24px}
      .deploy-top{display:flex;justify-content:space-between;gap:12px;align-items:flex-end;margin-bottom:10px}
      .deploy-top h2{margin:2px 0 3px;font-family:"Libre Baskerville",serif;color:#071a3d;font-size:clamp(1.45rem,2.4vw,2.2rem)}
      .deploy-top p{margin:0;color:#6c7a90;font-size:11px}
      .deploy-actions{display:flex;gap:5px;flex-wrap:wrap}
      .deploy-btn{border:1px solid #d5deeb;background:#fff;color:#0b2d63;border-radius:8px;padding:7px 9px;font:700 10px Inter,sans-serif;cursor:pointer}
      .deploy-btn.primary{background:#0f4cbd;border-color:#0f4cbd;color:#fff}
      .deploy-controlbar{display:grid;grid-template-columns:auto minmax(150px,1fr) auto auto auto;gap:6px;align-items:center;background:#fff;border:1px solid #dfe6f0;border-radius:11px;padding:8px 10px;margin-bottom:8px}
      .deploy-controlbar label{font-size:9px;color:#718099;font-weight:800;text-transform:uppercase;letter-spacing:.06em}
      .deploy-controlbar input[type=date]{width:100%;border:1px solid #d7e0ec;border-radius:7px;padding:6px 8px;font:600 11px Inter,sans-serif;color:#15223a;background:#fbfcfe}
      .deploy-week-label{font-size:11px;font-weight:800;color:#071a3d;white-space:nowrap}
      .unit-tabs{display:flex;gap:5px;overflow:auto;padding:1px 0 7px;scrollbar-width:thin}
      .unit-tab{flex:0 0 auto;border:1px solid #d7e1ee;background:#fff;color:#18345f;padding:7px 10px;border-radius:999px;font:800 10px Inter,sans-serif;cursor:pointer}
      .unit-tab.active{background:#0a2757;color:#fff;border-color:#0a2757}
      .roster-panel{background:#fff;border:1px solid #dfe6f0;border-radius:11px;padding:8px 10px;margin-bottom:8px}
      .roster-head{display:flex;justify-content:space-between;gap:8px;align-items:center;margin-bottom:5px}
      .roster-head strong{font-size:11px;color:#071a3d}.roster-head span{font-size:9px;color:#7a8799}
      .roster-chips{display:flex;gap:5px;overflow:auto;padding-bottom:1px}
      .roster-chip{flex:0 0 auto;border:1px solid #d9e2ee;background:#f8faff;border-radius:8px;padding:6px 8px;cursor:pointer;max-width:240px;text-align:left}
      .roster-chip strong{display:block;font-size:10px;color:#132b51;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .roster-chip small{display:block;font-size:8.5px;color:#6f7d91;margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .roster-chip.selected{border-color:#0f4cbd;background:#edf4ff;box-shadow:0 0 0 2px rgba(15,76,189,.08)}
      .roster-empty{font-size:10px;color:#7d899b;padding:4px 0}
      .deploy-card{background:#fff;border:1px solid #dfe6f0;border-radius:12px;overflow:hidden;box-shadow:0 6px 18px rgba(16,42,82,.045)}
      .deploy-card-head{display:flex;justify-content:space-between;align-items:center;background:#0a2757;color:#fff;padding:8px 10px}
      .deploy-card-head strong{font-size:12px}.deploy-card-head span{font-size:8px;color:#c9d7ec}
      .deploy-table{width:100%;border-collapse:collapse;table-layout:fixed}
      .deploy-table th{background:#f5f8fc;color:#687791;font-size:8px;text-transform:uppercase;letter-spacing:.05em;text-align:left;padding:6px 7px;border-bottom:1px solid #dfe6f0}
      .deploy-table th:first-child{width:105px}
      .deploy-table td{padding:5px 6px;border-bottom:1px solid #e8edf4;vertical-align:top}
      .deploy-table tr:last-child td{border-bottom:0}
      .deploy-day strong{display:block;color:#0b2348;font-size:10px}.deploy-day small{font-size:8px;color:#8390a3}
      .deploy-cell{min-height:36px;border:1px solid #d9e2ee;border-radius:7px;background:#fbfcfe;padding:5px 6px;font-size:9px;line-height:1.3;color:#1e2d43;white-space:pre-wrap;outline:none;cursor:text}
      .deploy-cell:focus{background:#fff;border-color:#0f4cbd;box-shadow:0 0 0 2px rgba(15,76,189,.1)}
      .deploy-cell:empty:before{content:"Tap to assign";color:#a4afbe}
      .shift-label{display:block;font-weight:800;color:#173861;font-size:8px;margin-bottom:1px}.shift-time{font-size:7.5px;color:#7c899d}
      .deploy-tip{margin:7px 2px 0;color:#7a8799;font-size:9px}
      .deploy-file{display:none}
      @media(max-width:760px){
        .deploy-top{align-items:flex-start;flex-direction:column}.deploy-actions{width:100%}.deploy-btn{flex:1}
        .deploy-controlbar{grid-template-columns:1fr 1fr}.deploy-controlbar label,.deploy-week-label{grid-column:1/-1}.deploy-week-label{white-space:normal}
        .deploy-table,.deploy-table tbody,.deploy-table tr,.deploy-table td{display:block;width:100%}.deploy-table thead{display:none}
        .deploy-table tr{padding:6px;border-bottom:1px solid #e4eaf2}.deploy-table tr:last-child{border-bottom:0}.deploy-table td{border:0;padding:2px 0}
        .deploy-day{display:flex!important;align-items:baseline;justify-content:space-between;gap:8px;margin-bottom:1px}.deploy-day strong{font-size:11px}
        .deploy-cell{min-height:34px;font-size:9px}.roster-chip{max-width:205px}
      }
      @media(max-width:430px){.deploy-controlbar{grid-template-columns:1fr}.deploy-top h2{font-size:1.35rem}.deployment-board-page{padding-left:0;padding-right:0}}
      @media print{.command-sidebar,.command-topbar,.command-footer,.deploy-actions,.deploy-controlbar,.unit-tabs,.roster-panel,.deploy-tip{display:none!important}.command-main{margin:0!important}.command-content{padding:0!important}.deploy-card{box-shadow:none}.deployment-board-page{display:block!important}.deploy-table{table-layout:auto}.deploy-cell{border:0;min-height:auto}}
    `;
    document.head.appendChild(style);
  }

  function assignmentKey(day, unit, shift) {
    return `${dateKey(day)}|${unit}|${shift}`;
  }

  function rosterMarkup() {
    const roster = loadRoster().filter((person) => person.unit === activeUnit);
    if (!roster.length) return '<div class="roster-empty">No local roster loaded. Use <strong>Import Roster</strong>.</div>';
    return roster.map((person, index) => `
      <button class="roster-chip" type="button" data-person-index="${index}">
        <strong>${safe(person.name)}</strong>
        <small>${safe(person.role || "Personnel")}${person.number ? ` • ${safe(person.number)}` : ""}</small>
      </button>`).join("");
  }

  function boardMarkup(start) {
    const saved = loadAssignments();
    const rows = Array.from({ length: 7 }, (_, i) => {
      const day = addDays(start, i);
      const key1 = assignmentKey(day, activeUnit, "shift1");
      const key2 = assignmentKey(day, activeUnit, "shift2");
      return `
        <tr>
          <td class="deploy-day"><strong>${safe(dayLabel(day))}</strong><small>${safe(dateKey(day))}</small></td>
          <td><span class="shift-label">${SHIFT_ONE}</span><span class="shift-time">${SHIFT_ONE_TIME}</span><div class="deploy-cell" contenteditable="true" data-deploy-key="${safe(key1)}">${safe(saved[key1] || "")}</div></td>
          <td><span class="shift-label">${SHIFT_TWO}</span><span class="shift-time">${SHIFT_TWO_TIME}</span><div class="deploy-cell" contenteditable="true" data-deploy-key="${safe(key2)}">${safe(saved[key2] || "")}</div></td>
        </tr>`;
    }).join("");
    return `
      <div class="deploy-card">
        <div class="deploy-card-head"><strong>${safe(activeUnit)}</strong><span>7 DAYS • 2 SHIFTS</span></div>
        <table class="deploy-table">
          <thead><tr><th>Date</th><th>${SHIFT_ONE} • ${SHIFT_ONE_TIME}</th><th>${SHIFT_TWO} • ${SHIFT_TWO_TIME}</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  }

  function renderBoard() {
    if (!section) return;
    const start = configuredStart();
    section.querySelector("#deploy-start-date").value = dateKey(start);
    section.querySelector("#deploy-week-label").textContent = weekLabel(start);
    section.querySelector("#deploy-active-unit").textContent = activeUnit;
    section.querySelectorAll(".unit-tab").forEach((button) => button.classList.toggle("active", button.dataset.unit === activeUnit));
    section.querySelector("#deploy-roster-chips").innerHTML = rosterMarkup();
    section.querySelector("#deploy-board-host").innerHTML = boardMarkup(start);
    bindDynamicEvents();
  }

  function bindDynamicEvents() {
    const rosterForUnit = loadRoster().filter((person) => person.unit === activeUnit);
    section.querySelectorAll("[data-person-index]").forEach((button) => {
      button.addEventListener("click", () => {
        selectedPerson = rosterForUnit[Number(button.dataset.personIndex)] || null;
        section.querySelectorAll(".roster-chip").forEach((chip) => chip.classList.toggle("selected", chip === button));
      });
    });

    section.querySelectorAll("[data-deploy-key]").forEach((cell) => {
      cell.addEventListener("input", () => saveAssignment(cell.dataset.deployKey, cell.textContent.trim()));
      cell.addEventListener("click", () => {
        if (!selectedPerson) return;
        const line = personLine(selectedPerson);
        const current = cell.textContent.trim();
        if (!current.includes(selectedPerson.name)) {
          cell.textContent = current ? `${current}\n${line}` : line;
          saveAssignment(cell.dataset.deployKey, cell.textContent.trim());
        }
        selectedPerson = null;
        section.querySelectorAll(".roster-chip").forEach((chip) => chip.classList.remove("selected"));
      });
    });
  }

  async function importRoster(file) {
    try {
      const roster = normalizeRoster(JSON.parse(await file.text()));
      if (!roster.length) throw new Error("No valid personnel found in that roster file.");
      saveRoster(roster);
      selectedPerson = null;
      renderBoard();
      window.alert(`${roster.length} personnel loaded on this device.`);
    } catch (error) {
      window.alert(error.message || "Unable to import the roster file.");
    }
  }

  function clearWeek() {
    const start = configuredStart();
    if (!window.confirm(`Clear all deployment entries for ${weekLabel(start)} on this device?`)) return;
    const end = addDays(start, 6);
    const current = loadAssignments();
    Object.keys(current).forEach((key) => {
      const d = parseDateKey(key.split("|")[0]);
      if (d && d >= start && d <= end) delete current[key];
    });
    localStorage.setItem(DEPLOYMENT_KEY, JSON.stringify(current));
    renderBoard();
  }

  function makePage() {
    if (document.querySelector("#deployment")) return;
    injectStyles();
    section = document.createElement("section");
    section.className = "command-page deployment-board-page";
    section.id = "deployment";
    section.dataset.commandPagePanel = "deployment";
    section.hidden = true;
    section.innerHTML = `
      <div class="deploy-top">
        <div><p class="kicker">Weekly personnel deployment</p><h2>Mobile Patrol & TMRU Deployment</h2><p>Compact 7-day deployment board with configurable dates and two 12-hour shifts.</p></div>
        <div class="deploy-actions">
          <button class="deploy-btn" type="button" id="deploy-import">Import Roster</button>
          <button class="deploy-btn" type="button" id="deploy-clear">Clear Week</button>
          <button class="deploy-btn primary" type="button" id="deploy-print">Print</button>
          <input class="deploy-file" type="file" id="deploy-file" accept="application/json,.json">
        </div>
      </div>
      <div class="deploy-controlbar">
        <label for="deploy-start-date">Start date</label>
        <input id="deploy-start-date" type="date">
        <button class="deploy-btn" id="deploy-prev" type="button">← 7 Days</button>
        <button class="deploy-btn" id="deploy-next" type="button">7 Days →</button>
        <button class="deploy-btn" id="deploy-this-week" type="button">This Week</button>
        <strong class="deploy-week-label" id="deploy-week-label"></strong>
      </div>
      <div class="unit-tabs" id="deploy-unit-tabs">
        ${UNITS.map((unit) => `<button class="unit-tab" type="button" data-unit="${safe(unit)}">${safe(unit)}</button>`).join("")}
      </div>
      <div class="roster-panel">
        <div class="roster-head"><strong>Personnel • <span id="deploy-active-unit">${safe(activeUnit)}</span></strong><span>Tap person → tap shift</span></div>
        <div class="roster-chips" id="deploy-roster-chips"></div>
      </div>
      <div id="deploy-board-host"></div>
      <p class="deploy-tip">Names, contact numbers, and deployment entries stay on this browser/device and are not published in the public GitHub repository.</p>`;

    document.querySelector(".command-content")?.appendChild(section);

    section.querySelectorAll("[data-unit]").forEach((button) => button.addEventListener("click", () => {
      activeUnit = button.dataset.unit;
      selectedPerson = null;
      renderBoard();
    }));
    section.querySelector("#deploy-start-date")?.addEventListener("change", (event) => {
      const date = parseDateKey(event.target.value);
      if (date) { setConfiguredStart(date); renderBoard(); }
    });
    section.querySelector("#deploy-prev")?.addEventListener("click", () => { setConfiguredStart(addDays(configuredStart(), -7)); renderBoard(); });
    section.querySelector("#deploy-next")?.addEventListener("click", () => { setConfiguredStart(addDays(configuredStart(), 7)); renderBoard(); });
    section.querySelector("#deploy-this-week")?.addEventListener("click", () => { setConfiguredStart(startOfWeek(phDate())); renderBoard(); });
    section.querySelector("#deploy-import")?.addEventListener("click", () => section.querySelector("#deploy-file")?.click());
    section.querySelector("#deploy-file")?.addEventListener("change", (event) => {
      const file = event.target.files?.[0];
      if (file) importRoster(file);
      event.target.value = "";
    });
    section.querySelector("#deploy-clear")?.addEventListener("click", clearWeek);
    section.querySelector("#deploy-print")?.addEventListener("click", () => window.print());
    renderBoard();
  }

  function addNav() {
    const nav = document.querySelector("#main-navigation");
    if (!nav || nav.querySelector('[data-deployment-nav="true"]')) return;
    const calendarLink = nav.querySelector('[data-command-page="calendar"]');
    const link = document.createElement("a");
    link.href = "#deployment";
    link.dataset.deploymentNav = "true";
    link.innerHTML = '<span class="nav-icon">D</span><span>Deployment</span>';
    calendarLink?.insertAdjacentElement("afterend", link);

    link.addEventListener("click", (event) => {
      event.preventDefault();
      document.querySelectorAll("[data-command-page-panel]").forEach((panel) => { panel.hidden = panel.dataset.commandPagePanel !== "deployment"; });
      document.querySelectorAll(".command-nav a").forEach((item) => item.classList.remove("active"));
      link.classList.add("active");
      const title = document.querySelector("#command-page-title");
      if (title) title.textContent = "Weekly Deployment";
      history.replaceState(null, "", "#deployment");
      document.querySelector("#command-sidebar")?.classList.remove("open");
      const scrim = document.querySelector("#sidebar-scrim");
      if (scrim) scrim.hidden = true;
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
    if (window.location.hash === "#deployment") link.click();
  }

  function install() {
    if (!document.querySelector(".command-content") || !document.querySelector("#main-navigation")) {
      setTimeout(install, 200);
      return;
    }
    makePage();
    addNav();
  }

  install();
})();
