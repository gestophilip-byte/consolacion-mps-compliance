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

const state = {
  activities: [],
  statuses: Object.fromEntries(complianceItems.map((item) => [item.id, false])),
  todayKey: localDateKey(new Date()),
  tomorrowKey: localDateKey(addDays(new Date(), 1)),
  month: startOfMonth(new Date()),
};

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
document.querySelector("input[name='activityDate']").min = localDateKey(new Date());

renderCompliance();
renderCalendar();
Promise.all([loadStatuses(), loadActivities()]);
