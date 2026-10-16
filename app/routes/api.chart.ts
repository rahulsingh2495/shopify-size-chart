import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { getStorefrontChartPayload } from "../utils/storefront-chart.server";

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Cache-Control": "public, max-age=60",
  };
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  const url = new URL(request.url);
  const shopDomain = url.searchParams.get("shop");
  if (!shopDomain) {
    return json({ error: "Missing shop parameter" }, { status: 400, headers: corsHeaders() });
  }

  const productId = url.searchParams.get("productId") || undefined;
  const productHandle = url.searchParams.get("productHandle") || undefined;
  const vendor = url.searchParams.get("vendor") || undefined;
  const productType = url.searchParams.get("productType") || undefined;

  const tagsRaw = url.searchParams.get("tags");
  const tags = tagsRaw ? tagsRaw.split(",").map((t) => t.trim()).filter(Boolean) : undefined;

  const collectionsRaw = url.searchParams.get("collectionIds");
  const collectionIds = collectionsRaw
    ? collectionsRaw.split(",").map((c) => c.trim()).filter(Boolean)
    : undefined;

  const payload = await getStorefrontChartPayload({
    shopDomain,
    productId,
    productHandle,
    vendor,
    productType,
    tags,
    collectionIds,
  });

  return json({ chart: payload }, { headers: corsHeaders() });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  try {
    const body = await request.json();
    const shopDomain = body.shop;
    if (!shopDomain) {
      return json({ error: "Missing shop" }, { status: 400, headers: corsHeaders() });
    }

    const payload = await getStorefrontChartPayload({
      shopDomain,
      productId: body.productId,
      productHandle: body.productHandle,
      vendor: body.vendor,
      productType: body.productType,
      tags: Array.isArray(body.tags) ? body.tags : body.tags ? [body.tags] : undefined,
      collectionIds: Array.isArray(body.collectionIds)
        ? body.collectionIds
        : body.collectionIds
        ? [body.collectionIds]
        : undefined,
    });

    return json({ chart: payload }, { headers: corsHeaders() });
  } catch (err: any) {
    return json({ error: "Invalid JSON request" }, { status: 400, headers: corsHeaders() });
  }
};
