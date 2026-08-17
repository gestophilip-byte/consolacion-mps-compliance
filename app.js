const API_BASE = "https://work-compliance-portal.gestophilip.chatgpt.site";

const complianceItems = [
  {
    id: "daily-patrol-operations-report",
    title: "Daily Patrol Operations Report",
    description: "Covered period from 6:00 AM to 6:00 AM the following day.",
    href: "https://drive.google.com/drive/folders/1HqQPTS6oCUgAw5iu5RoPY0FhBOi-XPBZ?usp=sharing",
    frequency: "Daily",
  },
  {
    id: "police-response-outside-e911",
    title: "Police Response Outside E911",
    description: "Daily monitoring record for police responses outside E911.",
    href: "https://docs.google.com/spreadsheets/d/1HiZwJdH8YaEgqvKvEL7bX-0rW_lE8vBqIeb_ITulLcc/edit?usp=sharing",
    frequency: "Daily",
  },
  {
    id: "pds-daily-monitoring-e911",
    title: "PDs Daily Monitoring — E911 Hotline",
    description: "Daily E911 hotline monitoring and response encoding sheet.",
    href: "https://docs.google.com/spreadsheets/d/1JND8GorUPVi3ssfB3_0MfC7LOWEqzLyAg62MhIr7j1A/edit?gid=0#gid=0",
    frequency: "Daily",
  },
  {
    id: "pds-daily-monitoring-simex-commex",
    title: "PDs Daily Monitoring — SIMEX/COMMEX",
    description: "Daily monitoring and encoding for SIMEX/COMMEX activities.",
    href: "https://docs.google.com/spreadsheets/d/1SskPtnrWCK9gM17O8MASkEt6DYwC9JhfKBs9OZMEpu8/edit?gid=0#gid=0",
    frequency: "Daily",
  },
  {
    id: "ccpo-emergency-alert-button",
    title: "CCPO Monitoring — Emergency Alert Button App",
    description: "Police response monitoring from the Emergency Alert Button application.",
    href: "https://docs.google.com/spreadsheets/d/1Vsal5aG3SW0EGFLeMm6w8ohCEGBZwr9w9V3n9_ATIMA/edit?gid=0#gid=0",
    frequency: "Daily",
  },
  {
    id: "weekly-drone-patrolling",
    title: "Weekly Drone Patrolling Accomplishment",
    description: "Weekly drone patrol activity and accomplishment monitoring.",
    href: "https://docs.google.com/spreadsheets/d/1mHyxCiUq5N_N-mu0Uz3aNiN2tkdGyCk3yv1ELTAoK8o/edit?gid=0#gid=0",
    frequency: "Weekly",
  },
  {
    id: "daily-duty-personnel-schools",
    title: "Daily Actual Duty Personnel on Schools",
    description: "Daily encoding of actual duty personnel deployed to schools.",
    href: "https://docs.google.com/spreadsheets/d/1ozHWBxWvAPvtRIGD7MEIiDlXAc7N1IIYupjgforTISo/edit?usp=sharing",
    frequency: "Daily",
  },
  {
    id: "checkpoint-local-traffic-ordinances",
    title: "Checkpoint Operations — Local and Traffic Ordinances",
    description: "Daily accomplishment monitoring for checkpoint and ordinance enforcement.",
    href: "https://docs.google.com/spreadsheets/d/1flE2nnLPsyXQmqTilKVyuuHzf1v1qrxhDXIGELUfhlU/edit?gid=0#gid=0",
    frequency: "Daily",
  },
  {
    id: "foreign-tourist-incidents",
    title: "Foreign Tourist Incident Monitoring",
    description: "Daily monitoring of incidents involving foreign tourists.",
    href: "https://docs.google.com/spreadsheets/d/17dxyVdGf_DQ9aW24WJTn72Z7UyQf75Dv1zZOvFgqd1c/edit?usp=sharing",
    frequency: "Daily",
  },
  {
    id: "cppo-google-forms-5-6-7",
    title: "CPPO Google Forms 5, 6 and 7",
    description: "Daily CPPO monitoring and encoding for Google Forms 5, 6 and 7.",
    href: "https://docs.google.com/spreadsheets/d/1YPJG0eSoaK2VutXOw3TJKA1h_BoI4Qac5DAqsIcBb1M/edit?gid=0#gid=0",
    frequency: "Daily",
  },
  {
    id: "cppo-deployment-forms-1-4",
    title: "CPPO Deployment Forms 1–4",
    description: "Weekly deployment monitoring for Forms 1, 2, 3 and 4.",
    href: "https://docs.google.com/spreadsheets/d/1-k1EN7IB7bnIGMCNyg9cVQjwArxzfLnkncy7MBIsknk/edit?gid=200488509#gid=200488509",
    frequency: "Weekly",
  },
  {
    id: "citation-monitoring",
    title: "Citation Monitoring",
    description: "Daily monitoring and encoding of issued citations and related activity.",
    href: "https://docs.google.com/spreadsheets/d/121UYJVxFOki-djRQN4pq-9fNtEMMfvVi--eWBNClNx0/edit?gid=0#gid=0",
    frequency: "Daily",
  },
];

const defaultAccomplishments = {
  updatedAt: null,
  focusCrime: {
    title: "8 Focus Crime",
    coveredPeriod: "1 January – 17 August 2026",
    asOfDate: "17 August 2026",
    metrics: [
      { id: "murder", label: "Murder", value: 1, color: "#249326" },
      { id: "homicide", label: "Homicide", value: 1, color: "#2e2aff" },
      { id: "physical-injury", label: "Physical Injury", value: 4, color: "#ffb327" },
      { id: "rape", label: "Rape", value: 6, color: "#d4863c" },
      { id: "robbery", label: "Robbery", value: 3, color: "#72b2dc" },
      { id: "theft", label: "Theft", value: 8, color: "#d4796f" },
      { id: "carnapping-mv", label: "Carnapping MV", value: 0, color: "#61356f" },
      { id: "carnapping-mc", label: "Carnapping MC", value: 0, color: "#5e696c" },
    ],
  },
  workspaceReports: {
    googleLinks: { coveredPeriod: "Current daily and weekly reporting cycle", asOfDate: "17 August 2026" },
    aars: { coveredPeriod: "Current operational reporting period", asOfDate: "17 August 2026" },
    oplanKatok: { coveredPeriod: "Master list through 17 August 2026", asOfDate: "17 August 2026" },
    googleMap: { coveredPeriod: "Current compliance monitoring coverage", asOfDate: "17 August 2026" },
  },
  campaigns: [
    {
      id: "illegal-drugs",
      title: "Campaign Against Illegal Drugs",
      period: "1 January – 31 July 2025 vs 1 January – 31 July 2026",
      asOfDate: "31 July 2026",
      chartMetrics: [
        { id: "operations", label: "Operations", year2025: 51, year2026: 48 },
        { id: "persons-arrested", label: "Persons arrested", year2025: 110, year2026: 67 },
        { id: "high-value", label: "High-value", year2025: 3, year2026: 1 },
        { id: "street-level", label: "Street-level", year2025: 38, year2026: 20 },
        { id: "newly-identified", label: "Newly identified", year2025: 69, year2026: 46 },
      ],
      tableTitle: "Illegal drugs confiscated",
      tableMetrics: [
        { id: "shabu-grams", label: "Shabu (grams)", year2025: 922.05, year2026: 104.71, kind: "decimal" },
        { id: "marijuana-leaves", label: "Marijuana dried leaves (g)", year2025: null, year2026: 6, kind: "decimal" },
        { id: "marijuana-plants", label: "Marijuana plants (stalks)", year2025: null, year2026: null },
        { id: "estimated-value", label: "Estimated value", year2025: 6269940, year2026: 712748, kind: "currency" },
      ],
    },
    {
      id: "wanted-persons",
      title: "Campaign Against Wanted Persons",
      period: "1 January – 31 July 2025 vs 1 January – 31 July 2026",
      asOfDate: "31 July 2026",
      chartMetrics: [
        { id: "warrants-served", label: "Warrants served", year2025: 38, year2026: 44 },
        { id: "operations", label: "Operations", year2025: 38, year2026: 44 },
        { id: "persons-arrested", label: "Persons arrested", year2025: 38, year2026: 44 },
        { id: "most-wanted", label: "Most Wanted Persons", year2025: 4, year2026: 3 },
        { id: "other-wanted", label: "Other wanted persons", year2025: 34, year2026: 41 },
      ],
    },
    {
      id: "illegal-gambling",
      title: "Campaign Against Illegal Gambling",
      period: "1 January – 31 July 2025 vs 1 January – 31 July 2026",
      asOfDate: "31 July 2026",
      chartMetrics: [
        { id: "operations-conducted", label: "Operations conducted", year2025: 38, year2026: 19 },
        { id: "persons-arrested", label: "Persons arrested", year2025: 43, year2026: 35 },
      ],
      tableTitle: "Confiscated amount",
      tableMetrics: [
        { id: "amount-confiscated", label: "Amount confiscated", year2025: 9758, year2026: 2507, kind: "currency" },
      ],
    },
    {
      id: "loose-firearms",
      title: "Campaign Against Loose Firearms",
      period: "1 January – 31 July 2025 vs 1 January – 31 July 2026",
      asOfDate: "31 July 2026",
      chartMetrics: [
        { id: "total-operations", label: "Total operations", year2025: 8, year2026: 5 },
        { id: "arrested-suspects", label: "Arrested suspects", year2025: 8, year2026: 5 },
        { id: "fas-seized", label: "FAs seized / recovered", year2025: 8, year2026: 5 },
        { id: "oplan-katok-operations", label: "Oplan Katok operations", year2025: 8, year2026: 0 },
        { id: "police-response", label: "Police response", year2025: 8, year2026: 9 },
        { id: "search-warrants", label: "Search warrants", year2025: 4, year2026: 2 },
        { id: "fas-surrendered", label: "FAs surrendered", year2025: 8, year2026: 9 },
        { id: "fas-accounted", label: "FAs accounted (total)", year2025: 24, year2026: 14 },
      ],
    },
  ],
};

const state = {
  activities: [],
  statuses: Object.fromEntries(complianceItems.map((item) => [item.id, false])),
  accomplishments: structuredClone(defaultAccomplishments),
  activeAccomplishmentCampaign: defaultAccomplishments.campaigns[0].id,
  activeWorkspace: "google-links",
  oplanKatok: {
    masterRecords: 357,
    individuals: 237,
    smallArms: 326,
    lightWeapons: 17,
    syncedAt: null,
  },
  todayKey: localDateKey(new Date()),
  tomorrowKey: localDateKey(addDays(new Date(), 1)),
  month: startOfMonth(new Date()),
};

function accomplishmentValue(metric, value) {
  if (value === null || value === undefined || value === "") return "—";
  if (metric.kind === "currency") {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      maximumFractionDigits: 2,
    }).format(value);
  }
  return new Intl.NumberFormat("en-PH", {
    maximumFractionDigits: metric.kind === "decimal" ? 2 : 0,
  }).format(value);
}

function accomplishmentsUpdatedLabel(value) {
  if (!value) return "Using the figures supplied in the current accomplishment report.";
  const normalized = value.includes("T") ? value : `${value.replace(" ", "T")}Z`;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return "Saved figures are active.";
  return `Last updated ${new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date)}.`;
}

function campaignTableMarkup(campaign) {
  if (!campaign.tableMetrics?.length) return "";
  return `
    <div class="campaign-table-wrap">
      <table class="campaign-table">
        <thead><tr><th>${escapeHtml(campaign.tableTitle || "Indicator")}</th><th>2025</th><th>2026</th>${campaign.id === "illegal-gambling" ? "<th>Variance</th>" : ""}</tr></thead>
        <tbody>${campaign.tableMetrics.map((metric) => {
          const variance = (metric.year2026 || 0) - (metric.year2025 || 0);
          return `<tr><td>${escapeHtml(metric.label)}</td><td>${accomplishmentValue(metric, metric.year2025)}</td><td>${accomplishmentValue(metric, metric.year2026)}</td>${campaign.id === "illegal-gambling" ? `<td class="${variance < 0 ? "negative" : "positive"}">${accomplishmentValue(metric, variance)}</td>` : ""}</tr>`;
        }).join("")}</tbody>
      </table>
    </div>`;
}

function campaignMarkup(campaign) {
  const maximum = Math.max(1, ...campaign.chartMetrics.flatMap((metric) => [metric.year2025 || 0, metric.year2026 || 0]));
  return `
    <article class="campaign-card">
      <div class="campaign-card-heading">
        <div><p class="kicker">Operational accomplishment</p><h3>${escapeHtml(campaign.title)}</h3></div>
        <span class="comparison-chip">2025 vs 2026</span>
      </div>
      <div class="inline-report-dates">
        <span><small>Covered period</small><strong>${escapeHtml(campaign.period)}</strong></span>
        <span><small>As of date</small><strong>${escapeHtml(campaign.asOfDate)}</strong></span>
      </div>
      <div class="campaign-chart" style="--metric-count:${campaign.chartMetrics.length}" role="img" aria-label="${escapeHtml(campaign.title)}, 2025 and 2026 comparison">
        ${campaign.chartMetrics.map((metric) => `
          <div class="campaign-chart-group">
            <div class="campaign-bars">
              ${["year2025", "year2026"].map((year) => {
                const value = metric[year] || 0;
                const height = value === 0 ? 2 : Math.max(7, (value / maximum) * 100);
                return `<span class="campaign-bar ${year}" style="height:${height}%"><b>${accomplishmentValue(metric, value)}</b></span>`;
              }).join("")}
            </div>
            <small>${escapeHtml(metric.label)}</small>
          </div>`).join("")}
      </div>
      <div class="campaign-legend"><span><i class="year-2025"></i>2025</span><span><i class="year-2026"></i>2026</span></div>
      ${campaignTableMarkup(campaign)}
    </article>`;
}

function renderAccomplishments() {
  const campaigns = state.accomplishments.campaigns;
  if (!campaigns.some((campaign) => campaign.id === state.activeAccomplishmentCampaign)) {
    state.activeAccomplishmentCampaign = campaigns[0]?.id ?? "";
  }

  const switcher = document.querySelector("#campaign-switcher");
  switcher.innerHTML = campaigns.map((campaign) => {
    const active = campaign.id === state.activeAccomplishmentCampaign;
    const shortTitle = campaign.title.replace(/^Campaign Against\s+/i, "");
    return `<button class="${active ? "active" : ""}" type="button" role="tab" aria-selected="${active}" data-campaign-id="${escapeHtml(campaign.id)}">
      <span>${escapeHtml(shortTitle)}</span>
      <small>${active ? "Currently displayed" : "Click to view"}</small>
    </button>`;
  }).join("");
  switcher.querySelectorAll("[data-campaign-id]").forEach((button) => {
    button.addEventListener("click", () => {
      state.activeAccomplishmentCampaign = button.dataset.campaignId;
      renderAccomplishments();
    });
  });

  const activeCampaign = campaigns.find((campaign) => campaign.id === state.activeAccomplishmentCampaign);
  document.querySelector("#campaign-grid").innerHTML = activeCampaign ? campaignMarkup(activeCampaign) : "";
  document.querySelector("#accomplishments-updated").textContent = accomplishmentsUpdatedLabel(state.accomplishments.updatedAt);
}

function editorMetricMarkup(campaign, metric, collection) {
  return `
    <div class="editor-metric-row ${collection === "tableMetrics" ? "table-metric" : ""}">
      <span>${escapeHtml(metric.label)}</span>
      <input aria-label="${escapeHtml(metric.label)} 2025" type="number" min="0" step="any" value="${metric.year2025 ?? ""}" data-campaign="${campaign.id}" data-collection="${collection}" data-metric="${metric.id}" data-year="year2025" />
      <input aria-label="${escapeHtml(metric.label)} 2026" type="number" min="0" step="any" value="${metric.year2026 ?? ""}" data-campaign="${campaign.id}" data-collection="${collection}" data-metric="${metric.id}" data-year="year2026" />
    </div>`;
}

function renderAccomplishmentsEditor() {
  document.querySelector("#editor-campaigns").innerHTML = state.accomplishments.campaigns.map((campaign) => `
    <fieldset>
      <legend>${escapeHtml(campaign.title)}</legend>
      <label class="period-field"><span>Comparison period</span><input maxlength="160" value="${escapeHtml(campaign.period)}" data-campaign="${campaign.id}" data-period="true" /></label>
      <label class="period-field"><span>As of date</span><input maxlength="80" value="${escapeHtml(campaign.asOfDate)}" data-campaign="${campaign.id}" data-as-of="true" /></label>
      <div class="editor-metric-header"><span>Indicator</span><span>2025</span><span>2026</span></div>
      ${campaign.chartMetrics.map((metric) => editorMetricMarkup(campaign, metric, "chartMetrics")).join("")}
      ${(campaign.tableMetrics || []).map((metric) => editorMetricMarkup(campaign, metric, "tableMetrics")).join("")}
    </fieldset>`).join("");
}

function readAccomplishmentsEditor() {
  const next = structuredClone(state.accomplishments);
  document.querySelectorAll("#accomplishments-editor input").forEach((input) => {
    const campaign = next.campaigns.find((item) => item.id === input.dataset.campaign);
    if (!campaign) return;
    if (input.dataset.period) {
      campaign.period = input.value.trim();
      return;
    }
    if (input.dataset.asOf) {
      campaign.asOfDate = input.value.trim();
      return;
    }
    const collection = input.dataset.collection;
    const metric = (campaign[collection] || []).find((item) => item.id === input.dataset.metric);
    if (metric) metric[input.dataset.year] = input.value === "" ? null : Math.max(0, Number(input.value) || 0);
  });
  return next;
}

async function loadAccomplishments() {
  const message = document.querySelector("#accomplishments-message");
  try {
    const data = await request("/api/accomplishments");
    if (data.accomplishments) state.accomplishments = {
      ...defaultAccomplishments,
      ...data.accomplishments,
      focusCrime: { ...defaultAccomplishments.focusCrime, ...(data.accomplishments.focusCrime || {}) },
      workspaceReports: { ...defaultAccomplishments.workspaceReports, ...(data.accomplishments.workspaceReports || {}) },
    };
    message.textContent = "";
    message.className = "accomplishments-message";
  } catch (error) {
    message.textContent = `${error.message} Showing the supplied report figures.`;
    message.className = "accomplishments-message error";
  }
  renderAccomplishments();
  renderFocusCrime();
  renderReportDateHosts();
}

function toggleAccomplishmentsEditor() {
  const editor = document.querySelector("#accomplishments-editor");
  const button = document.querySelector("#accomplishments-edit-toggle");
  const opening = editor.hidden;
  editor.hidden = !opening;
  button.textContent = opening ? "Close editor" : "Edit figures";
  if (opening) renderAccomplishmentsEditor();
}

async function saveAccomplishments(event) {
  event.preventDefault();
  const editor = event.currentTarget;
  const button = editor.querySelector("button[type='submit']");
  const message = document.querySelector("#accomplishments-message");
  button.disabled = true;
  button.textContent = "Saving figures…";
  message.textContent = "Saving the updated figures for all visitors…";
  message.className = "accomplishments-message";
  try {
    const data = await request("/api/accomplishments", {
      method: "POST",
      body: JSON.stringify(readAccomplishmentsEditor()),
    });
    state.accomplishments = data.accomplishments;
    renderAccomplishments();
    editor.hidden = true;
    document.querySelector("#accomplishments-edit-toggle").textContent = "Edit figures";
    message.textContent = "Figures saved. The public charts and tables are now updated.";
    message.className = "accomplishments-message success";
  } catch (error) {
    message.textContent = error.message;
    message.className = "accomplishments-message error";
  } finally {
    button.disabled = false;
    button.textContent = "Save all figures";
  }
}

function renderFocusCrime() {
  const focusCrime = state.accomplishments.focusCrime || defaultAccomplishments.focusCrime;
  const maximum = Math.max(1, ...focusCrime.metrics.map((metric) => metric.value));
  document.querySelector("#focus-crime-dates").innerHTML = `
    <span><small>Covered period</small><strong>${escapeHtml(focusCrime.coveredPeriod)}</strong></span>
    <span><small>As of date</small><strong>${escapeHtml(focusCrime.asOfDate)}</strong></span>`;
  const chart = document.querySelector("#focus-crime-chart");
  chart.style.setProperty("--crime-count", focusCrime.metrics.length);
  chart.innerHTML = focusCrime.metrics.map((metric) => {
    const height = metric.value === 0 ? 2 : Math.max(8, (metric.value / maximum) * 100);
    return `<div class="focus-crime-group">
      <div class="focus-crime-bar-space"><span class="focus-crime-bar" style="height:${height}%;background:${metric.color}"><b>${metric.value}</b></span></div>
      <small>${escapeHtml(metric.label)}</small>
    </div>`;
  }).join("");
  document.querySelector("#focus-crime-legend").innerHTML = focusCrime.metrics
    .map((metric) => `<span><i style="background:${metric.color}"></i>${escapeHtml(metric.label)}</span>`)
    .join("");
}

function renderFocusCrimeEditor() {
  const focusCrime = state.accomplishments.focusCrime || defaultAccomplishments.focusCrime;
  document.querySelector("#focus-crime-date-inputs").innerHTML = `
    <label><span>Covered period</span><input maxlength="160" value="${escapeHtml(focusCrime.coveredPeriod)}" data-focus-date="coveredPeriod" /></label>
    <label><span>As of date</span><input maxlength="80" value="${escapeHtml(focusCrime.asOfDate)}" data-focus-date="asOfDate" /></label>`;
  document.querySelector("#focus-crime-inputs").innerHTML = focusCrime.metrics.map((metric) => `
    <label><span>${escapeHtml(metric.label)}</span><input type="number" min="0" step="1" value="${metric.value}" data-focus-crime-id="${metric.id}" /></label>`).join("");
}

function toggleFocusCrimeEditor() {
  const editor = document.querySelector("#focus-crime-editor");
  const button = document.querySelector("#focus-crime-edit-toggle");
  const opening = editor.hidden;
  editor.hidden = !opening;
  button.textContent = opening ? "Close editor" : "Edit figures";
  document.querySelector("#focus-crime-message").textContent = "";
  if (opening) renderFocusCrimeEditor();
}

async function saveFocusCrime(event) {
  event.preventDefault();
  const editor = event.currentTarget;
  const button = editor.querySelector("button[type='submit']");
  const message = document.querySelector("#focus-crime-message");
  const next = structuredClone(state.accomplishments);
  const focusCrime = next.focusCrime || structuredClone(defaultAccomplishments.focusCrime);
  editor.querySelectorAll("[data-focus-crime-id]").forEach((input) => {
    const metric = focusCrime.metrics.find((item) => item.id === input.dataset.focusCrimeId);
    if (metric) metric.value = Math.max(0, Number(input.value) || 0);
  });
  editor.querySelectorAll("[data-focus-date]").forEach((input) => {
    focusCrime[input.dataset.focusDate] = input.value.trim();
  });
  next.focusCrime = focusCrime;
  button.disabled = true;
  button.textContent = "Saving figures…";
  message.textContent = "Saving the 8 Focus Crime figures for all visitors…";
  message.className = "accomplishments-message";
  try {
    const data = await request("/api/accomplishments", { method: "POST", body: JSON.stringify(next) });
    state.accomplishments = data.accomplishments;
    renderFocusCrime();
    renderAccomplishments();
    editor.hidden = true;
    document.querySelector("#focus-crime-edit-toggle").textContent = "Edit figures";
    message.textContent = "8 Focus Crime figures saved and updated for all visitors.";
    message.className = "accomplishments-message success";
  } catch (error) {
    message.textContent = error.message;
    message.className = "accomplishments-message error";
  } finally {
    button.disabled = false;
    button.textContent = "Save 8 Focus Crime figures";
  }
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function localDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateKey(dateKey) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatDate(dateKey, options = {}) {
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    month: "short",
    day: "numeric",
    year: "numeric",
    ...options,
  }).format(parseDateKey(dateKey));
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "The shared service is temporarily unavailable.");
  return data;
}

async function loadStatuses() {
  try {
    const data = await request("/api/status");
    state.statuses = { ...state.statuses, ...(data.statuses || {}) };
    document.querySelector("#date-label").textContent = data.dateLabel || "Philippine time";
  } catch (error) {
    document.querySelector("#summary-label").textContent = error.message;
  }
  renderCompliance();
}

function renderCompliance() {
  const list = document.querySelector("#compliance-list");
  list.innerHTML = complianceItems
    .map((item, index) => {
      const complied = Boolean(state.statuses[item.id]);
      return `
        <article class="compliance-item ${complied ? "is-complied" : ""}" data-item-id="${item.id}">
          <span class="compliance-number">${String(index + 1).padStart(2, "0")}</span>
          <div class="compliance-copy">
            <h3>${escapeHtml(item.title)}</h3>
            <p>${escapeHtml(item.description)}</p>
            <div class="compliance-meta">
              <span class="frequency">${item.frequency}</span>
              <a class="workspace-link" href="${item.href}" target="_blank" rel="noopener noreferrer">Open Google workspace ↗</a>
            </div>
          </div>
          <div class="status-toggle" role="group" aria-label="Status for ${escapeHtml(item.title)}">
            <button type="button" class="${complied ? "" : "active-no"}" data-complied="false">Red • Not complied</button>
            <button type="button" class="${complied ? "active-yes" : ""}" data-complied="true">Green • Complied</button>
          </div>
        </article>`;
    })
    .join("");

  list.querySelectorAll(".status-toggle button").forEach((button) => {
    button.addEventListener("click", updateStatus);
  });

  const completed = Object.values(state.statuses).filter(Boolean).length;
  document.querySelector("#summary-count").textContent = `${completed} / ${complianceItems.length}`;
  document.querySelector("#summary-progress").style.width = `${(completed / complianceItems.length) * 100}%`;
  document.querySelector("#summary-label").textContent = completed === complianceItems.length
    ? "All requirements are marked complied."
    : `${complianceItems.length - completed} requirement${complianceItems.length - completed === 1 ? "" : "s"} still red.`;
}

function reportDateMarkup(key, meta) {
  return `
    <div class="report-date-strip">
      <span><small>Covered period</small><strong>${escapeHtml(meta.coveredPeriod)}</strong></span>
      <span><small>As of date</small><strong>${escapeHtml(meta.asOfDate)}</strong></span>
      <button type="button" data-edit-report-dates="${key}">Edit dates</button>
    </div>
    <form class="report-date-editor" data-report-date-form="${key}" hidden>
      <label><span>Covered period</span><input name="coveredPeriod" maxlength="160" value="${escapeHtml(meta.coveredPeriod)}" /></label>
      <label><span>As of date</span><input name="asOfDate" maxlength="80" value="${escapeHtml(meta.asOfDate)}" /></label>
      <button type="submit">Save dates</button>
    </form>`;
}

function renderReportDateHosts() {
  document.querySelectorAll("[data-report-date-key]").forEach((host) => {
    const key = host.dataset.reportDateKey;
    const meta = state.accomplishments.workspaceReports?.[key] || defaultAccomplishments.workspaceReports[key];
    host.innerHTML = reportDateMarkup(key, meta);
    host.querySelector("[data-edit-report-dates]").addEventListener("click", (event) => {
      const form = host.querySelector("[data-report-date-form]");
      form.hidden = !form.hidden;
      event.currentTarget.textContent = form.hidden ? "Edit dates" : "Close";
    });
    host.querySelector("[data-report-date-form]").addEventListener("submit", saveReportDates);
  });
}

async function saveReportDates(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const key = form.dataset.reportDateForm;
  const button = form.querySelector("button[type=\"submit\"]");
  const payload = structuredClone(state.accomplishments);
  payload.workspaceReports = {
    ...defaultAccomplishments.workspaceReports,
    ...(payload.workspaceReports || {}),
    [key]: {
      coveredPeriod: form.elements.coveredPeriod.value.trim(),
      asOfDate: form.elements.asOfDate.value.trim(),
    },
  };
  button.disabled = true;
  button.textContent = "Saving…";
  try {
    const data = await request("/api/accomplishments", { method: "POST", body: JSON.stringify(payload) });
    state.accomplishments = data.accomplishments;
    renderReportDateHosts();
    renderAccomplishments();
    renderFocusCrime();
  } catch (error) {
    window.alert(error.message);
    button.disabled = false;
    button.textContent = "Save dates";
  }
}

function setWorkspace(view, options = {}) {
  const allowed = ["google-links", "aars", "accomplishments", "focus-crime", "oplan-katok", "map"];
  state.activeWorkspace = allowed.includes(view) ? view : "google-links";

  document.querySelectorAll("[data-workspace-panel]").forEach((panel) => {
    panel.hidden = panel.dataset.workspacePanel !== state.activeWorkspace;
  });
  document.querySelectorAll("#workspace-tabs [data-workspace-view]").forEach((button) => {
    const active = button.dataset.workspaceView === state.activeWorkspace;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", String(active));
  });

  if (options.scroll !== false) {
    document.querySelector("#compliance")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function initializeWorkspace() {
  const viewer = document.querySelector("#workspace-viewer");
  [
    ["accomplishments", "accomplishments"],
    ["focus-crime", "focus-crime"],
    ["oplan-katok", "oplan-katok"],
    ["map", "map"],
  ].forEach(([id, view]) => {
    const panel = document.getElementById(id);
    panel.classList.add("workspace-panel");
    panel.dataset.workspacePanel = view;
    viewer.append(panel);
  });

  const initialByHash = {
    "#accomplishments": "accomplishments",
    "#focus-crime": "focus-crime",
    "#oplan-katok": "oplan-katok",
    "#map": "map",
  };
  setWorkspace(initialByHash[window.location.hash] || "google-links", { scroll: false });

  document.querySelectorAll("[data-workspace-view]").forEach((control) => {
    control.addEventListener("click", () => setWorkspace(control.dataset.workspaceView));
  });
}

async function updateStatus(event) {
  const button = event.currentTarget;
  const article = button.closest("[data-item-id]");
  const itemId = article.dataset.itemId;
  const complied = button.dataset.complied === "true";
  const buttons = article.querySelectorAll("button");
  buttons.forEach((candidate) => { candidate.disabled = true; });
  try {
    await request("/api/status", {
      method: "POST",
      body: JSON.stringify({ itemId, complied }),
    });
    state.statuses[itemId] = complied;
    renderCompliance();
  } catch (error) {
    buttons.forEach((candidate) => { candidate.disabled = false; });
    window.alert(error.message);
  }
}

async function loadActivities() {
  try {
    const data = await request("/api/activities");
    state.activities = Array.isArray(data.activities) ? data.activities : [];
    state.todayKey = data.todayKey || state.todayKey;
    state.tomorrowKey = data.tomorrowKey || state.tomorrowKey;
  } catch (error) {
    document.querySelector("#upcoming-list").innerHTML = `<p class="empty-state">${escapeHtml(error.message)}</p>`;
  }
  renderCalendar();
  renderUpcoming();
  renderNotices();
}

function renderOplanKatokSummary() {
  const summary = state.oplanKatok;
  document.querySelector("#katok-master-records").textContent = summary.masterRecords.toLocaleString("en-PH");
  document.querySelector("#katok-individuals").textContent = summary.individuals.toLocaleString("en-PH");
  document.querySelector("#katok-small-arms").textContent = summary.smallArms.toLocaleString("en-PH");
  document.querySelector("#katok-light-weapons").textContent = summary.lightWeapons.toLocaleString("en-PH");

  const status = document.querySelector("#katok-sync-status");
  if (summary.syncedAt) {
    const synced = new Intl.DateTimeFormat("en-PH", {
      timeZone: "Asia/Manila",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(summary.syncedAt));
    status.textContent = `Automatically synced from the private Google Sheet. Last sync: ${synced} (Philippine time). Aggregate totals only.`;
  }
}

async function loadOplanKatokSummary() {
  const status = document.querySelector("#katok-sync-status");
  try {
    const response = await fetch(`oplan-katok-summary.json?cache=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) throw new Error("Unable to load the latest totals.");
    const data = await response.json();
    const fields = ["masterRecords", "individuals", "smallArms", "lightWeapons"];
    if (!fields.every((field) => Number.isFinite(Number(data[field])))) {
      throw new Error("The totals file is not valid.");
    }
    state.oplanKatok = {
      masterRecords: Number(data.masterRecords),
      individuals: Number(data.individuals),
      smallArms: Number(data.smallArms),
      lightWeapons: Number(data.lightWeapons),
      syncedAt: data.syncedAt || null,
    };
    renderOplanKatokSummary();
  } catch (error) {
    status.textContent = `${error.message} Showing the last verified aggregate totals.`;
  }
}

function renderCalendar() {
  const year = state.month.getFullYear();
  const month = state.month.getMonth();
  document.querySelector("#calendar-month").textContent = new Intl.DateTimeFormat("en-PH", {
    month: "long",
    year: "numeric",
  }).format(state.month);

  const firstCell = new Date(year, month, 1 - new Date(year, month, 1).getDay());
  const cells = [];
  for (let index = 0; index < 42; index += 1) {
    const date = addDays(firstCell, index);
    const key = localDateKey(date);
    const dayActivities = state.activities.filter((activity) => activity.activityDate === key);
    const dots = dayActivities.slice(0, 4).map(() => '<i class="event-dot"></i>').join("");
    cells.push(`
      <div class="calendar-day ${date.getMonth() !== month ? "outside" : ""} ${key === state.todayKey ? "today" : ""}" role="gridcell" aria-label="${formatDate(key)}${dayActivities.length ? `, ${dayActivities.length} activities` : ""}">
        <span class="day-number">${date.getDate()}</span>
        <span class="event-dots">${dots}</span>
        ${dayActivities.length ? `<span class="day-count">${dayActivities.length} activit${dayActivities.length === 1 ? "y" : "ies"}</span>` : ""}
      </div>`);
  }
  document.querySelector("#calendar-grid").innerHTML = cells.join("");
}

function sortedActivities() {
  return [...state.activities].sort((a, b) =>
    `${a.activityDate} ${a.activityTime || "23:59"}`.localeCompare(`${b.activityDate} ${b.activityTime || "23:59"}`),
  );
}

function activityMarkup(activity, className) {
  const time = activity.activityTime
    ? new Intl.DateTimeFormat("en-PH", { hour: "numeric", minute: "2-digit" }).format(
        new Date(`2000-01-01T${activity.activityTime}:00`),
      )
    : "Time to be announced";
  return `
    <article class="${className}">
      <strong>${escapeHtml(activity.title)}</strong>
      <time>${formatDate(activity.activityDate)} • ${escapeHtml(time)}</time>
      ${activity.location ? `<span>${escapeHtml(activity.location)}</span>` : ""}
      ${activity.details ? `<span>${escapeHtml(activity.details)}</span>` : ""}
      <button
        class="delete-activity"
        type="button"
        data-activity-id="${escapeHtml(activity.id)}"
        data-activity-title="${escapeHtml(activity.title)}"
      >Delete activity</button>
    </article>`;
}

function bindDeleteButtons(container) {
  container.querySelectorAll(".delete-activity").forEach((button) => {
    button.addEventListener("click", deleteActivity);
  });
}

async function deleteActivity(event) {
  const button = event.currentTarget;
  const id = button.dataset.activityId;
  const title = button.dataset.activityTitle || "this activity";
  if (!id || !window.confirm(`Delete “${title}” from the public calendar? This cannot be undone.`)) return;

  button.disabled = true;
  button.textContent = "Deleting…";
  try {
    await request("/api/activities", {
      method: "DELETE",
      body: JSON.stringify({ id }),
    });
    await loadActivities();
  } catch (error) {
    button.disabled = false;
    button.textContent = "Delete activity";
    window.alert(error.message);
  }
}

function renderUpcoming() {
  const activities = sortedActivities().filter((activity) => activity.activityDate >= state.todayKey).slice(0, 12);
  document.querySelector("#activity-count").textContent = String(activities.length);
  const list = document.querySelector("#upcoming-list");
  list.innerHTML = activities.length
    ? activities.map((activity) => activityMarkup(activity, "upcoming-item")).join("")
    : '<p class="empty-state">No upcoming activities yet. Add the first one below.</p>';
  bindDeleteButtons(list);
}

function renderNotices() {
  const notices = sortedActivities().filter((activity) => activity.activityDate === state.tomorrowKey);
  const list = document.querySelector("#notice-list");
  list.innerHTML = notices.length
    ? notices.map((activity) => activityMarkup(activity, "notice-item")).join("")
    : '<p class="empty-state">No activity is scheduled for tomorrow.</p>';
  bindDeleteButtons(list);
}

async function submitActivity(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector("button[type='submit']");
  const message = document.querySelector("#form-message");
  const payload = Object.fromEntries(new FormData(form).entries());
  button.disabled = true;
  button.textContent = "Saving…";
  message.className = "";
  message.textContent = "Saving this activity for all visitors…";
  try {
    await request("/api/activities", { method: "POST", body: JSON.stringify(payload) });
    form.reset();
    message.className = "success";
    message.textContent = "Activity saved. Everyone can now see it on the calendar.";
    await loadActivities();
  } catch (error) {
    message.className = "error";
    message.textContent = error.message;
  } finally {
    button.disabled = false;
    button.textContent = "Save public activity";
  }
}

document.querySelector("#previous-month").addEventListener("click", () => {
  state.month = new Date(state.month.getFullYear(), state.month.getMonth() - 1, 1);
  renderCalendar();
});
document.querySelector("#next-month").addEventListener("click", () => {
  state.month = new Date(state.month.getFullYear(), state.month.getMonth() + 1, 1);
  renderCalendar();
});
document.querySelector("#activity-form").addEventListener("submit", submitActivity);
document.querySelector("#accomplishments-edit-toggle").addEventListener("click", toggleAccomplishmentsEditor);
document.querySelector("#accomplishments-editor").addEventListener("submit", saveAccomplishments);
document.querySelector("#focus-crime-edit-toggle").addEventListener("click", toggleFocusCrimeEditor);
document.querySelector("#focus-crime-editor").addEventListener("submit", saveFocusCrime);
document.querySelector("input[name='activityDate']").min = localDateKey(new Date());

initializeWorkspace();
renderCompliance();
renderCalendar();
renderOplanKatokSummary();
renderAccomplishments();
renderFocusCrime();
renderReportDateHosts();
Promise.all([loadStatuses(), loadActivities(), loadOplanKatokSummary(), loadAccomplishments()]);
window.setInterval(loadOplanKatokSummary, 5 * 60 * 1000);
