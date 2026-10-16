import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";

export interface ParsedSizeChartTable {
  columns: string[];
  rows: string[][];
}

export function parseSizeChartCsv(csvText: string): ParsedSizeChartTable {
  if (!csvText || !csvText.trim()) {
    throw new Error("CSV file is empty");
  }

  let records: string[][];
  try {
    records = parse(csvText, {
      skip_empty_lines: true,
      relax_column_count: true,
      relax_quotes: true,
      escape: "\\",
      trim: true,
    });
  } catch (err: any) {
    throw new Error(`Invalid CSV format: ${err.message || err}`);
  }

  // Filter out any rows that are entirely empty strings
  records = records.filter((row) => row.some((cell) => cell.trim().length > 0));

  if (records.length === 0) {
    throw new Error("CSV file is empty");
  }

  if (records.length === 1) {
    throw new Error("CSV file contains no data rows");
  }

  const headerRow = records[0].map((h) => h.trim());
  const dataRows = records.slice(1).map((row) => row.map((cell) => cell.trim()));

  // Determine last non-empty header column index
  let lastNonEmptyCol = -1;
  for (let i = headerRow.length - 1; i >= 0; i--) {
    if (headerRow[i].length > 0) {
      lastNonEmptyCol = i;
      break;
    }
  }

  // If all headers were empty
  if (lastNonEmptyCol === -1) {
    throw new Error("CSV file contains no valid column headers");
  }

  const numCols = lastNonEmptyCol + 1;
  const columns = headerRow.slice(0, numCols);

  const normalizedRows = dataRows.map((row) => {
    const trimmedRow = row.slice(0, numCols);
    // Pad if shorter than numCols
    while (trimmedRow.length < numCols) {
      trimmedRow.push("");
    }
    return trimmedRow;
  });

  return {
    columns,
    rows: normalizedRows,
  };
}

export function exportSizeChartCsv(table: ParsedSizeChartTable): string {
  const records = [table.columns, ...table.rows];
  return stringify(records);
}
