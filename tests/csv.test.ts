import { describe, it, expect } from "vitest";
import {
  parseSizeChartCsv,
  exportSizeChartCsv,
  ParsedSizeChartTable,
} from "../app/utils/csv.server";

describe("CSV Import and Export", () => {
  it("parses valid CSV matching the design spec", () => {
    const csvContent = `Size,Chest,Waist,Hip
S,36-38,30-32,35-37
M,39-41,33-35,38-40
L,42-44,36-38,41-43`;

    const result = parseSizeChartCsv(csvContent);

    expect(result.columns).toEqual(["Size", "Chest", "Waist", "Hip"]);
    expect(result.rows).toHaveLength(3);
    expect(result.rows[0]).toEqual(["S", "36-38", "30-32", "35-37"]);
    expect(result.rows[1]).toEqual(["M", "39-41", "33-35", "38-40"]);
    expect(result.rows[2]).toEqual(["L", "42-44", "36-38", "41-43"]);
  });

  it("trims trailing empty columns and empty rows", () => {
    const csvContent = `Size,Chest,Waist,
S,36,30,
M,38,32,
,,,\n\n`;

    const result = parseSizeChartCsv(csvContent);

    expect(result.columns).toEqual(["Size", "Chest", "Waist"]);
    expect(result.rows).toEqual([
      ["S", "36", "30"],
      ["M", "38", "32"],
    ]);
  });

  it("throws clear validation error when CSV is completely empty", () => {
    expect(() => parseSizeChartCsv("")).toThrowError(/empty/i);
    expect(() => parseSizeChartCsv("   \n\n  ")).toThrowError(/empty/i);
  });

  it("throws error when CSV has headers but no data rows", () => {
    const csvContent = `Size,Chest,Waist`;
    expect(() => parseSizeChartCsv(csvContent)).toThrowError(/no data rows/i);
  });

  it("handles commas and quotes properly via real CSV parser", () => {
    const csvContent = `Size,"Description, Notes",Price
"S - Small","Chest: 36\\", slim fit",\$25
"M - Medium","Chest: 38\\", standard fit",\$30`;

    const result = parseSizeChartCsv(csvContent);
    expect(result.columns[1]).toBe("Description, Notes");
    expect(result.rows[0][0]).toBe("S - Small");
  });

  it("exports a size chart table to valid CSV that parses back to identical data", () => {
    const table: ParsedSizeChartTable = {
      columns: ["Size", "Chest (cm)", "Waist (cm)"],
      rows: [
        ["XS", "88", "72"],
        ["S", "92", "76"],
        ["M", "96", "80"],
      ],
    };

    const csvOutput = exportSizeChartCsv(table);
    expect(csvOutput).toContain("Size,Chest (cm),Waist (cm)");

    const reimported = parseSizeChartCsv(csvOutput);
    expect(reimported.columns).toEqual(table.columns);
    expect(reimported.rows).toEqual(table.rows);
  });
});
