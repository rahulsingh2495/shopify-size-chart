import { describe, it, expect, beforeEach } from "vitest";
import prisma from "../app/db.server";
import {
  createSizeChart,
  getSizeChart,
  updateSizeChart,
  listSizeCharts,
  deleteSizeChart,
  duplicateSizeChart,
} from "../app/models/chart.server";

describe("SizeChart model CRUD", () => {
  let testShopId: string;

  beforeEach(async () => {
    // Clear test records
    await prisma.chartAssignment.deleteMany({});
    await prisma.sizeChartTable.deleteMany({});
    await prisma.sizeChart.deleteMany({});
    await prisma.shop.deleteMany({});

    // Create a dummy test shop
    const shop = await prisma.shop.create({
      data: {
        shopDomain: "test-shop.myshopify.com",
        plan: "free",
      },
    });
    testShopId = shop.id;
  });

  it("creates a size chart with table data and default values", async () => {
    const chart = await createSizeChart({
      shopId: testShopId,
      name: "Men T-Shirts",
      status: "active",
      fitNote: "true_to_size",
      measurementInstructions: "Measure around chest horizontally.",
      displayMode: "popup",
      buttonText: "View Size Guide",
      columns: ["Size", "Chest (in)", "Waist (in)"],
      rows: [
        ["S", "34-36", "28-30"],
        ["M", "38-40", "32-34"],
        ["L", "42-44", "36-38"],
      ],
      baseUnit: "inch",
    });

    expect(chart.id).toBeDefined();
    expect(chart.name).toBe("Men T-Shirts");
    expect(chart.status).toBe("active");
    expect(chart.fitNote).toBe("true_to_size");
    expect(chart.measurementInstructions).toBe("Measure around chest horizontally.");
    expect(chart.displayMode).toBe("popup");
    expect(chart.buttonText).toBe("View Size Guide");
    expect(chart.table).toBeDefined();
    expect(chart.table?.columns).toEqual(["Size", "Chest (in)", "Waist (in)"]);
    expect(chart.table?.rows).toHaveLength(3);
    expect(chart.table?.baseUnit).toBe("inch");
  });

  it("updates an existing size chart and its table", async () => {
    const chart = await createSizeChart({
      shopId: testShopId,
      name: "Original Name",
      columns: ["Size", "Chest"],
      rows: [["S", "36"]],
    });

    const updated = await updateSizeChart(chart.id, {
      name: "Updated Name",
      status: "active",
      columns: ["Size", "Chest", "Length"],
      rows: [["S", "36", "28"], ["M", "38", "29"]],
      fitNote: "runs_small",
    });

    expect(updated.name).toBe("Updated Name");
    expect(updated.status).toBe("active");
    expect(updated.fitNote).toBe("runs_small");
    expect(updated.table?.columns).toEqual(["Size", "Chest", "Length"]);
    expect(updated.table?.rows).toHaveLength(2);
  });

  it("lists size charts for a shop with assignment count", async () => {
    const chart1 = await createSizeChart({
      shopId: testShopId,
      name: "Chart 1",
      columns: ["Size"],
      rows: [["S"]],
    });

    await createSizeChart({
      shopId: testShopId,
      name: "Chart 2",
      columns: ["Size"],
      rows: [["M"]],
    });

    const list = await listSizeCharts(testShopId);
    expect(list).toHaveLength(2);
    expect(list.map((c) => c.name)).toContain("Chart 1");
    expect(list.map((c) => c.name)).toContain("Chart 2");
  });

  it("deletes a size chart and cascades to table", async () => {
    const chart = await createSizeChart({
      shopId: testShopId,
      name: "To Delete",
      columns: ["Size"],
      rows: [["S"]],
    });

    await deleteSizeChart(chart.id);

    const found = await getSizeChart(chart.id);
    expect(found).toBeNull();

    const tableInDb = await prisma.sizeChartTable.findUnique({
      where: { sizeChartId: chart.id },
    });
    expect(tableInDb).toBeNull();
  });

  it("duplicates a size chart with copied table data", async () => {
    const original = await createSizeChart({
      shopId: testShopId,
      name: "Tops Chart",
      fitNote: "runs_large",
      displayMode: "inline",
      columns: ["Size", "Chest"],
      rows: [["S", "36"], ["M", "40"]],
      baseUnit: "cm",
    });

    const duplicate = await duplicateSizeChart(original.id);

    expect(duplicate.id).not.toBe(original.id);
    expect(duplicate.name).toBe("Tops Chart (Copy)");
    expect(duplicate.fitNote).toBe("runs_large");
    expect(duplicate.displayMode).toBe("inline");
    expect(duplicate.table?.columns).toEqual(["Size", "Chest"]);
    expect(duplicate.table?.rows).toEqual([["S", "36"], ["M", "40"]]);
    expect(duplicate.table?.baseUnit).toBe("cm");
  });
});
