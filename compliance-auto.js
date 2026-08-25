(() => {
  const version = "20260825-1408";

  const base = document.createElement("script");
  base.src = `compliance-auto-base.js?v=${version}`;
  base.onerror = () => console.error("Unable to load compliance automation.");
  document.head.appendChild(base);

  const sitrepRedStatus = document.createElement("script");
  sitrepRedStatus.src = `sitrep-red-status.js?v=${version}`;
  sitrepRedStatus.onerror = () => console.error("Unable to load SITREP overdue status styling.");
  document.head.appendChild(sitrepRedStatus);
})();
