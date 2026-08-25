(() => {
  const API_URL = "https://script.google.com/macros/s/AKfycbx1renj1Buk7UmPDc4_Hd47ji4ieBBkoKz72PfwOkmELG5uJHztbpnBiifBWRxsA0fH/exec";
  const PIN_KEY = "consolacion-mps-shared-sync-pin-session";
  const DEVICE_KEY = "consolacion-mps-shared-device-id";
  const DEPLOYMENT_KEY = "consolacion-mps-weekly-deployment-v2";
  const SITREP_PREFIX = "consolacion-mps-sitrep-v1:";
  const DELAY_PREFIX = "consolacion-mps-sitrep-delay-v1:";
  const BATCH_SIZE = 4;
  const REQUEST_TIMEOUT_MS = 45000;

  const UNIT_MAP = {
    "mobile-562": "MP 218-562",
    "mobile-2008": "MP 218-2008",
    "fvp": "MP 218-FVP",
  };

  function parseJson(value, fallback) {
    try {
      const parsed = JSON.parse(value || "");
      return parsed ?? fallback;
    } catch {
      return fallback;
    }
  }

  function pin() {
    return sessionStorage.getItem(PIN_KEY) || "";
  }

  function deviceId() {
    let value = localStorage.getItem(DEVICE_KEY);
    if (!value) {
      value = `device-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      localStorage.setItem(DEVICE_KEY, value);
    }
    return value;
  }

  function setStatus(color, text) {
    const badge = document.querySelector("#shared-sync-status");
    if (!badge) return;
    badge.dataset.state = color;
    badge.textContent = `● ${text}`;
  }

  function historyDates() {
    const dates = new Set();
    const deployments = parseJson(localStorage.getItem(DEPLOYMENT_KEY), {});

    Object.keys(deployments).forEach((key) => {
      const date = String(key).split("|")[0];
      if (/^\d{4}-\d{2}-\d{2}$/.test(date)) dates.add(date);
    });

    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i) || "";
      if (key.startsWith(SITREP_PREFIX)) {
        const date = key.slice(SITREP_PREFIX.length);
        if (/^\d{4}-\d{2}-\d{2}$/.test(date)) dates.add(date);
      }
      if (key.startsWith(DELAY_PREFIX)) {
        const date = key.slice(DELAY_PREFIX.length);
        if (/^\d{4}-\d{2}-\d{2}$/.test(date)) dates.add(date);
      }
    }

    return [...dates].sort();
  }

  function hourLabel(hour) {
    const normalized = ((hour % 24) + 24) % 24;
    return `${normalized % 12 || 12}:00 ${normalized >= 12 ? "PM" : "AM"}`;
  }

  function parseCheckId(checkId) {
    const match = String(checkId || "").match(/^shift-(1|2)-(\d{2})-(mobile-562|mobile-2008|fvp)$/);
    if (!match) return null;
    return {
      shiftNumber: Number(match[1]),
      slotNumber: Number(match[2]),
      unitId: match[3],
    };
  }

  function dueIso(dateKey, shiftNumber, slotNumber) {
    const dutyStart = new Date(`${dateKey}T08:00:00+08:00`).getTime();
    const startHour = (shiftNumber === 1 ? 8 : 20) + slotNumber - 1;
    return new Date(dutyStart + (startHour + 1 - 8) * 3600000).toISOString();
  }

  function patrolPeriod(shiftNumber, slotNumber) {
    const startHour = (shiftNumber === 1 ? 8 : 20) + slotNumber - 1;
    return `${hourLabel(startHour)}–${hourLabel(startHour + 1)}`;
  }

  function assignmentFor(dateKey, unit, shift) {
    const deployments = parseJson(localStorage.getItem(DEPLOYMENT_KEY), {});
    return String(deployments[`${dateKey}|${unit}|${shift}`] || "").trim();
  }

  function deploymentRecords(dateKey) {
    const deployments = parseJson(localStorage.getItem(DEPLOYMENT_KEY), {});
    return Object.entries(deployments)
      .filter(([key, value]) => String(key).startsWith(`${dateKey}|`) && String(value || "").trim())
      .map(([key, value]) => {
        const [dutyDate, unit, shift] = key.split("|");
        return {
          record_id: `DEP|${dutyDate}|${unit}|${shift}`,
          duty_date: dutyDate,
          unit,
          shift,
          assignment: String(value || "").trim(),
          updated_at: new Date().toISOString(),
          updated_by: "Duty & SITREP Dashboard",
          device_id: deviceId(),
          active: true,
        };
      });
  }

  function sitrepRecords(dateKey) {
    const saved = parseJson(localStorage.getItem(`${SITREP_PREFIX}${dateKey}`), {});
    const checks = saved && typeof saved.checks === "object" ? saved.checks : {};
    const delayed = parseJson(localStorage.getItem(`${DELAY_PREFIX}${dateKey}`), {});
    const rows = [];

    Object.entries(checks).forEach(([checkId, received]) => {
      if (!received) return;
      const info = parseCheckId(checkId);
      if (!info) return;

      const unit = UNIT_MAP[info.unitId];
      if (!unit) return;

      const shift = info.shiftNumber === 1 ? "shift1" : "shift2";
      const delayRecord = delayed[checkId];
      const receivedAt = delayRecord && typeof delayRecord === "object"
        ? String(delayRecord.receivedAt || "")
        : (typeof delayRecord === "string" ? delayRecord : "");
      const due = dueIso(dateKey, info.shiftNumber, info.slotNumber);
      const minutesLate = receivedAt
        ? Math.max(0, Math.round((new Date(receivedAt).getTime() - new Date(due).getTime()) / 60000))
        : "";

      rows.push({
        record_id: `SIT|${dateKey}|${checkId}`,
        duty_date: dateKey,
        shift,
        slot_number: info.slotNumber,
        patrol_period: patrolPeriod(info.shiftNumber, info.slotNumber),
        due_time: due,
        unit,
        status: delayRecord ? "DELAYED" : "COMPLIED",
        received_at: receivedAt || saved.updatedAt || new Date().toISOString(),
        minutes_late: delayRecord ? minutesLate : "",
        assignment: assignmentFor(dateKey, unit, shift),
        updated_at: new Date().toISOString(),
        updated_by: "Duty & SITREP Dashboard",
        device_id: deviceId(),
        source: "WEB_DASHBOARD_MIGRATION",
      });
    });

    return rows;
  }

  async function request(payload, attempt = 1) {
    const stationPin = pin();
    if (!stationPin) throw new Error("Station PIN is not connected on this computer.");

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const body = new URLSearchParams({
        payload: JSON.stringify({ ...payload, pin: stationPin }),
      });
      const response = await fetch(API_URL, {
        method: "POST",
        body,
        redirect: "follow",
        signal: controller.signal,
      });
      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error("Google returned an invalid response.");
      }
      if (!data.ok) throw new Error(data.error || "Google database request failed.");
      return data;
    } catch (error) {
      if (attempt < 3) {
        await new Promise((resolve) => window.setTimeout(resolve, 900 * attempt));
        return request(payload, attempt + 1);
      }
      if (error?.name === "AbortError") throw new Error("Google batch timed out after retries.");
      throw error;
    } finally {
      window.clearTimeout(timeout);
    }
  }

  async function uploadBatches(table, records, progress) {
    if (!records.length) return;
    for (let index = 0; index < records.length; index += BATCH_SIZE) {
      const batch = records.slice(index, index + BATCH_SIZE);
      await request({ action: "bulkUpsert", table, records: batch });
      progress(batch.length);
      await new Promise((resolve) => window.setTimeout(resolve, 180));
    }
  }

  async function migrateDates(dates, modeLabel = "Migrating") {
    let totalRecords = 0;
    const payloads = dates.map((dateKey) => {
      const deployment = deploymentRecords(dateKey);
      const sitrep = sitrepRecords(dateKey);
      totalRecords += deployment.length + sitrep.length;
      return { dateKey, deployment, sitrep };
    });

    if (!totalRecords) {
      window.alert("No saved green/yellow SITREP records or deployment assignments were found on this computer.");
      return;
    }

    let completed = 0;
    const updateProgress = (count) => {
      completed += count;
      setStatus("yellow", `${modeLabel} ${completed} / ${totalRecords}`);
    };

    setStatus("yellow", `${modeLabel} 0 / ${totalRecords}`);

    for (const item of payloads) {
      await uploadBatches("DEPLOYMENT", item.deployment, updateProgress);
      await uploadBatches("SITREP", item.sitrep, updateProgress);
    }

    setStatus("green", "Google Sync Online • history migrated");
    window.dispatchEvent(new CustomEvent("consolacion-shared-migration-complete"));
    window.alert(`${completed} saved record(s) were uploaded successfully across ${dates.length} duty date(s).`);
  }

  async function runFullMigration() {
    const dates = historyDates();
    if (!dates.length) {
      window.alert("No local Duty/SITREP history was found on this computer.");
      return;
    }

    if (!pin()) {
      window.alert("Connect Google Sync first, then run migration again.");
      return;
    }

    if (!window.confirm(`Upload the actual saved history from ${dates.length} duty date(s)? Only populated deployments and received green/yellow SITREPs will be migrated.`)) return;

    try {
      await migrateDates(dates, "Migrating history");
    } catch (error) {
      setStatus("red", "Migration failed");
      window.alert(`Migration stopped: ${error.message}`);
    }
  }

  async function runSelectedDateSync() {
    if (!pin()) {
      window.alert("Connect Google Sync first.");
      return;
    }
    const dateKey = document.querySelector("#sitrep-duty-date")?.value;
    if (!dateKey) return;
    try {
      await migrateDates([dateKey], "Syncing saved records");
    } catch (error) {
      setStatus("red", "Sync failed");
      window.alert(`Sync stopped: ${error.message}`);
    }
  }

  document.addEventListener("click", (event) => {
    const migrateButton = event.target.closest?.("#shared-sync-migrate");
    if (migrateButton) {
      event.preventDefault();
      event.stopImmediatePropagation();
      runFullMigration();
      return;
    }

    const syncButton = event.target.closest?.("#shared-sync-now");
    if (syncButton) {
      event.preventDefault();
      event.stopImmediatePropagation();
      runSelectedDateSync();
    }
  }, true);
})();