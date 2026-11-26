import { useState } from "react";
import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useLocation, useNavigate, useSubmit } from "@remix-run/react";
import {
  Page,
  Card,
  BlockStack,
  EmptyState,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticateAdmin } from "../utils/auth.server";
import { getOrCreateShop } from "../models/shop.server";
import { listSizeCharts, duplicateSizeChart, deleteSizeChart } from "../models/chart.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticateAdmin(request);
  const shop = await getOrCreateShop(session.shop, session.accessToken);
  const charts = await listSizeCharts(shop.id);

  return json({ charts });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  await authenticateAdmin(request);
  const formData = await request.formData();
  const intent = formData.get("intent");
  const chartId = formData.get("chartId") as string;

  if (intent === "duplicate" && chartId) {
    await duplicateSizeChart(chartId);
    return json({ success: true });
  }

  if (intent === "delete" && chartId) {
    await deleteSizeChart(chartId);
    return json({ success: true });
  }

  return json({ success: false });
};

export function matchChartSearch(
  chart: { name: string; status?: string; displayMode?: string; fitNote?: string },
  query: string,
): boolean {
  const cleanQuery = query.trim().toLowerCase();
  if (!cleanQuery) return true;

  // Split query into tokens, stripping punctuation like apostrophes
  const queryTokens = cleanQuery
    .replace(/['’]/g, "")
    .split(/\s+/)
    .filter(Boolean);

  if (queryTokens.length === 0) return true;

  const rawName = chart.name.toLowerCase();
  const normalizedName = rawName.replace(/['’]/g, "");

  // Words from chart name (e.g. "men's top" -> ["men", "top"])
  const nameWords = normalizedName
    .replace(/[^a-z0-9]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  // Metadata words (e.g. "active", "popup", "true to size")
  const metaWords = [
    chart.status?.toLowerCase() || "",
    chart.displayMode?.toLowerCase() || "",
    chart.fitNote?.toLowerCase().replace(/_/g, " ") || "",
  ]
    .join(" ")
    .split(/\s+/)
    .filter(Boolean);

  const allWords = [...nameWords, ...metaWords];

  return queryTokens.every((token) => {
    // 1. Any word starts with the query token (e.g. "men" matches "men's", "menswear", but NOT "women")
    if (allWords.some((w) => w.startsWith(token))) {
      return true;
    }

    // 2. Exact word match
    if (allWords.includes(token)) {
      return true;
    }

    // 3. If token is 4+ characters, permit full substring match in name (e.g. "bottoms" in "women's bottoms")
    if (token.length >= 4 && normalizedName.includes(token)) {
      return true;
    }

    return false;
  });
}

export default function ChartsList() {
  const { charts } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const location = useLocation();
  const submit = useSubmit();
  const [search, setSearch] = useState("");

  const goTo = (path: string) => navigate(path + location.search);
  const createChartUrl = `/app/charts/new${location.search}`;

  const filteredCharts = charts.filter((c) => matchChartSearch(c, search));

  const handleDuplicate = (chartId: string) => {
    submit({ intent: "duplicate", chartId }, { method: "post" });
  };

  const handleDelete = (chartId: string) => {
    if (confirm("Are you sure you want to delete this size chart?")) {
      submit({ intent: "delete", chartId }, { method: "post" });
    }
  };

  const formatDisplayMode = (mode: string) => {
    switch (mode) {
      case "popup":
        return "Popup modal";
      case "inline":
        return "Inline";
      case "accordion":
        return "Accordion";
      case "floating":
        return "Floating button";
      default:
        return mode;
    }
  };

  const formatFitGuidance = (fit: string) => {
    switch (fit) {
      case "true_to_size":
        return "True to size";
      case "runs_small":
        return "Runs small";
      case "runs_large":
        return "Runs large";
      case "none":
        return "—";
      default:
        return fit.replace(/_/g, " ");
    }
  };

  return (
    <Page
      fullWidth
      title="Size charts"
      subtitle="Manage your size charts and storefront display."
      primaryAction={{
        content: "+ Create size chart",
        url: createChartUrl,
      }}
      backAction={{
        content: "Dashboard",
        onAction: () => goTo("/app"),
      }}
    >
      <TitleBar title="Size Charts" />
      <div style={{ width: "100%", paddingBottom: "2rem" }}>
        <BlockStack gap="400">
          <Card padding="0">
            {/* Search Bar */}
            <div style={{ padding: "16px 24px 14px 24px", borderBottom: "1px solid #f1f2f4" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  background: "#ffffff",
                  border: "1px solid #dcdfe4",
                  borderRadius: "8px",
                  padding: "8px 14px",
                  maxWidth: "420px",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
                }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#6d7175"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ flexShrink: 0 }}
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
                <input
                  type="text"
                  placeholder="Search by chart name..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{
                    border: "none",
                    outline: "none",
                    width: "100%",
                    fontSize: "13.5px",
                    color: "#202223",
                    background: "transparent",
                  }}
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: 0,
                      color: "#8c9196",
                      display: "flex",
                    }}
                    aria-label="Clear search"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {filteredCharts.length === 0 ? (
              <div style={{ padding: "40px 20px" }}>
                <EmptyState
                  heading={search ? "No size charts match your search" : "No size charts yet"}
                  action={
                    search
                      ? {
                          content: "Clear search",
                          onAction: () => setSearch(""),
                        }
                      : {
                          content: "+ Create size chart",
                          url: createChartUrl,
                        }
                  }
                  image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                >
                  <p>
                    {search
                      ? `No size charts matched "${search}". Try checking for spelling errors or clear your search to view all.`
                      : "Create unlimited size charts and assign them to your products or collections."}
                  </p>
                </EmptyState>
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
                  <thead>
                    <tr style={{ background: "#f8f9fa", borderBottom: "1px solid #e5e7eb", color: "#4b5563", fontWeight: 600, fontSize: "12.5px" }}>
                      <th style={{ padding: "14px 24px", whiteSpace: "nowrap" }}>Name</th>
                      <th style={{ padding: "14px 20px", whiteSpace: "nowrap" }}>Status</th>
                      <th style={{ padding: "14px 20px", whiteSpace: "nowrap" }}>Fit guidance</th>
                      <th style={{ padding: "14px 20px", whiteSpace: "nowrap" }}>Display mode</th>
                      <th style={{ padding: "14px 20px", whiteSpace: "nowrap" }}>Targeting</th>
                      <th style={{ padding: "14px 24px", textAlign: "right", whiteSpace: "nowrap" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCharts.map((chart) => (
                      <tr
                        key={chart.id}
                        style={{
                          borderBottom: "1px solid #f1f2f4",
                          transition: "background 0.15s ease",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "#fafbfb")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                      >
                        {/* Name */}
                        <td style={{ padding: "16px 24px", whiteSpace: "nowrap" }}>
                          <button
                            type="button"
                            onClick={() => goTo(`/app/charts/${chart.id}`)}
                            style={{
                              background: "none",
                              border: "none",
                              padding: 0,
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "10px",
                              textAlign: "left",
                              fontWeight: 600,
                              color: "#0f172a",
                              fontSize: "13.5px",
                              whiteSpace: "nowrap",
                            }}
                          >
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                width: "30px",
                                height: "30px",
                                borderRadius: "6px",
                                background: "#f1f5f9",
                                color: "#475569",
                                flexShrink: 0,
                              }}
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect width="18" height="18" x="3" y="3" rx="2" />
                                <path d="M3 9h18" />
                                <path d="M3 15h18" />
                                <path d="M9 3v18" />
                                <path d="M15 3v18" />
                              </svg>
                            </span>
                            <span style={{ color: "#005bd3", textDecoration: "none", whiteSpace: "nowrap" }}>{chart.name}</span>
                          </button>
                        </td>

                        {/* Status */}
                        <td style={{ padding: "16px 20px", whiteSpace: "nowrap" }}>
                          {chart.status === "active" ? (
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "6px",
                                background: "#eaf7ee",
                                color: "#166534",
                                padding: "4px 12px",
                                borderRadius: "14px",
                                fontWeight: 500,
                                fontSize: "12px",
                                whiteSpace: "nowrap",
                              }}
                            >
                              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#16a34a", flexShrink: 0 }} />
                              Active
                            </span>
                          ) : (
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "6px",
                                background: "#f1f5f9",
                                color: "#475569",
                                padding: "4px 12px",
                                borderRadius: "14px",
                                fontWeight: 500,
                                fontSize: "12px",
                                whiteSpace: "nowrap",
                              }}
                            >
                              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#94a3b8", flexShrink: 0 }} />
                              Draft
                            </span>
                          )}
                        </td>

                        {/* Fit Guidance */}
                        <td style={{ padding: "16px 20px", color: "#374151", whiteSpace: "nowrap" }}>
                          {formatFitGuidance(chart.fitNote)}
                        </td>

                        {/* Display Mode */}
                        <td style={{ padding: "16px 20px", color: "#374151", whiteSpace: "nowrap" }}>
                          {formatDisplayMode(chart.displayMode)}
                        </td>

                        {/* Targeting */}
                        <td style={{ padding: "16px 20px", whiteSpace: "nowrap" }}>
                          <span
                            style={{
                              display: "inline-block",
                              background: "#f1f2f4",
                              color: "#475569",
                              padding: "4px 12px",
                              borderRadius: "12px",
                              fontWeight: 500,
                              fontSize: "12px",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {chart.assignmentCount > 0 ? (chart.assignmentCount === 1 ? "1 rule" : `${chart.assignmentCount} rules`) : "All products"}
                          </span>
                        </td>

                        {/* Actions */}
                        <td style={{ padding: "16px 24px", textAlign: "right", whiteSpace: "nowrap" }}>
                          <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", justifyContent: "flex-end", whiteSpace: "nowrap" }}>
                            {/* Edit */}
                            <button
                              type="button"
                              onClick={() => goTo(`/app/charts/${chart.id}`)}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "5px",
                                background: "#ffffff",
                                border: "1px solid #d4d7dc",
                                borderRadius: "6px",
                                padding: "5px 11px",
                                fontSize: "12px",
                                fontWeight: 500,
                                color: "#303030",
                                cursor: "pointer",
                                whiteSpace: "nowrap",
                              }}
                            >
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                              </svg>
                              Edit
                            </button>

                            {/* Targeting */}
                            <button
                              type="button"
                              onClick={() => goTo(`/app/charts/${chart.id}/assignments`)}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "5px",
                                background: "#ffffff",
                                border: "1px solid #d4d7dc",
                                borderRadius: "6px",
                                padding: "5px 11px",
                                fontSize: "12px",
                                fontWeight: 500,
                                color: "#303030",
                                cursor: "pointer",
                                whiteSpace: "nowrap",
                              }}
                            >
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10" />
                                <circle cx="12" cy="12" r="6" />
                                <circle cx="12" cy="12" r="2" />
                              </svg>
                              Targeting
                            </button>

                            {/* Duplicate */}
                            <button
                              type="button"
                              onClick={() => handleDuplicate(chart.id)}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "5px",
                                background: "#ffffff",
                                border: "1px solid #d4d7dc",
                                borderRadius: "6px",
                                padding: "5px 11px",
                                fontSize: "12px",
                                fontWeight: 500,
                                color: "#303030",
                                cursor: "pointer",
                                whiteSpace: "nowrap",
                              }}
                            >
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                                <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                              </svg>
                              Duplicate
                            </button>

                            {/* Divider */}
                            <span style={{ width: "1px", height: "16px", background: "#e2e8f0", margin: "0 2px" }} />

                            {/* Delete */}
                            <button
                              type="button"
                              onClick={() => handleDelete(chart.id)}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                background: "transparent",
                                border: "none",
                                padding: "5px 8px",
                                fontSize: "12px",
                                fontWeight: 500,
                                color: "#d82c0d",
                                cursor: "pointer",
                                whiteSpace: "nowrap",
                              }}
                            >
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M3 6h18" />
                                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                              </svg>
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </BlockStack>
      </div>
    </Page>
  );
}
