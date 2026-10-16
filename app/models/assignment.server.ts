import prisma from "../db.server";
import { getSizeChart, SizeChartWithTable } from "./chart.server";

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

const TARGET_TYPE_RANK: Record<TargetType, number> = {
  product: 1,
  collection: 2,
  tag: 3,
  vendor: 4,
  product_type: 5,
  all_products: 6,
};

export async function setAssignments(
  sizeChartId: string,
  assignments: SetAssignmentInput[],
): Promise<void> {
  await prisma.$transaction([
    prisma.chartAssignment.deleteMany({
      where: { sizeChartId },
    }),
    prisma.chartAssignment.createMany({
      data: assignments.map((a) => ({
        sizeChartId,
        targetType: a.targetType,
        targetValue: a.targetValue,
        priority: a.priority ?? 0,
      })),
    }),
  ]);
}

export async function getAssignments(sizeChartId: string) {
  return prisma.chartAssignment.findMany({
    where: { sizeChartId },
    orderBy: { priority: "asc" },
  });
}

function normalize(val?: string | null): string {
  return (val || "").trim().toLowerCase();
}

function normalizeId(id?: string | null): string {
  if (!id) return "";
  // Handles both numeric ID and Shopify GID formats like "gid://shopify/Product/123"
  const trimmed = id.trim();
  const match = trimmed.match(/\/(\d+)$/);
  return match ? match[1] : trimmed;
}

export async function findMatchingChart(
  shopId: string,
  product: ProductMatchInput,
): Promise<SizeChartWithTable | null> {
  // Fetch all active size charts with their assignments for this shop
  const activeCharts = await prisma.sizeChart.findMany({
    where: {
      shopId,
      status: "active",
    },
    include: {
      assignments: true,
      table: true,
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  const productNormId = normalizeId(product.productId);
  const productRawId = normalize(product.productId);
  const productHandle = normalize(product.productHandle);
  const collectionNormIds = new Set(
    (product.collectionIds || []).map((c) => normalizeId(c)),
  );
  const collectionRawIds = new Set(
    (product.collectionIds || []).map((c) => normalize(c)),
  );
  const productTags = new Set(
    (product.tags || []).map((t) => normalize(t)),
  );
  const vendor = normalize(product.vendor);
  const productType = normalize(product.productType);

  interface MatchCandidate {
    chartId: string;
    targetRank: number;
    assignmentPriority: number;
    chartUpdatedAt: Date;
  }

  const candidates: MatchCandidate[] = [];

  for (const chart of activeCharts) {
    for (const assignment of chart.assignments) {
      const type = assignment.targetType as TargetType;
      const targetRank = TARGET_TYPE_RANK[type];
      if (!targetRank) continue;

      const targetValNorm = normalize(assignment.targetValue);
      const targetValId = normalizeId(assignment.targetValue);

      let matched = false;

      switch (type) {
        case "product":
          if (
            (productNormId && targetValId && productNormId === targetValId) ||
            (productRawId && productRawId === targetValNorm) ||
            (productHandle && productHandle === targetValNorm)
          ) {
            matched = true;
          }
          break;

        case "collection":
          if (
            collectionNormIds.has(targetValId) ||
            collectionRawIds.has(targetValNorm)
          ) {
            matched = true;
          }
          break;

        case "tag":
          if (productTags.has(targetValNorm)) {
            matched = true;
          }
          break;

        case "vendor":
          if (vendor && vendor === targetValNorm) {
            matched = true;
          }
          break;

        case "product_type":
          if (productType && productType === targetValNorm) {
            matched = true;
          }
          break;

        case "all_products":
          matched = true;
          break;
      }

      if (matched) {
        candidates.push({
          chartId: chart.id,
          targetRank,
          assignmentPriority: assignment.priority,
          chartUpdatedAt: chart.updatedAt,
        });
      }
    }
  }

  if (candidates.length === 0) {
    return null;
  }

  // Sorting rules:
  // 1. Lower targetRank wins (product: 1 < collection: 2 < ...)
  // 2. Lower assignmentPriority wins (0 < 1)
  // 3. More recent chartUpdatedAt wins (descending)
  candidates.sort((a, b) => {
    if (a.targetRank !== b.targetRank) {
      return a.targetRank - b.targetRank;
    }
    if (a.assignmentPriority !== b.assignmentPriority) {
      return a.assignmentPriority - b.assignmentPriority;
    }
    return b.chartUpdatedAt.getTime() - a.chartUpdatedAt.getTime();
  });

  const bestMatchId = candidates[0].chartId;
  return getSizeChart(bestMatchId);
}
