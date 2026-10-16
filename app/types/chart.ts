export type BaseUnit = "cm" | "inch" | "mixed";
export type FitNote = "none" | "runs_small" | "true_to_size" | "runs_large";
export type DisplayMode = "inline" | "popup" | "accordion" | "floating";
export type Status = "draft" | "active";

export type TargetType =
  | "product"
  | "collection"
  | "tag"
  | "vendor"
  | "product_type"
  | "all_products";

export interface SetAssignmentInput {
  targetType: TargetType;
  targetValue: string;
  priority?: number;
}

export interface ProductMatchInput {
  productId?: string;
  productHandle?: string;
  collectionIds?: string[];
  tags?: string[];
  vendor?: string;
  productType?: string;
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
