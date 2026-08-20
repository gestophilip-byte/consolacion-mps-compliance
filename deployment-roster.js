(() => {
  const ROSTER_KEY = "consolacion-mps-deployment-roster-v1";
  let selectedPerson = null;

  function loadRoster() {
    try {
      const parsed = JSON.parse(localStorage.getItem(ROSTER_KEY) || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function saveRoster(roster) {
    localStorage.setItem(ROSTER_KEY, JSON.stringify(roster));
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function injectStyles() {
    if (document.querySelector("#deployment-roster-styles")) return;
    const style = document.createElement("style");
    style.id = "deployment-roster-styles";
    style.textContent = `
      .deployment-roster{background:#fff;border:1px solid #dfe6f0;border-radius:16px;padding:18px;margin:0 0 18px;box-shadow:0 10px 28px rgba(16,42,82,.05)}
      .deployment-roster-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:14px}
      .deployment-roster-head h3{margin:3px 0 5px;color:#071a3d;font-size:17px}
      .deployment-roster-head p{margin:0;color:#6f7d91;font-size:12px;max-width:720px}
      .deployment-roster-actions{display:flex;gap:8px;flex-wrap:wrap}
      .deployment-roster-actions button{border:1px solid #d7e0ed;background:#fff;color:#0b2d63;border-radius:10px;padding:9px 12px;font:700 11px Inter,sans-serif;cursor:pointer}
      .deployment-roster-actions button.primary{background:#0f4cbd;border-color:#0f4cbd;color:#fff}
      .deployment-roster-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}
      .deployment-roster-unit{border:1px solid #e1e8f2;border-radius:12px;padding:12px;background:#f9fbfe}
      .deployment-roster-unit h4{margin:0 0 9px;color:#0b2d63;font-size:12px}
      .deployment-person{width:100%;text-align:left;border:1px solid #dce5f0;background:#fff;border-radius:9px;padding:9px 10px;margin:0 0 7px;cursor:pointer;color:#1d2c43}
      .deployment-person:last-child{margin-bottom:0}
      .deployment-person strong{display:block;font-size:11px;line-height:1.3}
      .deployment-person small{display:block;color:#7b8799;font-size:9.5px;margin-top:3px;line-height:1.3}
      .deployment-person.selected{border-color:#0f4cbd;box-shadow:0 0 0 3px rgba(15,76,189,.11);background:#f4f8ff}
      .deployment-roster-empty{padding:16px;border:1px dashed #cfd9e8;border-radius:11px;color:#728096;font-size:12px;background:#fafcff}
      .deployment-roster-tip{margin:10px 0 0;color:#6f7d91;font-size:11px}
      @media(max-width:1100px){.deployment-roster-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
      @media(max-width:700px){.deployment-roster-head{flex-direction:column}.deployment-roster-grid{grid-template-columns:1fr}.deployment-roster-actions{width:100%}.deployment-roster-actions button{flex:1}}
      @media print{.deployment-roster{display:none!important}}
    `;
    document.head.appendChild(style);
  }

  function normalizeRoster(data) {
    const source = Array.isArray(data) ? data : Array.isArray(data?.personnel) ? data.personnel : [];
    const validUnits = new Set(["MP 218-562", "MP 218-2008", "MP 218-FVP", "TMRU"]);
    return source
      .map((item) => ({
        name: String(item?.name || "").trim(),
        unit: String(item?.unit || "").trim(),
        role: String(item?.role || "").trim(),
      }))
      .filter((item) => item.name && validUnits.has(item.unit));
  }

  function renderRoster(host) {
    const roster = loadRoster();
    const units = ["MP 218-562", "MP 218-2008", "MP 218-FVP", "TMRU"];
    const grid = host.querySelector("#deployment-roster-grid");
    if (!grid) return;

    if (!roster.length) {
      grid.innerHTML = '<div class="deployment-roster-empty" style="grid-column:1/-1">No local personnel roster loaded yet. Use <strong>Import Roster</strong> to load the roster file on this device.</div>';
      return;
    }

    grid.innerHTML = units.map((unit) => {
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

    grid.querySelectorAll(".deployment-person").forEach((button) => {
      button.addEventListener("click", () => {
        grid.querySelectorAll(".deployment-person").forEach((item) => item.classList.remove("selected"));
        button.classList.add("selected");
        const unit = button.dataset.rosterUnit;
        const people = roster.filter((person) => person.unit === unit);
        selectedPerson = people[Number(button.dataset.rosterIndex)] || null;
        const tip = host.querySelector("#deployment-roster-tip");
        if (tip && selectedPerson) tip.textContent = `${selectedPerson.name} selected. Click any 1st Shift or 2nd Shift deployment cell to add the name.`;
      });
    });
  }

  function installCellAssignment(host) {
    document.querySelectorAll("#deployment [data-deploy-key]").forEach((cell) => {
      if (cell.dataset.rosterAssignInstalled) return;
      cell.dataset.rosterAssignInstalled = "true";
      cell.addEventListener("click", () => {
        if (!selectedPerson) return;
        const existing = cell.textContent.trim();
        const line = selectedPerson.role ? `${selectedPerson.name} — ${selectedPerson.role}` : selectedPerson.name;
        if (!existing.includes(selectedPerson.name)) {
          cell.textContent = existing ? `${existing}\n${line}` : line;
          cell.dispatchEvent(new Event("input", { bubbles: true }));
        }
        selectedPerson = null;
        host.querySelectorAll(".deployment-person").forEach((item) => item.classList.remove("selected"));
        const tip = host.querySelector("#deployment-roster-tip");
        if (tip) tip.textContent = "Select another person, then click a deployment shift cell to add the name.";
      });
    });
  }

  function addRosterPanel() {
    const section = document.querySelector("#deployment");
    const weekStrip = section?.querySelector(".deployment-week-strip");
    if (!section || !weekStrip || section.querySelector("#deployment-roster")) return false;
    injectStyles();

    const host = document.createElement("section");
    host.id = "deployment-roster";
    host.className = "deployment-roster";
    host.innerHTML = `
      <div class="deployment-roster-head">
        <div>
          <p class="kicker">Local personnel roster</p>
          <h3>Patrol Personnel</h3>
          <p>Personnel names are stored only on this browser/device. They are not saved in the public GitHub repository.</p>
        </div>
        <div class="deployment-roster-actions">
          <input id="deployment-roster-file" type="file" accept="application/json,.json" hidden />
          <button type="button" class="primary" id="deployment-roster-import">Import Roster</button>
          <button type="button" id="deployment-roster-clear">Clear Roster</button>
        </div>
      </div>
      <div id="deployment-roster-grid" class="deployment-roster-grid"></div>
      <p class="deployment-roster-tip" id="deployment-roster-tip">Select a person, then click a 1st Shift or 2nd Shift deployment cell to add that person.</p>`;

    weekStrip.insertAdjacentElement("afterend", host);
    const input = host.querySelector("#deployment-roster-file");
    host.querySelector("#deployment-roster-import")?.addEventListener("click", () => input?.click());
    input?.addEventListener("change", async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const data = JSON.parse(await file.text());
        const roster = normalizeRoster(data);
        if (!roster.length) throw new Error("No valid personnel records were found in that roster file.");
        saveRoster(roster);
        selectedPerson = null;
        renderRoster(host);
        installCellAssignment(host);
      } catch (error) {
        window.alert(error.message || "Unable to import the personnel roster.");
      } finally {
        input.value = "";
      }
    });

    host.querySelector("#deployment-roster-clear")?.addEventListener("click", () => {
      if (!window.confirm("Clear the personnel roster stored on this device?")) return;
      localStorage.removeItem(ROSTER_KEY);
      selectedPerson = null;
      renderRoster(host);
    });

    renderRoster(host);
    installCellAssignment(host);
    return true;
  }

  function install() {
    if (!addRosterPanel()) {
      window.setTimeout(install, 250);
      return;
    }
  }

  install();
})();
