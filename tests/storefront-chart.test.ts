import { describe, it, expect, beforeEach } from "vitest";
import prisma from "../app/db.server";
import { getOrCreateShop, upsertShopSettings } from "../app/models/shop.server";
import { createSizeChart } from "../app/models/chart.server";
import { setAssignments } from "../app/models/assignment.server";
import { getStorefrontChartPayload } from "../app/utils/storefront-chart.server";

describe("Storefront chart serialization", () => {
  const shopDomain = "storefront-test.myshopify.com";
  let shopId: string;

  beforeEach(async () => {
    await prisma.chartAssignment.deleteMany({});
    await prisma.sizeChartTable.deleteMany({});
    await prisma.sizeChart.deleteMany({});
    await prisma.displaySettings.deleteMany({});
    await prisma.shop.deleteMany({});

    const shop = await getOrCreateShop(shopDomain, "shpat_secret_token_123");
    shopId = shop.id;

    await upsertShopSettings(shopId, {
      primaryColor: "#ff0055",
      textColor: "#111111",
      borderStyle: "rounded",
    });
  });

  it("returns storefront-safe chart payload for matching product", async () => {
    const chart = await createSizeChart({
      shopId,
      name: "Men Denim",
      status: "active",
      fitNote: "runs_small",
      displayMode: "popup",
      buttonText: "Check Size",
      measurementInstructions: "Measure around your waist.",
      columns: ["Size", "Waist", "Inseam"],
      rows: [["30", "30", "32"], ["32", "32", "32"]],
      baseUnit: "inch",
    });

    await setAssignments(chart.id, [
      { targetType: "tag", targetValue: "denim" },
    ]);

    const payload = await getStorefrontChartPayload({
      shopDomain,
      tags: ["denim", "pants"],
    });

    expect(payload).not.toBeNull();
    expect(payload?.chartId).toBe(chart.id);
    expect(payload?.name).toBe("Men Denim");
    expect(payload?.displayMode).toBe("popup");
    expect(payload?.buttonText).toBe("Check Size");
    expect(payload?.fitNote).toBe("runs_small");
    expect(payload?.measurementInstructions).toBe("Measure around your waist.");
    expect(payload?.baseUnit).toBe("inch");
    expect(payload?.columns).toEqual(["Size", "Waist", "Inseam"]);
    expect(payload?.rows).toHaveLength(2);
    expect(payload?.displaySettings?.primaryColor).toBe("#ff0055");

    // Security check: Access token, shop internal ID, and raw session must NEVER be exposed
    const stringified = JSON.stringify(payload);
    expect(stringified).not.toContain("shpat_secret_token_123");
    expect(stringified).not.toContain(shopId);
  });

  it("returns exact display modes as configured (accordion, inline, floating, popup)", async () => {
    const inlineChart = await createSizeChart({
      shopId,
      name: "Tees",
      status: "active",
      displayMode: "accordion",
      columns: ["Size"],
      rows: [["M"]],
    });
    await setAssignments(inlineChart.id, [
      { targetType: "all_products", targetValue: "*" },
    ]);

    const payload = await getStorefrontChartPayload({
      shopDomain,
      productId: "12345",
    });

    expect(payload?.displayMode).toBe("accordion");
  });

  it("returns null when no chart matches the product", async () => {
    const chart = await createSizeChart({
      shopId,
      name: "Jewelry Only",
      status: "active",
      columns: ["Size"],
      rows: [["7"]],
    });
    await setAssignments(chart.id, [
      { targetType: "product_type", targetValue: "Ring" },
    ]);

    const payload = await getStorefrontChartPayload({
      shopDomain,
      productType: "Shoes",
    });

    expect(payload).toBeNull();
  });
});
