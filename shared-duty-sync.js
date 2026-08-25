(() => {
  const API_URL = "https://script.google.com/macros/s/AKfycbx1renj1Buk7UmPDc4_Hd47ji4ieBBkoKz72PfwOkmELG5uJHztbpnBiifBWRxsA0fH/exec";
  const DEPLOYMENT_KEY = "consolacion-mps-weekly-deployment-v2";
  const SITREP_PREFIX = "consolacion-mps-sitrep-v1:";
  const DELAY_PREFIX = "consolacion-mps-sitrep-delay-v1:";
  const PIN_KEY = "consolacion-mps-shared-sync-pin-session";
  const DEVICE_KEY = "consolacion-mps-shared-device-id";
  const UNITS = [
    ["mobile-562", "MP 218-562"],
    ["mobile-2008", "MP 218-2008"],
    ["fvp", "MP 218-FVP"],
  ];
  let pin = sessionStorage.getItem(PIN_KEY) || "";
  let busy = false;
  let connected = false;
  let lastLocalSignature = "";
  let lastRemoteAt = 0;

  function deviceId() {
    let value = localStorage.getItem(DEVICE_KEY);
    if (!value) {
      value = `device-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      localStorage.setItem(DEVICE_KEY, value);
    }
    return value;
  }

  function selectedDate() {
    return document.querySelector("#sitrep-duty-date")?.value || phDutyDate();
  }

  function phDutyDate() {
    const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23",
    }).formatToParts(new Date()).map((p) => [p.type, p.value]));
    const today = `${parts.year}-${parts.month}-${parts.day}`;
    if (Number(parts.hour) >= 8) return today;
    const d = new Date(`${today}T12:00:00+08:00`); d.setUTCDate(d.getUTCDate() - 1);
    return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
  }

  function parseJson(value, fallback) {
    try { const out = JSON.parse(value || ""); return out ?? fallback; } catch { return fallback; }
  }

  function checkId(shift, slot, unitId) {
    return `shift-${shift}-${String(slot).padStart(2, "0")}-${unitId}`;
  }

  function period(shift, slot) {
    const start = (shift === 1 ? 8 : 20) + slot - 1;
    const label = (hour) => { const h = ((hour % 24) + 24) % 24; return `${h % 12 || 12}:00 ${h >= 12 ? "PM" : "AM"}`; };
    return `${label(start)}–${label(start + 1)}`;
  }

  function dueIso(dateKey, shift, slot) {
    const dutyStart = new Date(`${dateKey}T08:00:00+08:00`).getTime();
    const start = (shift === 1 ? 8 : 20) + slot - 1;
    return new Date(dutyStart + (start + 1 - 8) * 3600000).toISOString();
  }

  function deploymentRecords(dateKey) {
    const saved = parseJson(localStorage.getItem(DEPLOYMENT_KEY), {});
    const rows = [];
    ["MP 218-562", "MP 218-2008", "MP 218-FVP", "TMRU"].forEach((unit) => {
      ["shift1", "shift2"].forEach((shift) => {
        rows.push({
          record_id: `DEP|${dateKey}|${unit}|${shift}`,
          duty_date: dateKey,
          unit,
          shift,
          assignment: String(saved[`${dateKey}|${unit}|${shift}`] || ""),
          updated_at: new Date().toISOString(),
          updated_by: "Duty & SITREP Dashboard",
          device_id: deviceId(),
          active: true,
        });
      });
    });
    return rows;
  }

  function sitrepRecords(dateKey) {
    const record = parseJson(localStorage.getItem(`${SITREP_PREFIX}${dateKey}`), {});
    const checks = record.checks && typeof record.checks === "object" ? record.checks : {};
    const delayed = parseJson(localStorage.getItem(`${DELAY_PREFIX}${dateKey}`), {});
    const rows = [];
    [1, 2].forEach((shift) => {
      for (let slot = 1; slot <= 12; slot += 1) {
        UNITS.forEach(([unitId, unit]) => {
          const id = checkId(shift, slot, unitId);
          const received = Boolean(checks[id]);
          const delay = delayed[id];
          const receivedAt = delay && typeof delay === "object" ? delay.receivedAt : (typeof delay === "string" ? delay : "");
          const due = dueIso(dateKey, shift, slot);
          const minutesLate = receivedAt ? Math.max(0, Math.round((new Date(receivedAt).getTime() - new Date(due).getTime()) / 60000)) : "";
          rows.push({
            record_id: `SIT|${dateKey}|${id}`,
            duty_date: dateKey,
            shift: shift === 1 ? "shift1" : "shift2",
            slot_number: slot,
            patrol_period: period(shift, slot),
            due_time: due,
            unit,
            status: received ? (delay ? "DELAYED" : "COMPLIED") : "NOT_COMPLIED",
            received_at: received ? (receivedAt || record.updatedAt || "") : "",
            minutes_late: delay ? minutesLate : "",
            assignment: "",
            updated_at: new Date().toISOString(),
            updated_by: "Duty & SITREP Dashboard",
            device_id: deviceId(),
            source: "WEB_DASHBOARD",
          });
        });
      }
    });
    return rows;
  }

  function localSignature(dateKey) {
    return JSON.stringify({
      deployment: deploymentRecords(dateKey).map((r) => [r.record_id, r.assignment]),
      sitrep: sitrepRecords(dateKey).map((r) => [r.record_id, r.status, r.received_at]),
    });
  }

  async function post(payload) {
    const body = new URLSearchParams({ payload: JSON.stringify({ ...payload, pin }) });
    const response = await fetch(API_URL, { method: "POST", body, redirect: "follow" });
    const data = await response.json();
    if (!data.ok) throw new Error(data.error || "Shared database request failed.");
    return data;
  }

  async function snapshot(dateKey) {
    const url = `${API_URL}?action=snapshot&duty_date=${encodeURIComponent(dateKey)}&pin=${encodeURIComponent(pin)}`;
    const response = await fetch(url, { cache: "no-store", redirect: "follow" });
    const data = await response.json();
    if (!data.ok) throw new Error(data.error || "Unable to read shared database.");
    return data;
  }

  function applySnapshot(dateKey, data) {
    const deployments = parseJson(localStorage.getItem(DEPLOYMENT_KEY), {});
    (data.deployment || []).forEach((row) => {
      deployments[`${dateKey}|${row.unit}|${row.shift}`] = String(row.assignment || "");
    });
    localStorage.setItem(DEPLOYMENT_KEY, JSON.stringify(deployments));

    const checks = {};
    const delayed = {};
    (data.sitrep || []).forEach((row) => {
      const match = String(row.record_id || "").match(/\|(shift-[12]-\d{2}-(?:mobile-562|mobile-2008|fvp))$/);
      if (!match) return;
      const id = match[1];
      if (row.status === "COMPLIED" || row.status === "DELAYED") checks[id] = true;
      if (row.status === "DELAYED") delayed[id] = { receivedAt: row.received_at || new Date().toISOString(), shared: true };
    });
    localStorage.setItem(`${SITREP_PREFIX}${dateKey}`, JSON.stringify({ version: 2, dutyDate: dateKey, checks, updatedAt: new Date().toISOString() }));
    localStorage.setItem(`${DELAY_PREFIX}${dateKey}`, JSON.stringify(delayed));
    window.dispatchEvent(new StorageEvent("storage", { key: `${SITREP_PREFIX}${dateKey}` }));
    window.dispatchEvent(new StorageEvent("storage", { key: `${DELAY_PREFIX}${dateKey}` }));
    window.dispatchEvent(new CustomEvent("consolacion-shared-sync-applied", { detail: { dateKey } }));
  }

  async function pushDate(dateKey) {
    await post({
      action: "syncDutyDate",
      duty_date: dateKey,
      deployment: deploymentRecords(dateKey),
      sitrep: sitrepRecords(dateKey),
      incidents: [],
      updated_by: "Duty & SITREP Dashboard",
      device_id: deviceId(),
    });
  }

  function remoteHasData(data) {
    return Boolean((data.deployment || []).length || (data.sitrep || []).length);
  }

  async function connect() {
    const entered = window.prompt("Enter the Consolacion MPS station PIN to connect this computer to the shared Duty & SITREP database:", pin ? "••••••" : "");
    if (entered === null) return;
    if (entered === "••••••" && pin) {} else pin = String(entered).trim();
    if (!pin) return setStatus("red", "PIN required");
    sessionStorage.setItem(PIN_KEY, pin);
    setStatus("yellow", "Connecting…");
    try {
      const dateKey = selectedDate();
      const data = await snapshot(dateKey);
      connected = true;
      if (remoteHasData(data)) applySnapshot(dateKey, data);
      else await pushDate(dateKey);
      lastLocalSignature = localSignature(dateKey);
      lastRemoteAt = Date.now();
      setStatus("green", "Google Sync Online");
    } catch (error) {
      connected = false;
      sessionStorage.removeItem(PIN_KEY);
      setStatus("red", error.message === "UNAUTHORIZED" ? "Wrong PIN" : "Sync Offline");
    }
  }

  async function syncNow(forcePush = false) {
    if (!pin || busy) return;
    busy = true;
    const dateKey = selectedDate();
    try {
      if (!connected) {
        const data = await snapshot(dateKey);
        connected = true;
        if (remoteHasData(data)) applySnapshot(dateKey, data);
        else await pushDate(dateKey);
      } else {
        const signature = localSignature(dateKey);
        if (forcePush || (lastLocalSignature && signature !== lastLocalSignature)) {
          await pushDate(dateKey);
        } else if (Date.now() - lastRemoteAt > 12000) {
          const data = await snapshot(dateKey);
          applySnapshot(dateKey, data);
          lastRemoteAt = Date.now();
        }
      }
      lastLocalSignature = localSignature(dateKey);
      setStatus("green", "Google Sync Online");
    } catch (error) {
      connected = false;
      setStatus("red", "Sync Offline");
    } finally { busy = false; }
  }

  function historyDates() {
    const dates = new Set();
    const deployments = parseJson(localStorage.getItem(DEPLOYMENT_KEY), {});
    Object.keys(deployments).forEach((key) => { const date = key.split("|")[0]; if (/^\d{4}-\d{2}-\d{2}$/.test(date)) dates.add(date); });
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i) || "";
      if (key.startsWith(SITREP_PREFIX)) dates.add(key.slice(SITREP_PREFIX.length));
      if (key.startsWith(DELAY_PREFIX)) dates.add(key.slice(DELAY_PREFIX.length));
    }
    return [...dates].filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort();
  }

  async function migrateHistory() {
    if (!pin) return connect();
    const dates = historyDates();
    if (!dates.length) return window.alert("No local Duty/SITREP history was found on this computer.");
    if (!window.confirm(`Upload ${dates.length} duty date(s) from this computer to the shared Google database? Existing matching records will be updated.`)) return;
    busy = true;
    setStatus("yellow", `Migrating 0 / ${dates.length}`);
    try {
      for (let i = 0; i < dates.length; i += 1) {
        await pushDate(dates[i]);
        setStatus("yellow", `Migrating ${i + 1} / ${dates.length}`);
      }
      connected = true;
      lastLocalSignature = localSignature(selectedDate());
      setStatus("green", "History migrated");
      window.alert(`${dates.length} duty date(s) were uploaded to the shared database.`);
    } catch (error) {
      setStatus("red", "Migration failed");
      window.alert(`Migration stopped: ${error.message}`);
    } finally { busy = false; }
  }

  function setStatus(color, text) {
    const badge = document.querySelector("#shared-sync-status");
    if (!badge) return;
    badge.dataset.state = color;
    badge.textContent = `${color === "green" ? "●" : color === "yellow" ? "●" : "●"} ${text}`;
  }

  function injectUI() {
    if (document.querySelector("#shared-duty-sync-panel")) return;
    const toolbar = document.querySelector(".sitrep-date-toolbar");
    if (!toolbar) return;
    const style = document.createElement("style");
    style.textContent = `#shared-duty-sync-panel{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:0 0 12px;padding:9px 12px;border:1px solid #dfe6f0;border-radius:10px;background:#fff;font:700 10px Inter,sans-serif}.shared-sync-actions{display:flex;gap:6px;flex-wrap:wrap}.shared-sync-btn{border:1px solid #d7e0ec;background:#fff;color:#173861;border-radius:8px;padding:7px 9px;font:800 9px Inter,sans-serif;cursor:pointer}#shared-sync-status[data-state=green]{color:#15803d}#shared-sync-status[data-state=yellow]{color:#9a6b00}#shared-sync-status[data-state=red]{color:#c62828}@media(max-width:650px){#shared-duty-sync-panel{align-items:flex-start;flex-direction:column}.shared-sync-actions{width:100%}.shared-sync-btn{flex:1}}`;
    document.head.appendChild(style);
    const panel = document.createElement("div");
    panel.id = "shared-duty-sync-panel";
    panel.innerHTML = `<span id="shared-sync-status" data-state="${pin ? "yellow" : "red"}">● ${pin ? "Ready to sync" : "Shared sync not connected"}</span><div class="shared-sync-actions"><button class="shared-sync-btn" id="shared-sync-connect" type="button">${pin ? "Reconnect" : "Connect Google Sync"}</button><button class="shared-sync-btn" id="shared-sync-now" type="button">Sync Now</button><button class="shared-sync-btn" id="shared-sync-migrate" type="button">Migrate This Device History</button></div>`;
    toolbar.insertAdjacentElement("afterend", panel);
    panel.querySelector("#shared-sync-connect").addEventListener("click", connect);
    panel.querySelector("#shared-sync-now").addEventListener("click", () => syncNow(true));
    panel.querySelector("#shared-sync-migrate").addEventListener("click", migrateHistory);
  }

  function install() {
    injectUI();
    document.querySelector("#sitrep-duty-date")?.addEventListener("change", () => { lastLocalSignature = ""; lastRemoteAt = 0; setTimeout(() => syncNow(false), 250); });
    window.addEventListener("consolacion-deployment-changed", () => setTimeout(() => syncNow(true), 150));
    window.setInterval(() => syncNow(false), 5000);
    if (pin) syncNow(false);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install);
  else install();
})();