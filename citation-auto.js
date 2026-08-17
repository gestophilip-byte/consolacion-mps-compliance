(() => {
  const SUMMARY_URL = "citation-summary.json";
  const CITATION_ID = "citation-monitoring";
  const CITATION_SHEET_URL =
    "https://docs.google.com/spreadsheets/d/121UYJVxFOki-djRQN4pq-9fNtEMMfvVi--eWBNClNx0/edit?gid=0#gid=0";
  const POLL_INTERVAL = 60 * 1000;
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

    campaign.period = `All populated Citation Monitoring entries (${latestSummary.populatedSheetCount || 0} tabs)`;
    campaign.asOfDate = formatSyncDate(latestSummary.calculatedAt);
    campaign.sourceHref = CITATION_SHEET_URL;
    campaign.autoSynced = true;
  }

  function decorateCitationCard() {
    const card = document.querySelector(".citation-summary-card");
    if (!card || state.activeAccomplishmentCampaign !== CITATION_ID) return;

    const note = card.querySelector(".citation-summary-footer p");
    if (note) {
      note.textContent =
        "Automatically calculated from the Citation Monitoring Google Sheet. The website checks the published summary for changes every minute; the GitHub Pages data source is recalculated on its scheduled sync.";
    }

    const chip = card.querySelector(".comparison-chip");
    if (chip) chip.textContent = "Auto synced";
  }

  function makeCitationEditorReadOnly() {
    const fieldset = [...document.querySelectorAll("#editor-campaigns fieldset")]
      .find((item) => item.querySelector("legend")?.textContent.trim() === "Citation Monitoring");
    if (!fieldset) return;

    fieldset.innerHTML = `
      <legend>Citation Monitoring</legend>
      <p class="citation-editor-note">
        Citation totals are automatic and cannot be manually overridden here.
        Update the Citation Monitoring Google Sheet and the website will recalculate the totals.
      </p>
      <a class="button primary" href="${CITATION_SHEET_URL}" target="_blank" rel="noopener noreferrer">
        Open Citation Monitoring Sheet ↗
      </a>`;
  }

  async function refreshSummary() {
    try {
      const response = await fetch(`${SUMMARY_URL}?v=${Date.now()}`, {
        cache: "no-store",
      });
      if (!response.ok) throw new Error(`Citation summary HTTP ${response.status}`);
      latestSummary = await response.json();
      applySummary();
      renderAccomplishments();
    } catch (error) {
      console.warn("Citation Monitoring automatic summary is temporarily unavailable.", error);
    }
  }

  function install() {
    if (installed) return;
    installed = true;

    const originalRenderAccomplishments = renderAccomplishments;
    renderAccomplishments = function renderWithLiveCitationSummary() {
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

    refreshSummary();
    window.setInterval(refreshSummary, POLL_INTERVAL);
  }

  function waitForApp() {
    if (
      typeof state === "undefined" ||
      typeof renderAccomplishments !== "function"
    ) {
      window.setTimeout(waitForApp, 150);
      return;
    }
    install();
  }

  waitForApp();
})();
