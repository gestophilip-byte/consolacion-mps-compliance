(() => {
  const SUMMARY_URL = "compliance-summary.json";
  const POLL_INTERVAL = 2 * 60 * 1000;
  const CACHE_KEY = "consolacion-mps-verified-compliance-summary-v1";
  const REMOVED_COMPLIANCE_ID = "daily-patrol-operations-report";

  let verifiedSummary = null;
  let installed = false;

  function removeLockedComplianceItem() {
    if (typeof complianceItems !== "undefined") {
      const index = complianceItems.findIndex((item) => item.id === REMOVED_COMPLIANCE_ID);
      if (index >= 0) complianceItems.splice(index, 1);
    }
    if (typeof state !== "undefined") {
      if (state.statuses) delete state.statuses[REMOVED_COMPLIANCE_ID];
      if (state.statusSources) delete state.statusSources[REMOVED_COMPLIANCE_ID];
    }
  }

  function philippineDateKey() {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Manila",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date());
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${values.year}-${values.month}-${values.day}`;
  }

  function isValidSummary(summary) {
    return Boolean(
      summary &&
      /^\d{4}-\d{2}-\d{2}$/.test(String(summary.dateKey || "")) &&
      summary.statuses &&
      typeof summary.statuses === "object" &&
      !Array.isArray(summary.statuses)
    );
  }

  function summaryIsForToday(summary) {
    return isValidSummary(summary) && summary.dateKey === philippineDateKey();
  }

  function applyVerifiedSummary() {
    removeLockedComplianceItem();
    if (!summaryIsForToday(verifiedSummary)) return false;
    if (typeof state === "undefined" || typeof complianceItems === "undefined") return false;

    complianceItems.forEach((item) => {
      if (Object.prototype.hasOwnProperty.call(verifiedSummary.statuses, item.id)) {
        state.statuses[item.id] = Boolean(verifiedSummary.statuses[item.id]);
      }
      if (verifiedSummary.statusSources && Object.prototype.hasOwnProperty.call(verifiedSummary.statusSources, item.id)) {
        state.statusSources[item.id] = verifiedSummary.statusSources[item.id];
      }
    });
    return true;
  }

  function saveCache(summary) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(summary));
    } catch (error) {
      console.warn("Unable to cache the verified compliance summary.", error);
    }
  }

  function restoreCache() {
    try {
      const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
      if (!summaryIsForToday(cached)) return;
      verifiedSummary = cached;
    } catch (error) {
      console.warn("Unable to restore the verified compliance summary cache.", error);
    }
  }

  function updateVerificationNotes() {
    if (!summaryIsForToday(verifiedSummary)) return;
    document.querySelectorAll("#compliance-list .compliance-item").forEach((card) => {
      const id = card.dataset.itemId;
      const note = verifiedSummary.notes?.[id];
      if (!note) return;
      const detection = card.querySelector(".detection-note");
      if (detection) {
        detection.textContent = note;
        detection.classList.toggle("automatic", Boolean(verifiedSummary.statuses?.[id]));
        detection.classList.toggle("watching", !verifiedSummary.statuses?.[id]);
      }
    });
  }

  function updateVerifiedTimestamp() {
    if (!summaryIsForToday(verifiedSummary) || !verifiedSummary.checkedAt) return;
    const date = new Date(verifiedSummary.checkedAt);
    if (Number.isNaN(date.getTime())) return;
    const text = new Intl.DateTimeFormat("en-PH", {
      timeZone: "Asia/Manila",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
    const legend = document.querySelector(".compliance-heading .legend");
    if (!legend) return;
    let marker = legend.querySelector("[data-verified-status-time]");
    if (!marker) {
      marker = document.createElement("span");
      marker.dataset.verifiedStatusTime = "true";
      legend.appendChild(marker);
    }
    marker.textContent = `Verified ${text} (PH)`;
  }

  async function refreshVerifiedSummary() {
    try {
      const response = await fetch(`${SUMMARY_URL}?v=${Date.now()}`, { cache: "no-store" });
      if (!response.ok) throw new Error(`Verified compliance HTTP ${response.status}`);
      const summary = await response.json();
      if (!isValidSummary(summary)) throw new Error("Verified compliance summary is invalid.");

      if (!summaryIsForToday(summary)) {
        console.warn("Verified compliance summary is not yet for today's Philippine date.");
        return;
      }

      verifiedSummary = summary;
      saveCache(summary);
      applyVerifiedSummary();
      renderCompliance();
      updateVerificationNotes();
      updateVerifiedTimestamp();
    } catch (error) {
      console.warn("Verified Google Sheet compliance summary is temporarily unavailable.", error);
    }
  }

  function install() {
    if (installed) return;
    installed = true;

    removeLockedComplianceItem();

    const originalRenderCompliance = renderCompliance;
    renderCompliance = function renderWithVerifiedGoogleSheetStatus() {
      removeLockedComplianceItem();
      applyVerifiedSummary();
      const result = originalRenderCompliance();
      updateVerificationNotes();
      updateVerifiedTimestamp();
      return result;
    };

    renderCompliance();
    restoreCache();
    if (applyVerifiedSummary()) renderCompliance();
    refreshVerifiedSummary();
    window.setInterval(refreshVerifiedSummary, POLL_INTERVAL);
  }

  function waitForApp() {
    if (
      typeof state === "undefined" ||
      typeof complianceItems === "undefined" ||
      typeof renderCompliance !== "function"
    ) {
      window.setTimeout(waitForApp, 150);
      return;
    }
    install();
  }

  waitForApp();
})();
