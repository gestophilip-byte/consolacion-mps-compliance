(() => {
  const STORAGE_KEY = "consolacion-mps-weekly-deployment-v1";
  const ROSTER_KEY = "consolacion-mps-deployment-roster-v1";
  const UNITS = ["MP 218-562", "MP 218-2008", "MP 218-FVP", "TMRU"];
  const SHIFT_ONE = "1st Shift • 8:00 AM – 8:00 PM";
  const SHIFT_TWO = "2nd Shift • 8:00 PM – 8:00 AM";
  let selectedPerson = null;

  function phNow() {
    return new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" }));
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

  function dateLabel(date) {
    return new Intl.DateTimeFormat("en-PH", {
      weekday: "short",
      month: "short",
      day: "numeric",
      timeZone: "Asia/Manila",
    }).format(date);
  }

  function weekLabel(start) {
    const end = addDays(start, 6);
    const fmt = new Intl.DateTimeFormat("en-PH", { month: "long", day: "numeric", year: "numeric" });
    return `${fmt.format(start)} – ${fmt.format(end)}`;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function loadSaved() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); }
    catch { return {}; }
  }

  function saveValue(key, value) {
    const saved = loadSaved();
    saved[key] = value;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
  }

  function loadRoster() {
    try {
      const roster = JSON.parse(localStorage.getItem(ROSTER_KEY) || "[]");
      return Array.isArray(roster) ? roster : [];
    } catch {
      return [];
    }
  }

  function saveRoster(roster) {
    localStorage.setItem(ROSTER_KEY, JSON.stringify(roster));
  }

  function normalizeRoster(data) {
    const source = Array.isArray(data) ? data : Array.isArray(data?.personnel) ? data.personnel : [];
    const validUnits = new Set(UNITS);
    return source
      .map((item) => ({
        name: String(item?.name || "").trim(),
        unit: String(item?.unit || "").trim(),
        role: String(item?.role || "").trim(),
      }))
      .filter((item) => item.name && validUnits.has(item.unit));
  }

  function injectStyles() {
    if (document.querySelector("#deployment-board-styles")) return;
    const style = document.createElement("style");
    style.id = "deployment-board-styles";
    style.textContent = `
      .deployment-board-page{padding-bottom:32px}
      .deployment-head{display:flex;align-items:flex-end;justify-content:space-between;gap:18px;margin-bottom:20px}
      .deployment-head h2{margin:.3rem 0 .45rem;font-family:"Libre Baskerville",serif;color:#071a3d;font-size:clamp(1.8rem,3vw,2.8rem)}
      .deployment-head p{margin:0;color:#68778e}
      .deployment-actions,.deployment-roster-actions{display:flex;gap:8px;flex-wrap:wrap}
      .deployment-actions button,.deployment-roster-actions button{border:1px solid #d7e0ed;background:#fff;color:#0b2d63;border-radius:10px;padding:10px 14px;font:700 12px Inter,sans-serif;cursor:pointer}
      .deployment-actions button.primary,.deployment-roster-actions button.primary{background:#0f4cbd;color:#fff;border-color:#0f4cbd}
      .deployment-week-strip{display:flex;align-items:center;justify-content:space-between;gap:16px;background:#fff;border:1px solid #dfe6f0;border-radius:14px;padding:16px 18px;margin-bottom:16px;box-shadow:0 8px 24px rgba(16,42,82,.05)}
      .deployment-week-strip small{display:block;color:#718099;text-transform:uppercase;font-weight:800;letter-spacing:.09em;font-size:10px;margin-bottom:4px}
      .deployment-week-strip strong{font-size:16px;color:#071a3d}
      .deployment-shifts{display:flex;gap:8px;flex-wrap:wrap}
      .deployment-shifts span{background:#eef4ff;color:#0f4cbd;border-radius:999px;padding:8px 11px;font-size:11px;font-weight:800}
      .deployment-roster{background:#fff;border:1px solid #dfe6f0;border-radius:16px;padding:18px;margin:0 0 18px;box-shadow:0 10px 28px rgba(16,42,82,.05)}
      .deployment-roster-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:14px}
      .deployment-roster-head h3{margin:3px 0 5px;color:#071a3d;font-size:17px}
      .deployment-roster-head p{margin:0;color:#6f7d91;font-size:12px;max-width:720px}
      .deployment-roster-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}
      .deployment-roster-unit{border:1px solid #e1e8f2;border-radius:12px;padding:12px;background:#f9fbfe}
      .deployment-roster-unit h4{margin:0 0 9px;color:#0b2d63;font-size:12px}
      .deployment-person{width:100%;text-align:left;border:1px solid #dce5f0;background:#fff;border-radius:9px;padding:9px 10px;margin:0 0 7px;cursor:pointer;color:#1d2c43}
      .deployment-person:last-child{margin-bottom:0}
      .deployment-person strong{display:block;font-size:11px;line-height:1.3}
      .deployment-person small{display:block;color:#7b8799;font-size:9.5px;margin-top:3px;line-height:1.3}
      .deployment-person.selected{border-color:#0f4cbd;box-shadow:0 0 0 3px rgba(15,76,189,.11);background:#f4f8ff}
      .deployment-roster-empty{padding:14px;border:1px dashed #cfd9e8;border-radius:11px;color:#728096;font-size:12px;background:#fafcff}
      .deployment-roster-tip{margin:10px 0 0;color:#6f7d91;font-size:11px}
      .deployment-unit{background:#fff;border:1px solid #dfe6f0;border-radius:16px;margin-bottom:16px;overflow:hidden;box-shadow:0 10px 28px rgba(16,42,82,.055)}
      .deployment-unit-head{display:flex;align-items:center;justify-content:space-between;background:#0a2757;color:#fff;padding:14px 18px}
      .deployment-unit-head h3{margin:0;font-size:16px}
      .deployment-unit-head span{font-size:11px;color:#c9d8ef}
      .deployment-table-wrap{overflow:auto}
      .deployment-table{width:100%;border-collapse:collapse;min-width:920px}
      .deployment-table th{background:#f5f8fc;color:#64738c;text-transform:uppercase;letter-spacing:.07em;font-size:10px;padding:11px 12px;text-align:left;border-bottom:1px solid #dfe6f0}
      .deployment-table td{padding:10px 12px;border-bottom:1px solid #e8edf5;vertical-align:top}
      .deployment-table tr:last-child td{border-bottom:0}
      .deployment-day{width:155px}
      .deployment-day strong{display:block;color:#071a3d;font-size:13px}
      .deployment-day small{color:#7a879b;font-size:11px}
      .deployment-cell{min-height:58px;border:1px solid #d9e3ef;border-radius:9px;background:#fbfcfe;padding:9px 10px;outline:none;white-space:pre-wrap;font-size:12px;line-height:1.45;color:#1f2d43}
      .deployment-cell:focus{border-color:#0f4cbd;box-shadow:0 0 0 3px rgba(15,76,189,.1);background:#fff}
      .deployment-cell:empty:before{content:"Enter personnel / assignment";color:#a1acbc}
      .deployment-note{margin-top:8px;color:#78869a;font-size:11px}
      @media(max-width:1100px){.deployment-roster-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
      @media(max-width:760px){.deployment-head,.deployment-week-strip,.deployment-roster-head{align-items:flex-start;flex-direction:column}.deployment-actions,.deployment-roster-actions{width:100%}.deployment-actions button,.deployment-roster-actions button{flex:1}.deployment-roster-grid{grid-template-columns:1fr}}
      @media print{.command-sidebar,.command-topbar,.deployment-actions,.deployment-roster,.command-footer{display:none!important}.command-main{margin:0!important}.command-content{padding:0!important}.deployment-unit{break-inside:avoid;box-shadow:none}.deployment-board-page{display:block!important}}
    `;
    document.head.appendChild(style);
  }

  function rosterMarkup() {
    const roster = loadRoster();
    if (!roster.length) {
      return '<div class="deployment-roster-empty" style="grid-column:1/-1">No personnel roster loaded yet. Click <strong>Import Roster</strong> and choose the roster JSON file.</div>';
    }
    return UNITS.map((unit) => {
      const people = roster.filter((person) => person.unit === unit);
      return `
        <div class="deployment-roster-unit">
          <h4>${escapeHtml(unit)} <span style="font-weight:500;color:#8a96a7">(${people.length})</span></h4>
          ${people.length ? people.map((person, index) => `
            <button type="button" class="deployment-person" data-roster-unit="${escapeHtml(unit)}" data-roster-index="${index}">
              <strong>${escapeHtml(person.name)}</strong>
              <small>${escapeHtml(person.role || "Personnel")}</small>
            </button>`).join("") : '<div class="deployment-roster-empty">No personnel assigned to this unit.</div>'}
        </div>`;
    }).join("");
  }

  function bindRoster(section) {
    const grid = section.querySelector("#deployment-roster-grid");
    if (!grid) return;
    grid.innerHTML = rosterMarkup();
    grid.querySelectorAll(".deployment-person").forEach((button) => {
      button.addEventListener("click", () => {
        grid.querySelectorAll(".deployment-person").forEach((item) => item.classList.remove("selected"));
        button.classList.add("selected");
        const roster = loadRoster();
        const people = roster.filter((person) => person.unit === button.dataset.rosterUnit);
        selectedPerson = people[Number(button.dataset.rosterIndex)] || null;
        const tip = section.querySelector("#deployment-roster-tip");
        if (tip && selectedPerson) tip.textContent = `${selectedPerson.name} selected. Click any 1st Shift or 2nd Shift cell to add the name.`;
      });
    });
  }

  function makeBoard() {
    if (document.querySelector("#deployment")) return;
    injectStyles();
    const start = startOfWeek(phNow());
    const saved = loadSaved();
    const section = document.createElement("section");
    section.className = "command-page deployment-board-page";
    section.id = "deployment";
    section.dataset.commandPagePanel = "deployment";
    section.hidden = true;

    const unitsMarkup = UNITS.map((unit) => {
      const rows = Array.from({ length: 7 }, (_, i) => {
        const day = addDays(start, i);
        const dayKey = dateKey(day);
        const key1 = `${dayKey}|${unit}|shift1`;
        const key2 = `${dayKey}|${unit}|shift2`;
        return `
          <tr>
            <td class="deployment-day"><strong>${dateLabel(day)}</strong><small>${dayKey}</small></td>
            <td><div class="deployment-cell" contenteditable="true" data-deploy-key="${key1}">${escapeHtml(saved[key1] || "")}</div></td>
            <td><div class="deployment-cell" contenteditable="true" data-deploy-key="${key2}">${escapeHtml(saved[key2] || "")}</div></td>
          </tr>`;
      }).join("");
      return `
        <article class="deployment-unit">
          <div class="deployment-unit-head"><h3>${unit}</h3><span>7-day deployment</span></div>
          <div class="deployment-table-wrap">
            <table class="deployment-table">
              <thead><tr><th>Date</th><th>${SHIFT_ONE}</th><th>${SHIFT_TWO}</th></tr></thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
        </article>`;
    }).join("");

    section.innerHTML = `
      <div class="deployment-head">
        <div><p class="kicker">Weekly personnel deployment</p><h2>Mobile Patrol & TMRU Deployment</h2><p>One-week deployment board for four operational units and two 12-hour shifts.</p></div>
        <div class="deployment-actions"><button type="button" id="deployment-clear">Clear Week</button><button type="button" class="primary" id="deployment-print">Print Deployment</button></div>
      </div>
      <div class="deployment-week-strip">
        <div><small>Covered week</small><strong>${weekLabel(start)}</strong></div>
        <div class="deployment-shifts"><span>${SHIFT_ONE}</span><span>${SHIFT_TWO}</span></div>
      </div>
      <section class="deployment-roster">
        <div class="deployment-roster-head">
          <div><p class="kicker">Local personnel roster</p><h3>Patrol Personnel</h3><p>For safety and privacy, roster names stay only on this browser/device and are not uploaded to the public GitHub repository.</p></div>
          <div class="deployment-roster-actions">
            <input id="deployment-roster-file" type="file" accept="application/json,.json" hidden />
            <button type="button" class="primary" id="deployment-roster-import">Import Roster</button>
            <button type="button" id="deployment-roster-clear">Clear Roster</button>
          </div>
        </div>
        <div id="deployment-roster-grid" class="deployment-roster-grid"></div>
        <p class="deployment-roster-tip" id="deployment-roster-tip">Select a person, then click a 1st Shift or 2nd Shift cell to add that person.</p>
      </section>
      ${unitsMarkup}
      <p class="deployment-note">Deployment and roster entries save automatically on this browser/device. No personnel data is uploaded to the public GitHub repository.</p>`;

    document.querySelector(".command-content")?.appendChild(section);
    bindRoster(section);

    section.querySelectorAll("[data-deploy-key]").forEach((cell) => {
      cell.addEventListener("input", () => saveValue(cell.dataset.deployKey, cell.textContent.trim()));
      cell.addEventListener("click", () => {
        if (!selectedPerson) return;
        const existing = cell.textContent.trim();
        const line = selectedPerson.role ? `${selectedPerson.name} — ${selectedPerson.role}` : selectedPerson.name;
        if (!existing.includes(selectedPerson.name)) {
          cell.textContent = existing ? `${existing}\n${line}` : line;
          saveValue(cell.dataset.deployKey, cell.textContent.trim());
        }
        selectedPerson = null;
        section.querySelectorAll(".deployment-person").forEach((item) => item.classList.remove("selected"));
        const tip = section.querySelector("#deployment-roster-tip");
        if (tip) tip.textContent = "Select another person, then click a deployment shift cell to add that person.";
      });
    });

    const fileInput = section.querySelector("#deployment-roster-file");
    section.querySelector("#deployment-roster-import")?.addEventListener("click", () => fileInput?.click());
    fileInput?.addEventListener("change", async () => {
      const file = fileInput.files?.[0];
      if (!file) return;
      try {
        const data = JSON.parse(await file.text());
        const roster = normalizeRoster(data);
        if (!roster.length) throw new Error("No valid personnel records were found in that roster file.");
        saveRoster(roster);
        selectedPerson = null;
        bindRoster(section);
      } catch (error) {
        window.alert(error.message || "Unable to import the personnel roster.");
      } finally {
        fileInput.value = "";
      }
    });

    section.querySelector("#deployment-roster-clear")?.addEventListener("click", () => {
      if (!window.confirm("Clear the personnel roster stored on this device?")) return;
      localStorage.removeItem(ROSTER_KEY);
      selectedPerson = null;
      bindRoster(section);
    });

    section.querySelector("#deployment-print")?.addEventListener("click", () => window.print());
    section.querySelector("#deployment-clear")?.addEventListener("click", () => {
      if (!window.confirm("Clear all deployment entries for this week on this device?")) return;
      const current = loadSaved();
      Object.keys(current).forEach((key) => {
        const keyDate = key.split("|")[0];
        const d = new Date(`${keyDate}T00:00:00`);
        if (d >= start && d <= addDays(start, 6)) delete current[key];
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
      section.querySelectorAll("[data-deploy-key]").forEach((cell) => { cell.textContent = ""; });
    });
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
      document.querySelectorAll("[data-command-page-panel]").forEach((panel) => {
        panel.hidden = panel.dataset.commandPagePanel !== "deployment";
      });
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
    makeBoard();
    addNav();
  }

  install();
})();
