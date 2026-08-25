(() => {
  if (document.querySelector("#sitrep-red-noncompliance-styles")) return;

  const style = document.createElement("style");
  style.id = "sitrep-red-noncompliance-styles";
  style.textContent = `
    .sitrep-row.overdue .sitrep-unit-button:not(.is-received) {
      background: #fff0ef !important;
      border-color: #d93025 !important;
      color: #8b1e18 !important;
      box-shadow: inset 0 0 0 1px rgba(217,48,37,.12) !important;
    }

    .sitrep-row.overdue .sitrep-unit-button:not(.is-received) span {
      color: #8b1e18 !important;
      font-weight: 900 !important;
    }

    .sitrep-row.overdue .sitrep-unit-button:not(.is-received) strong {
      font-size: 0 !important;
      color: #b3261e !important;
    }

    .sitrep-row.overdue .sitrep-unit-button:not(.is-received) strong::after {
      content: "✕ NOT COMPLIED";
      font-size: 9px;
      font-weight: 900;
      letter-spacing: .02em;
    }

    .sitrep-row.overdue:has(.sitrep-unit-button:not(.is-received)) {
      background: #fffafa !important;
      border-left: 4px solid #d93025 !important;
    }

    .sitrep-row.overdue:has(.sitrep-unit-button:not(.is-received)) .sitrep-time-copy small {
      color: #b3261e !important;
      font-weight: 800 !important;
    }

    .sitrep-row.overdue .sitrep-unit-button.is-received {
      opacity: 1 !important;
    }
  `;

  document.head.appendChild(style);
})();
