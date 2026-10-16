import prisma from "../db.server";

export type BaseUnit = "cm" | "inch" | "mixed";
export type FitNote = "none" | "runs_small" | "true_to_size" | "runs_large";
export type DisplayMode = "inline" | "popup" | "accordion" | "floating";
export type Status = "draft" | "active";

export interface CreateSizeChartInput {
  shopId: string;
  name: string;
  status?: Status;
  fitNote?: FitNote;
  measurementInstructions?: string | null;
  displayMode?: DisplayMode;
  buttonText?: string;
  columns: string[];
  rows: string[][];
  baseUnit?: BaseUnit;
}

export interface UpdateSizeChartInput {
  name?: string;
  status?: Status;
  fitNote?: FitNote;
  measurementInstructions?: string | null;
  displayMode?: DisplayMode;
  buttonText?: string;
  columns?: string[];
  rows?: string[][];
  baseUnit?: BaseUnit;
}

export interface SizeChartTableData {
  id: string;
  sizeChartId: string;
  columns: string[];
  rows: string[][];
  baseUnit: BaseUnit;
}

export interface SizeChartWithTable {
  id: string;
  shopId: string;
  name: string;
  status: string;
  fitNote: string;
  measurementInstructions: string | null;
  displayMode: string;
  buttonText: string;
  createdAt: Date;
  updatedAt: Date;
  table: SizeChartTableData | null;
  assignments?: Array<{
    id: string;
    sizeChartId: string;
    targetType: string;
    targetValue: string;
    priority: number;
  }>;
}

export interface SizeChartSummary {
  id: string;
  shopId: string;
  name: string;
  status: string;
  fitNote: string;
  displayMode: string;
  buttonText: string;
  createdAt: Date;
  updatedAt: Date;
  assignmentCount: number;
}

function formatChartWithTable(chart: any): SizeChartWithTable {
  return {
    id: chart.id,
    shopId: chart.shopId,
    name: chart.name,
    status: chart.status,
    fitNote: chart.fitNote,
    measurementInstructions: chart.measurementInstructions,
    displayMode: chart.displayMode,
    buttonText: chart.buttonText,
    createdAt: chart.createdAt,
    updatedAt: chart.updatedAt,
    table: chart.table
      ? {
          id: chart.table.id,
          sizeChartId: chart.table.sizeChartId,
          columns: JSON.parse(chart.table.columnsJson || "[]"),
          rows: JSON.parse(chart.table.rowsJson || "[]"),
          baseUnit: (chart.table.baseUnit as BaseUnit) || "cm",
        }
      : null,
    assignments: chart.assignments || [],
  };
}

export async function createSizeChart(
  input: CreateSizeChartInput,
): Promise<SizeChartWithTable> {
  const chart = await prisma.sizeChart.create({
    data: {
      shopId: input.shopId,
      name: input.name,
      status: input.status ?? "draft",
      fitNote: input.fitNote ?? "none",
      measurementInstructions: input.measurementInstructions ?? null,
      displayMode: input.displayMode ?? "popup",
      buttonText: input.buttonText ?? "Size Guide",
      table: {
        create: {
          columnsJson: JSON.stringify(input.columns || []),
          rowsJson: JSON.stringify(input.rows || []),
          baseUnit: input.baseUnit ?? "cm",
        },
      },
    },
    include: {
      table: true,
      assignments: true,
    },
  });

  return formatChartWithTable(chart);
}

export async function getSizeChart(id: string): Promise<SizeChartWithTable | null> {
  const chart = await prisma.sizeChart.findUnique({
    where: { id },
    include: {
      table: true,
      assignments: true,
    },
  });

  if (!chart) return null;
  return formatChartWithTable(chart);
}

export async function updateSizeChart(
  id: string,
  input: UpdateSizeChartInput,
): Promise<SizeChartWithTable> {
  const data: any = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.status !== undefined) data.status = input.status;
  if (input.fitNote !== undefined) data.fitNote = input.fitNote;
  if (input.measurementInstructions !== undefined)
    data.measurementInstructions = input.measurementInstructions;
  if (input.displayMode !== undefined) data.displayMode = input.displayMode;
  if (input.buttonText !== undefined) data.buttonText = input.buttonText;

  if (
    input.columns !== undefined ||
    input.rows !== undefined ||
    input.baseUnit !== undefined
  ) {
    const tableUpdate: any = {};
    if (input.columns !== undefined)
      tableUpdate.columnsJson = JSON.stringify(input.columns);
    if (input.rows !== undefined)
      tableUpdate.rowsJson = JSON.stringify(input.rows);
    if (input.baseUnit !== undefined) tableUpdate.baseUnit = input.baseUnit;

    data.table = {
      upsert: {
        create: {
          columnsJson: JSON.stringify(input.columns || []),
          rowsJson: JSON.stringify(input.rows || []),
          baseUnit: input.baseUnit ?? "cm",
        },
        update: tableUpdate,
      },
    };
  }

  const updated = await prisma.sizeChart.update({
    where: { id },
    data,
    include: {
      table: true,
      assignments: true,
    },
  });

  return formatChartWithTable(updated);
}

export async function listSizeCharts(
  shopId: string,
): Promise<SizeChartSummary[]> {
  const charts = await prisma.sizeChart.findMany({
    where: { shopId },
    orderBy: { updatedAt: "desc" },
    include: {
      assignments: {
        select: { id: true },
      },
    },
  });

  return charts.map((c) => ({
    id: c.id,
    shopId: c.shopId,
    name: c.name,
    status: c.status,
    fitNote: c.fitNote,
    displayMode: c.displayMode,
    buttonText: c.buttonText,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
    assignmentCount: c.assignments.length,
  }));
}

export async function deleteSizeChart(id: string): Promise<void> {
  await prisma.sizeChart.delete({
    where: { id },
  });
}

export async function duplicateSizeChart(
  id: string,
): Promise<SizeChartWithTable> {
  const original = await getSizeChart(id);
  if (!original) {
    throw new Error(`SizeChart not found: ${id}`);
  }

  return createSizeChart({
    shopId: original.shopId,
    name: `${original.name} (Copy)`,
    status: "draft",
    fitNote: original.fitNote as FitNote,
    measurementInstructions: original.measurementInstructions,
    displayMode: original.displayMode as DisplayMode,
    buttonText: original.buttonText,
    columns: original.table ? original.table.columns : [],
    rows: original.table ? original.table.rows : [],
    baseUnit: original.table ? original.table.baseUnit : "cm",
  });
}
