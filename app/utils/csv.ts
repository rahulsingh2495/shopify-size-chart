export interface ParsedSizeChartTable {
  columns: string[];
  rows: string[][];
}

/**
 * Pure TypeScript RFC-4180 compliant CSV tokenizer.
 * Works seamlessly in both browser and Node environments with 0 dependencies.
 */
function tokenizeCsv(text: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = "";
  let insideQuotes = false;
  let i = 0;

  while (i < text.length) {
    const char = text[i];

    if (insideQuotes) {
      if (char === '"') {
        if (i + 1 < text.length && text[i + 1] === '"') {
          currentCell += '"';
          i += 2;
          continue;
        } else {
          insideQuotes = false;
          i++;
          continue;
        }
      } else if (char === '\\' && i + 1 < text.length && text[i + 1] === '"') {
        currentCell += '"';
        i += 2;
        continue;
      } else {
        currentCell += char;
        i++;
        continue;
      }
    } else {
      if (char === '"') {
        insideQuotes = true;
        i++;
        continue;
      } else if (char === ',') {
        currentRow.push(currentCell);
        currentCell = "";
        i++;
        continue;
      } else if (char === '\r') {
        if (i + 1 < text.length && text[i + 1] === '\n') {
          i++;
        }
        currentRow.push(currentCell);
        currentCell = "";
        rows.push(currentRow);
        currentRow = [];
        i++;
        continue;
      } else if (char === '\n') {
        currentRow.push(currentCell);
        currentCell = "";
        rows.push(currentRow);
        currentRow = [];
        i++;
        continue;
      } else {
        currentCell += char;
        i++;
        continue;
      }
    }
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell);
    rows.push(currentRow);
  }

  return rows;
}

export function parseSizeChartCsv(csvText: string): ParsedSizeChartTable {
  if (!csvText || !csvText.trim()) {
    throw new Error("CSV file is empty");
  }

  let records = tokenizeCsv(csvText);

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

  if (lastNonEmptyCol === -1) {
    throw new Error("CSV file contains no valid column headers");
  }

  const numCols = lastNonEmptyCol + 1;
  const columns = headerRow.slice(0, numCols);

  const normalizedRows = dataRows.map((row) => {
    const trimmedRow = row.slice(0, numCols);
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
  return records
    .map((row) =>
      row
        .map((cell) => {
          const str = cell ?? "";
          if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        })
        .join(",")
    )
    .join("\n");
}
