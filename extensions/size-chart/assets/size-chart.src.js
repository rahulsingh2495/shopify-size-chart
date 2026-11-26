(function () {
  "use strict";

  function initSizeCharts() {
    var containers = document.querySelectorAll("[data-px-size-chart]");
    if (!containers.length) return;

    containers.forEach(function (container) {
      if (container.dataset.initialized === "true") return;
      container.dataset.initialized = "true";

      var shop = container.dataset.shop || window.Shopify?.shop;
      if (!shop) return;

      var ds = container.dataset;
      var p = new URLSearchParams({ shop: shop });
      ["productId", "productHandle", "vendor", "productType", "tags"].forEach(function (k) {
        if (ds[k]) p.set(k, ds[k]);
      });
      if (ds.collections) p.set("collectionIds", ds.collections);

      var customEndpoint = (ds.customEndpoint || "").trim();
      var proxyEndpoint = "/apps/size-chart/api/chart?" + p.toString();
      var directEndpoint = customEndpoint ? customEndpoint.replace(/\/+$/, "") + "/api/chart?" + p.toString() : null;

      var primaryUrl = directEndpoint || proxyEndpoint;
      var fallbackUrl = directEndpoint ? proxyEndpoint : "/api/chart?" + p.toString();

      fetch(primaryUrl)
        .then(function (r) { return r.ok ? r : fetch(fallbackUrl); })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (data) {
          if (!data || !data.chart) {
            if (window.Shopify?.designMode) container.innerHTML = '<div style="padding:8px;border:1px dashed #9ca3af;border-radius:6px;font-size:12px;color:#4b5563;">📏 No matching size chart.</div>';
            return;
          }
          renderChart(container, data.chart, {
            overrideButton: ds.overrideButton,
            overrideDisplay: ds.overrideDisplay,
            position: ds.position || "block",
            alignment: ds.alignment || "left",
            customSelector: ds.customSelector,
            floatingPosition: ds.floatingPosition || "bottom_right",
            floatingOffsetY: ds.floatingOffsetY,
            floatingOffsetX: ds.floatingOffsetX,
          });
        })
        .catch(function () {});
    });
  }

  function convertCell(val, target, current) {
    if (current === target || !val) return val;
    return val.replace(/(\d+(\.\d+)?)/g, function (m) {
      var n = parseFloat(m);
      return isNaN(n) ? m : target === "cm" ? Math.round(n * 2.54) : Math.round(n / 0.254) / 10;
    });
  }

  function renderChart(container, chart, overrides) {
    document.querySelectorAll(".px-sc-floating-btn, .px-sc-modal-overlay, .px-sc-injected-btn").forEach(function (el) {
      el.remove();
    });

    var displayMode =
      overrides.overrideDisplay && overrides.overrideDisplay !== "default"
        ? overrides.overrideDisplay
        : chart.displayMode;

    var s = chart.displaySettings || {};
    var buttonLabel = overrides.overrideButton || chart.buttonText || s.buttonText || "Size Guide";

    var radius = "6px";
    if (s.borderStyle === "square" || s.borderStyle === "sharp") radius = "0px";
    else if (s.borderStyle === "pill") radius = "9999px";

    var btnStyle = s.buttonStyle || "solid";
    var primaryCol = s.primaryColor || "#111827";
    var textCol = s.textColor || "#ffffff";
    var borderCol = s.borderColor || (btnStyle === "outline" ? primaryCol : "#303030");
    var showRuler = s.showRulerIcon !== false;
    var fSize = (s.fontSize || 13) + "px";
    var iSize = s.iconSize || 14;

    var bgColor = btnStyle === "solid" ? primaryCol : "transparent";
    var txtColor = btnStyle === "solid" ? textCol : (s.textColor || primaryCol);
    var bdrColor = btnStyle === "solid" ? "transparent" : borderCol;

    var thBg = s.tableHeaderBg || "#f8fafc";
    var thColor = s.tableHeaderColor || getContrast(thBg);
    var modalAccent = s.modalHeaderColor || "#111827";
    var modalBg = s.chartBgColor || "#ffffff";
    var rowEvenBg = s.tableRowEvenBg || "#ffffff";
    var rowOddBg = s.tableRowOddBg || "#f8fafc";
    var tableTextColor = s.tableTextColor || "#334155";
    var tableBorderColor = s.tableBorderColor || "#e2e8f0";

    var setVars = function (el) {
      [
        ["primary", primaryCol],
        ["text", textCol],
        ["radius", radius],
        ["th-bg", thBg],
        ["th-color", thColor],
        ["modal-accent", modalAccent],
        ["modal-bg", modalBg],
        ["row-even-bg", rowEvenBg],
        ["row-odd-bg", rowOddBg],
        ["table-color", tableTextColor],
        ["table-border", tableBorderColor]
      ].forEach(function (p) {
        el.style.setProperty("--px-sc-" + p[0], p[1]);
      });
    };
    setVars(container);

    if (s.customCss && s.customCss.trim()) {
      var styleTag = document.getElementById("px-sc-custom-css");
      if (!styleTag) {
        styleTag = document.createElement("style");
        styleTag.id = "px-sc-custom-css";
        document.head.appendChild(styleTag);
      }
      styleTag.textContent = s.customCss;
    }

    var activeUnit = chart.baseUnit;

    function buildContentHtml(u) {
      var conv = chart.baseUnit === "cm" || chart.baseUnit === "inch";
      var fit = chart.fitNote && chart.fitNote !== "none"
        ? '<span class="px-sc-fit-badge ' + chart.fitNote.replace(/_/g, "-") + '">' + (chart.fitNote === "runs_small" ? "Runs small" : chart.fitNote === "runs_large" ? "Runs large" : "True to size") + "</span>"
        : "";

      var toggle = conv
        ? '<div class="px-sc-unit-toggle"><button type="button" class="px-sc-unit-btn ' +
          (u === "inch" ? "active" : "") +
          '" data-unit="inch">INCHES</button><button type="button" class="px-sc-unit-btn ' +
          (u === "cm" ? "active" : "") +
          '" data-unit="cm">CM</button></div>'
        : "";

      var headerBar =
        '<div class="px-sc-header-bar">' +
          '<div class="px-sc-title-area">' +
            '<h3 class="px-sc-title">' + esc(chart.name) + '</h3>' +
            fit +
          '</div>' +
          toggle +
        '</div>';

      var ths = chart.columns
        .map(function (col) {
          return "<th>" + esc(conv ? col.replace(/\((in|inch|inches|cm)\)/gi, "").trim() + " (" + u + ")" : col) + "</th>";
        })
        .join("");

      var trs = chart.rows
        .map(function (row) {
          return "<tr>" + row.map(function (cell) {
            return "<td>" + esc(conv ? convertCell(cell, u, chart.baseUnit) : cell) + "</td>";
          }).join("") + "</tr>";
        })
        .join("");

      var tableNote = conv
        ? '<div class="px-sc-table-note">Measurements in ' + (u === "cm" ? "centimeters" : "inches") + '</div>'
        : "";

      var inst = chart.measurementInstructions
        ? '<div class="px-sc-instructions"><h4 class="px-sc-instructions-title">How to measure</h4><div class="px-sc-instructions-text">' +
          esc(chart.measurementInstructions) +
          "</div></div>"
        : "";

      return (
        headerBar +
        '<div class="px-sc-table-wrapper"><table class="px-sc-table"><thead><tr>' +
        ths +
        "</tr></thead><tbody>" +
        trs +
        "</tbody></table></div>" +
        tableNote +
        inst
      );
    }

    var rulerSvg =
      '<svg width="' + iSize + '" height="' + iSize + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.3 8.7 8.7 21.3c-1 1-2.5 1-3.5 0l-3.5-3.5c-1-1-1-2.5 0-3.5z"/><path d="m14.5 4.5 2 2M11.5 7.5 14 10M8.5 10.5 11 13M5.5 13.5 8 16"/></svg>';

    var rulerPrefix = showRuler ? rulerSvg + " " : "";

    if (displayMode === "inline") {
      container.innerHTML = '<div class="px-sc-inline-card"><div class="px-sc-content-slot">' + buildContentHtml(activeUnit) + "</div></div>";
      wire(container, function (unit) {
        activeUnit = unit;
        container.querySelector(".px-sc-content-slot").innerHTML = buildContentHtml(activeUnit);
      });
    } else if (displayMode === "accordion") {
      container.innerHTML =
        '<div class="px-sc-accordion">' +
          '<button type="button" class="px-sc-accordion-header">' +
            '<span class="px-sc-accordion-title">' + rulerPrefix + '<span>' + esc(buttonLabel) + '</span></span>' +
            '<span class="px-sc-accordion-chevron">▼</span>' +
          '</button>' +
          '<div class="px-sc-accordion-content">' +
            '<div class="px-sc-content-slot">' + buildContentHtml(activeUnit) + '</div>' +
          '</div>' +
        '</div>';
      var acc = container.querySelector(".px-sc-accordion");
      container.querySelector(".px-sc-accordion-header")?.addEventListener("click", function (e) {
        if (e) { e.preventDefault(); e.stopPropagation(); }
        acc?.classList.toggle("px-open");
      });
      wire(container, function (unit) {
        activeUnit = unit;
        container.querySelector(".px-sc-content-slot").innerHTML = buildContentHtml(activeUnit);
      });
    } else {
      var isFloating =
        displayMode === "floating" ||
        overrides.position === "floating" ||
        overrides.overrideDisplay === "floating";

      if (!isFloating && overrides.alignment && overrides.alignment !== "left") {
        container.style.display = "flex";
        container.style.justifyContent = overrides.alignment === "right" ? "flex-end" : "center";
      }

      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = isFloating ? "px-sc-floating-btn" : "px-sc-trigger-btn";
      btn.innerHTML = rulerPrefix + "<span>" + esc(buttonLabel) + "</span>";

      btn.style.cssText =
        "background-color:" + bgColor + "!important;color:" + txtColor +
        "!important;border-radius:" + radius + "!important;font-size:" + fSize +
        "!important;border:" + (btnStyle === "solid" ? "1px solid transparent" : btnStyle === "text" ? "none" : "1.5px solid " + bdrColor) +
        "!important;" + (btnStyle === "text" ? "text-decoration:underline!important;padding:6px 4px!important;" : "");

      if (isFloating) {
        var fPos = overrides.floatingPosition || "bottom_right";
        var offY = (overrides.floatingOffsetY !== undefined && overrides.floatingOffsetY !== "") ? overrides.floatingOffsetY + "px" : "24px";
        var offX = (overrides.floatingOffsetX !== undefined && overrides.floatingOffsetX !== "") ? overrides.floatingOffsetX + "px" : "24px";

        var isTop = !fPos.indexOf("top");
        var isMid = !fPos.indexOf("middle");
        var isLeft = fPos.indexOf("left") > -1;
        var v = isMid
          ? "top:50%!important;bottom:auto!important;transform:translateY(-50%)!important;"
          : (isTop ? "top:" + offY + "!important;bottom:auto!important;transform:none!important;" : "bottom:" + offY + "!important;top:auto!important;transform:none!important;");
        var h = isLeft
          ? "left:" + offX + "!important;right:auto!important;"
          : "right:" + offX + "!important;left:auto!important;";

        btn.style.cssText += ";position:fixed!important;" + v + h;
        if (btnStyle === "outline") {
          btn.style.setProperty("background-color", "#ffffff", "important");
        }
        document.body.appendChild(btn);
        if (window.Shopify?.designMode) {
          container.innerHTML = '<div style="padding:8px;border:1px dashed #9ca3af;border-radius:6px;font-size:12px;color:#4b5563;background:#f9fafb;">📍 Pinned to ' + fPos.replace(/_/g, " ") + '.</div>';
        }
      } else {
        var position = overrides.position || "block";
        var injected = false;

        if (position !== "block") {
          btn.classList.add("px-sc-injected-btn");
          btn.style.margin = "10px 0";
          var sel = overrides.customSelector && overrides.customSelector.trim();
          var target = sel ? document.querySelector(sel) : null;
          if (!target) {
            var candidateList = ".product-form__submit,.product__buy-buttons,[name='add'],[data-add-to-cart],.btn-action";
            var el = document.querySelector(candidateList);
            if (el) target = el.closest(".btn-action,.product-form__buttons,.product__buy-buttons") || el;
          }

          if (target) {
            if (position === "above_cart") {
              target.insertAdjacentElement("beforebegin", btn);
              injected = true;
            } else {
              target.insertAdjacentElement("afterend", btn);
              injected = true;
            }
          }
        }

        if (injected) {
          if (window.Shopify?.designMode) {
            var loc = position === "above_cart" ? "Above Add to Cart" : "Below Add to Cart";
            container.innerHTML = '<div style="padding:8px;border:1px dashed #9ca3af;border-radius:6px;font-size:12px;color:#4b5563;background:#f9fafb;">📍 Injected ' + loc + '.</div>';
          } else {
            container.innerHTML = "";
          }
        } else {
          container.innerHTML = "";
          container.appendChild(btn);
        }
      }

      var modal = document.createElement("div");
      modal.className = "px-sc-modal-overlay";
      modal.innerHTML =
        '<div class="px-sc-modal-dialog" role="dialog" aria-modal="true"><div class="px-sc-modal-header"><span class="px-sc-modal-title">Size Guide</span><button type="button" class="px-sc-modal-close" aria-label="Close">&times;</button></div><div class="px-sc-modal-body"><div class="px-sc-content-slot">' +
        buildContentHtml(activeUnit) +
        "</div></div></div>";
      setVars(modal);
      document.body.appendChild(modal);

      var openModal = function (e) {
        if (e) { e.preventDefault(); e.stopPropagation(); }
        modal.classList.add("px-active");
        document.body.style.overflow = "hidden";
      };

      var closeModal = function (e) {
        if (e) { e.preventDefault(); e.stopPropagation(); }
        modal.classList.remove("px-active");
        document.body.style.overflow = "";
      };

      btn.addEventListener("click", openModal);
      if (window.Shopify?.designMode) {
        btn.addEventListener("pointerup", openModal);
      }
      modal.querySelector(".px-sc-modal-close")?.addEventListener("click", closeModal);
      modal.addEventListener("click", function (e) {
        if (e.target === modal) closeModal(e);
      });
      document.addEventListener("keydown", function (e) {
        if (e.key === "Escape" && modal.classList.contains("px-active")) closeModal(e);
      });

      wire(modal, function (unit) {
        activeUnit = unit;
        modal.querySelector(".px-sc-content-slot").innerHTML = buildContentHtml(activeUnit);
      });
    }
  }

  function wire(root, fn) {
    root.addEventListener("click", function (e) {
      var b = e.target.closest(".px-sc-unit-btn");
      if (b && b.dataset.unit) fn(b.dataset.unit);
    });
  }

  function getContrast(h) {
    if (!h || h === "transparent") return "#1e293b";
    var c = h.replace("#", "");
    if (c.length === 3) c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
    var n = parseInt(c, 16);
    return !n || ((n >> 16) * 299 + ((n >> 8) & 255) * 587 + (n & 255) * 114) / 1000 < 140 ? "#ffffff" : "#1e293b";
  }

  function esc(s) {
    return s ? String(s).replace(/[&<>"']/g, function (m) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[m];
    }) : "";
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initSizeCharts);
  } else {
    initSizeCharts();
  }

  if (window.Shopify && window.Shopify.designMode) {
    var reinit = function () {
      document.querySelectorAll("[data-px-size-chart]").forEach(function (el) {
        delete el.dataset.initialized;
      });
      initSizeCharts();
    };
    document.addEventListener("shopify:section:load", reinit);
  }
})();
