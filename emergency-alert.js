(() => {
  const ALERT_HOUR = 23;
  const TIME_ZONE = "Asia/Manila";
  const REMOVED_ID = "daily-patrol-operations-report";
  const ACK_PREFIX = "consolacion-mps-11pm-alert-ack-";
  let audio = null;
  let sirenTimer = null;
  let installed = false;

  function parts() {
    return Object.fromEntries(new Intl.DateTimeFormat("en-US", {
      timeZone: TIME_ZONE,
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
      hourCycle: "h23",
    }).formatToParts(new Date()).map((p) => [p.type, p.value]));
  }

  function dateKey() {
    const p = parts();
    return `${p.year}-${p.month}-${p.day}`;
  }

  function pending() {
    if (typeof complianceItems === "undefined" || typeof state === "undefined") return [];
    return complianceItems.filter((item) => item.id !== REMOVED_ID && !Boolean(state.statuses?.[item.id]));
  }

  function acknowledged() {
    try { return localStorage.getItem(`${ACK_PREFIX}${dateKey()}`) === "1"; }
    catch { return false; }
  }

  function acknowledge() {
    try { localStorage.setItem(`${ACK_PREFIX}${dateKey()}`, "1"); } catch {}
    closeAlert();
  }

  function addStyles() {
    if (document.querySelector("#compliance-emergency-styles")) return;
    const style = document.createElement("style");
    style.id = "compliance-emergency-styles";
    style.textContent = `
      @keyframes ceFlash{0%,100%{background:rgba(82,0,0,.97)}50%{background:rgba(190,0,0,.99)}}
      @keyframes cePulse{0%,100%{transform:scale(1)}50%{transform:scale(1.12)}}
      #compliance-emergency-overlay[hidden]{display:none!important}
      #compliance-emergency-overlay{position:fixed;inset:0;z-index:2147483647;padding:18px;display:grid;place-items:center;overflow:auto;color:#fff;background:#8b0000;animation:ceFlash 1s steps(2,end) infinite;font-family:Inter,system-ui,sans-serif}
      .ce-card{width:min(760px,100%);padding:clamp(22px,5vw,42px);text-align:center;background:rgba(30,0,0,.94);border:3px solid #fff;border-radius:24px;box-shadow:0 24px 80px rgba(0,0,0,.65)}
      .ce-icon{font-size:clamp(56px,10vw,96px);line-height:1;animation:cePulse .8s ease-in-out infinite}.ce-kicker{margin:14px 0 5px;font-weight:900;letter-spacing:.16em;text-transform:uppercase;color:#ffd4d4}.ce-card h2{margin:0;font-size:clamp(28px,6vw,52px);line-height:1.02}.ce-time{display:inline-block;margin-top:14px;padding:7px 12px;border-radius:999px;background:#fff;color:#760000;font-weight:900}.ce-summary{margin:20px auto 12px;max-width:620px;font-size:18px;line-height:1.5}.ce-count{font-size:clamp(26px,5vw,40px);font-weight:900;color:#ffe66d}.ce-list{margin:16px 0 22px;padding:0;list-style:none;text-align:left;display:grid;gap:8px;max-height:260px;overflow:auto}.ce-list li{padding:11px 13px;border:1px solid rgba(255,255,255,.25);border-radius:12px;background:rgba(255,255,255,.08);font-weight:700}.ce-actions{display:flex;gap:10px;flex-wrap:wrap;justify-content:center}.ce-actions button{border:0;border-radius:12px;padding:13px 18px;font:inherit;font-weight:900;cursor:pointer}#ce-sound{background:#ffb3b3;color:#620000}#ce-view{background:#ffe66d;color:#3b2600}#ce-ack{background:#fff;color:#750000}
      #compliance-alarm-enable{position:fixed;right:18px;bottom:18px;z-index:9999;border:0;border-radius:999px;padding:10px 14px;background:#8b0000;color:#fff;font:700 13px/1 Inter,system-ui,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.28);cursor:pointer}#compliance-alarm-enable.ready{background:#165c35}
      @media(max-width:640px){#compliance-emergency-overlay{padding:10px}.ce-card{padding:22px 16px;border-radius:18px}.ce-actions{flex-direction:column}.ce-actions button{width:100%}#compliance-alarm-enable{right:10px;bottom:10px}}
    `;
    document.head.appendChild(style);
  }

  function ensureUI() {
    addStyles();
    let overlay = document.querySelector("#compliance-emergency-overlay");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "compliance-emergency-overlay";
      overlay.hidden = true;
      overlay.setAttribute("role", "alertdialog");
      overlay.setAttribute("aria-modal", "true");
      overlay.innerHTML = `
        <section class="ce-card">
          <div class="ce-icon" aria-hidden="true">🚨</div>
          <p class="ce-kicker">11:00 PM Deadline Warning</p>
          <h2>COMPLIANCE EMERGENCY ALERT</h2>
          <span class="ce-time" id="ce-time">Philippine time</span>
          <p class="ce-summary">Consolacion MPS still has compliance requirements that need immediate action.</p>
          <div class="ce-count" id="ce-count">0 PENDING</div>
          <ul class="ce-list" id="ce-list"></ul>
          <div class="ce-actions">
            <button id="ce-sound" type="button">🔊 ENABLE / TEST ALARM</button>
            <button id="ce-view" type="button">VIEW PENDING COMPLIANCE</button>
            <button id="ce-ack" type="button">ACKNOWLEDGE ALARM</button>
          </div>
        </section>`;
      document.body.appendChild(overlay);
      overlay.querySelector("#ce-sound")?.addEventListener("click", () => primeAudio(true));
      overlay.querySelector("#ce-ack")?.addEventListener("click", acknowledge);
      overlay.querySelector("#ce-view")?.addEventListener("click", () => {
        acknowledge();
        document.querySelector('[data-command-page="compliance"]')?.click();
        window.setTimeout(() => document.querySelector('[data-compliance-filter="pending"]')?.click(), 150);
      });
    }

    if (!document.querySelector("#compliance-alarm-enable")) {
      const button = document.createElement("button");
      button.id = "compliance-alarm-enable";
      button.type = "button";
      button.textContent = "🔊 Enable 11 PM Alarm";
      button.addEventListener("click", () => primeAudio(true));
      document.body.appendChild(button);
    }
    return overlay;
  }

  async function primeAudio(test = false) {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return false;
      if (!audio) audio = new AudioContextClass();
      if (audio.state === "suspended") await audio.resume();
      const ready = audio.state === "running";
      const button = document.querySelector("#compliance-alarm-enable");
      if (ready && button) {
        button.textContent = "🔊 11 PM Alarm Ready";
        button.classList.add("ready");
      }
      if (ready && test) pulse(.28);
      return ready;
    } catch { return false; }
  }

  function pulse(duration = 1.05) {
    if (!audio || audio.state !== "running") return;
    const now = audio.currentTime;
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(620, now);
    osc.frequency.linearRampToValueAtTime(980, now + duration / 2);
    osc.frequency.linearRampToValueAtTime(620, now + duration);
    gain.gain.setValueAtTime(.0001, now);
    gain.gain.exponentialRampToValueAtTime(.12, now + .04);
    gain.gain.setValueAtTime(.12, now + Math.max(.05, duration - .08));
    gain.gain.exponentialRampToValueAtTime(.0001, now + duration);
    osc.connect(gain); gain.connect(audio.destination); osc.start(now); osc.stop(now + duration + .02);
  }

  async function startSiren() {
    if (!(await primeAudio(false)) || sirenTimer) return;
    pulse();
    sirenTimer = window.setInterval(pulse, 1250);
    try { navigator.vibrate?.([450,180,450,180,700]); } catch {}
  }

  function stopSiren() {
    if (sirenTimer) window.clearInterval(sirenTimer);
    sirenTimer = null;
    try { navigator.vibrate?.(0); } catch {}
  }

  function closeAlert() {
    stopSiren();
    const overlay = document.querySelector("#compliance-emergency-overlay");
    if (overlay) overlay.hidden = true;
    document.body.style.removeProperty("overflow");
  }

  function showAlert(items) {
    const overlay = ensureUI();
    const time = new Intl.DateTimeFormat("en-PH", {
      timeZone: TIME_ZONE, month: "short", day: "numeric", year: "numeric",
      hour: "numeric", minute: "2-digit", second: "2-digit",
    }).format(new Date());
    overlay.querySelector("#ce-time").textContent = `${time} PH`;
    overlay.querySelector("#ce-count").textContent = `${items.length} PENDING REQUIREMENT${items.length === 1 ? "" : "S"}`;
    overlay.querySelector("#ce-list").innerHTML = items.map((item) => {
      const title = String(item.title || item.id || "Pending compliance")
        .replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
      const freq = String(item.frequency || "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;");
      return `<li>⚠️ ${title}${freq ? ` <small>— ${freq}</small>` : ""}</li>`;
    }).join("");
    overlay.hidden = false;
    document.body.style.overflow = "hidden";
    startSiren();
  }

  function check() {
    if (typeof complianceItems === "undefined" || typeof state === "undefined") return;
    const items = pending();
    if (Number(parts().hour) >= ALERT_HOUR && items.length && !acknowledged()) showAlert(items);
    else closeAlert();
  }

  function install() {
    if (installed) return;
    installed = true;
    ensureUI();
    const prime = () => primeAudio(false);
    window.addEventListener("pointerdown", prime, { once: true, passive: true });
    window.addEventListener("keydown", prime, { once: true });
    check();
    window.setInterval(check, 5000);
  }

  function waitForApp() {
    if (typeof complianceItems === "undefined" || typeof state === "undefined") {
      window.setTimeout(waitForApp, 150);
      return;
    }
    install();
  }

  waitForApp();
})();
