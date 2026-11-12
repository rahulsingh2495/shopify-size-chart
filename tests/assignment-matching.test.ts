import { describe, it, expect, beforeEach } from "vitest";
import prisma from "../app/db.server";
import { createSizeChart } from "../app/models/chart.server";
import {
  setAssignments,
  findMatchingChart,
} from "../app/models/assignment.server";

describe("Assignment matching rules", () => {
  let testShopId: string;

  beforeEach(async () => {
    await prisma.chartAssignment.deleteMany({
      where: { sizeChart: { shop: { shopDomain: "match-test.myshopify.com" } } },
    });
    await prisma.sizeChartTable.deleteMany({
      where: { sizeChart: { shop: { shopDomain: "match-test.myshopify.com" } } },
    });
    await prisma.sizeChart.deleteMany({
      where: { shop: { shopDomain: "match-test.myshopify.com" } },
    });
    await prisma.shop.deleteMany({
      where: { shopDomain: "match-test.myshopify.com" },
    });

    const shop = await prisma.shop.create({
      data: {
        shopDomain: "match-test.myshopify.com",
        plan: "free",
      },
    });
    testShopId = shop.id;
  });

  it("prioritizes product over collection", async () => {
    const productChart = await createSizeChart({
      shopId: testShopId,
      name: "Product Specific Chart",
      status: "active",
      columns: ["Size"],
      rows: [["S"]],
    });
    await setAssignments(productChart.id, [
      { targetType: "product", targetValue: "gid://shopify/Product/123" },
    ]);

    const collectionChart = await createSizeChart({
      shopId: testShopId,
      name: "Collection Chart",
      status: "active",
      columns: ["Size"],
      rows: [["M"]],
    });
    await setAssignments(collectionChart.id, [
      { targetType: "collection", targetValue: "gid://shopify/Collection/456" },
    ]);

    const match = await findMatchingChart(testShopId, {
      productId: "gid://shopify/Product/123",
      collectionIds: ["gid://shopify/Collection/456"],
    });

    expect(match).not.toBeNull();
    expect(match?.id).toBe(productChart.id);
  });

  it("prioritizes collection over tag", async () => {
    const collectionChart = await createSizeChart({
      shopId: testShopId,
      name: "Collection Chart",
      status: "active",
      columns: ["Size"],
      rows: [["S"]],
    });
    await setAssignments(collectionChart.id, [
      { targetType: "collection", targetValue: "gid://shopify/Collection/456" },
    ]);

    const tagChart = await createSizeChart({
      shopId: testShopId,
      name: "Tag Chart",
      status: "active",
      columns: ["Size"],
      rows: [["L"]],
    });
    await setAssignments(tagChart.id, [
      { targetType: "tag", targetValue: "summer" },
    ]);

    const match = await findMatchingChart(testShopId, {
      collectionIds: ["gid://shopify/Collection/456"],
      tags: ["summer"],
    });

    expect(match?.id).toBe(collectionChart.id);
  });

  it("prioritizes tag over vendor", async () => {
    const tagChart = await createSizeChart({
      shopId: testShopId,
      name: "Tag Chart",
      status: "active",
      columns: ["Size"],
      rows: [["S"]],
    });
    await setAssignments(tagChart.id, [
      { targetType: "tag", targetValue: "cotton" },
    ]);

    const vendorChart = await createSizeChart({
      shopId: testShopId,
      name: "Vendor Chart",
      status: "active",
      columns: ["Size"],
      rows: [["XL"]],
    });
    await setAssignments(vendorChart.id, [
      { targetType: "vendor", targetValue: "Nike" },
    ]);

    const match = await findMatchingChart(testShopId, {
      tags: ["cotton"],
      vendor: "Nike",
    });

    expect(match?.id).toBe(tagChart.id);
  });

  it("prioritizes vendor over product_type", async () => {
    const vendorChart = await createSizeChart({
      shopId: testShopId,
      name: "Vendor Chart",
      status: "active",
      columns: ["Size"],
      rows: [["S"]],
    });
    await setAssignments(vendorChart.id, [
      { targetType: "vendor", targetValue: "Adidas" },
    ]);

    const typeChart = await createSizeChart({
      shopId: testShopId,
      name: "Type Chart",
      status: "active",
      columns: ["Size"],
      rows: [["XXL"]],
    });
    await setAssignments(typeChart.id, [
      { targetType: "product_type", targetValue: "Shoes" },
    ]);

    const match = await findMatchingChart(testShopId, {
      vendor: "Adidas",
      productType: "Shoes",
    });

    expect(match?.id).toBe(vendorChart.id);
  });

  it("prioritizes product_type over all_products fallback", async () => {
    const typeChart = await createSizeChart({
      shopId: testShopId,
      name: "Type Chart",
      status: "active",
      columns: ["Size"],
      rows: [["S"]],
    });
    await setAssignments(typeChart.id, [
      { targetType: "product_type", targetValue: "Hoodies" },
    ]);

    const fallbackChart = await createSizeChart({
      shopId: testShopId,
      name: "All Products Fallback",
      status: "active",
      columns: ["Size"],
      rows: [["All"]],
    });
    await setAssignments(fallbackChart.id, [
      { targetType: "all_products", targetValue: "*" },
    ]);

    const match = await findMatchingChart(testShopId, {
      productType: "Hoodies",
    });

    expect(match?.id).toBe(typeChart.id);
  });

  it("chooses lower numeric priority when target types match", async () => {
    const highPriChart = await createSizeChart({
      shopId: testShopId,
      name: "High Priority Tag Chart",
      status: "active",
      columns: ["Size"],
      rows: [["S"]],
    });
    await setAssignments(highPriChart.id, [
      { targetType: "tag", targetValue: "sale", priority: 1 },
    ]);

    const lowPriChart = await createSizeChart({
      shopId: testShopId,
      name: "Low Priority Tag Chart",
      status: "active",
      columns: ["Size"],
      rows: [["M"]],
    });
    await setAssignments(lowPriChart.id, [
      { targetType: "tag", targetValue: "sale", priority: 5 },
    ]);

    const match = await findMatchingChart(testShopId, {
      tags: ["sale"],
    });

    expect(match?.id).toBe(highPriChart.id);
  });

  it("returns null when no assignment matches", async () => {
    const chart = await createSizeChart({
      shopId: testShopId,
      name: "Some Chart",
      status: "active",
      columns: ["Size"],
      rows: [["S"]],
    });
    await setAssignments(chart.id, [
      { targetType: "tag", targetValue: "rare-tag" },
    ]);

    const match = await findMatchingChart(testShopId, {
      tags: ["unrelated-tag"],
    });

    expect(match).toBeNull();
  });

  it("ignores draft charts", async () => {
    const draftChart = await createSizeChart({
      shopId: testShopId,
      name: "Draft Chart",
      status: "draft",
      columns: ["Size"],
      rows: [["S"]],
    });
    await setAssignments(draftChart.id, [
      { targetType: "all_products", targetValue: "*" },
    ]);

    const match = await findMatchingChart(testShopId, {
      productId: "gid://shopify/Product/999",
    });

    expect(match).toBeNull();
  });
});
