(() => {
  const version = "20260825-1645";

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
  sitrepDelayStatus.onerror = () => console.error("Unable to load SITREP status picker.");
  document.head.appendChild(sitrepDelayStatus);

  const sitrepMemoGenerator = document.createElement("script");
  sitrepMemoGenerator.src = `sitrep-memo-generator-v2.js?v=${version}`;
  sitrepMemoGenerator.onerror = () => console.error("Unable to load PNP-style SITREP explanation memorandum generator.");
  document.head.appendChild(sitrepMemoGenerator);

  const sharedSync = document.createElement("script");
  sharedSync.src = `shared-duty-sync.js?v=${version}`;
  sharedSync.onerror = () => console.error("Unable to load shared Duty & SITREP sync.");
  sharedSync.onload = () => {
    const migrationFix = document.createElement("script");
    migrationFix.src = `shared-duty-sync-migration-fix.js?v=${version}`;
    migrationFix.onerror = () => console.error("Unable to load optimized shared history migration.");
    document.head.appendChild(migrationFix);
  };
  document.head.appendChild(sharedSync);
})();