import React, { useState } from "react";
import {
  Card,
  BlockStack,
  InlineStack,
  Text,
  TextField,
  Button,
  Select,
  Banner,
  Modal,
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
    const newColName = `Measurement ${columns.length}`;
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
        <InlineStack align="space-between" blockAlign="center">
          <Text as="h2" variant="headingMd">
            Size Chart Table
          </Text>
          <InlineStack gap="200">
            <Select
              label=""
              labelHidden
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
            <Button onClick={() => setCsvModalOpen(true)}>Import CSV</Button>
            <Button onClick={handleExportCsv}>Export CSV</Button>
          </InlineStack>
        </InlineStack>

        <InlineStack gap="300" blockAlign="center">
          <Text as="span" variant="bodyMd">
            Base Unit:
          </Text>
          <div style={{ width: "150px" }}>
            <Select
              label=""
              labelHidden
              options={[
                { label: "Centimeters (cm)", value: "cm" },
                { label: "Inches (in)", value: "inch" },
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
        </InlineStack>

        <div style={{ overflowX: "auto", width: "100%" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              minWidth: `${Math.max(columns.length * 140, 500)}px`,
            }}
          >
            <thead>
              <tr style={{ background: "#f6f6f7" }}>
                {columns.map((col, ci) => (
                  <th
                    key={ci}
                    style={{
                      padding: "8px",
                      border: "1px solid #dfe3e8",
                      textAlign: "left",
                      minWidth: "130px",
                    }}
                  >
                    <InlineStack gap="100" blockAlign="center">
                      <div style={{ flex: 1 }}>
                        <TextField
                          label=""
                          labelHidden
                          value={col}
                          onChange={(val) => handleColumnNameChange(ci, val)}
                          autoComplete="off"
                        />
                      </div>
                      {columns.length > 1 && (
                        <Button
                          variant="plain"
                          tone="critical"
                          onClick={() => removeColumn(ci)}
                        >
                          ✕
                        </Button>
                      )}
                    </InlineStack>
                  </th>
                ))}
                <th
                  style={{
                    padding: "8px",
                    border: "1px solid #dfe3e8",
                    width: "80px",
                    textAlign: "center",
                  }}
                >
                  <Button size="micro" onClick={addColumn}>
                    + Col
                  </Button>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => (
                <tr key={ri}>
                  {row.map((cell, ci) => (
                    <td
                      key={ci}
                      style={{
                        padding: "6px",
                        border: "1px solid #dfe3e8",
                      }}
                    >
                      <TextField
                        label=""
                        labelHidden
                        value={cell}
                        onChange={(val) => handleCellChange(ri, ci, val)}
                        autoComplete="off"
                      />
                    </td>
                  ))}
                  <td
                    style={{
                      padding: "6px",
                      border: "1px solid #dfe3e8",
                      textAlign: "center",
                    }}
                  >
                    {rows.length > 1 && (
                      <Button
                        variant="plain"
                        tone="critical"
                        onClick={() => removeRow(ri)}
                      >
                        Delete
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <InlineStack>
          <Button onClick={addRow}>+ Add Row</Button>
        </InlineStack>

        {csvModalOpen && (
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
                  Paste standard CSV text below. The first row should contain the column names
                  (e.g., Size, Chest, Waist, Hip).
                </Text>
                <TextField
                  label="CSV Content"
                  multiline={8}
                  value={csvInput}
                  onChange={setCsvInput}
                  placeholder={`Size,Chest,Waist,Hip\nS,36-38,30-32,35-37\nM,39-41,33-35,38-40\nL,42-44,36-38,41-43`}
                  autoComplete="off"
                />
              </BlockStack>
            </Modal.Section>
          </Modal>
        )}
      </BlockStack>
    </Card>
  );
}
