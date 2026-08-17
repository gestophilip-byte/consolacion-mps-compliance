(() => {
  const SUMMARY_URL = "citation-summary.json";
  const CITATION_ID = "citation-monitoring";
  const SPREADSHEET_ID = "121UYJVxFOki-djRQN4pq-9fNtEMMfvVi--eWBNClNx0";
  const CITATION_SHEET_URL =
    `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/edit?gid=0#gid=0`;
  const POLL_INTERVAL = 60 * 1000;
  const SHEET_GIDS = [
    0,
    689076678,
    1536113601,
    927535692,
    75072311,
    1032422677,
    666458955,
    657545645,
    515491966,
    836382183,
    1728777794,
    1664455865,
    2053601195,
    107907399,
    1237231537,
    920551843,
    921782154,
    1985787728,
    262652188,
    33588465,
    172126045,
    1547719091,
    502800720,
    272445291,
    1876508346,
    377720584,
    1570601412,
    290315774,
    903577498,
    897063277,
    887798000,
    1796399783,
    1800528413,
    432593483,
    433087257,
    300963544,
  ];

  let latestSummary = null;
  let installed = false;
  let directRefreshRunning = false;
  let googleLoaderPromise = null;

  function normalize(value) {
    return String(value ?? "").trim().replace(/\s+/g, " ").toLowerCase();
  }

  function numericValue(value) {
    if (value === null || value === undefined || value === "") return null;
    if (typeof value === "number") return Number.isFinite(value) ? value : null;
    const parsed = Number(
      String(value)
        .replaceAll(",", "")
        .replaceAll("₱", "")
        .replace(/PHP/gi, "")
        .trim(),
    );
    return Number.isFinite(parsed) ? parsed : null;
  }

  function findColumn(row, phrases) {
    for (let index = 0; index < row.length; index += 1) {
      const text = normalize(row[index]);
      if (phrases.some((phrase) => text.includes(phrase))) return index;
    }
    return null;
  }

  function isCitationHeader(row) {
    return findColumn(row, [
      "total no. of issued citation",
      "total no of issued citation",
    ]) !== null;
  }

  function summarizeRows(rows) {
    let citations = 0;
    let fines = 0;
    let blocks = 0;
    let index = 0;

    while (index < rows.length) {
      const header = rows[index] || [];
      const citationColumn = findColumn(header, [
        "total no. of issued citation",
        "total no of issued citation",
      ]);

      if (citationColumn === null) {
        index += 1;
        continue;
      }

      let fineColumn = findColumn(header, ["estimated fine", "estimated fines"]);
      if (fineColumn === null) {
        for (const lookback of [1, 2]) {
          if (index - lookback < 0) break;
          fineColumn = findColumn(rows[index - lookback] || [], [
            "estimated fine",
            "estimated fines",
          ]);
          if (fineColumn !== null) break;
        }
      }

      let rowIndex = index + 1;
      while (rowIndex < rows.length) {
        const row = rows[rowIndex] || [];
        const firstCell = normalize(row[0]);
        if (isCitationHeader(row) || firstCell === "total") break;

        const citation = numericValue(row[citationColumn]);
        const fine = fineColumn === null ? null : numericValue(row[fineColumn]);
        if (citation !== null) citations += citation;
        if (fine !== null) fines += fine;
        rowIndex += 1;
      }

      blocks += 1;
      index = Math.max(rowIndex, index + 1);
    }

    return { citations, fines, blocks };
  }

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
    campaign.liveSource = latestSummary.liveSource || "published-fallback";
  }

  function decorateCitationCard() {
    const card = document.querySelector(".citation-summary-card");
    if (!card || state.activeAccomplishmentCampaign !== CITATION_ID) return;

    const note = card.querySelector(".citation-summary-footer p");
    if (note) {
      note.textContent = latestSummary?.liveSource === "google-sheet-live"
        ? "Live from the Citation Monitoring Google Sheet. The website recalculates the underlying citation and fine entries every minute."
        : "Showing the latest published Citation Monitoring calculation while the direct Google Sheet connection retries automatically.";
    }

    const chip = card.querySelector(".comparison-chip");
    if (chip) {
      chip.textContent = latestSummary?.liveSource === "google-sheet-live"
        ? "Live sheet"
        : "Auto synced";
    }
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

  function loadGoogleVisualization() {
    if (window.google?.visualization?.Query) return Promise.resolve();
    if (googleLoaderPromise) return googleLoaderPromise;

    googleLoaderPromise = new Promise((resolve, reject) => {
      const finishLoad = () => {
        if (!window.google?.charts) {
          reject(new Error("Google Charts loader is unavailable."));
          return;
        }
        google.charts.load("current", { packages: ["table"] });
        google.charts.setOnLoadCallback(() => resolve());
      };

      const existing = document.querySelector('script[data-citation-google-loader="true"]');
      if (existing) {
        if (window.google?.charts) finishLoad();
        else existing.addEventListener("load", finishLoad, { once: true });
        return;
      }

      const script = document.createElement("script");
      script.src = "https://www.gstatic.com/charts/loader.js";
      script.async = true;
      script.dataset.citationGoogleLoader = "true";
      script.addEventListener("load", finishLoad, { once: true });
      script.addEventListener("error", () => reject(new Error("Unable to load Google Charts.")), { once: true });
      document.head.appendChild(script);
    });

    return googleLoaderPromise;
  }

  function querySheet(gid) {
    return new Promise((resolve, reject) => {
      const url =
        `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq` +
        `?gid=${gid}&headers=0&range=A1:J200&tq=${encodeURIComponent("select *")}` +
        `&tqx=out:json&v=${Date.now()}`;
      const query = new google.visualization.Query(url);
      query.send((response) => {
        if (response.isError()) {
          reject(new Error(response.getDetailedMessage?.() || response.getMessage?.() || `Sheet ${gid} query failed.`));
          return;
        }

        const table = response.getDataTable();
        const rows = [];
        for (let rowIndex = 0; rowIndex < table.getNumberOfRows(); rowIndex += 1) {
          const row = [];
          for (let colIndex = 0; colIndex < table.getNumberOfColumns(); colIndex += 1) {
            const raw = table.getValue(rowIndex, colIndex);
            row.push(raw === null || raw === undefined ? table.getFormattedValue(rowIndex, colIndex) : raw);
          }
          rows.push(row);
        }
        resolve(rows);
      });
    });
  }

  async function refreshFromGoogleSheet() {
    if (directRefreshRunning) return;
    directRefreshRunning = true;

    try {
      await loadGoogleVisualization();

      let totalCitations = 0;
      let overallFines = 0;
      let populatedSheets = 0;
      let monitoringBlocks = 0;
      let successfulSheets = 0;

      const batchSize = 6;
      for (let start = 0; start < SHEET_GIDS.length; start += batchSize) {
        const gids = SHEET_GIDS.slice(start, start + batchSize);
        const results = await Promise.allSettled(gids.map((gid) => querySheet(gid)));

        results.forEach((result) => {
          if (result.status !== "fulfilled") return;
          successfulSheets += 1;
          const summary = summarizeRows(result.value);
          if (summary.citations || summary.fines) populatedSheets += 1;
          totalCitations += summary.citations;
          overallFines += summary.fines;
          monitoringBlocks += summary.blocks;
        });
      }

      if (successfulSheets === 0) {
        throw new Error("No Citation Monitoring tabs could be read directly.");
      }

      latestSummary = {
        source: "Citation Monitoring",
        spreadsheetId: SPREADSHEET_ID,
        totalCitations: Math.round(totalCitations),
        overallEstimatedFines: Math.round(overallFines * 100) / 100,
        currency: "PHP",
        sheetCount: SHEET_GIDS.length,
        populatedSheetCount: populatedSheets,
        monitoringBlockCount: monitoringBlocks,
        calculatedAt: new Date().toISOString(),
        liveSource: "google-sheet-live",
      };

      applySummary();
      renderAccomplishments();
    } catch (error) {
      console.warn("Direct Citation Monitoring sync is temporarily unavailable.", error);
    } finally {
      directRefreshRunning = false;
    }
  }

  async function refreshPublishedFallback() {
    try {
      const response = await fetch(`${SUMMARY_URL}?v=${Date.now()}`, { cache: "no-store" });
      if (!response.ok) throw new Error(`Citation summary HTTP ${response.status}`);
      const published = await response.json();
      if (latestSummary?.liveSource === "google-sheet-live") return;
      latestSummary = { ...published, liveSource: "published-fallback" };
      applySummary();
      renderAccomplishments();
    } catch (error) {
      console.warn("Published Citation Monitoring fallback is temporarily unavailable.", error);
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

    refreshPublishedFallback();
    refreshFromGoogleSheet();
    window.setInterval(refreshFromGoogleSheet, POLL_INTERVAL);
    window.setInterval(refreshPublishedFallback, 5 * POLL_INTERVAL);
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
