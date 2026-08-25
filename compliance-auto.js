(() => {
  const version = "20260825-1413";

  const base = document.createElement("script");
  base.src = `compliance-auto-base.js?v=${version}`;
  base.onerror = () => console.error("Unable to load compliance automation.");
  document.head.appendChild(base);

  const sitrepRedStatus = document.createElement("script");
  sitrepRedStatus.src = `sitrep-red-status.js?v=${version}`;
  sitrepRedStatus.onerror = () => console.error("Unable to load SITREP overdue status styling.");
  document.head.appendChild(sitrepRedStatus);

  const sitrepDelayStatus = document.createElement("script");
  sitrepDelayStatus.src = `sitrep-delay-status.js?v=${version}`;
  sitrepDelayStatus.onerror = () => console.error("Unable to load SITREP delayed-reporting status.");
  document.head.appendChild(sitrepDelayStatus);
})();