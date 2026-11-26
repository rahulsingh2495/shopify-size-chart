import React, { useState } from "react";
import {
  Card,
  BlockStack,
  Text,
  Select,
  Modal,
  TextField,
  Banner,
} from "@shopify/polaris";
import { parseSizeChartCsv, exportSizeChartCsv } from "../utils/csv";

export interface ChartTableEditorProps {
  columns: string[];
  rows: string[][];
  baseUnit: "cm" | "inch" | "mixed";
  onChange: (data: {
    columns: string[];
    rows: string[][];
    baseUnit: "cm" | "inch" | "mixed";
  }) => void;
}

const TEMPLATES: Record<
  string,
  { columns: string[]; rows: string[][]; baseUnit: "cm" | "inch" | "mixed" }
> = {
  tops: {
    baseUnit: "inch",
    columns: ["Size", "Chest (in)", "Length (in)", "Shoulder (in)"],
    rows: [
      ["S", "36 - 38", "28", "17.5"],
      ["M", "40 - 42", "29", "18.5"],
      ["L", "44 - 46", "30", "19.5"],
      ["XL", "48 - 50", "31", "20.5"],
    ],
  },
  bottoms: {
    baseUnit: "inch",
    columns: ["Size", "Waist (in)", "Hip (in)", "Inseam (in)"],
    rows: [
      ["28", "28 - 29", "35 - 36", "30"],
      ["30", "30 - 31", "37 - 38", "30"],
      ["32", "32 - 33", "39 - 40", "32"],
      ["34", "34 - 35", "41 - 42", "32"],
      ["36", "36 - 37", "43 - 44", "32"],
    ],
  },
  shoes: {
    baseUnit: "mixed",
    columns: ["US Men", "US Women", "UK", "EU", "CM"],
    rows: [
      ["7", "8.5", "6", "40", "25.0"],
      ["8", "9.5", "7", "41", "26.0"],
      ["9", "10.5", "8", "42.5", "27.0"],
      ["10", "11.5", "9", "44", "28.0"],
      ["11", "12.5", "10", "45", "29.0"],
    ],
  },
  rings: {
    baseUnit: "mixed",
    columns: ["Ring Size (US)", "Diameter (mm)", "Circumference (mm)"],
    rows: [
      ["5", "15.7", "49.3"],
      ["6", "16.5", "51.9"],
      ["7", "17.3", "54.4"],
      ["8", "18.1", "57.0"],
      ["9", "18.9", "59.5"],
    ],
  },
};

export function ChartTableEditor({
  columns,
  rows,
  baseUnit,
  onChange,
}: ChartTableEditorProps) {
  const [csvModalOpen, setCsvModalOpen] = useState(false);
  const [csvInput, setCsvInput] = useState("");
  const [csvError, setCsvError] = useState<string | null>(null);

  const handleCellChange = (rowIndex: number, colIndex: number, value: string) => {
    const newRows = rows.map((r, ri) =>
      ri === rowIndex ? r.map((c, ci) => (ci === colIndex ? value : c)) : r,
    );
    onChange({ columns, rows: newRows, baseUnit });
  };

  const handleColumnNameChange = (colIndex: number, value: string) => {
    const newCols = columns.map((col, i) => (i === colIndex ? value : col));
    onChange({ columns: newCols, rows, baseUnit });
  };

  const addColumn = () => {
    const newColName = `Col ${columns.length + 1}`;
    const newCols = [...columns, newColName];
    const newRows = rows.map((r) => [...r, ""]);
    onChange({ columns: newCols, rows: newRows, baseUnit });
  };

  const removeColumn = (colIndex: number) => {
    if (columns.length <= 1) return;
    const newCols = columns.filter((_, i) => i !== colIndex);
    const newRows = rows.map((r) => r.filter((_, i) => i !== colIndex));
    onChange({ columns: newCols, rows: newRows, baseUnit });
  };

  const addRow = () => {
    const newRow = columns.map(() => "");
    onChange({ columns, rows: [...rows, newRow], baseUnit });
  };

  const removeRow = (rowIndex: number) => {
    if (rows.length <= 1) return;
    const newRows = rows.filter((_, i) => i !== rowIndex);
    onChange({ columns, rows: newRows, baseUnit });
  };

  const applyTemplate = (templateKey: string) => {
    const template = TEMPLATES[templateKey];
    if (template) {
      onChange({
        columns: [...template.columns],
        rows: template.rows.map((r) => [...r]),
        baseUnit: template.baseUnit,
      });
    }
  };

  const handleCsvImport = () => {
    setCsvError(null);
    try {
      const parsed = parseSizeChartCsv(csvInput);
      onChange({
        columns: parsed.columns,
        rows: parsed.rows,
        baseUnit,
      });
      setCsvModalOpen(false);
      setCsvInput("");
    } catch (err: any) {
      setCsvError(err.message || "Failed to parse CSV");
    }
  };

  const handleExportCsv = () => {
    const csvString = exportSizeChartCsv({ columns, rows });
    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `size-chart.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Card>
      <BlockStack gap="400">
        <Text as="h2" variant="headingMd">
          Measurements
        </Text>

        {/* Top Controls: Base Unit & Template Actions */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "12px",
            paddingBottom: "4px",
          }}
        >
          {/* Base Unit */}
          <div style={{ width: "160px" }}>
            <Select
              label="Base unit"
              options={[
                { label: "Inches (in)", value: "inch" },
                { label: "Centimeters (cm)", value: "cm" },
                { label: "Mixed / Sizes", value: "mixed" },
              ]}
              value={baseUnit}
              onChange={(val) =>
                onChange({
                  columns,
                  rows,
                  baseUnit: val as "cm" | "inch" | "mixed",
                })
              }
            />
          </div>

          {/* Template, Import, Export */}
          <div style={{ display: "flex", alignItems: "flex-end", gap: "8px", flexWrap: "wrap" }}>
            <div style={{ width: "180px" }}>
              <Select
                label="Choose a template"
                options={[
                  { label: "Choose a template...", value: "" },
                  { label: "Tops (Chest, Length, Shoulder)", value: "tops" },
                  { label: "Bottoms (Waist, Hip, Inseam)", value: "bottoms" },
                  { label: "Shoes (US, UK, EU, CM)", value: "shoes" },
                  { label: "Rings (US, Dia, Circ)", value: "rings" },
                ]}
                onChange={(val) => val && applyTemplate(val)}
                value=""
              />
            </div>
            <button
              type="button"
              onClick={() => setCsvModalOpen(true)}
              style={{
                height: "36px",
                padding: "0 14px",
                background: "#ffffff",
                border: "1px solid #d4d7dc",
                borderRadius: "8px",
                fontSize: "13px",
                fontWeight: 500,
                color: "#202223",
                cursor: "pointer",
              }}
            >
              Import CSV
            </button>
            <button
              type="button"
              onClick={handleExportCsv}
              style={{
                height: "36px",
                padding: "0 14px",
                background: "#ffffff",
                border: "1px solid #d4d7dc",
                borderRadius: "8px",
                fontSize: "13px",
                fontWeight: 500,
                color: "#202223",
                cursor: "pointer",
              }}
            >
              Export CSV
            </button>
          </div>
        </div>

        {/* Measurement Grid */}
        <div style={{ overflowX: "auto", width: "100%", borderRadius: "8px" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "separate",
              borderSpacing: "0 6px",
              minWidth: `${Math.max(columns.length * 130 + 120, 520)}px`,
            }}
          >
            <thead>
              <tr>
                {columns.map((col, ci) => (
                  <th
                    key={ci}
                    style={{
                      padding: "0 4px",
                      textAlign: "left",
                      minWidth: "120px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        background: "#f8fafc",
                        border: "1px solid #e2e8f0",
                        borderRadius: "6px",
                        padding: "2px 8px",
                        height: "36px",
                        boxSizing: "border-box",
                      }}
                    >
                      <input
                        type="text"
                        value={col}
                        onChange={(e) => handleColumnNameChange(ci, e.target.value)}
                        style={{
                          border: "none",
                          background: "transparent",
                          outline: "none",
                          width: "100%",
                          fontSize: "13px",
                          fontWeight: 600,
                          color: "#1e293b",
                        }}
                      />
                      {columns.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeColumn(ci)}
                          style={{
                            background: "none",
                            border: "none",
                            color: "#94a3b8",
                            cursor: "pointer",
                            padding: "0 2px",
                            fontSize: "12px",
                            display: "flex",
                          }}
                          title="Remove column"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </th>
                ))}
                <th style={{ width: "120px", padding: "0 4px", textAlign: "center" }}>
                  <button
                    type="button"
                    onClick={addColumn}
                    style={{
                      width: "100%",
                      height: "36px",
                      background: "#ffffff",
                      border: "1px dashed #cbd5e1",
                      borderRadius: "6px",
                      fontSize: "12.5px",
                      fontWeight: 600,
                      color: "#334155",
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "4px",
                    }}
                  >
                    + Add column
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => (
                <tr key={ri}>
                  {row.map((cell, ci) => (
                    <td key={ci} style={{ padding: "0 4px" }}>
                      <input
                        type="text"
                        value={cell}
                        onChange={(e) => handleCellChange(ri, ci, e.target.value)}
                        style={{
                          width: "100%",
                          height: "36px",
                          border: "1px solid #e2e8f0",
                          borderRadius: "6px",
                          padding: "0 10px",
                          fontSize: "13px",
                          color: "#0f172a",
                          background: "#ffffff",
                          outline: "none",
                          boxSizing: "border-box",
                        }}
                      />
                    </td>
                  ))}
                  <td style={{ padding: "0 8px", textAlign: "center" }}>
                    <button
                      type="button"
                      onClick={() => removeRow(ri)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#ef4444",
                        fontSize: "12.5px",
                        fontWeight: 500,
                        cursor: "pointer",
                        padding: "4px 8px",
                      }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Add Row Button */}
        <div>
          <button
            type="button"
            onClick={addRow}
            style={{
              height: "34px",
              padding: "0 14px",
              background: "#ffffff",
              border: "1px solid #d4d7dc",
              borderRadius: "6px",
              fontSize: "13px",
              fontWeight: 500,
              color: "#202223",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            + Add row
          </button>
        </div>
      </BlockStack>

      {/* CSV Import Modal */}
      <Modal
        open={csvModalOpen}
        onClose={() => setCsvModalOpen(false)}
        title="Import Size Chart from CSV"
        primaryAction={{
          content: "Import Data",
          onAction: handleCsvImport,
        }}
        secondaryActions={[
          {
            content: "Cancel",
            onAction: () => setCsvModalOpen(false),
          },
        ]}
      >
        <Modal.Section>
          <BlockStack gap="400">
            {csvError && <Banner tone="critical">{csvError}</Banner>}
            <Text as="p" variant="bodyMd">
              Paste your comma-separated (CSV) size chart table below. The first row will be used as the column headers.
            </Text>
            <TextField
              label="CSV Content"
              labelHidden
              multiline={8}
              value={csvInput}
              onChange={setCsvInput}
              placeholder={"Size,Chest (in),Waist (in)\nS,36,30\nM,40,34\nL,44,38"}
              autoComplete="off"
            />
          </BlockStack>
        </Modal.Section>
      </Modal>
    </Card>
  );
}
