(() => {
  const CITATION_CAMPAIGN_ID = "citation-monitoring";
  const CITATION_SHEET_URL = "https://docs.google.com/spreadsheets/d/121UYJVxFOki-djRQN4pq-9fNtEMMfvVi--eWBNClNx0/edit?gid=0#gid=0";

  const coreScript = document.createElement("script");
  coreScript.src = "app-core.js";

  coreScript.onload = () => {
    const defaultCitationCampaign = () => ({
      id: CITATION_CAMPAIGN_ID,
      title: "Citation Monitoring",
      period: "All populated Citation Monitoring tabs through 17 August 2026",
      asOfDate: "17 August 2026",
      summaryOnly: true,
      sourceHref: CITATION_SHEET_URL,
      chartMetrics: [
        {
          id: "total-citations",
          label: "Total Citations",
          year2025: null,
          year2026: 4197,
        },
        {
          id: "overall-amount",
          label: "Overall Estimated Fines",
          year2025: null,
          year2026: 2114300,
          kind: "currency",
        },
      ],
    });

    function ensureCitationCampaign(target) {
      if (!target || !Array.isArray(target.campaigns)) return null;

      let campaign = target.campaigns.find((item) => item.id === CITATION_CAMPAIGN_ID);
      const defaults = defaultCitationCampaign();

      if (!campaign) {
        campaign = defaults;
        target.campaigns.push(campaign);
        return campaign;
      }

      campaign.title = campaign.title || defaults.title;
      campaign.period = campaign.period || defaults.period;
      campaign.asOfDate = campaign.asOfDate || defaults.asOfDate;
      campaign.summaryOnly = true;
      campaign.sourceHref = CITATION_SHEET_URL;

      const existingMetrics = Array.isArray(campaign.chartMetrics) ? campaign.chartMetrics : [];
      campaign.chartMetrics = defaults.chartMetrics.map((defaultMetric) => {
        const existingMetric = existingMetrics.find((metric) => metric.id === defaultMetric.id) || {};
        const merged = { ...defaultMetric, ...existingMetric };
        if (merged.year2026 === null || merged.year2026 === undefined || merged.year2026 === "") {
          merged.year2026 = defaultMetric.year2026;
        }
        return merged;
      });

      return campaign;
    }

    ensureCitationCampaign(defaultAccomplishments);
    ensureCitationCampaign(state.accomplishments);

    const style = document.createElement("style");
    style.textContent = `
      .citation-summary-card {
        overflow: hidden;
      }

      .citation-summary-card .campaign-card-heading {
        align-items: flex-start;
      }

      .citation-summary-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 16px;
        margin-top: 22px;
      }

      .citation-summary-metric {
        min-width: 0;
        padding: 24px;
        border: 1px solid var(--line);
        border-radius: 14px;
        background: linear-gradient(145deg, #ffffff, #f5f8fd);
        box-shadow: 0 10px 28px rgba(7, 26, 61, 0.07);
      }

      .citation-summary-metric small {
        display: block;
        margin-bottom: 8px;
        color: var(--muted);
        font-size: .68rem;
        font-weight: 800;
        letter-spacing: .08em;
        text-transform: uppercase;
      }

      .citation-summary-metric strong {
        display: block;
        overflow-wrap: anywhere;
        color: var(--navy);
        font-size: clamp(1.8rem, 4vw, 3.2rem);
        line-height: 1.05;
      }

      .citation-summary-metric.amount strong {
        color: var(--blue);
      }

      .citation-summary-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        margin-top: 20px;
        padding-top: 18px;
        border-top: 1px solid var(--line);
      }

      .citation-summary-footer p {
        max-width: 620px;
        margin: 0;
        color: var(--muted);
        font-size: .8rem;
      }

      .citation-summary-footer .button {
        flex: 0 0 auto;
      }

      .citation-editor-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 14px;
        margin-top: 14px;
      }

      .citation-editor-note {
        margin: 12px 0 0;
        color: var(--muted);
        font-size: .76rem;
      }

      @media (max-width: 600px) {
        .citation-summary-grid,
        .citation-editor-grid {
          grid-template-columns: 1fr;
        }

        .citation-summary-metric {
          padding: 20px;
        }

        .citation-summary-footer {
          align-items: stretch;
          flex-direction: column;
        }

        .citation-summary-footer .button {
          width: 100%;
        }
      }
    `;
    document.head.appendChild(style);

    const originalCampaignMarkup = campaignMarkup;
    campaignMarkup = function enhancedCampaignMarkup(campaign) {
      if (campaign.id !== CITATION_CAMPAIGN_ID) return originalCampaignMarkup(campaign);

      const totalMetric = campaign.chartMetrics.find((metric) => metric.id === "total-citations");
      const amountMetric = campaign.chartMetrics.find((metric) => metric.id === "overall-amount");
      const totalValue = totalMetric ? accomplishmentValue(totalMetric, totalMetric.year2026) : "—";
      const amountValue = amountMetric ? accomplishmentValue(amountMetric, amountMetric.year2026) : "—";

      return `
        <article class="campaign-card citation-summary-card">
          <div class="campaign-card-heading">
            <div><p class="kicker">Operational accomplishment</p><h3>${escapeHtml(campaign.title)}</h3></div>
            <span class="comparison-chip">Overall total</span>
          </div>
          <div class="inline-report-dates">
            <span><small>Covered period</small><strong>${escapeHtml(campaign.period)}</strong></span>
            <span><small>As of date</small><strong>${escapeHtml(campaign.asOfDate)}</strong></span>
          </div>
          <div class="citation-summary-grid" aria-label="Citation Monitoring overall totals">
            <div class="citation-summary-metric">
              <small>Total number of citations</small>
              <strong>${totalValue}</strong>
            </div>
            <div class="citation-summary-metric amount">
              <small>Overall estimated fines</small>
              <strong>${amountValue}</strong>
            </div>
          </div>
          <div class="citation-summary-footer">
            <p>Totals were calculated from the populated Citation Monitoring workbook tabs. Use Edit figures only if you need to override the current overall totals.</p>
            <a class="button primary" href="${CITATION_SHEET_URL}" target="_blank" rel="noopener noreferrer">Open Citation Monitoring Sheet ↗</a>
          </div>
        </article>`;
    };

    const originalRenderAccomplishments = renderAccomplishments;
    renderAccomplishments = function enhancedRenderAccomplishments() {
      ensureCitationCampaign(state.accomplishments);
      return originalRenderAccomplishments();
    };

    const originalRenderAccomplishmentsEditor = renderAccomplishmentsEditor;
    renderAccomplishmentsEditor = function enhancedRenderAccomplishmentsEditor() {
      const campaign = ensureCitationCampaign(state.accomplishments);
      originalRenderAccomplishmentsEditor();

      const fieldset = [...document.querySelectorAll("#editor-campaigns fieldset")]
        .find((item) => item.querySelector("legend")?.textContent.trim() === "Citation Monitoring");
      if (!fieldset || !campaign) return;

      const totalMetric = campaign.chartMetrics.find((metric) => metric.id === "total-citations");
      const amountMetric = campaign.chartMetrics.find((metric) => metric.id === "overall-amount");

      fieldset.innerHTML = `
        <legend>Citation Monitoring</legend>
        <label class="period-field"><span>Covered period</span><input maxlength="160" value="${escapeHtml(campaign.period)}" data-campaign="${CITATION_CAMPAIGN_ID}" data-period="true" /></label>
        <label class="period-field"><span>As of date</span><input maxlength="80" value="${escapeHtml(campaign.asOfDate)}" data-campaign="${CITATION_CAMPAIGN_ID}" data-as-of="true" /></label>
        <div class="citation-editor-grid">
          <label>
            <span>Total number of citations</span>
            <input aria-label="Total number of citations" type="number" min="0" step="1" value="${totalMetric?.year2026 ?? ""}" data-campaign="${CITATION_CAMPAIGN_ID}" data-collection="chartMetrics" data-metric="total-citations" data-year="year2026" />
          </label>
          <label>
            <span>Overall estimated fines (PHP)</span>
            <input aria-label="Overall estimated fines in Philippine pesos" type="number" min="0" step="0.01" value="${amountMetric?.year2026 ?? ""}" data-campaign="${CITATION_CAMPAIGN_ID}" data-collection="chartMetrics" data-metric="overall-amount" data-year="year2026" />
          </label>
        </div>
        <p class="citation-editor-note">Current workbook totals: 4,197 citations and ₱2,114,300.00 estimated fines. Saving here overrides the displayed totals for all visitors.</p>`;
    };

    renderAccomplishments();
  };

  coreScript.onerror = () => {
    console.error("Unable to load the Consolacion MPS compliance core application.");
  };

  document.head.appendChild(coreScript);
})();