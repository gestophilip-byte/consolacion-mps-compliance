(() => {
  const API_URL = "https://script.google.com/macros/s/AKfycbx1renj1Buk7UmPDc4_Hd47ji4ieBBkoKz72PfwOkmELG5uJHztbpnBiifBWRxsA0fH/exec";
  const DEPLOYMENT_KEY = "consolacion-mps-weekly-deployment-v2";
  const SITREP_PREFIX = "consolacion-mps-sitrep-v1:";
  const DELAY_PREFIX = "consolacion-mps-sitrep-delay-v1:";
  const PIN_KEY = "consolacion-mps-shared-sync-pin-session";
  const DEVICE_KEY = "consolacion-mps-shared-device-id";
  const POLL_MS = 3000;
  const REQUEST_TIMEOUT_MS = 12000;
  const UNITS = [
    ["mobile-562", "MP 218-562"],
    ["mobile-2008", "MP 218-2008"],
    ["fvp", "MP 218-FVP"],
  ];

  let pin = sessionStorage.getItem(PIN_KEY) || "";
  let connected = false;
  let busy = false;
  let pushQueued = false;
  let lastRemoteAt = 0;
  let deploymentTimer = null;
  let pendingSitrepCheckId = "";

  function deviceId() {
    let value = localStorage.getItem(DEVICE_KEY);
    if (!value) {
      value = `device-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      localStorage.setItem(DEVICE_KEY, value);
    }
    return value;
  }

  function parseJson(value, fallback) {
    try {
      const parsed = JSON.parse(value || "");
      return parsed ?? fallback;
    } catch {
      return fallback;
    }
  }

  function selectedDate() {
    return document.querySelector("#sitrep-duty-date")?.value || phDutyDate();
  }

  function phDutyDate() {
    const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Manila",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      hourCycle: "h23",
    }).formatToParts(new Date()).map((p) => [p.type, p.value]));
    const today = `${parts.year}-${parts.month}-${parts.day}`;
    if (Number(parts.hour) >= 8) return today;
    const d = new Date(`${today}T12:00:00+08:00`);
    d.setUTCDate(d.getUTCDate() - 1);
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Manila",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(d);
  }

  function checkId(shift, slot, unitId) {
    return `shift-${shift}-${String(slot).padStart(2, "0")}-${unitId}`;
  }

  function parseCheckId(id) {
    const match = String(id || "").match(/^shift-(1|2)-(\d{2})-(mobile-562|mobile-2008|fvp)$/);
    if (!match) return null;
    return {
      shift: Number(match[1]),
      slot: Number(match[2]),
      unitId: match[3],
    };
  }

  function period(shift, slot) {
    const start = (shift === 1 ? 8 : 20) + slot - 1;
    const label = (hour) => {
      const h = ((hour % 24) + 24) % 24;
      return `${h % 12 || 12}:00 ${h >= 12 ? "PM" : "AM"}`;
    };
    return `${label(start)}–${label(start + 1)}`;
  }

  function dueIso(dateKey, shift, slot) {
    const dutyStart = new Date(`${dateKey}T08:00:00+08:00`).getTime();
    const start = (shift === 1 ? 8 : 20) + slot - 1;
    return new Date(dutyStart + (start + 1 - 8) * 3600000).toISOString();
  }

  function assignmentFor(dateKey, unit, shift) {
    const saved = parseJson(localStorage.getItem(DEPLOYMENT_KEY), {});
    return String(saved[`${dateKey}|${unit}|${shift}`] || "");
  }

  function sitrepRecord(dateKey, id) {
    const info = parseCheckId(id);
    if (!info) return null;
    const unit = UNITS.find(([unitId]) => unitId === info.unitId)?.[1];
    if (!unit) return null;

    const record = parseJson(localStorage.getItem(`${SITREP_PREFIX}${dateKey}`), {});
    const checks = record.checks && typeof record.checks === "object" ? record.checks : {};
    const delayed = parseJson(localStorage.getItem(`${DELAY_PREFIX}${dateKey}`), {});
    const received = Boolean(checks[id]);
    const delay = delayed[id];
    const receivedAt = delay && typeof delay === "object"
      ? delay.receivedAt
      : (typeof delay === "string" ? delay : "");
    const due = dueIso(dateKey, info.shift, info.slot);
    const minutesLate = receivedAt
      ? Math.max(0, Math.round((new Date(receivedAt).getTime() - new Date(due).getTime()) / 60000))
      : "";
    const shift = info.shift === 1 ? "shift1" : "shift2";

    return {
      record_id: `SIT|${dateKey}|${id}`,
      duty_date: dateKey,
      shift,
      slot_number: info.slot,
      patrol_period: period(info.shift, info.slot),
      due_time: due,
      unit,
      status: received ? (delay ? "DELAYED" : "COMPLIED") : "NOT_COMPLIED",
      received_at: received ? (receivedAt || record.updatedAt || new Date().toISOString()) : "",
      minutes_late: delay ? minutesLate : "",
      assignment: assignmentFor(dateKey, unit, shift),
      updated_at: new Date().toISOString(),
      updated_by: "Duty & SITREP Dashboard",
      device_id: deviceId(),
      source: "WEB_DASHBOARD",
    };
  }

  function deploymentRecordFromKey(key, value) {
    const [dateKey, unit, shift] = String(key || "").split("|");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey || "") || !unit || !shift) return null;
    return {
      record_id: `DEP|${dateKey}|${unit}|${shift}`,
      duty_date: dateKey,
      unit,
      shift,
      assignment: String(value || ""),
      updated_at: new Date().toISOString(),
      updated_by: "Duty & SITREP Dashboard",
      device_id: deviceId(),
      active: true,
    };
  }

  function deploymentRecords(dateKey) {
    const saved = parseJson(localStorage.getItem(DEPLOYMENT_KEY), {});
    const rows = [];
    ["MP 218-562", "MP 218-2008", "MP 218-FVP", "TMRU"].forEach((unit) => {
      ["shift1", "shift2"].forEach((shift) => {
        rows.push(deploymentRecordFromKey(`${dateKey}|${unit}|${shift}`, saved[`${dateKey}|${unit}|${shift}`] || ""));
      });
    });
    return rows.filter(Boolean);
  }

  function sitrepRecords(dateKey) {
    const rows = [];
    [1, 2].forEach((shift) => {
      for (let slot = 1; slot <= 12; slot += 1) {
        UNITS.forEach(([unitId]) => {
          const row = sitrepRecord(dateKey, checkId(shift, slot, unitId));
          if (row) rows.push(row);
        });
      }
    });
    return rows;
  }

  async function requestJson(url, options = {}) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(url, { ...options, signal: controller.signal, redirect: "follow" });
      const text = await response.text();
      let data;
      try { data = JSON.parse(text); }
      catch { throw new Error("Google returned an invalid response."); }
      if (!data.ok) throw new Error(data.error || "Shared database request failed.");
      return data;
    } catch (error) {
      if (error?.name === "AbortError") throw new Error("Google connection timed out.");
      throw error;
    } finally {
      window.clearTimeout(timeout);
    }
  }

  async function post(payload) {
    const body = new URLSearchParams({ payload: JSON.stringify({ ...payload, pin }) });
    return requestJson(API_URL, { method: "POST", body });
  }

  async function snapshot(dateKey) {
    const url = `${API_URL}?action=snapshot&duty_date=${encodeURIComponent(dateKey)}&pin=${encodeURIComponent(pin)}&_=${Date.now()}`;
    return requestJson(url, { cache: "no-store" });
  }

  async function upsert(table, record) {
    if (!record) return;
    await post({ action: "upsert", table, record });
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
      if (row.status === "DELAYED") {
        delayed[id] = { receivedAt: row.received_at || new Date().toISOString(), shared: true };
      }
    });

    localStorage.setItem(`${SITREP_PREFIX}${dateKey}`, JSON.stringify({
      version: 2,
      dutyDate: dateKey,
      checks,
      updatedAt: new Date().toISOString(),
    }));
    localStorage.setItem(`${DELAY_PREFIX}${dateKey}`, JSON.stringify(delayed));

    window.dispatchEvent(new StorageEvent("storage", { key: DEPLOYMENT_KEY }));
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

  function setStatus(color, text) {
    const badge = document.querySelector("#shared-sync-status");
    if (!badge) return;
    badge.dataset.state = color;
    badge.textContent = `● ${text}`;
  }

  async function connect() {
    const entered = window.prompt(
      "Enter the Consolacion MPS station PIN to connect this computer to the shared Duty & SITREP database:",
      pin ? "••••••" : ""
    );
    if (entered === null) return;
    if (!(entered === "••••••" && pin)) pin = String(entered).trim();
    if (!pin) return setStatus("red", "PIN required");

    sessionStorage.setItem(PIN_KEY, pin);
    setStatus("yellow", "Connecting…");

    try {
      const dateKey = selectedDate();
      const data = await snapshot(dateKey);
      connected = true;
      if (remoteHasData(data)) applySnapshot(dateKey, data);
      else await pushDate(dateKey);
      lastRemoteAt = Date.now();
      setStatus("green", "Google Sync Online • live");
    } catch (error) {
      connected = false;
      sessionStorage.removeItem(PIN_KEY);
      setStatus("red", error.message === "UNAUTHORIZED" ? "Wrong PIN" : error.message);
    }
  }

  async function pullRemote() {
    if (!pin || busy) return;
    busy = true;
    try {
      const dateKey = selectedDate();
      const data = await snapshot(dateKey);
      connected = true;
      if (remoteHasData(data)) applySnapshot(dateKey, data);
      lastRemoteAt = Date.now();
      setStatus("green", "Google Sync Online • live");
    } catch (error) {
      connected = false;
      setStatus("red", error.message === "UNAUTHORIZED" ? "Wrong PIN" : "Sync Offline");
    } finally {
      busy = false;
      if (pushQueued) {
        pushQueued = false;
        window.setTimeout(() => pushSelectedDate(), 80);
      }
    }
  }

  async function pushSelectedDate() {
    if (!pin) return;
    if (busy) {
      pushQueued = true;
      return;
    }
    busy = true;
    setStatus("yellow", "Saving change…");
    try {
      await pushDate(selectedDate());
      connected = true;
      lastRemoteAt = Date.now();
      setStatus("green", "Google Sync Online • saved");
    } catch (error) {
      connected = false;
      setStatus("red", "Save failed");
    } finally {
      busy = false;
      if (pushQueued) {
        pushQueued = false;
        window.setTimeout(() => pushSelectedDate(), 80);
      }
    }
  }

  async function pushSitrepChange(detail = {}) {
    if (!pin) return;
    const dateKey = detail.dateKey || selectedDate();
    const id = detail.checkId;
    const record = sitrepRecord(dateKey, id);
    if (!record) return pushSelectedDate();
    if (busy) {
      pushQueued = true;
      return;
    }
    busy = true;
    setStatus("yellow", "Saving SITREP…");
    try {
      await upsert("SITREP", record);
      connected = true;
      lastRemoteAt = Date.now();
      setStatus("green", "Google Sync Online • SITREP saved");
    } catch {
      connected = false;
      setStatus("red", "SITREP save failed");
    } finally {
      busy = false;
      if (pushQueued) {
        pushQueued = false;
        window.setTimeout(() => pushSelectedDate(), 80);
      }
    }
  }

  function scheduleDeploymentPush(cell) {
    window.clearTimeout(deploymentTimer);
    deploymentTimer = window.setTimeout(async () => {
      if (!pin || !cell?.isConnected) return;
      const record = deploymentRecordFromKey(cell.dataset.deployKey, cell.textContent.trim());
      if (!record) return;
      if (busy) {
        pushQueued = true;
        return;
      }
      busy = true;
      setStatus("yellow", "Saving deployment…");
      try {
        await upsert("DEPLOYMENT", record);
        connected = true;
        lastRemoteAt = Date.now();
        setStatus("green", "Google Sync Online • deployment saved");
      } catch {
        connected = false;
        setStatus("red", "Deployment save failed");
      } finally {
        busy = false;
        if (pushQueued) {
          pushQueued = false;
          window.setTimeout(() => pushSelectedDate(), 80);
        }
      }
    }, 650);
  }

  function historyDates() {
    const dates = new Set();
    const deployments = parseJson(localStorage.getItem(DEPLOYMENT_KEY), {});
    Object.keys(deployments).forEach((key) => {
      const date = key.split("|")[0];
      if (/^\d{4}-\d{2}-\d{2}$/.test(date)) dates.add(date);
    });
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
      lastRemoteAt = Date.now();
      setStatus("green", "History migrated • live");
      window.alert(`${dates.length} duty date(s) were uploaded to the shared database.`);
    } catch (error) {
      setStatus("red", "Migration failed");
      window.alert(`Migration stopped: ${error.message}`);
    } finally {
      busy = false;
    }
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

    panel.querySelector("#shared-sync-connect")?.addEventListener("click", connect);
    panel.querySelector("#shared-sync-now")?.addEventListener("click", pushSelectedDate);
    panel.querySelector("#shared-sync-migrate")?.addEventListener("click", migrateHistory);
  }

  function install() {
    injectUI();

    document.querySelector("#sitrep-duty-date")?.addEventListener("change", () => {
      lastRemoteAt = 0;
      window.setTimeout(pullRemote, 180);
    });

    document.addEventListener("click", (event) => {
      const sitrepButton = event.target.closest?.("[data-sitrep-toggle]");
      if (sitrepButton) {
        pendingSitrepCheckId = sitrepButton.dataset.sitrepToggle || "";
        const overdue = sitrepButton.closest?.(".sitrep-row")?.classList.contains("overdue");
        if (!overdue && pendingSitrepCheckId) {
          const id = pendingSitrepCheckId;
          window.setTimeout(() => pushSitrepChange({ dateKey: selectedDate(), checkId: id }), 180);
        }
        return;
      }

      const statusChoice = event.target.closest?.("[data-sitrep-status-choice]");
      if (statusChoice && pendingSitrepCheckId) {
        const id = pendingSitrepCheckId;
        window.setTimeout(() => pushSitrepChange({ dateKey: selectedDate(), checkId: id }), 220);
      }
    }, true);

    document.addEventListener("input", (event) => {
      const cell = event.target.closest?.("[data-deploy-key]");
      if (cell) scheduleDeploymentPush(cell);
    }, true);

    window.setInterval(() => {
      if (!pin || busy) return;
      if (Date.now() - lastRemoteAt >= POLL_MS) pullRemote();
    }, POLL_MS);

    if (pin) pullRemote();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install);
  else install();
})();