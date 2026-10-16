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
  } | null;
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

  return {
    chartId: chart.id,
    name: chart.name,
    displayMode: chart.displayMode,
    buttonText: chart.buttonText || "Size Guide",
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
          customCss: shopSettings.customCss,
        }
      : null,
  };
}
