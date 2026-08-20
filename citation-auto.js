(() => {
  const SUMMARY_URL = "citation-summary.json";
  const CITATION_ID = "citation-monitoring";
  const SPREADSHEET_ID = "121UYJVxFOki-djRQN4pq-9fNtEMMfvVi--eWBNClNx0";
  const CITATION_SHEET_URL =
    `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/edit?gid=0#gid=0`;
  const POLL_INTERVAL = 60 * 1000;
  const STATUS_POLL_INTERVAL = 2 * 60 * 1000;
  const STATUS_CACHE_KEY = "consolacion-mps-compliance-status-v1";

  let latestSummary = null;
  let installed = false;

  function formatSyncDate(value) {
    if (!value) return "Latest automatic calculation";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Latest automatic calculation";
    return new Intl.DateTimeFormat("en-PH", {
      timeZone: "Asia/Manila",
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  }

  function citationCampaign() {
    return state?.accomplishments?.campaigns?.find(
      (campaign) => campaign.id === CITATION_ID,
    );
  }

  function isValidSummary(summary) {
    if (!summary || summary.spreadsheetId !== SPREADSHEET_ID) return false;
    return [
      summary.totalCitations,
      summary.overallEstimatedFines,
      summary.sheetCount,
      summary.populatedSheetCount,
    ].every((value) => Number.isFinite(Number(value)));
  }

  function applySummary() {
    if (!latestSummary) return;
    const campaign = citationCampaign();
    if (!campaign) return;

    const totalMetric = campaign.chartMetrics?.find(
      (metric) => metric.id === "total-citations",
    );
    const amountMetric = campaign.chartMetrics?.find(
      (metric) => metric.id === "overall-amount",
    );

    if (totalMetric) totalMetric.year2026 = Number(latestSummary.totalCitations) || 0;
    if (amountMetric) {
      amountMetric.year2026 = Number(latestSummary.overallEstimatedFines) || 0;
      amountMetric.kind = "currency";
    }

    campaign.period = `All populated Citation Monitoring entries (${latestSummary.populatedSheetCount || 0} of ${latestSummary.sheetCount || 0} tabs)`;
    campaign.asOfDate = formatSyncDate(latestSummary.calculatedAt);
    campaign.sourceHref = CITATION_SHEET_URL;
    campaign.autoSynced = true;
    campaign.liveSource = "verified-workbook-summary";
  }

  function decorateCitationCard() {
    const card = document.querySelector(".citation-summary-card");
    if (!card || state.activeAccomplishmentCampaign !== CITATION_ID) return;

    const note = card.querySelector(".citation-summary-footer p");
    if (note) {
      note.textContent =
        "Automatically calculated from the complete Citation Monitoring workbook. The page checks the verified workbook summary every minute and no longer uses partial browser tab reads.";
    }

    const chip = card.querySelector(".comparison-chip");
    if (chip) chip.textContent = "Verified sync";
  }

  function makeCitationEditorReadOnly() {
    const fieldset = [...document.querySelectorAll("#editor-campaigns fieldset")]
      .find((item) => item.querySelector("legend")?.textContent.trim() === "Citation Monitoring");
    if (!fieldset) return;

    fieldset.innerHTML = `
      <legend>Citation Monitoring</legend>
      <p class="citation-editor-note">
        Citation totals are automatic and cannot be manually overridden here.
        Update the Citation Monitoring Google Sheet and the verified workbook summary will refresh automatically.
      </p>
      <a class="button primary" href="${CITATION_SHEET_URL}" target="_blank" rel="noopener noreferrer">
        Open Citation Monitoring Sheet ↗
      </a>`;
  }

  function installCorsSafeRequest() {
    if (typeof request !== "function") return;

    request = async function corsSafeRequest(path, options = {}) {
      const method = String(options.method || "GET").toUpperCase();
      const headers = { ...(options.headers || {}) };
      const hasContentType = Object.keys(headers).some(
        (key) => key.toLowerCase() === "content-type",
      );

      if (options.body !== undefined && options.body !== null && !hasContentType) {
        headers["Content-Type"] = "application/json";
      }

      const response = await fetch(`${API_BASE}${path}`, {
        ...options,
        method,
        headers,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "The shared service is temporarily unavailable.");
      }
      return data;
    };
  }

  function restoreCachedComplianceStatus() {
    try {
      const cached = JSON.parse(localStorage.getItem(STATUS_CACHE_KEY) || "null");
      if (!cached || cached.todayKey !== state.todayKey || !cached.statuses) return;

      state.statuses = { ...state.statuses, ...cached.statuses };
      state.statusSources = { ...state.statusSources, ...(cached.statusSources || {}) };
      if (cached.dateLabel) {
        const dateLabel = document.querySelector("#date-label");
        if (dateLabel) dateLabel.textContent = cached.dateLabel;
      }
      renderCompliance();
    } catch (error) {
      console.warn("Unable to restore cached compliance status.", error);
    }
  }

  async function refreshComplianceStatus() {
    try {
      const response = await fetch(`${API_BASE}/api/status?ts=${Date.now()}`, {
        method: "GET",
        cache: "no-store",
        credentials: "omit",
      });
      if (!response.ok) throw new Error(`Compliance status HTTP ${response.status}`);

      const data = await response.json();
      if (!data || typeof data.statuses !== "object" || data.statuses === null) {
        throw new Error("Compliance status response is incomplete.");
      }

      state.statuses = { ...state.statuses, ...data.statuses };
      state.statusSources = { ...state.statusSources, ...(data.statusSources || {}) };

      const dateLabel = document.querySelector("#date-label");
      if (dateLabel && data.dateLabel) dateLabel.textContent = data.dateLabel;

      localStorage.setItem(
        STATUS_CACHE_KEY,
        JSON.stringify({
          todayKey: state.todayKey,
          statuses: data.statuses,
          statusSources: data.statusSources || {},
          dateLabel: data.dateLabel || "",
          savedAt: Date.now(),
        }),
      );

      renderCompliance();
    } catch (error) {
      console.warn("Shared compliance status is temporarily unavailable.", error);
      const summaryLabel = document.querySelector("#summary-label");
      if (summaryLabel && summaryLabel.textContent.includes("still red")) {
        summaryLabel.textContent = "Reconnecting to the shared compliance status…";
      }
    }
  }

  async function refreshSummary() {
    try {
      const response = await fetch(`${SUMMARY_URL}?v=${Date.now()}`, { cache: "no-store" });
      if (!response.ok) throw new Error(`Citation summary HTTP ${response.status}`);
      const summary = await response.json();
      if (!isValidSummary(summary)) throw new Error("Citation summary is incomplete or invalid.");

      latestSummary = summary;
      applySummary();
      renderAccomplishments();
    } catch (error) {
      console.warn("Verified Citation Monitoring summary is temporarily unavailable.", error);
    }
  }

  function install() {
    if (installed) return;
    installed = true;

    installCorsSafeRequest();

    const originalRenderAccomplishments = renderAccomplishments;
    renderAccomplishments = function renderWithVerifiedCitationSummary() {
      applySummary();
      const result = originalRenderAccomplishments();
      decorateCitationCard();
      return result;
    };

    if (typeof renderAccomplishmentsEditor === "function") {
      const originalRenderEditor = renderAccomplishmentsEditor;
      renderAccomplishmentsEditor = function renderEditorWithCitationNotice() {
        const result = originalRenderEditor();
        makeCitationEditorReadOnly();
        return result;
      };
    }

    restoreCachedComplianceStatus();
    refreshComplianceStatus();
    refreshSummary();

    if (typeof loadStatuses === "function") loadStatuses();
    if (typeof loadActivities === "function") loadActivities();
    if (typeof loadAccomplishments === "function") loadAccomplishments();

    window.setInterval(refreshComplianceStatus, STATUS_POLL_INTERVAL);
    window.setInterval(refreshSummary, POLL_INTERVAL);
  }

  function waitForApp() {
    if (
      typeof state === "undefined" ||
      typeof renderCompliance !== "function" ||
      typeof renderAccomplishments !== "function"
    ) {
      window.setTimeout(waitForApp, 150);
      return;
    }
    install();
  }

  const verifiedComplianceScript = document.createElement("script");
  verifiedComplianceScript.src = `compliance-auto.js?v=${Date.now()}`;
  verifiedComplianceScript.async = true;
  document.head.appendChild(verifiedComplianceScript);

  const deploymentScript = document.createElement("script");
  deploymentScript.src = `deployment.js?v=${Date.now()}`;
  deploymentScript.async = true;
  document.head.appendChild(deploymentScript);

  waitForApp();
})();
