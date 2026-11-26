import { useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useActionData, useLoaderData, useLocation, useNavigate, useNavigation, useSubmit } from "@remix-run/react";
import {
  Page,
  Banner,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticateAdmin } from "../utils/auth.server";
import { getOrCreateShop, getShopSettings, upsertShopSettings } from "../models/shop.server";

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

function getContrastColor(hex: string): string {
  if (!hex || hex === "transparent") return "#1e293b";
  const c = hex.replace("#", "");
  const cleanHex = c.length === 3 ? c.split("").map((x) => x + x).join("") : c;
  const num = parseInt(cleanHex, 16);
  if (isNaN(num)) return "#1e293b";
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luma < 140 ? "#ffffff" : "#1e293b";
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

function serializeCustomConfig(config: CustomButtonConfig, cleanCss: string): string {
  const jsonHeader = `/*__CONFIG__\n${JSON.stringify(config)}\n*/\n`;
  return jsonHeader + (cleanCss || "");
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticateAdmin(request);
  const shop = await getOrCreateShop(session.shop, session.accessToken);
  const settings = await getShopSettings(shop.id);

  const rawCss = settings?.customCss || "";
  const { config, cleanCss } = parseCustomConfig(rawCss);

  return json({
    shopDomain: session.shop,
    settings: {
      primaryColor: settings?.primaryColor || "#d82222",
      textColor: settings?.textColor || "#ffffff",
      borderStyle: settings?.borderStyle || "rounded",
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
    },
  });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticateAdmin(request);
  const shop = await getOrCreateShop(session.shop, session.accessToken);

  const formData = await request.formData();
  const primaryColor = (formData.get("primaryColor") as string) || "#FFFFFF";
  const textColor = (formData.get("textColor") as string) || "#303030";
  const borderStyle = (formData.get("borderStyle") as string) || "rounded";
  const rawCustomCss = (formData.get("customCss") as string) || "";
  const buttonText = (formData.get("buttonText") as string) || "Size guide";
  const buttonStyle = ((formData.get("buttonStyle") as string) || "solid") as "solid" | "outline" | "text";
  const borderColor = (formData.get("borderColor") as string) || "#303030";
  const showRulerIcon = formData.get("showRulerIcon") === "true";
  const fontSize = parseInt(formData.get("fontSize") as string, 10) || 13;
  const iconSize = parseInt(formData.get("iconSize") as string, 10) || 14;
  const tableHeaderBg = (formData.get("tableHeaderBg") as string) || "#f8fafc";
  const tableHeaderColor = (formData.get("tableHeaderColor") as string) || "#1e293b";
  const modalHeaderColor = (formData.get("modalHeaderColor") as string) || "#111827";
  const chartBgColor = (formData.get("chartBgColor") as string) || "#ffffff";
  const tableRowEvenBg = (formData.get("tableRowEvenBg") as string) || "#ffffff";
  const tableRowOddBg = (formData.get("tableRowOddBg") as string) || "#f8fafc";
  const tableTextColor = (formData.get("tableTextColor") as string) || "#334155";
  const tableBorderColor = (formData.get("tableBorderColor") as string) || "#e2e8f0";

  const serializedCss = serializeCustomConfig(
    {
      buttonText,
      buttonStyle,
      borderColor,
      showRulerIcon,
      fontSize,
      iconSize,
      tableHeaderBg,
      tableHeaderColor,
      modalHeaderColor,
      chartBgColor,
      tableRowEvenBg,
      tableRowOddBg,
      tableTextColor,
      tableBorderColor,
    },
    rawCustomCss,
  );

  await upsertShopSettings(shop.id, {
    primaryColor,
    textColor,
    borderStyle,
    customCss: serializedCss,
  });

  return json({ success: true });
};

// Color input component with swatch + native color picker + hex field
function ColorPickerInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
}) {
  return (
    <div style={{ marginBottom: "1rem" }}>
      <label
        style={{
          display: "block",
          fontSize: "0.875rem",
          fontWeight: 500,
          color: "#303030",
          marginBottom: "0.35rem",
        }}
      >
        {label}
      </label>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}
      >
        <div
          style={{
            position: "relative",
            width: "38px",
            height: "38px",
            borderRadius: "6px",
            border: "1px solid #d1d5db",
            backgroundColor: value || "#ffffff",
            cursor: "pointer",
            flexShrink: 0,
            overflow: "hidden",
            boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
          }}
        >
          <input
            type="color"
            value={value.startsWith("#") && value.length === 7 ? value : "#303030"}
            onChange={(e) => onChange(e.target.value)}
            style={{
              position: "absolute",
              top: "-8px",
              left: "-8px",
              width: "56px",
              height: "56px",
              opacity: 0,
              cursor: "pointer",
            }}
          />
        </div>
        <div style={{ flex: 1, position: "relative" }}>
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            style={{
              width: "100%",
              height: "38px",
              padding: "0 12px",
              borderRadius: "6px",
              border: "1px solid #d1d5db",
              fontSize: "0.875rem",
              fontFamily: "monospace",
              color: "#303030",
              boxSizing: "border-box",
              outline: "none",
            }}
            placeholder="#303030"
          />
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { settings, shopDomain } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const location = useLocation();
  const submit = useSubmit();
  const navigation = useNavigation();
  const actionData = useActionData<typeof action>();

  const isSubmitting = navigation.state === "submitting";
  const goTo = (path: string) => navigate(path + location.search);

  // Step state: 1 = Button styling, 2 = Chart styling
  const [activeStep, setActiveStep] = useState<1 | 2>(1);

  // Button styling state
  const [buttonText, setButtonText] = useState(settings.buttonText);
  const [buttonStyle, setButtonStyle] = useState<"solid" | "outline" | "text">(settings.buttonStyle);
  const [textColor, setTextColor] = useState(settings.textColor);
  const [backgroundColor, setBackgroundColor] = useState(settings.primaryColor);
  const [borderColor, setBorderColor] = useState(settings.borderColor);
  const [cornerStyle, setCornerStyle] = useState<"square" | "rounded" | "pill">(
    (settings.borderStyle as "square" | "rounded" | "pill") || "rounded",
  );
  const [showRulerIcon, setShowRulerIcon] = useState(settings.showRulerIcon);
  const [fontSize, setFontSize] = useState<number>(settings.fontSize || 13);
  const [iconSize, setIconSize] = useState<number>(settings.iconSize || 14);
  const [tableHeaderBg, setTableHeaderBg] = useState(settings.tableHeaderBg || "#f8fafc");
  const [tableHeaderColor, setTableHeaderColor] = useState(settings.tableHeaderColor || "#1e293b");
  const [modalHeaderColor, setModalHeaderColor] = useState(settings.modalHeaderColor || "#111827");
  const [chartBgColor, setChartBgColor] = useState(settings.chartBgColor || "#ffffff");
  const [tableRowEvenBg, setTableRowEvenBg] = useState(settings.tableRowEvenBg || "#ffffff");
  const [tableRowOddBg, setTableRowOddBg] = useState(settings.tableRowOddBg || "#f8fafc");
  const [tableTextColor, setTableTextColor] = useState(settings.tableTextColor || "#334155");
  const [tableBorderColor, setTableBorderColor] = useState(settings.tableBorderColor || "#e2e8f0");
  const [customCss, setCustomCss] = useState(settings.customCss);
  const [showAdvancedCss, setShowAdvancedCss] = useState(false);

  // Live preview device toggle: desktop or mobile
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");

  const handleSave = () => {
    submit(
      {
        primaryColor: backgroundColor,
        textColor,
        borderStyle: cornerStyle,
        customCss,
        buttonText,
        buttonStyle,
        borderColor,
        showRulerIcon: String(showRulerIcon),
        fontSize: String(fontSize),
        iconSize: String(iconSize),
        tableHeaderBg,
        tableHeaderColor,
        modalHeaderColor,
        chartBgColor,
        tableRowEvenBg,
        tableRowOddBg,
        tableTextColor,
        tableBorderColor,
      },
      { method: "post" },
    );
  };

  // Determine button corner radius
  const getBorderRadius = () => {
    if (cornerStyle === "square") return "0px";
    if (cornerStyle === "pill") return "9999px";
    return "6px";
  };

  // Determine button style properties
  const getButtonStyles = (): React.CSSProperties => {
    const base: React.CSSProperties = {
      display: "inline-flex",
      alignItems: "center",
      gap: "6px",
      fontSize: `${fontSize || 13}px`,
      fontWeight: 500,
      cursor: "pointer",
      borderRadius: getBorderRadius(),
      padding: "6px 14px",
      transition: "all 0.15s ease",
      lineHeight: 1.2,
      fontFamily: "inherit",
    };

    if (buttonStyle === "solid") {
      return {
        ...base,
        backgroundColor: backgroundColor || "#d82222",
        color: textColor || "#FFFFFF",
        border: "1px solid transparent",
      };
    }
    if (buttonStyle === "outline") {
      return {
        ...base,
        backgroundColor: "transparent",
        color: textColor || "#303030",
        border: `1.5px solid ${borderColor || "#303030"}`,
      };
    }
    // text link
    return {
      ...base,
      backgroundColor: "transparent",
      color: textColor || "#303030",
      border: "none",
      textDecoration: "underline",
      padding: "6px 4px",
    };
  };

  // Theme editor link
  const cleanStoreName = shopDomain.replace(".myshopify.com", "");
  const themeEditorUrl = `https://admin.shopify.com/store/${cleanStoreName}/themes/current/editor`;

  return (
    <Page
      fullWidth
      title={activeStep === 1 ? "Style your size guide button" : "Style your size chart modal"}
      subtitle={
        activeStep === 1
          ? "Customize the button customers use to open your size chart."
          : "Customize header colors, table borders, and modal fit options."
      }
      backAction={{
        content: "Dashboard",
        onAction: () => goTo("/app"),
      }}
      primaryAction={{
        content: isSubmitting ? "Saving..." : "Save settings",
        onAction: handleSave,
        loading: isSubmitting,
      }}
      secondaryActions={[
        {
          content: activeStep === 1 ? "Next: Chart styling →" : "← Back to Button styling",
          onAction: () => setActiveStep(activeStep === 1 ? 2 : 1),
        },
      ]}
    >
      <TitleBar title="Button Styling" />

      <div style={{ width: "100%", paddingBottom: "2rem" }}>
        {actionData?.success && (
          <div style={{ marginBottom: "1.5rem" }}>
            <Banner tone="success">Display settings saved successfully!</Banner>
          </div>
        )}

        {/* Stepper Header (Image 2) */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            marginBottom: "1.5rem",
            maxWidth: "460px",
          }}
        >
          {/* Step 1 */}
          <button
            type="button"
            onClick={() => setActiveStep(1)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: "none",
              border: "none",
              padding: 0,
              cursor: "pointer",
            }}
          >
            <div
              style={{
                width: "24px",
                height: "24px",
                borderRadius: "50%",
                backgroundColor: activeStep === 1 ? "#111827" : "#e5e7eb",
                color: activeStep === 1 ? "#ffffff" : "#6b7280",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "12px",
                fontWeight: 600,
              }}
            >
              1
            </div>
            <span
              style={{
                fontSize: "0.875rem",
                fontWeight: activeStep === 1 ? 600 : 400,
                color: activeStep === 1 ? "#111827" : "#6b7280",
              }}
            >
              Button styling
            </span>
          </button>

          {/* Stepper Line */}
          <div style={{ flex: 1, height: "1px", backgroundColor: "#e5e7eb", margin: "0 6px" }} />

          {/* Step 2 */}
          <button
            type="button"
            onClick={() => setActiveStep(2)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: "none",
              border: "none",
              padding: 0,
              cursor: "pointer",
            }}
          >
            <div
              style={{
                width: "24px",
                height: "24px",
                borderRadius: "50%",
                backgroundColor: activeStep === 2 ? "#111827" : "#ffffff",
                border: activeStep === 2 ? "none" : "1.5px solid #d1d5db",
                color: activeStep === 2 ? "#ffffff" : "#6b7280",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "12px",
                fontWeight: 600,
              }}
            >
              2
            </div>
            <span
              style={{
                fontSize: "0.875rem",
                fontWeight: activeStep === 2 ? 600 : 400,
                color: activeStep === 2 ? "#111827" : "#6b7280",
              }}
            >
              Chart styling
            </span>
          </button>
        </div>

        {/* Main Grid: Controls on Left, Live Preview on Right */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(360px, 420px) 1fr",
            gap: "1.5rem",
            alignItems: "start",
          }}
        >
          {/* LEFT COLUMN: Controls */}
          <div
            style={{
              backgroundColor: "#ffffff",
              border: "1px solid #e5e7eb",
              borderRadius: "12px",
              padding: "1.5rem",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            }}
          >
            {activeStep === 1 ? (
              <>
                <h2
                  style={{
                    fontSize: "1rem",
                    fontWeight: 600,
                    color: "#111827",
                    margin: "0 0 1.25rem 0",
                  }}
                >
                  Button appearance
                </h2>

                {/* Button Text */}
                <div style={{ marginBottom: "1.25rem" }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.875rem",
                      fontWeight: 500,
                      color: "#303030",
                      marginBottom: "0.35rem",
                    }}
                  >
                    Button text
                  </label>
                  <input
                    type="text"
                    value={buttonText}
                    onChange={(e) => setButtonText(e.target.value)}
                    style={{
                      width: "100%",
                      height: "38px",
                      padding: "0 12px",
                      borderRadius: "6px",
                      border: "1px solid #d1d5db",
                      fontSize: "0.875rem",
                      color: "#111827",
                      boxSizing: "border-box",
                      outline: "none",
                    }}
                    placeholder="Size guide"
                  />
                </div>

                {/* Button Style: Segmented Control */}
                <div style={{ marginBottom: "1.25rem" }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.875rem",
                      fontWeight: 500,
                      color: "#303030",
                      marginBottom: "0.35rem",
                    }}
                  >
                    Button style
                  </label>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr 1fr",
                      gap: "6px",
                      backgroundColor: "#f3f4f6",
                      padding: "3px",
                      borderRadius: "8px",
                    }}
                  >
                    {(["solid", "outline", "text"] as const).map((styleOpt) => {
                      const isSelected = buttonStyle === styleOpt;
                      const label =
                        styleOpt === "solid" ? "Solid" : styleOpt === "outline" ? "Outline" : "Text link";
                      return (
                        <button
                          key={styleOpt}
                          type="button"
                          onClick={() => setButtonStyle(styleOpt)}
                          style={{
                            padding: "7px 10px",
                            fontSize: "0.8125rem",
                            fontWeight: isSelected ? 600 : 400,
                            color: isSelected ? "#111827" : "#4b5563",
                            backgroundColor: isSelected ? "#ffffff" : "transparent",
                            border: isSelected ? "1px solid #d1d5db" : "1px solid transparent",
                            borderRadius: "6px",
                            cursor: "pointer",
                            transition: "all 0.15s ease",
                            boxShadow: isSelected ? "0 1px 2px rgba(0,0,0,0.05)" : "none",
                          }}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Text Color */}
                <ColorPickerInput
                  label="Text color"
                  value={textColor}
                  onChange={setTextColor}
                />

                {/* Background Color */}
                <ColorPickerInput
                  label="Background color"
                  value={backgroundColor}
                  onChange={setBackgroundColor}
                />

                {/* Border Color */}
                <ColorPickerInput
                  label="Border color"
                  value={borderColor}
                  onChange={setBorderColor}
                />

                {/* Corner style: Segmented Control */}
                <div style={{ marginBottom: "1.25rem" }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.875rem",
                      fontWeight: 500,
                      color: "#303030",
                      marginBottom: "0.35rem",
                    }}
                  >
                    Corner style
                  </label>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr 1fr",
                      gap: "6px",
                      backgroundColor: "#f3f4f6",
                      padding: "3px",
                      borderRadius: "8px",
                    }}
                  >
                    {(["square", "rounded", "pill"] as const).map((cOpt) => {
                      const isSelected = cornerStyle === cOpt;
                      const label =
                        cOpt === "square" ? "Square" : cOpt === "rounded" ? "Rounded" : "Pill";
                      return (
                        <button
                          key={cOpt}
                          type="button"
                          onClick={() => setCornerStyle(cOpt)}
                          style={{
                            padding: "7px 10px",
                            fontSize: "0.8125rem",
                            fontWeight: isSelected ? 600 : 400,
                            color: isSelected ? "#111827" : "#4b5563",
                            backgroundColor: isSelected ? "#ffffff" : "transparent",
                            border: isSelected ? "1px solid #d1d5db" : "1px solid transparent",
                            borderRadius: "6px",
                            cursor: "pointer",
                            transition: "all 0.15s ease",
                            boxShadow: isSelected ? "0 1px 2px rgba(0,0,0,0.05)" : "none",
                          }}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Button Font Size & Icon Size */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "1.25rem" }}>
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: "0.875rem",
                        fontWeight: 500,
                        color: "#303030",
                        marginBottom: "0.35rem",
                      }}
                    >
                      Text font size (px)
                    </label>
                    <input
                      type="number"
                      min={10}
                      max={26}
                      value={fontSize}
                      onChange={(e) => setFontSize(Number(e.target.value) || 13)}
                      style={{
                        width: "100%",
                        height: "38px",
                        padding: "0 12px",
                        borderRadius: "6px",
                        border: "1px solid #d1d5db",
                        fontSize: "0.875rem",
                        color: "#111827",
                        boxSizing: "border-box",
                        outline: "none",
                      }}
                    />
                  </div>

                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: "0.875rem",
                        fontWeight: 500,
                        color: "#303030",
                        marginBottom: "0.35rem",
                      }}
                    >
                      Icon size (px)
                    </label>
                    <input
                      type="number"
                      min={10}
                      max={28}
                      value={iconSize}
                      onChange={(e) => setIconSize(Number(e.target.value) || 14)}
                      style={{
                        width: "100%",
                        height: "38px",
                        padding: "0 12px",
                        borderRadius: "6px",
                        border: "1px solid #d1d5db",
                        fontSize: "0.875rem",
                        color: "#111827",
                        boxSizing: "border-box",
                        outline: "none",
                      }}
                    />
                  </div>
                </div>

                {/* Show ruler icon toggle */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "0.75rem 0",
                    borderTop: "1px solid #f3f4f6",
                    borderBottom: "1px solid #f3f4f6",
                    marginBottom: "1rem",
                  }}
                >
                  <span style={{ fontSize: "0.875rem", fontWeight: 500, color: "#303030" }}>
                    Show ruler icon
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowRulerIcon(!showRulerIcon)}
                    aria-label="Toggle ruler icon"
                    style={{
                      width: "42px",
                      height: "24px",
                      borderRadius: "12px",
                      backgroundColor: showRulerIcon ? "#111827" : "#e5e7eb",
                      position: "relative",
                      border: "none",
                      cursor: "pointer",
                      padding: 0,
                      transition: "background-color 0.2s ease",
                    }}
                  >
                    <div
                      style={{
                        width: "18px",
                        height: "18px",
                        borderRadius: "50%",
                        backgroundColor: "#ffffff",
                        position: "absolute",
                        top: "3px",
                        left: showRulerIcon ? "21px" : "3px",
                        transition: "left 0.2s ease",
                        boxShadow: "0 1px 2px rgba(0,0,0,0.15)",
                      }}
                    />
                  </button>
                </div>

                {/* Advanced: Collapsible Custom CSS */}
                <div style={{ marginTop: "0.5rem" }}>
                  <button
                    type="button"
                    onClick={() => setShowAdvancedCss(!showAdvancedCss)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      width: "100%",
                      padding: "8px 0",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      fontSize: "0.875rem",
                      fontWeight: 500,
                      color: "#4b5563",
                    }}
                  >
                    <span>Advanced · Custom CSS</span>
                    <span
                      style={{
                        transform: showAdvancedCss ? "rotate(90deg)" : "rotate(0deg)",
                        transition: "transform 0.15s ease",
                        fontSize: "0.75rem",
                      }}
                    >
                      ›
                    </span>
                  </button>

                  {showAdvancedCss && (
                    <div style={{ marginTop: "0.5rem" }}>
                      <textarea
                        value={customCss}
                        onChange={(e) => setCustomCss(e.target.value)}
                        placeholder={`.px-sc-trigger-btn { font-size: 14px; }`}
                        rows={4}
                        style={{
                          width: "100%",
                          padding: "10px",
                          borderRadius: "6px",
                          border: "1px solid #d1d5db",
                          fontFamily: "monospace",
                          fontSize: "0.8125rem",
                          color: "#111827",
                          boxSizing: "border-box",
                          resize: "vertical",
                          outline: "none",
                        }}
                      />
                      <p style={{ margin: "4px 0 0 0", fontSize: "0.75rem", color: "#6b7280" }}>
                        Injected directly into your storefront size chart.
                      </p>
                    </div>
                  )}
                </div>

                {/* Open Theme Editor Action Card (Separated from Save Settings per Image 2 feedback) */}
                <div
                  style={{
                    marginTop: "1.5rem",
                    padding: "1rem",
                    backgroundColor: "#f9fafb",
                    borderRadius: "8px",
                    border: "1px solid #e5e7eb",
                  }}
                >
                  <p style={{ margin: "0 0 8px 0", fontSize: "0.8125rem", fontWeight: 600, color: "#111827" }}>
                    Theme App Extension
                  </p>
                  <p style={{ margin: "0 0 12px 0", fontSize: "0.75rem", color: "#4b5563", lineHeight: 1.4 }}>
                    Add or reposition the Size Chart block on your product pages in the Shopify theme editor.
                  </p>
                  <a
                    href={themeEditorUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      fontSize: "0.8125rem",
                      fontWeight: 600,
                      color: "#2563eb",
                      textDecoration: "none",
                    }}
                  >
                    Open theme editor ↗
                  </a>
                </div>
              </>
            ) : (
              /* Step 2: Chart styling */
              <div>
                <h2
                  style={{
                    fontSize: "1rem",
                    fontWeight: 600,
                    color: "#111827",
                    margin: "0 0 1.25rem 0",
                  }}
                >
                  Modal & Table appearance
                </h2>
                <p style={{ margin: "0 0 1.25rem 0", fontSize: "0.8125rem", color: "#6b7280" }}>
                  These styles apply when customers click your size guide button to view the table.
                </p>

                {/* Modal Window */}
                <div style={{ marginBottom: "1.25rem", paddingBottom: "1rem", borderBottom: "1px solid #f1f5f9" }}>
                  <h3 style={{ fontSize: "0.875rem", fontWeight: 600, color: "#1e293b", margin: "0 0 0.75rem 0" }}>
                    Modal Window
                  </h3>
                  <ColorPickerInput
                    label="Modal background color"
                    value={chartBgColor}
                    onChange={setChartBgColor}
                  />
                  <ColorPickerInput
                    label="Modal header title color"
                    value={modalHeaderColor}
                    onChange={setModalHeaderColor}
                  />
                </div>

                {/* Table Header */}
                <div style={{ marginBottom: "1.25rem", paddingBottom: "1rem", borderBottom: "1px solid #f1f5f9" }}>
                  <h3 style={{ fontSize: "0.875rem", fontWeight: 600, color: "#1e293b", margin: "0 0 0.75rem 0" }}>
                    Table Header
                  </h3>
                  <ColorPickerInput
                    label="Table header background"
                    value={tableHeaderBg}
                    onChange={setTableHeaderBg}
                  />
                  <ColorPickerInput
                    label="Table header text color"
                    value={tableHeaderColor}
                    onChange={setTableHeaderColor}
                  />
                </div>

                {/* Table Rows & Borders */}
                <div style={{ marginBottom: "1.25rem" }}>
                  <h3 style={{ fontSize: "0.875rem", fontWeight: 600, color: "#1e293b", margin: "0 0 0.75rem 0" }}>
                    Table Rows & Borders
                  </h3>
                  <ColorPickerInput
                    label="Even rows background"
                    value={tableRowEvenBg}
                    onChange={setTableRowEvenBg}
                  />
                  <ColorPickerInput
                    label="Odd rows background"
                    value={tableRowOddBg}
                    onChange={setTableRowOddBg}
                  />
                  <ColorPickerInput
                    label="Table text color"
                    value={tableTextColor}
                    onChange={setTableTextColor}
                  />
                  <ColorPickerInput
                    label="Table border & divider color"
                    value={tableBorderColor}
                    onChange={setTableBorderColor}
                  />
                </div>

                <div style={{ marginTop: "1.5rem" }}>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={isSubmitting}
                    style={{
                      width: "100%",
                      backgroundColor: "#111827",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: "6px",
                      padding: "10px",
                      fontSize: "0.875rem",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    {isSubmitting ? "Saving..." : "Save settings"}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: Live Preview (Image 2) */}
          <div
            style={{
              backgroundColor: "#ffffff",
              border: "1px solid #e5e7eb",
              borderRadius: "12px",
              padding: "1.5rem",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            }}
          >
            {/* Live Preview Header & Device Switcher */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1.25rem",
              }}
            >
              <h2
                style={{
                  fontSize: "1rem",
                  fontWeight: 600,
                  color: "#111827",
                  margin: 0,
                }}
              >
                Live preview
              </h2>

              <div
                style={{
                  display: "flex",
                  gap: "4px",
                  backgroundColor: "#f3f4f6",
                  padding: "3px",
                  borderRadius: "8px",
                }}
              >
                <button
                  type="button"
                  onClick={() => setPreviewDevice("desktop")}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "5px 12px",
                    fontSize: "0.8125rem",
                    fontWeight: previewDevice === "desktop" ? 600 : 400,
                    color: previewDevice === "desktop" ? "#111827" : "#4b5563",
                    backgroundColor: previewDevice === "desktop" ? "#ffffff" : "transparent",
                    border: previewDevice === "desktop" ? "1px solid #d1d5db" : "1px solid transparent",
                    borderRadius: "6px",
                    cursor: "pointer",
                  }}
                >
                  <span>💻</span> Desktop
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDevice("mobile")}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "5px 12px",
                    fontSize: "0.8125rem",
                    fontWeight: previewDevice === "mobile" ? 600 : 400,
                    color: previewDevice === "mobile" ? "#111827" : "#4b5563",
                    backgroundColor: previewDevice === "mobile" ? "#ffffff" : "transparent",
                    border: previewDevice === "mobile" ? "1px solid #d1d5db" : "1px solid transparent",
                    borderRadius: "6px",
                    cursor: "pointer",
                  }}
                >
                  <span>📱</span> Mobile
                </button>
              </div>
            </div>

            {activeStep === 1 ? (
              /* Realistic Product Page Mockup (Matches Reference Image 2) */
              <div
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: "10px",
                  backgroundColor: "#ffffff",
                  padding: previewDevice === "mobile" ? "16px 12px" : "24px 20px",
                  maxWidth: previewDevice === "mobile" ? "360px" : "100%",
                  margin: "0 auto",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.03)",
                  boxSizing: "border-box",
                  transition: "max-width 0.25s ease",
                }}
              >
              {/* Store Navbar in Mockup */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingBottom: "12px",
                  borderBottom: "1px solid #f3f4f6",
                  marginBottom: "18px",
                }}
              >
                <span
                  style={{
                    fontWeight: 800,
                    fontSize: "0.9375rem",
                    letterSpacing: "2px",
                    color: "#111827",
                  }}
                >
                  EVERYDAY
                </span>

                {previewDevice === "desktop" && (
                  <div style={{ display: "flex", gap: "16px", fontSize: "0.8125rem", color: "#6b7280" }}>
                    <span>Men</span>
                    <span>Women</span>
                    <span>Accessories</span>
                  </div>
                )}

                <div style={{ display: "flex", gap: "12px", color: "#4b5563", fontSize: "14px" }}>
                  <span>🔍</span>
                  <span>👤</span>
                  <span>🛍️</span>
                </div>
              </div>

              {/* Product Layout: Grid for Desktop, Stack for Mobile */}
              <div
                style={{
                  display: previewDevice === "mobile" ? "flex" : "grid",
                  flexDirection: previewDevice === "mobile" ? "column" : undefined,
                  gridTemplateColumns: previewDevice === "mobile" ? undefined : "1fr 1.15fr",
                  gap: "20px",
                  alignItems: "start",
                }}
              >
                {/* Product Image */}
                <div
                  style={{
                    backgroundColor: "#f7f5f0",
                    borderRadius: "8px",
                    overflow: "hidden",
                    aspectRatio: "4/5",
                    position: "relative",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {/* Clean SVG Model with Ivory Tee */}
                  <svg
                    viewBox="0 0 300 375"
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  >
                    <rect width="300" height="375" fill="#f4efe6" />
                    {/* Soft background glow */}
                    <circle cx="150" cy="140" r="110" fill="#ede6d9" opacity="0.6" />
                    {/* Head / Hair */}
                    <path
                      d="M105 130 C105 70, 195 70, 195 130 C195 180, 185 220, 175 230 C165 240, 135 240, 125 230 C115 220, 105 180, 105 130 Z"
                      fill="#8d6346"
                    />
                    {/* Face */}
                    <ellipse cx="150" cy="130" rx="32" ry="40" fill="#f8d5c2" />
                    {/* Hair strands */}
                    <path
                      d="M120 100 C130 90, 170 90, 180 100 C175 125, 175 160, 182 195 C160 185, 140 185, 118 195 C125 160, 125 125, 120 100 Z"
                      fill="#7a5338"
                    />
                    {/* Neck */}
                    <rect x="142" y="160" width="16" height="24" fill="#f0c2a8" />
                    {/* Ivory Classic Cotton Tee */}
                    <path
                      d="M110 182 L140 184 L142 178 C144 184, 156 184, 158 178 L160 184 L190 182 L215 235 L190 242 L182 215 L182 340 L118 340 L118 215 L110 242 L85 235 Z"
                      fill="#fcfbf7"
                      stroke="#e5e2da"
                      strokeWidth="1.5"
                    />
                    {/* Subtle tee creases */}
                    <path d="M142 205 Q150 215 158 205" stroke="#ece7dd" strokeWidth="2" fill="none" />
                    <path d="M135 240 Q150 252 165 240" stroke="#ece7dd" strokeWidth="2" fill="none" />
                    <path d="M138 280 Q150 290 162 280" stroke="#ece7dd" strokeWidth="2" fill="none" />
                    {/* Jeans waistband */}
                    <path d="M118 340 L182 340 L185 375 L115 375 Z" fill="#9bb3c7" />
                    <path d="M150 340 L150 375" stroke="#7e9bb5" strokeWidth="2" />
                  </svg>
                </div>

                {/* Product Info */}
                <div>
                  <h3
                    style={{
                      fontSize: "1.125rem",
                      fontWeight: 700,
                      color: "#111827",
                      margin: "0 0 4px 0",
                    }}
                  >
                    Classic cotton tee
                  </h3>
                  <div style={{ fontSize: "0.9375rem", color: "#4b5563", marginBottom: "14px" }}>
                    $32.00
                  </div>

                  {/* Color Option */}
                  <div style={{ marginBottom: "14px" }}>
                    <div style={{ fontSize: "0.8125rem", color: "#374151", marginBottom: "6px" }}>
                      Color: <strong>Ivory</strong>
                    </div>
                    <div style={{ display: "flex", gap: "8px" }}>
                      {/* Ivory (Selected) */}
                      <div
                        style={{
                          width: "22px",
                          height: "22px",
                          borderRadius: "50%",
                          backgroundColor: "#f5f3ec",
                          boxShadow: "0 0 0 2px #fff, 0 0 0 3px #111827",
                          cursor: "pointer",
                        }}
                      />
                      {/* Sage */}
                      <div
                        style={{
                          width: "22px",
                          height: "22px",
                          borderRadius: "50%",
                          backgroundColor: "#9eaa94",
                          cursor: "pointer",
                        }}
                      />
                      {/* Charcoal */}
                      <div
                        style={{
                          width: "22px",
                          height: "22px",
                          borderRadius: "50%",
                          backgroundColor: "#333a38",
                          cursor: "pointer",
                        }}
                      />
                    </div>
                  </div>

                  {/* Size Option & LIVE BUTTON */}
                  <div style={{ marginBottom: "16px" }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "8px",
                      }}
                    >
                      <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: "#374151" }}>
                        Size
                      </span>

                      {/* THE LIVE SIZE GUIDE BUTTON (Directly reacts to merchant's custom settings) */}
                      <button
                        type="button"
                        style={getButtonStyles()}
                        title="Click to preview size guide"
                      >
                        {showRulerIcon && (
                          <svg
                            width={iconSize || 14}
                            height={iconSize || 14}
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            style={{ flexShrink: 0 }}
                          >
                            <path d="M21.3 8.7 8.7 21.3c-1 1-2.5 1-3.5 0l-3.5-3.5c-1-1-1-2.5 0-3.5z" />
                            <path d="m14.5 4.5 2 2M11.5 7.5 14 10M8.5 10.5 11 13M5.5 13.5 8 16" />
                          </svg>
                        )}
                        <span>{buttonText || "Size guide"}</span>
                      </button>
                    </div>

                    {/* Size Selector Buttons */}
                    <div style={{ display: "flex", gap: "6px" }}>
                      {["XS", "S", "M", "L", "XL"].map((size) => {
                        const isM = size === "M";
                        return (
                          <div
                            key={size}
                            style={{
                              flex: 1,
                              height: "34px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "0.75rem",
                              fontWeight: isM ? 700 : 500,
                              color: isM ? "#111827" : "#4b5563",
                              backgroundColor: "#ffffff",
                              border: isM ? "1.5px solid #111827" : "1px solid #e5e7eb",
                              borderRadius: "4px",
                              cursor: "pointer",
                            }}
                          >
                            {size}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Add to Cart Primary Button */}
                  <button
                    type="button"
                    style={{
                      width: "100%",
                      height: "40px",
                      backgroundColor: "#111827",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: "6px",
                      fontSize: "0.875rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                    }}
                  >
                    Add to cart
                  </button>
                </div>
              </div>
            </div>
          ) : (
              /* Realistic Size Chart Modal / Table Mockup for Step 2 */
              <div
                style={{
                  border: `1px solid ${tableBorderColor || "#e5e7eb"}`,
                  borderRadius: "12px",
                  backgroundColor: chartBgColor || "#ffffff",
                  maxWidth: previewDevice === "mobile" ? "360px" : "600px",
                  margin: "0 auto",
                  boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04)",
                  overflow: "hidden",
                  transition: "max-width 0.25s ease",
                }}
              >
                {/* Modal Header Bar */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "16px 20px",
                    borderBottom: `1px solid ${tableBorderColor || "#f1f5f9"}`,
                    backgroundColor: chartBgColor || "#ffffff",
                  }}
                >
                  <span style={{ fontSize: "1.0625rem", fontWeight: 700, color: modalHeaderColor || "#111827" }}>
                    Size Guide
                  </span>
                  <span style={{ fontSize: "1.25rem", color: "#94a3b8", cursor: "pointer", lineHeight: 1 }}>&times;</span>
                </div>

                {/* Modal Content Slot */}
                <div style={{ padding: previewDevice === "mobile" ? "14px 12px" : "18px 20px", backgroundColor: chartBgColor || "#ffffff" }}>
                  {/* Title & Unit Toggle */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      flexWrap: "wrap",
                      gap: "10px",
                      marginBottom: "14px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: modalHeaderColor || "#0f172a" }}>Classic Cotton Tee</h3>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          padding: "2px 8px",
                          borderRadius: "4px",
                          fontSize: "12px",
                          fontWeight: 500,
                          backgroundColor: "#f0fdf4",
                          color: "#166534",
                        }}
                      >
                        ✓ True to size
                      </span>
                    </div>

                    {/* Unit Toggle */}
                    <div
                      style={{
                        display: "inline-flex",
                        backgroundColor: "#f1f5f9",
                        borderRadius: "6px",
                        padding: "2px",
                      }}
                    >
                      <span
                        style={{
                          padding: "3px 10px",
                          fontSize: "11px",
                          fontWeight: 700,
                          backgroundColor: "#ffffff",
                          color: "#0f172a",
                          borderRadius: "4px",
                          boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
                        }}
                      >
                        INCHES
                      </span>
                      <span
                        style={{
                          padding: "3px 10px",
                          fontSize: "11px",
                          fontWeight: 600,
                          color: "#64748b",
                        }}
                      >
                        CM
                      </span>
                    </div>
                  </div>

                  {/* Size Chart Table */}
                  <div style={{ overflowX: "auto", borderRadius: "8px", border: `1px solid ${tableBorderColor || "#e2e8f0"}` }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                      <thead>
                        <tr>
                          {["Size (inch)", "Chest (inch)", "Length (inch)", "Sleeve (inch)"].map((col, idx) => (
                            <th
                              key={col}
                              style={{
                                backgroundColor: tableHeaderBg || "#f8fafc",
                                color: tableHeaderColor || getContrastColor(tableHeaderBg || "#f8fafc"),
                                padding: "10px 14px",
                                fontWeight: 600,
                                textAlign: idx === 0 ? "left" : "center",
                                borderBottom: `1px solid ${tableBorderColor || "#e2e8f0"}`,
                                whiteSpace: "nowrap",
                                transition: "background-color 0.15s ease",
                              }}
                            >
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          ["XS", "34 - 36", "27", "8.0"],
                          ["S", "36 - 38", "28", "8.2"],
                          ["M", "38 - 40", "29", "8.5"],
                          ["L", "40 - 42", "30", "8.8"],
                          ["XL", "42 - 45", "31", "9.0"],
                        ].map((row, rowIdx) => (
                          <tr key={rowIdx} style={{ backgroundColor: rowIdx % 2 === 0 ? (tableRowEvenBg || "#ffffff") : (tableRowOddBg || "#f8fafc") }}>
                            {row.map((cell, cIdx) => (
                              <td
                                key={cIdx}
                                style={{
                                  padding: "10px 14px",
                                  textAlign: cIdx === 0 ? "left" : "center",
                                  fontWeight: cIdx === 0 ? 600 : 400,
                                  color: tableTextColor || "#334155",
                                  borderBottom: rowIdx === 4 ? "none" : `1px solid ${tableBorderColor || "#f1f5f9"}`,
                                }}
                              >
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Measurement Instructions */}
                  <div
                    style={{
                      marginTop: "14px",
                      padding: "10px 12px",
                      backgroundColor: tableRowOddBg || "#f8fafc",
                      borderRadius: "6px",
                      border: `1px solid ${tableBorderColor || "#f1f5f9"}`,
                    }}
                  >
                    <div style={{ fontSize: "12px", fontWeight: 600, color: modalHeaderColor || "#334155", marginBottom: "3px" }}>
                      How to measure
                    </div>
                    <div style={{ fontSize: "11.5px", color: tableTextColor || "#64748b", lineHeight: 1.4 }}>
                      Chest: Measure around the fullest part of your chest, keeping the tape horizontal.
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Subdued update hint at bottom */}
            <p
              style={{
                textAlign: "center",
                color: "#9ca3af",
                fontSize: "0.75rem",
                margin: "14px 0 0 0",
              }}
            >
              Preview updates as you style your {activeStep === 1 ? "button" : "modal & table"}.
            </p>
          </div>
        </div>
      </div>
    </Page>
  );
}
