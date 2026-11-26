import React, { useState } from "react";
import type { BaseUnit, FitNote } from "../types/chart";

export interface LivePreviewModalProps {
  open: boolean;
  onClose: () => void;
  chartName: string;
  buttonText: string;
  fitNote: FitNote;
  measurementInstructions: string;
  columns: string[];
  rows: string[][];
  baseUnit: BaseUnit;
}

export function LivePreviewModal({
  open,
  onClose,
  chartName,
  buttonText,
  fitNote,
  measurementInstructions,
  columns,
  rows,
  baseUnit,
}: LivePreviewModalProps) {
  const [activeUnit, setActiveUnit] = useState<BaseUnit>(baseUnit || "inch");

  if (!open) return null;

  const conv = baseUnit === "cm" || baseUnit === "inch";

  function convertCell(val: string, target: string, current: string) {
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

  const formatFitNote = (note: FitNote) => {
    switch (note) {
      case "true_to_size":
        return { label: "True to size", bg: "#eaf7ee", color: "#166534" };
      case "runs_small":
        return { label: "Runs small", bg: "#fff7ed", color: "#c2410c" };
      case "runs_large":
        return { label: "Runs large", bg: "#eff6ff", color: "#1d4ed8" };
      default:
        return null;
    }
  };

  const fitBadge = formatFitNote(fitNote);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 999999,
        background: "rgba(0, 0, 0, 0.45)",
        backdropFilter: "blur(2px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#ffffff",
          borderRadius: "16px",
          width: "100%",
          maxWidth: "640px",
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
          padding: "24px 28px",
          position: "relative",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingBottom: "16px",
            borderBottom: "1px solid #f1f2f4",
            marginBottom: "20px",
          }}
        >
          <span style={{ fontSize: "17px", fontWeight: 700, color: "#111827" }}>Live preview</span>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "4px",
              color: "#6b7280",
              display: "flex",
            }}
            aria-label="Close"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Title & Badge */}
        <div style={{ marginBottom: "16px" }}>
          <h2 style={{ fontSize: "22px", fontWeight: 700, color: "#111827", margin: "0 0 6px 0" }}>
            {buttonText || "Size Guide"}
          </h2>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "14px", color: "#4b5563", fontWeight: 500 }}>
              {chartName || "Size Chart"}
            </span>
            {fitBadge && (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  padding: "3px 10px",
                  borderRadius: "12px",
                  fontSize: "12px",
                  fontWeight: 600,
                  background: fitBadge.bg,
                  color: fitBadge.color,
                }}
              >
                {fitBadge.label}
              </span>
            )}
          </div>
        </div>

        {/* Unit Toggle if applicable */}
        {conv && (
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "12px" }}>
            <div
              style={{
                display: "inline-flex",
                background: "#f3f4f6",
                borderRadius: "8px",
                padding: "2px",
                border: "1px solid #e5e7eb",
              }}
            >
              <button
                type="button"
                onClick={() => setActiveUnit("inch")}
                style={{
                  background: activeUnit === "inch" ? "#ffffff" : "transparent",
                  color: activeUnit === "inch" ? "#111827" : "#6b7280",
                  border: "none",
                  borderRadius: "6px",
                  padding: "4px 12px",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                  boxShadow: activeUnit === "inch" ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
                }}
              >
                INCHES
              </button>
              <button
                type="button"
                onClick={() => setActiveUnit("cm")}
                style={{
                  background: activeUnit === "cm" ? "#ffffff" : "transparent",
                  color: activeUnit === "cm" ? "#111827" : "#6b7280",
                  border: "none",
                  borderRadius: "6px",
                  padding: "4px 12px",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                  boxShadow: activeUnit === "cm" ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
                }}
              >
                CM
              </button>
            </div>
          </div>
        )}

        {/* Table */}
        <div
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: "10px",
            overflow: "hidden",
            marginBottom: "8px",
          }}
        >
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13.5px" }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e5e7eb" }}>
                {columns.map((col, idx) => {
                  let name = col;
                  if (conv) {
                    name = name.replace(/\((in|inch|inches|cm)\)/gi, "").trim() + ` (${activeUnit})`;
                  }
                  return (
                    <th
                      key={idx}
                      style={{
                        padding: "10px 14px",
                        textAlign: idx === 0 ? "left" : "center",
                        fontWeight: 600,
                        color: "#1e293b",
                        fontSize: "13px",
                      }}
                    >
                      {name}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => (
                <tr
                  key={ri}
                  style={{
                    borderBottom: ri < rows.length - 1 ? "1px solid #f1f5f9" : "none",
                    background: ri % 2 === 0 ? "#ffffff" : "#fafafa",
                  }}
                >
                  {row.map((cell, ci) => (
                    <td
                      key={ci}
                      style={{
                        padding: "10px 14px",
                        textAlign: ci === 0 ? "left" : "center",
                        color: "#334155",
                        fontWeight: ci === 0 ? 500 : 400,
                      }}
                    >
                      {conv ? convertCell(cell, activeUnit, baseUnit) : cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "22px" }}>
          Measurements in {activeUnit === "cm" ? "centimeters" : activeUnit === "inch" ? "inches" : "standard sizes"}
        </div>

        {/* How to Measure */}
        {measurementInstructions && (
          <div style={{ borderTop: "1px solid #f1f2f4", paddingTop: "16px" }}>
            <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#111827", margin: "0 0 8px 0" }}>
              How to measure
            </h3>
            <div style={{ fontSize: "13px", color: "#475569", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
              {measurementInstructions}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
