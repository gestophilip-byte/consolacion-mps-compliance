(() => {
  const version = "20260820-2310";
  const base = document.createElement("script");
  base.src = `compliance-auto-base.js?v=${version}`;
  base.onerror = () => console.error("Unable to load compliance automation.");
  document.head.appendChild(base);
})();
