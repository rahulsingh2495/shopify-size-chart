import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useLocation, useNavigate, useSubmit } from "@remix-run/react";
import {
  Page,
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

  return json({
    shopDomain: session.shop,
    charts,
  });
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

export default function Dashboard() {
  const { charts, shopDomain } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const location = useLocation();
  const submit = useSubmit();

  const activeCount = charts.filter((c) => c.status === "active").length;
  const draftCount = charts.filter((c) => c.status === "draft").length;

  const goTo = (path: string) => navigate(path + location.search);
  const createChartUrl = `/app/charts/new${location.search}`;

  const cleanStore = shopDomain.replace(".myshopify.com", "");
  const themeEditorUrl = `https://admin.shopify.com/store/${cleanStore}/themes/current/editor`;

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
      title="Size Chart Dashboard"
      subtitle="Overview of your storefront sizing guides and product coverage."
      primaryAction={{
        content: "+ Create size chart",
        url: createChartUrl,
      }}
    >
      <TitleBar title="Size Chart Dashboard" />

      <div style={{ width: "100%", paddingBottom: "2rem" }}>
        <BlockStack gap="500">
          {/* Quick Setup Guide - Modern Card */}
          <div
            style={{
              backgroundColor: "#ffffff",
              border: "1px solid #e5e7eb",
              borderRadius: "12px",
              padding: "1.25rem 1.5rem",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* Top Bar inside Guide */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1rem",
                flexWrap: "wrap",
                gap: "8px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "6px",
                    backgroundColor: "#f0fdf4",
                    color: "#166534",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "14px",
                    fontWeight: 700,
                  }}
                >
                  ⚡
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: "0.9375rem", fontWeight: 700, color: "#111827" }}>
                    Quick Setup Guide
                  </h2>
                  <p style={{ margin: 0, fontSize: "0.75rem", color: "#6b7280" }}>
                    Get your size charts live on your Shopify store in 3 simple steps
                  </p>
                </div>
              </div>

              <div style={{ display: "flex", gap: "8px" }}>
                <a
                  href={themeEditorUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    fontSize: "0.8125rem",
                    fontWeight: 500,
                    color: "#2563eb",
                    textDecoration: "none",
                    padding: "4px 10px",
                    borderRadius: "6px",
                    backgroundColor: "#eff6ff",
                  }}
                >
                  Open theme editor ↗
                </a>
                <button
                  type="button"
                  onClick={() => goTo("/app/settings")}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    fontSize: "0.8125rem",
                    fontWeight: 500,
                    color: "#374151",
                    backgroundColor: "#f3f4f6",
                    border: "1px solid #e5e7eb",
                    borderRadius: "6px",
                    padding: "4px 10px",
                    cursor: "pointer",
                  }}
                >
                  🎨 Button styling
                </button>
              </div>
            </div>

            {/* 3 Step Cards */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                gap: "12px",
              }}
            >
              {/* Step 1 */}
              <div
                style={{
                  backgroundColor: "#f9fafb",
                  border: "1px solid #f1f2f4",
                  borderRadius: "8px",
                  padding: "12px 14px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                  <span
                    style={{
                      width: "20px",
                      height: "20px",
                      borderRadius: "50%",
                      backgroundColor: "#111827",
                      color: "#ffffff",
                      fontSize: "11px",
                      fontWeight: 700,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    1
                  </span>
                  <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: "#111827" }}>
                    Create size chart
                  </span>
                </div>
                <p style={{ margin: "0 0 8px 0", fontSize: "0.75rem", color: "#4b5563", lineHeight: 1.4 }}>
                  Build custom measurements grid manually or import existing sizes from CSV.
                </p>
                <button
                  type="button"
                  onClick={() => goTo("/app/charts/new")}
                  style={{
                    background: "none",
                    border: "none",
                    padding: 0,
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    color: "#005bd3",
                    cursor: "pointer",
                  }}
                >
                  + Add new chart →
                </button>
              </div>

              {/* Step 2 */}
              <div
                style={{
                  backgroundColor: "#f9fafb",
                  border: "1px solid #f1f2f4",
                  borderRadius: "8px",
                  padding: "12px 14px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                  <span
                    style={{
                      width: "20px",
                      height: "20px",
                      borderRadius: "50%",
                      backgroundColor: "#111827",
                      color: "#ffffff",
                      fontSize: "11px",
                      fontWeight: 700,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    2
                  </span>
                  <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: "#111827" }}>
                    Target products
                  </span>
                </div>
                <p style={{ margin: "0 0 8px 0", fontSize: "0.75rem", color: "#4b5563", lineHeight: 1.4 }}>
                  Assign your charts by product ID, collection, tag, vendor, or store-wide.
                </p>
                <button
                  type="button"
                  onClick={() => goTo("/app/charts")}
                  style={{
                    background: "none",
                    border: "none",
                    padding: 0,
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    color: "#005bd3",
                    cursor: "pointer",
                  }}
                >
                  Manage assignments →
                </button>
              </div>

              {/* Step 3 */}
              <div
                style={{
                  backgroundColor: "#f9fafb",
                  border: "1px solid #f1f2f4",
                  borderRadius: "8px",
                  padding: "12px 14px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                  <span
                    style={{
                      width: "20px",
                      height: "20px",
                      borderRadius: "50%",
                      backgroundColor: "#111827",
                      color: "#ffffff",
                      fontSize: "11px",
                      fontWeight: 700,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    3
                  </span>
                  <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: "#111827" }}>
                    Enable in Theme
                  </span>
                </div>
                <p style={{ margin: "0 0 8px 0", fontSize: "0.75rem", color: "#4b5563", lineHeight: 1.4 }}>
                  Add the Size Chart App Block to your default product template in Shopify customizer.
                </p>
                <a
                  href={themeEditorUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    color: "#005bd3",
                    textDecoration: "none",
                  }}
                >
                  Customize theme ↗
                </a>
              </div>
            </div>
          </div>

          {/* Metric Cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: "1.25rem",
            }}
          >
            {/* Active Charts */}
            <div
              style={{
                backgroundColor: "#ffffff",
                border: "1px solid #e5e7eb",
                borderRadius: "12px",
                padding: "1.25rem 1.5rem",
                boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "8px",
                }}
              >
                <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: "#6b7280" }}>
                  Active Charts
                </span>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    backgroundColor: "#eaf7ee",
                    color: "#166534",
                    fontSize: "11px",
                    fontWeight: 600,
                    padding: "2px 8px",
                    borderRadius: "12px",
                  }}
                >
                  <span
                    style={{
                      width: "6px",
                      height: "6px",
                      borderRadius: "50%",
                      backgroundColor: "#16a34a",
                    }}
                  />
                  Live
                </span>
              </div>
              <div style={{ fontSize: "2rem", fontWeight: 700, color: "#111827", lineHeight: 1.1 }}>
                {activeCount}
              </div>
              <p style={{ margin: "6px 0 0 0", fontSize: "0.8125rem", color: "#6b7280" }}>
                Live on matching products
              </p>
            </div>

            {/* Draft Charts */}
            <div
              style={{
                backgroundColor: "#ffffff",
                border: "1px solid #e5e7eb",
                borderRadius: "12px",
                padding: "1.25rem 1.5rem",
                boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "8px",
                }}
              >
                <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: "#6b7280" }}>
                  Draft Charts
                </span>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    backgroundColor: "#f3f4f6",
                    color: "#4b5563",
                    fontSize: "11px",
                    fontWeight: 600,
                    padding: "2px 8px",
                    borderRadius: "12px",
                  }}
                >
                  Hidden
                </span>
              </div>
              <div style={{ fontSize: "2rem", fontWeight: 700, color: "#111827", lineHeight: 1.1 }}>
                {draftCount}
              </div>
              <p style={{ margin: "6px 0 0 0", fontSize: "0.8125rem", color: "#6b7280" }}>
                Hidden from storefront
              </p>
            </div>

            {/* Plan & Privacy */}
            <div
              style={{
                backgroundColor: "#ffffff",
                border: "1px solid #e5e7eb",
                borderRadius: "12px",
                padding: "1.25rem 1.5rem",
                boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "8px",
                }}
              >
                <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: "#6b7280" }}>
                  Plan & Privacy
                </span>
                <span
                  style={{
                    backgroundColor: "#eff6ff",
                    color: "#1e40af",
                    fontSize: "11px",
                    fontWeight: 600,
                    padding: "2px 8px",
                    borderRadius: "12px",
                  }}
                >
                  ✓ 100% Free
                </span>
              </div>
              <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#111827", lineHeight: 1.2 }}>
                Free Forever
              </div>
              <p style={{ margin: "6px 0 0 0", fontSize: "0.75rem", color: "#6b7280", lineHeight: 1.4 }}>
                Unlimited charts · No watermark · Zero customer tracking
              </p>
            </div>
          </div>

          {/* Recent Size Charts Section */}
          <div
            style={{
              backgroundColor: "#ffffff",
              border: "1px solid #e5e7eb",
              borderRadius: "12px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
              overflow: "hidden",
            }}
          >
            {/* Table Header Row */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "16px 20px",
                borderBottom: "1px solid #f1f2f4",
              }}
            >
              <div>
                <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "#111827" }}>
                  Recent Size Charts
                </h2>
                <p style={{ margin: "2px 0 0 0", fontSize: "0.75rem", color: "#6b7280" }}>
                  Most recently modified sizing charts
                </p>
              </div>

              {charts.length > 0 && (
                <button
                  type="button"
                  onClick={() => goTo("/app/charts")}
                  style={{
                    background: "none",
                    border: "none",
                    padding: 0,
                    fontSize: "0.8125rem",
                    fontWeight: 600,
                    color: "#005bd3",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  View all ({charts.length}) →
                </button>
              )}
            </div>

            {/* Table Content */}
            {charts.length === 0 ? (
              <div style={{ padding: "3rem 1.5rem", textAlign: "center" }}>
                <EmptyState
                  heading="Create your first size chart"
                  action={{
                    content: "Create Size Chart",
                    url: createChartUrl,
                  }}
                  image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                >
                  <p>
                    Help your shoppers find the right fit and reduce return rates with responsive, watermark-free size charts.
                  </p>
                </EmptyState>
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    textAlign: "left",
                    fontSize: "13px",
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        background: "#fafbfc",
                        borderBottom: "1px solid #edf0f2",
                        color: "#6b7280",
                        fontSize: "12px",
                        fontWeight: 600,
                        textTransform: "capitalize",
                      }}
                    >
                      <th style={{ padding: "14px 24px", whiteSpace: "nowrap" }}>Name</th>
                      <th style={{ padding: "14px 20px", whiteSpace: "nowrap" }}>Status</th>
                      <th style={{ padding: "14px 20px", whiteSpace: "nowrap" }}>Fit guidance</th>
                      <th style={{ padding: "14px 20px", whiteSpace: "nowrap" }}>Display mode</th>
                      <th style={{ padding: "14px 20px", whiteSpace: "nowrap" }}>Targeting</th>
                      <th style={{ padding: "14px 24px", textAlign: "right", whiteSpace: "nowrap" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {charts.slice(0, 5).map((chart) => (
                      <tr
                        key={chart.id}
                        style={{
                          borderBottom: "1px solid #f1f2f4",
                          transition: "background-color 0.15s ease",
                        }}
                      >
                        {/* Name with table icon */}
                        <td style={{ padding: "16px 24px", whiteSpace: "nowrap" }}>
                          <button
                            type="button"
                            onClick={() => goTo(`/app/charts/${chart.id}`)}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "10px",
                              background: "none",
                              border: "none",
                              padding: 0,
                              cursor: "pointer",
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
                                width: "28px",
                                height: "28px",
                                borderRadius: "6px",
                                background: "#f1f5f9",
                                color: "#475569",
                                flexShrink: 0,
                              }}
                            >
                              <svg
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <rect width="18" height="18" x="3" y="3" rx="2" />
                                <path d="M3 9h18" />
                                <path d="M3 15h18" />
                                <path d="M9 3v18" />
                                <path d="M15 3v18" />
                              </svg>
                            </span>
                            <span style={{ color: "#005bd3", textDecoration: "none", whiteSpace: "nowrap" }}>
                              {chart.name}
                            </span>
                          </button>
                        </td>

                        {/* Status badge */}
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
                              <span
                                style={{
                                  width: "6px",
                                  height: "6px",
                                  borderRadius: "50%",
                                  background: "#16a34a",
                                  flexShrink: 0,
                                }}
                              />
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
                              <span
                                style={{
                                  width: "6px",
                                  height: "6px",
                                  borderRadius: "50%",
                                  background: "#94a3b8",
                                  flexShrink: 0,
                                }}
                              />
                              Draft
                            </span>
                          )}
                        </td>

                        {/* Fit Guidance */}
                        <td style={{ padding: "16px 20px", color: "#374151", whiteSpace: "nowrap" }}>
                          {formatFitGuidance(chart.fitNote)}
                        </td>

                        {/* Display mode */}
                        <td style={{ padding: "16px 20px", color: "#374151", whiteSpace: "nowrap" }}>
                          {formatDisplayMode(chart.displayMode)}
                        </td>

                        {/* Targeting */}
                        <td style={{ padding: "16px 20px", whiteSpace: "nowrap" }}>
                          {chart.assignmentCount > 0 ? (
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                background: "#f3f4f6",
                                color: "#374151",
                                padding: "4px 12px",
                                borderRadius: "6px",
                                fontSize: "12px",
                                fontWeight: 500,
                                whiteSpace: "nowrap",
                              }}
                            >
                              {chart.assignmentCount === 1 ? "1 rule" : `${chart.assignmentCount} rules`}
                            </span>
                          ) : (
                            <span style={{ color: "#9ca3af", fontSize: "12px", whiteSpace: "nowrap" }}>Not assigned</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td style={{ padding: "16px 24px", textAlign: "right", whiteSpace: "nowrap" }}>
                          <div
                            style={{
                              display: "inline-flex",
                              gap: "8px",
                              alignItems: "center",
                              justifyContent: "flex-end",
                              whiteSpace: "nowrap",
                            }}
                          >
                            <button
                              type="button"
                              onClick={() => goTo(`/app/charts/${chart.id}`)}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                background: "#ffffff",
                                border: "1px solid #d1d5db",
                                borderRadius: "6px",
                                padding: "5px 11px",
                                fontSize: "12px",
                                fontWeight: 500,
                                color: "#374151",
                                cursor: "pointer",
                                whiteSpace: "nowrap",
                              }}
                            >
                              <svg
                                width="12"
                                height="12"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                              </svg>
                              Edit
                            </button>

                            <button
                              type="button"
                              onClick={() => goTo(`/app/charts/${chart.id}/assignments`)}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                background: "#ffffff",
                                border: "1px solid #d1d5db",
                                borderRadius: "6px",
                                padding: "5px 11px",
                                fontSize: "12px",
                                fontWeight: 500,
                                color: "#374151",
                                cursor: "pointer",
                                whiteSpace: "nowrap",
                              }}
                            >
                              <svg
                                width="12"
                                height="12"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <circle cx="12" cy="12" r="10" />
                                <circle cx="12" cy="12" r="6" />
                                <circle cx="12" cy="12" r="2" />
                              </svg>
                              Targeting
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDuplicate(chart.id)}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                background: "#ffffff",
                                border: "1px solid #d1d5db",
                                borderRadius: "6px",
                                padding: "5px 11px",
                                fontSize: "12px",
                                fontWeight: 500,
                                color: "#374151",
                                cursor: "pointer",
                                whiteSpace: "nowrap",
                              }}
                            >
                              <svg
                                width="12"
                                height="12"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                                <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                              </svg>
                              Duplicate
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDelete(chart.id)}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                background: "#ffffff",
                                border: "1px solid #fee2e2",
                                borderRadius: "6px",
                                padding: "5px 11px",
                                fontSize: "12px",
                                fontWeight: 500,
                                color: "#dc2626",
                                cursor: "pointer",
                                whiteSpace: "nowrap",
                              }}
                            >
                              <svg
                                width="12"
                                height="12"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
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
          </div>
        </BlockStack>
      </div>
    </Page>
  );
}
