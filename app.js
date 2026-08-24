(() => {
  const CITATION_CAMPAIGN_ID = "citation-monitoring";
  const CITATION_SHEET_URL = "https://docs.google.com/spreadsheets/d/121UYJVxFOki-djRQN4pq-9fNtEMMfvVi--eWBNClNx0/edit?gid=0#gid=0";
  const SCHOOL_SECURITY_URL = "https://docs.google.com/spreadsheets/d/1ozHWBxWvAPvtRIGD7MEIiDlXAc7N1IIYupjgforTISo/edit?usp=drivesdk";
  const PUROK_SECURITY_URL = "https://docs.google.com/spreadsheets/d/11AQOOhourpIpSZqfJhywbKk2B37JWR6qB7Vm9OgtCcQ/edit?usp=drivesdk";

  const coreScript = document.createElement("script");
  coreScript.src = "app-core.js";

  coreScript.onload = () => {
    const schoolSecurityItem = complianceItems.find((item) => item.id === "daily-duty-personnel-schools");
    if (schoolSecurityItem) {
      schoolSecurityItem.title = "Inventory of Security of Schools";
      schoolSecurityItem.description = "Inventory and monitoring of security coverage and deployed personnel for schools.";
      schoolSecurityItem.href = SCHOOL_SECURITY_URL;
      schoolSecurityItem.frequency = "Daily / Inventory";
    }

    const purokSecurityId = "inventory-purok-barangay-activities-fiestas-security";
    if (!complianceItems.some((item) => item.id === purokSecurityId)) {
      complianceItems.push({
        id: purokSecurityId,
        title: "Inventory on Purok, Brgy., Major Municipal/City Activity/Fiestas Provided with Security (June 25, 2026 to August 16, 2026)",
        description: "Inventory of security provided for purok and barangay activities, major municipal/city activities, and fiestas for the covered period.",
        href: PUROK_SECURITY_URL,
        frequency: "Inventory",
      });
      state.statuses[purokSecurityId] = false;
      state.statusSources[purokSecurityId] = "manual-check";
    }

    const defaultCitationCampaign = () => ({
      id: CITATION_CAMPAIGN_ID,
      title: "Citation Monitoring",
      period: "Complete Citation Monitoring workbook",
      asOfDate: "Verified automatic calculation",
      summaryOnly: true,
      sourceHref: CITATION_SHEET_URL,
      chartMetrics: [
        { id: "total-citations", label: "Total Citations", year2025: null, year2026: 4274 },
        { id: "overall-amount", label: "Overall Estimated Fines", year2025: null, year2026: 2119600, kind: "currency" },
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
      campaign.title = defaults.title;
      campaign.summaryOnly = true;
      campaign.sourceHref = CITATION_SHEET_URL;
      campaign.period = campaign.period || defaults.period;
      campaign.asOfDate = campaign.asOfDate || defaults.asOfDate;
      const existing = Array.isArray(campaign.chartMetrics) ? campaign.chartMetrics : [];
      campaign.chartMetrics = defaults.chartMetrics.map((metric) => ({
        ...metric,
        ...(existing.find((item) => item.id === metric.id) || {}),
      }));
      return campaign;
    }

    ensureCitationCampaign(defaultAccomplishments);
    ensureCitationCampaign(state.accomplishments);

    const originalCampaignMarkup = campaignMarkup;
    campaignMarkup = function commandCampaignMarkup(campaign) {
      if (campaign.id !== CITATION_CAMPAIGN_ID) return originalCampaignMarkup(campaign);
      const totalMetric = campaign.chartMetrics.find((metric) => metric.id === "total-citations");
      const amountMetric = campaign.chartMetrics.find((metric) => metric.id === "overall-amount");
      const totalValue = totalMetric ? accomplishmentValue(totalMetric, totalMetric.year2026) : "—";
      const amountValue = amountMetric ? accomplishmentValue(amountMetric, amountMetric.year2026) : "—";
      return `
        <article class="campaign-card citation-summary-card">
          <div class="campaign-card-heading">
            <div><p class="kicker">Verified operational data</p><h3>${escapeHtml(campaign.title)}</h3></div>
            <span class="comparison-chip">Verified sync</span>
          </div>
          <div class="inline-report-dates">
            <span><small>Covered period</small><strong>${escapeHtml(campaign.period)}</strong></span>
            <span><small>As of date</small><strong>${escapeHtml(campaign.asOfDate)}</strong></span>
          </div>
          <div class="citation-summary-grid" aria-label="Citation Monitoring verified totals">
            <div class="citation-summary-metric"><small>Total number of citations</small><strong>${totalValue}</strong></div>
            <div class="citation-summary-metric amount"><small>Overall estimated fines</small><strong>${amountValue}</strong></div>
          </div>
          <div class="citation-summary-footer">
            <p>Automatically calculated from the complete Citation Monitoring workbook. Partial browser-tab calculations are not used.</p>
            <a class="button primary" href="${CITATION_SHEET_URL}" target="_blank" rel="noopener noreferrer">Open Citation Monitoring Sheet ↗</a>
          </div>
        </article>`;
    };

    const originalRenderAccomplishments = renderAccomplishments;
    renderAccomplishments = function commandRenderAccomplishments() {
      ensureCitationCampaign(state.accomplishments);
      return originalRenderAccomplishments();
    };

    const originalRenderEditor = renderAccomplishmentsEditor;
    renderAccomplishmentsEditor = function commandRenderEditor() {
      originalRenderEditor();
      const fieldset = [...document.querySelectorAll("#editor-campaigns fieldset")]
        .find((item) => item.querySelector("legend")?.textContent.trim() === "Citation Monitoring");
      if (!fieldset) return;
      fieldset.innerHTML = `
        <legend>Citation Monitoring</legend>
        <p class="citation-editor-note">Citation totals are automatic and cannot be manually overridden here. Update the Citation Monitoring Google Sheet and the verified workbook summary will refresh automatically.</p>
        <a class="button primary" href="${CITATION_SHEET_URL}" target="_blank" rel="noopener noreferrer">Open Citation Monitoring Sheet ↗</a>`;
    };

    let complianceFilter = "all";

    function compactCurrency(value) {
      const number = Number(value);
      if (!Number.isFinite(number)) return "—";
      return new Intl.NumberFormat("en-PH", {
        style: "currency",
        currency: "PHP",
        notation: "compact",
        maximumFractionDigits: 2,
      }).format(number);
    }

    function numberText(value) {
      const number = Number(value);
      return Number.isFinite(number) ? number.toLocaleString("en-PH") : "—";
    }

    function syncCommandOverview() {
      const total = complianceItems.length;
      const completed = complianceItems.filter((item) => Boolean(state.statuses[item.id])).length;
      const pendingItems = complianceItems.filter((item) => !state.statuses[item.id]);
      const pending = Math.max(0, total - completed);

      const pendingNode = document.querySelector("#overview-pending");
      if (pendingNode) pendingNode.textContent = String(pending);

      const citation = state.accomplishments?.campaigns?.find((item) => item.id === CITATION_CAMPAIGN_ID);
      const citationCount = citation?.chartMetrics?.find((item) => item.id === "total-citations")?.year2026;
      const citationFines = citation?.chartMetrics?.find((item) => item.id === "overall-amount")?.year2026;
      ["#overview-citations", "#overview-citations-detail"].forEach((selector) => {
        const node = document.querySelector(selector);
        if (node) node.textContent = numberText(citationCount);
      });
      ["#overview-fines", "#overview-fines-detail"].forEach((selector) => {
        const node = document.querySelector(selector);
        if (node) node.textContent = compactCurrency(citationFines);
      });

      const katok = state.oplanKatok || {};
      const mappings = {
        "#overview-katok": katok.masterRecords,
        "#overview-katok-master": katok.masterRecords,
        "#overview-katok-individuals": katok.individuals,
        "#overview-katok-arms": katok.smallArms,
        "#overview-katok-weapons": katok.lightWeapons,
      };
      Object.entries(mappings).forEach(([selector, value]) => {
        const node = document.querySelector(selector);
        if (node) node.textContent = numberText(value);
      });

      const action = document.querySelector("#attention-action");
      if (action) {
        action.textContent = pending
          ? `${pending} ITEM${pending === 1 ? "" : "S"} REQUIRE ATTENTION`
          : "ALL REQUIRED REPORTS COMPLIED";
        action.classList.toggle("all-clear", pending === 0);
      }

      const attention = document.querySelector("#overview-attention-list");
      if (attention) {
        attention.innerHTML = pendingItems.length
          ? pendingItems.slice(0, 6).map((item) => `
              <div class="attention-row">
                <div><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.frequency)} requirement</small></div>
                <span class="status-pill pending">● PENDING</span>
              </div>`).join("")
          : '<div class="attention-row"><div><strong>All requirements complied</strong><small>No outstanding compliance items for the current status.</small></div><span class="status-pill ok">● CLEAR</span></div>';
      }

      applyComplianceFilter();
    }

    function applyComplianceFilter() {
      document.querySelectorAll("#compliance-list .compliance-item").forEach((item) => {
        const complied = item.classList.contains("is-complied");
        const frequency = item.querySelector(".frequency")?.textContent.toLowerCase() || "";
        let show = true;
        if (complianceFilter === "pending") show = !complied;
        if (complianceFilter === "complied") show = complied;
        if (complianceFilter === "daily") show = frequency.includes("daily");
        if (complianceFilter === "weekly") show = frequency.includes("weekly");
        item.hidden = !show;
      });
    }

    function closeSidebar() {
      document.querySelector("#command-sidebar")?.classList.remove("open");
      const scrim = document.querySelector("#sidebar-scrim");
      if (scrim) scrim.hidden = true;
      const toggle = document.querySelector("#mobile-menu-toggle");
      if (toggle) toggle.setAttribute("aria-expanded", "false");
    }

    function showCommandPage(page, control = null) {
      const target = ["overview", "calendar", "sitrep", "compliance"].includes(page) ? page : "overview";
      document.querySelectorAll("[data-command-page-panel]").forEach((section) => {
        section.hidden = section.dataset.commandPagePanel !== target;
      });

      const workspace = control?.dataset.commandWorkspace;
      const campaign = control?.dataset.commandCampaign;
      if (target === "compliance" && workspace && typeof setWorkspace === "function") {
        setWorkspace(workspace, { scroll: false });
      }
      if (campaign) {
        state.activeAccomplishmentCampaign = campaign;
        renderAccomplishments();
      }

      document.querySelectorAll(".command-nav a").forEach((link) => link.classList.toggle("active", link === control));
      if (target === "overview" && !control) document.querySelector('.command-nav a[data-command-page="overview"]')?.classList.add("active");

      const titleMap = {
        overview: "Operations Command & Compliance Center",
        calendar: "Operations Calendar",
        sitrep: "Hourly SITREP Monitoring",
        "google-links": "Compliance Requirements",
        aars: "After-Activity Reports",
        accomplishments: campaign ? "Citation Monitoring" : "Operational Accomplishments",
        "focus-crime": "8 Focus Crime",
        "oplan-katok": "Oplan Katok Monitoring",
        map: "Google Map Compliance",
      };
      const title = document.querySelector("#command-page-title");
      if (title) title.textContent = target === "compliance" ? (titleMap[workspace] || "Compliance Workspaces") : titleMap[target];
      closeSidebar();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }

    function activateControl(control) {
      if (!control) return;
      showCommandPage(control.dataset.commandPage || "overview", control);
      const href = control.getAttribute("href");
      if (href?.startsWith("#")) history.replaceState(null, "", href);
    }

    document.querySelectorAll("[data-command-page]").forEach((control) => {
      control.addEventListener("click", (event) => {
        event.preventDefault();
        activateControl(control);
      });
    });

    document.querySelectorAll("[data-command-jump]").forEach((button) => {
      button.addEventListener("click", () => {
        const jump = button.dataset.commandJump;
        const selector = jump === "citation-monitoring"
          ? '[data-command-campaign="citation-monitoring"]'
          : `[data-command-workspace="${jump}"]`;
        activateControl(document.querySelector(`.command-nav ${selector}`));
      });
    });

    document.querySelectorAll("[data-compliance-filter]").forEach((button) => {
      button.addEventListener("click", () => {
        complianceFilter = button.dataset.complianceFilter;
        document.querySelectorAll("[data-compliance-filter]").forEach((item) => item.classList.toggle("active", item === button));
        applyComplianceFilter();
      });
    });

    const openPending = () => {
      const complianceControl = document.querySelector('.command-nav [data-command-workspace="google-links"]');
      activateControl(complianceControl);
      complianceFilter = "pending";
      document.querySelectorAll("[data-compliance-filter]").forEach((button) => button.classList.toggle("active", button.dataset.complianceFilter === "pending"));
      applyComplianceFilter();
    };
    document.querySelector("#attention-action")?.addEventListener("click", openPending);
    document.querySelector("[data-open-pending]")?.addEventListener("click", openPending);

    const menuToggle = document.querySelector("#mobile-menu-toggle");
    const sidebar = document.querySelector("#command-sidebar");
    const scrim = document.querySelector("#sidebar-scrim");
    menuToggle?.addEventListener("click", () => {
      const open = !sidebar.classList.contains("open");
      sidebar.classList.toggle("open", open);
      menuToggle.setAttribute("aria-expanded", String(open));
      if (scrim) scrim.hidden = !open;
    });
    scrim?.addEventListener("click", closeSidebar);
    document.addEventListener("keydown", (event) => { if (event.key === "Escape") closeSidebar(); });

    function activateFromHash() {
      const hash = window.location.hash;
      const map = {
        "#overview": '[data-command-page="overview"]',
        "#calendar": '[data-command-page="calendar"]',
        "#sitrep": '[data-command-page="sitrep"]',
        "#compliance": '[data-command-workspace="google-links"]',
        "#accomplishments": '[data-command-workspace="accomplishments"]:not([data-command-campaign])',
        "#citation-monitoring": '[data-command-campaign="citation-monitoring"]',
        "#focus-crime": '[data-command-workspace="focus-crime"]',
        "#oplan-katok": '[data-command-workspace="oplan-katok"]',
        "#aars": '[data-command-workspace="aars"]',
        "#map": '[data-command-workspace="map"]',
      };
      const control = document.querySelector(`.command-nav ${map[hash] || map["#overview"]}`);
      showCommandPage(control?.dataset.commandPage || "overview", control);
    }

    renderCompliance();
    renderAccomplishments();
    syncCommandOverview();
    activateFromHash();
    window.setInterval(syncCommandOverview, 1500);
  };

  coreScript.onerror = () => console.error("Unable to load the Consolacion MPS compliance core application.");
  document.head.appendChild(coreScript);
})();