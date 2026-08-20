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

  function complianceGroups() {
    if (typeof complianceItems === "undefined") return { daily: [], weekly: [] };
    const daily = complianceItems.filter((item) =>
      String(item.frequency || "").toLowerCase().includes("daily")
    );
    const dailyIds = new Set(daily.map((item) => item.id));
    const weekly = complianceItems.filter((item) => !dailyIds.has(item.id));
    return { daily, weekly };
  }

  function completedCount(items) {
    return items.filter((item) => Boolean(state.statuses?.[item.id])).length;
  }

  function forceHide(node) {
    if (!node) return;
    node.hidden = true;
    node.style.setProperty("display", "none", "important");
  }

  function ensureSplitOverviewCards() {
    const summaryNode = document.querySelector("#summary-count");
    const dailyCard = summaryNode?.closest(".kpi-card");
    if (dailyCard && !dailyCard.dataset.splitComplianceCard) {
      dailyCard.dataset.splitComplianceCard = "daily";
      const label = dailyCard.querySelector(".kpi-label");
      if (label) label.textContent = "Daily Compliance";

      forceHide(summaryNode);
      const summaryLabel = dailyCard.querySelector("#summary-label");
      forceHide(summaryLabel);
      const originalProgress = dailyCard.querySelector("#summary-progress")?.closest(".progress-track");
      forceHide(originalProgress);

      dailyCard.insertAdjacentHTML("beforeend", `
        <strong id="overview-daily-compliance">— / —</strong>
        <span id="overview-daily-label">Loading daily requirements…</span>
        <div class="progress-track"><i id="overview-daily-progress"></i></div>`);
    } else if (dailyCard) {
      forceHide(summaryNode);
      forceHide(dailyCard.querySelector("#summary-label"));
      forceHide(dailyCard.querySelector("#summary-progress")?.closest(".progress-track"));
    }

    const pendingNode = document.querySelector("#overview-pending");
    const weeklyCard = pendingNode?.closest(".kpi-card") || document.querySelector('[data-split-compliance-card="weekly"]');
    if (weeklyCard && !weeklyCard.dataset.splitComplianceCard) {
      weeklyCard.dataset.splitComplianceCard = "weekly";
      const label = weeklyCard.querySelector(".kpi-label");
      if (label) label.textContent = "Weekly Compliance";

      forceHide(pendingNode);
      [...weeklyCard.querySelectorAll(":scope > span")].forEach((node) => {
        if (!node.classList.contains("kpi-label") && node.id !== "overview-weekly-label") forceHide(node);
      });

      weeklyCard.insertAdjacentHTML("beforeend", `
        <strong id="overview-weekly-compliance">— / —</strong>
        <span id="overview-weekly-label">Loading weekly requirements…</span>
        <div class="progress-track"><i id="overview-weekly-progress"></i></div>`);
    } else if (weeklyCard) {
      forceHide(document.querySelector("#overview-pending"));
      [...weeklyCard.querySelectorAll(":scope > span")].forEach((node) => {
        if (!node.classList.contains("kpi-label") && node.id !== "overview-weekly-label") forceHide(node);
      });
    }
  }

  function ensureComplianceCyclePanel() {
    const panel = document.querySelector("#google-links-panel");
    const tableHead = panel?.querySelector(".compliance-table-head");
    if (!panel || !tableHead || panel.querySelector("#compliance-cycle-summary")) return;

    const wrapper = document.createElement("div");
    wrapper.id = "compliance-cycle-summary";
    wrapper.setAttribute("aria-label", "Daily and weekly compliance summary");
    wrapper.style.cssText = "display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin:14px 0 18px;";
    wrapper.innerHTML = `
      <article class="kpi-card" style="padding:18px;">
        <span class="kpi-label">Daily Compliance</span>
        <strong id="compliance-daily-count">— / —</strong>
        <span id="compliance-daily-note">Loading daily requirements…</span>
        <div class="progress-track"><i id="compliance-daily-progress"></i></div>
      </article>
      <article class="kpi-card" style="padding:18px;">
        <span class="kpi-label">Weekly Compliance</span>
        <strong id="compliance-weekly-count">— / —</strong>
        <span id="compliance-weekly-note">Loading weekly requirements…</span>
        <div class="progress-track"><i id="compliance-weekly-progress"></i></div>
      </article>`;
    tableHead.before(wrapper);
  }

  function updateSplitCompliance() {
    if (typeof state === "undefined") return;
    ensureSplitOverviewCards();
    ensureComplianceCyclePanel();

    const { daily, weekly } = complianceGroups();
    const dailyDone = completedCount(daily);
    const weeklyDone = completedCount(weekly);
    const dailyPending = Math.max(0, daily.length - dailyDone);
    const weeklyPending = Math.max(0, weekly.length - weeklyDone);

    const setText = (selector, text) => {
      const node = document.querySelector(selector);
      if (node) node.textContent = text;
    };
    const setProgress = (selector, done, total) => {
      const node = document.querySelector(selector);
      if (node) node.style.width = `${total ? (done / total) * 100 : 0}%`;
    };

    setText("#overview-daily-compliance", `${dailyDone} / ${daily.length}`);
    setText("#overview-daily-label", dailyPending === 0
      ? "All daily requirements complied."
      : `${dailyPending} daily requirement${dailyPending === 1 ? "" : "s"} pending.`);
    setProgress("#overview-daily-progress", dailyDone, daily.length);

    setText("#overview-weekly-compliance", `${weeklyDone} / ${weekly.length}`);
    setText("#overview-weekly-label", weeklyPending === 0
      ? "All weekly requirements complied."
      : `${weeklyPending} weekly requirement${weeklyPending === 1 ? "" : "s"} pending.`);
    setProgress("#overview-weekly-progress", weeklyDone, weekly.length);

    setText("#compliance-daily-count", `${dailyDone} / ${daily.length}`);
    setText("#compliance-daily-note", dailyPending === 0
      ? "All daily requirements complied."
      : `${dailyPending} pending for today's reporting cycle.`);
    setProgress("#compliance-daily-progress", dailyDone, daily.length);

    setText("#compliance-weekly-count", `${weeklyDone} / ${weekly.length}`);
    setText("#compliance-weekly-note", weeklyPending === 0
      ? "All weekly/current-week requirements complied."
      : `${weeklyPending} pending for the current weekly/inventory cycle.`);
    setProgress("#compliance-weekly-progress", weeklyDone, weekly.length);
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
      updateSplitCompliance();
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
      updateSplitCompliance();
      return result;
    };

    renderCompliance();
    restoreCache();
    if (applyVerifiedSummary()) renderCompliance();
    updateSplitCompliance();
    refreshVerifiedSummary();
    window.setInterval(refreshVerifiedSummary, POLL_INTERVAL);
    window.setInterval(updateSplitCompliance, 1500);
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
