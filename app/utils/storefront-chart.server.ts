import prisma from "../db.server";
import { findMatchingChart } from "../models/assignment.server";
import { getShopSettings } from "../models/shop.server";
import type { ProductMatchInput } from "../types/chart";

export interface StorefrontChartRequest extends ProductMatchInput {
  shopDomain: string;
}

export interface StorefrontChartPayload {
  chartId: string;
  name: string;
  displayMode: string;
  buttonText: string;
  fitNote: string;
  measurementInstructions: string | null;
  baseUnit: string;
  columns: string[];
  rows: string[][];
  displaySettings?: {
    primaryColor: string | null;
    textColor: string | null;
    borderStyle: string | null;
    customCss: string | null;
    buttonText?: string;
    buttonStyle?: "solid" | "outline" | "text";
    borderColor?: string;
    showRulerIcon?: boolean;
    fontSize?: number;
    iconSize?: number;
    tableHeaderBg?: string;
    tableHeaderColor?: string;
    modalHeaderColor?: string;
    chartBgColor?: string;
    tableRowEvenBg?: string;
    tableRowOddBg?: string;
    tableTextColor?: string;
    tableBorderColor?: string;
  } | null;
}

interface CustomButtonConfig {
  buttonText?: string;
  buttonStyle?: "solid" | "outline" | "text";
  borderColor?: string;
  showRulerIcon?: boolean;
  fontSize?: number;
  iconSize?: number;
  tableHeaderBg?: string;
  tableHeaderColor?: string;
  modalHeaderColor?: string;
  chartBgColor?: string;
  tableRowEvenBg?: string;
  tableRowOddBg?: string;
  tableTextColor?: string;
  tableBorderColor?: string;
}

function parseCustomConfig(rawCss: string | null | undefined): { config: CustomButtonConfig; cleanCss: string } {
  if (!rawCss) {
    return { config: {}, cleanCss: "" };
  }
  const match = rawCss.match(/^\/\*__CONFIG__\s*([\s\S]*?)\s*\*\/([\s\S]*)$/);
  if (match) {
    try {
      const config = JSON.parse(match[1]);
      return { config, cleanCss: match[2].trim() };
    } catch {
      return { config: {}, cleanCss: rawCss };
    }
  }
  return { config: {}, cleanCss: rawCss };
}

export async function getStorefrontChartPayload(
  input: StorefrontChartRequest,
): Promise<StorefrontChartPayload | null> {
  const shop = await prisma.shop.findUnique({
    where: { shopDomain: input.shopDomain },
  });

  if (!shop) {
    return null;
  }

  const chart = await findMatchingChart(shop.id, {
    productId: input.productId,
    productHandle: input.productHandle,
    collectionIds: input.collectionIds,
    tags: input.tags,
    vendor: input.vendor,
    productType: input.productType,
  });

  if (!chart || !chart.table) {
    return null;
  }

  const shopSettings = await getShopSettings(shop.id);
  const rawCss = shopSettings?.customCss || "";
  const { config, cleanCss } = parseCustomConfig(rawCss);

  return {
    chartId: chart.id,
    name: chart.name,
    displayMode: chart.displayMode,
    buttonText: chart.buttonText || config.buttonText || "Size Guide",
    fitNote: chart.fitNote,
    measurementInstructions: chart.measurementInstructions,
    baseUnit: chart.table.baseUnit,
    columns: chart.table.columns,
    rows: chart.table.rows,
    displaySettings: shopSettings
      ? {
          primaryColor: shopSettings.primaryColor,
          textColor: shopSettings.textColor,
          borderStyle: shopSettings.borderStyle,
          customCss: cleanCss,
          buttonText: config.buttonText || "Size guide",
          buttonStyle: config.buttonStyle || "solid",
          borderColor: config.borderColor || "#303030",
          showRulerIcon: config.showRulerIcon !== undefined ? config.showRulerIcon : true,
          fontSize: config.fontSize || 13,
          iconSize: config.iconSize || 14,
          tableHeaderBg: config.tableHeaderBg || "#f8fafc",
          tableHeaderColor: config.tableHeaderColor || "#1e293b",
          modalHeaderColor: config.modalHeaderColor || "#111827",
          chartBgColor: config.chartBgColor || "#ffffff",
          tableRowEvenBg: config.tableRowEvenBg || "#ffffff",
          tableRowOddBg: config.tableRowOddBg || "#f8fafc",
          tableTextColor: config.tableTextColor || "#334155",
          tableBorderColor: config.tableBorderColor || "#e2e8f0",
        }
      : null,
  };
}
