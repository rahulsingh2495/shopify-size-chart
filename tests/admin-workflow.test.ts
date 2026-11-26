import { describe, it, expect, beforeEach } from "vitest";
import prisma from "../app/db.server";
import { getOrCreateShop, upsertShopSettings, getShopSettings } from "../app/models/shop.server";
import {
  createSizeChart,
  updateSizeChart,
  listSizeCharts,
} from "../app/models/chart.server";
import { setAssignments, getAssignments } from "../app/models/assignment.server";
import { parseSizeChartCsv, exportSizeChartCsv } from "../app/utils/csv.server";

describe("Admin Chart & Settings Workflow", () => {
  let shopId: string;

  beforeEach(async () => {
    await prisma.chartAssignment.deleteMany({
      where: { sizeChart: { shop: { shopDomain: "admin-test.myshopify.com" } } },
    });
    await prisma.sizeChartTable.deleteMany({
      where: { sizeChart: { shop: { shopDomain: "admin-test.myshopify.com" } } },
    });
    await prisma.sizeChart.deleteMany({
      where: { shop: { shopDomain: "admin-test.myshopify.com" } },
    });
    await prisma.displaySettings.deleteMany({
      where: { shop: { shopDomain: "admin-test.myshopify.com" } },
    });
    await prisma.shop.deleteMany({
      where: { shopDomain: "admin-test.myshopify.com" },
    });

    const shop = await getOrCreateShop("admin-test.myshopify.com");
    shopId = shop.id;
  });

  it("handles complete chart lifecycle with CSV import and assignment rules", async () => {
    // 1. Merchant imports CSV
    const csvData = `Size,Bust,Waist,Hips
XS,32,24,34
S,34,26,36
M,36,28,38
L,38,30,40`;
    const parsed = parseSizeChartCsv(csvData);

    // 2. Creates chart from parsed data
    const chart = await createSizeChart({
      shopId,
      name: "Dresses Sizing",
      status: "active",
      fitNote: "true_to_size",
      displayMode: "accordion",
      buttonText: "Check Size",
      measurementInstructions: "Keep measuring tape comfortably loose.",
      columns: parsed.columns,
      rows: parsed.rows,
      baseUnit: "inch",
    });

    expect(chart.name).toBe("Dresses Sizing");
    expect(chart.table?.rows).toHaveLength(4);
    expect(chart.displayMode).toBe("accordion");

    // 3. Configures assignments (Collection + Tag)
    await setAssignments(chart.id, [
      { targetType: "collection", targetValue: "gid://shopify/Collection/100", priority: 1 },
      { targetType: "tag", targetValue: "dresses", priority: 2 },
    ]);

    const assignments = await getAssignments(chart.id);
    expect(assignments).toHaveLength(2);
    expect(assignments[0].targetType).toBe("collection");
    expect(assignments[1].targetType).toBe("tag");

    // 4. Updates chart details
    const updated = await updateSizeChart(chart.id, {
      fitNote: "runs_small",
      status: "draft",
    });
    expect(updated.fitNote).toBe("runs_small");
    expect(updated.status).toBe("draft");

    // 5. Exports to CSV
    if (updated.table) {
      const exportedCsv = exportSizeChartCsv({
        columns: updated.table.columns,
        rows: updated.table.rows,
      });
      expect(exportedCsv).toContain("Size,Bust,Waist,Hips");
      expect(exportedCsv).toContain("XS,32,24,34");
    }

    // 6. Confirms summary listing includes assignment count
    const list = await listSizeCharts(shopId);
    expect(list).toHaveLength(1);
    expect(list[0].assignmentCount).toBe(2);
  });

  it("saves and retrieves shop-wide display settings", async () => {
    const settings = await upsertShopSettings(shopId, {
      primaryColor: "#008060",
      textColor: "#202223",
      borderStyle: "rounded",
    });

    expect(settings.primaryColor).toBe("#008060");
    expect(settings.textColor).toBe("#202223");
    expect(settings.borderStyle).toBe("rounded");

    const fetched = await getShopSettings(shopId);
    expect(fetched?.primaryColor).toBe("#008060");
  });
});
