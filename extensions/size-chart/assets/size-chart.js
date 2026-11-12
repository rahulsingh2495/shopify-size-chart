(function () {
  "use strict";

  function initSizeCharts() {
    const containers = document.querySelectorAll("[data-px-size-chart]");
    if (!containers.length) return;

    containers.forEach((container) => {
      if (container.dataset.initialized) return;
      container.dataset.initialized = "true";

      const shop = container.dataset.shop || window.Shopify?.shop;
      if (!shop) return;

      const p = new URLSearchParams({
        shop,
        ...(container.dataset.productId ? { productId: container.dataset.productId } : {}),
        ...(container.dataset.productHandle ? { productHandle: container.dataset.productHandle } : {}),
        ...(container.dataset.vendor ? { vendor: container.dataset.vendor } : {}),
        ...(container.dataset.productType ? { productType: container.dataset.productType } : {}),
        ...(container.dataset.tags ? { tags: container.dataset.tags } : {}),
        ...(container.dataset.collections ? { collectionIds: container.dataset.collections } : {}),
      });

      const endpoint = `/apps/size-chart/api/chart?${p.toString()}`;
      fetch(endpoint)
        .then((r) => (r.ok ? r : fetch(`/api/chart?${p.toString()}`)))
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (!data || !data.chart) {
            if (window.Shopify?.designMode) {
              container.innerHTML =
                '<div style="padding:10px 14px;border:1px dashed #9ca3af;border-radius:6px;font-size:13px;color:#4b5563;background:#f9fafb;">📏 <strong>Size Chart:</strong> No active chart matches this product yet. Go to <strong>Apps &gt; Size Chart</strong> to create or activate a size chart.</div>';
            }
            return;
          }
          renderChart(container, data.chart, {
            overrideButton: container.dataset.overrideButton,
            overrideDisplay: container.dataset.overrideDisplay,
          });
        })
        .catch(() => {});
    });
  }

  function convertCell(val, target, current) {
    if (current === target || !val) return val;
    return val.replace(/(\d+(\.\d+)?)/g, (m) => {
      const n = parseFloat(m);
      if (isNaN(n)) return m;
      return current === "inch" && target === "cm"
        ? Math.round(n * 2.54).toString()
        : current === "cm" && target === "inch"
        ? (Math.round((n / 2.54) * 10) / 10).toString()
        : m;
    });
  }

  function renderChart(container, chart, overrides) {
    const displayMode =
      overrides.overrideDisplay && overrides.overrideDisplay !== "default"
        ? overrides.overrideDisplay
        : chart.displayMode;

    const buttonLabel = overrides.overrideButton || chart.buttonText || "Size Guide";

    if (chart.displaySettings) {
      const s = chart.displaySettings;
      if (s.primaryColor) container.style.setProperty("--px-sc-primary", s.primaryColor);
      if (s.textColor) container.style.setProperty("--px-sc-text", s.textColor);
      if (s.borderStyle === "sharp") container.style.setProperty("--px-sc-radius", "0px");
      else if (s.borderStyle === "pill") container.style.setProperty("--px-sc-radius", "16px");
    }

    let activeUnit = chart.baseUnit;

    function buildContentHtml(u) {
      const conv = chart.baseUnit === "cm" || chart.baseUnit === "inch";
      let fit = "";
      if (chart.fitNote && chart.fitNote !== "none") {
        const c = chart.fitNote.replace(/_/g, "-");
        const lbl =
          chart.fitNote === "runs_small"
            ? "⚡ Runs Small - Recommend sizing up"
            : chart.fitNote === "runs_large"
            ? "⚡ Runs Large - Recommend sizing down"
            : "✓ True to Size - Fits as expected";
        fit = `<div class="px-sc-fit-badge ${c}">${lbl}</div>`;
      }

      const toggle = conv
        ? `<div class="px-sc-unit-toggle"><button type="button" class="px-sc-unit-btn ${
            u === "inch" ? "active" : ""
          }" data-unit="inch">INCHES</button><button type="button" class="px-sc-unit-btn ${
            u === "cm" ? "active" : ""
          }" data-unit="cm">CM</button></div>`
        : "";

      const ths = chart.columns
        .map((col) => {
          let n = col;
          if (conv) n = n.replace(/\((in|inch|inches|cm)\)/gi, "").trim() + ` (${u})`;
          return `<th>${esc(n)}</th>`;
        })
        .join("");

      const trs = chart.rows
        .map((row) => {
          const tds = row
            .map((cell) => `<td>${esc(conv ? convertCell(cell, u, chart.baseUnit) : cell)}</td>`)
            .join("");
          return `<tr>${tds}</tr>`;
        })
        .join("");

      const inst = chart.measurementInstructions
        ? `<div class="px-sc-instructions"><h4 class="px-sc-instructions-title">How to Measure</h4><p class="px-sc-instructions-text">${esc(
            chart.measurementInstructions,
          )}</p></div>`
        : "";

      return `${fit}${toggle}<div class="px-sc-table-wrapper"><table class="px-sc-table"><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table></div>${inst}`;
    }

    const rulerSvg =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.3 8.7 8.7 21.3c-1 1-2.5 1-3.5 0l-3.5-3.5c-1-1-1-2.5 0-3.5z"/><path d="m14.5 4.5 2 2M11.5 7.5 14 10M8.5 10.5 11 13M5.5 13.5 8 16"/></svg>';

    if (displayMode === "inline") {
      container.innerHTML = `<div class="px-sc-inline-card"><h3 style="margin-top:0;margin-bottom:0.75rem;font-size:1.125rem;">${esc(
        chart.name,
      )}</h3><div class="px-sc-content-slot">${buildContentHtml(activeUnit)}</div></div>`;
      wire(container, (unit) => {
        activeUnit = unit;
        container.querySelector(".px-sc-content-slot").innerHTML = buildContentHtml(activeUnit);
      });
    } else if (displayMode === "accordion") {
      container.innerHTML = `<div class="px-sc-accordion"><button type="button" class="px-sc-accordion-header"><span>${rulerSvg} ${esc(
        buttonLabel,
      )}</span><span class="px-sc-accordion-chevron">▼</span></button><div class="px-sc-accordion-content"><div class="px-sc-content-slot">${buildContentHtml(
        activeUnit,
      )}</div></div></div>`;
      const acc = container.querySelector(".px-sc-accordion");
      container.querySelector(".px-sc-accordion-header")?.addEventListener("click", () => {
        acc?.classList.toggle("px-open");
      });
      wire(container, (unit) => {
        activeUnit = unit;
        container.querySelector(".px-sc-content-slot").innerHTML = buildContentHtml(activeUnit);
      });
    } else {
      const isFloating = displayMode === "floating";
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = isFloating ? "px-sc-floating-btn" : "px-sc-trigger-btn";
      btn.innerHTML = `${rulerSvg} <span>${esc(buttonLabel)}</span>`;

      if (isFloating) document.body.appendChild(btn);
      else container.appendChild(btn);

      const modal = document.createElement("div");
      modal.className = "px-sc-modal-overlay";
      modal.innerHTML = `<div class="px-sc-modal-dialog" role="dialog" aria-modal="true"><div class="px-sc-modal-header"><h3 class="px-sc-modal-title">${esc(
        chart.name,
      )}</h3><button type="button" class="px-sc-modal-close" aria-label="Close">&times;</button></div><div class="px-sc-modal-body"><div class="px-sc-content-slot">${buildContentHtml(
        activeUnit,
      )}</div></div></div>`;
      document.body.appendChild(modal);

      const open = () => {
        modal.classList.add("px-active");
        document.body.style.overflow = "hidden";
      };
      const close = () => {
        modal.classList.remove("px-active");
        document.body.style.overflow = "";
      };

      btn.addEventListener("click", open);
      modal.querySelector(".px-sc-modal-close")?.addEventListener("click", close);
      modal.addEventListener("click", (e) => {
        if (e.target === modal) close();
      });
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && modal.classList.contains("px-active")) close();
      });

      wire(modal, (unit) => {
        activeUnit = unit;
        modal.querySelector(".px-sc-content-slot").innerHTML = buildContentHtml(activeUnit);
      });
    }
  }

  function wire(root, fn) {
    root.addEventListener("click", (e) => {
      const b = e.target.closest(".px-sc-unit-btn");
      if (b && b.dataset.unit) fn(b.dataset.unit);
    });
  }

  function esc(s) {
    if (!s) return "";
    return String(s)
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
