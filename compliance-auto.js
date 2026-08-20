(() => {
  const version = "20260820-2300";
  const base = document.createElement("script");
  base.src = `compliance-auto-base.js?v=${version}`;
  base.onload = () => {
    const emergency = document.createElement("script");
    emergency.src = `emergency-alert.js?v=${version}`;
    document.head.appendChild(emergency);
  };
  base.onerror = () => console.error("Unable to load compliance automation.");
  document.head.appendChild(base);
})();
