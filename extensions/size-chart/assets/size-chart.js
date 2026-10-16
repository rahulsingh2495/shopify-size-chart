(function () {
  "use strict";

  function initSizeCharts() {
    const containers = document.querySelectorAll("[data-px-size-chart]");
    if (!containers.length) return;

    containers.forEach((container) => {
      // Prevent double initialization
      if (container.dataset.initialized) return;
      container.dataset.initialized = "true";

      const shop = container.dataset.shop || window.Shopify?.shop;
      if (!shop) return;

      const productId = container.dataset.productId;
      const productHandle = container.dataset.productHandle;
      const vendor = container.dataset.vendor;
      const productType = container.dataset.productType;
      const tags = container.dataset.tags;
      const collectionIds = container.dataset.collections;
      const overrideButton = container.dataset.overrideButton;
      const overrideDisplay = container.dataset.overrideDisplay;

      const params = new URLSearchParams({
        shop,
        ...(productId ? { productId } : {}),
        ...(productHandle ? { productHandle } : {}),
        ...(vendor ? { vendor } : {}),
        ...(productType ? { productType } : {}),
        ...(tags ? { tags } : {}),
        ...(collectionIds ? { collectionIds } : {}),
      });

      // App endpoint lookup
      const apiEndpoint = `/apps/size-chart/api/chart?${params.toString()}`;

      // In development or local theme preview, fallback to root or current domain
      fetch(apiEndpoint)
        .then((res) => {
          if (!res.ok) {
            // Try relative API route fallback
            return fetch(`/api/chart?${params.toString()}`);
          }
          return res;
        })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (!data || !data.chart) return;
          renderChart(container, data.chart, {
            overrideButton,
            overrideDisplay,
          });
        })
        .catch(() => {
          // Silent fallback on failure so storefront never breaks
        });
    });
  }

  function convertCell(val, targetUnit, currentUnit) {
    if (currentUnit === targetUnit || !val) return val;
    // Match numbers and ranges like "36-38" or "36 - 38" or "36.5"
    return val.replace(/(\d+(\.\d+)?)/g, (match) => {
      const num = parseFloat(match);
      if (isNaN(num)) return match;
      if (currentUnit === "inch" && targetUnit === "cm") {
        return Math.round(num * 2.54).toString();
      } else if (currentUnit === "cm" && targetUnit === "inch") {
        return (Math.round((num / 2.54) * 10) / 10).toString();
      }
      return match;
    });
  }

  function renderChart(container, chart, overrides) {
    const displayMode =
      overrides.overrideDisplay && overrides.overrideDisplay !== "default"
        ? overrides.overrideDisplay
        : chart.displayMode;

    const buttonLabel =
      overrides.overrideButton || chart.buttonText || "Size Guide";

    if (chart.displaySettings) {
      if (chart.displaySettings.primaryColor) {
        container.style.setProperty(
          "--px-sc-primary",
          chart.displaySettings.primaryColor,
        );
      }
      if (chart.displaySettings.textColor) {
        container.style.setProperty(
          "--px-sc-text",
          chart.displaySettings.textColor,
        );
      }
      if (chart.displaySettings.borderStyle === "sharp") {
        container.style.setProperty("--px-sc-radius", "0px");
      } else if (chart.displaySettings.borderStyle === "pill") {
        container.style.setProperty("--px-sc-radius", "16px");
      }
    }

    let activeUnit = chart.baseUnit;

    function buildContentHtml(currentUnit) {
      const isConvertible =
        chart.baseUnit === "cm" || chart.baseUnit === "inch";

      let fitBadgeHtml = "";
      if (chart.fitNote && chart.fitNote !== "none") {
        const noteClass = chart.fitNote.replace(/_/g, "-");
        const noteLabel =
          chart.fitNote === "runs_small"
            ? "⚡ Runs Small - We recommend sizing up"
            : chart.fitNote === "runs_large"
            ? "⚡ Runs Large - We recommend sizing down"
            : "✓ True to Size - Fits as expected";
        fitBadgeHtml = `<div class="px-sc-fit-badge ${noteClass}">${noteLabel}</div>`;
      }

      let unitToggleHtml = "";
      if (isConvertible) {
        unitToggleHtml = `
          <div class="px-sc-unit-toggle">
            <button type="button" class="px-sc-unit-btn ${
              currentUnit === "inch" ? "active" : ""
            }" data-unit="inch">INCHES</button>
            <button type="button" class="px-sc-unit-btn ${
              currentUnit === "cm" ? "active" : ""
            }" data-unit="cm">CM</button>
          </div>
        `;
      }

      const headersHtml = chart.columns
        .map((col) => {
          let colName = col;
          if (isConvertible) {
            colName = colName.replace(/\((in|inch|inches|cm)\)/gi, "").trim();
            colName += ` (${currentUnit})`;
          }
          return `<th>${escapeHtml(colName)}</th>`;
        })
        .join("");

      const rowsHtml = chart.rows
        .map((row) => {
          const cellsHtml = row
            .map((cell) => {
              const converted = isConvertible
                ? convertCell(cell, currentUnit, chart.baseUnit)
                : cell;
              return `<td>${escapeHtml(converted)}</td>`;
            })
            .join("");
          return `<tr>${cellsHtml}</tr>`;
        })
        .join("");

      let instructionsHtml = "";
      if (chart.measurementInstructions) {
        instructionsHtml = `
          <div class="px-sc-instructions">
            <h4 class="px-sc-instructions-title">How to Measure</h4>
            <p class="px-sc-instructions-text">${escapeHtml(
              chart.measurementInstructions,
            )}</p>
          </div>
        `;
      }

      return `
        ${fitBadgeHtml}
        ${unitToggleHtml}
        <div class="px-sc-table-wrapper">
          <table class="px-sc-table">
            <thead>
              <tr>${headersHtml}</tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </div>
        ${instructionsHtml}
      `;
    }

    const rulerIconSvg = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21.3 8.7 8.7 21.3c-1 1-2.5 1-3.5 0l-3.5-3.5c-1-1-1-2.5 0-3.5L14.3 1.7c1-1 2.5-1 3.5 0l3.5 3.5c1 1 1 2.5 0 3.5z"/>
        <path d="m14.5 4.5 2 2M11.5 7.5 14 10M8.5 10.5 11 13M5.5 13.5 8 16"/>
      </svg>
    `;

    if (displayMode === "inline") {
      container.innerHTML = `
        <div class="px-sc-inline-card">
          <h3 style="margin-top:0;margin-bottom:0.75rem;font-size:1.125rem;">${escapeHtml(
            chart.name,
          )}</h3>
          <div class="px-sc-content-slot">${buildContentHtml(activeUnit)}</div>
        </div>
      `;
      wireUnitButtons(container, (unit) => {
        activeUnit = unit;
        const slot = container.querySelector(".px-sc-content-slot");
        if (slot) slot.innerHTML = buildContentHtml(activeUnit);
      });
    } else if (displayMode === "accordion") {
      container.innerHTML = `
        <div class="px-sc-accordion">
          <button type="button" class="px-sc-accordion-header">
            <span>${rulerIconSvg} ${escapeHtml(buttonLabel)}</span>
            <span class="px-sc-accordion-chevron">▼</span>
          </button>
          <div class="px-sc-accordion-content">
            <div class="px-sc-content-slot">${buildContentHtml(activeUnit)}</div>
          </div>
        </div>
      `;
      const acc = container.querySelector(".px-sc-accordion");
      const header = container.querySelector(".px-sc-accordion-header");
      header?.addEventListener("click", () => {
        acc?.classList.toggle("px-open");
      });
      wireUnitButtons(container, (unit) => {
        activeUnit = unit;
        const slot = container.querySelector(".px-sc-content-slot");
        if (slot) slot.innerHTML = buildContentHtml(activeUnit);
      });
    } else {
      // popup or floating
      const isFloating = displayMode === "floating";

      const triggerBtn = document.createElement("button");
      triggerBtn.type = "button";
      triggerBtn.className = isFloating
        ? "px-sc-floating-btn"
        : "px-sc-trigger-btn";
      triggerBtn.innerHTML = `${rulerIconSvg} <span>${escapeHtml(
        buttonLabel,
      )}</span>`;

      if (isFloating) {
        document.body.appendChild(triggerBtn);
      } else {
        container.appendChild(triggerBtn);
      }

      // Create modal
      const modal = document.createElement("div");
      modal.className = "px-sc-modal-overlay";
      modal.innerHTML = `
        <div class="px-sc-modal-dialog" role="dialog" aria-modal="true" aria-labelledby="px-sc-title">
          <div class="px-sc-modal-header">
            <h3 class="px-sc-modal-title" id="px-sc-title">${escapeHtml(
              chart.name,
            )}</h3>
            <button type="button" class="px-sc-modal-close" aria-label="Close modal">&times;</button>
          </div>
          <div class="px-sc-modal-body">
            <div class="px-sc-content-slot">${buildContentHtml(activeUnit)}</div>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      const openModal = () => {
        modal.classList.add("px-active");
        document.body.style.overflow = "hidden";
      };

      const closeModal = () => {
        modal.classList.remove("px-active");
        document.body.style.overflow = "";
      };

      triggerBtn.addEventListener("click", openModal);
      modal
        .querySelector(".px-sc-modal-close")
        ?.addEventListener("click", closeModal);

      modal.addEventListener("click", (e) => {
        if (e.target === modal) closeModal();
      });

      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && modal.classList.contains("px-active")) {
          closeModal();
        }
      });

      wireUnitButtons(modal, (unit) => {
        activeUnit = unit;
        const slot = modal.querySelector(".px-sc-content-slot");
        if (slot) slot.innerHTML = buildContentHtml(activeUnit);
      });
    }
  }

  function wireUnitButtons(rootEl, onUnitChange) {
    rootEl.addEventListener("click", (e) => {
      const btn = e.target.closest(".px-sc-unit-btn");
      if (btn && btn.dataset.unit) {
        onUnitChange(btn.dataset.unit);
      }
    });
  }

  function escapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initSizeCharts);
  } else {
    initSizeCharts();
  }
})();
