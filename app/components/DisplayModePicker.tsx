import React from "react";
import {
  Card,
  BlockStack,
  Text,
  Select,
  TextField,
} from "@shopify/polaris";

export interface DisplayModePickerProps {
  displayMode: "inline" | "popup" | "accordion" | "floating";
  buttonText: string;
  fitNote: "none" | "runs_small" | "true_to_size" | "runs_large";
  measurementInstructions: string;
  onDisplayModeChange: (val: "inline" | "popup" | "accordion" | "floating") => void;
  onButtonTextChange: (val: string) => void;
  onFitNoteChange: (val: "none" | "runs_small" | "true_to_size" | "runs_large") => void;
  onMeasurementInstructionsChange: (val: string) => void;
}

export function DisplayModePicker({
  displayMode,
  buttonText,
  fitNote,
  measurementInstructions,
  onDisplayModeChange,
  onButtonTextChange,
  onFitNoteChange,
  onMeasurementInstructionsChange,
}: DisplayModePickerProps) {
  const modes: Array<{
    id: "popup" | "inline" | "accordion" | "floating";
    title: string;
    desc: string;
    recommended?: boolean;
  }> = [
    {
      id: "popup",
      title: "Popup modal",
      desc: "Opens when the button is clicked",
      recommended: true,
    },
    {
      id: "inline",
      title: "Inline",
      desc: "Embedded on the product page",
    },
    {
      id: "accordion",
      title: "Accordion",
      desc: "Collapsible below product details",
    },
    {
      id: "floating",
      title: "Floating button",
      desc: "Pinned to the screen edge",
    },
  ];

  return (
    <BlockStack gap="400">
      {/* Card 1: Display Mode */}
      <Card>
        <BlockStack gap="400">
          <Text as="h2" variant="headingMd">
            Display mode
          </Text>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {modes.map((m) => {
              const isSelected = displayMode === m.id;
              return (
                <div
                  key={m.id}
                  onClick={() => onDisplayModeChange(m.id)}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "10px",
                    cursor: "pointer",
                    padding: "4px 0",
                  }}
                >
                  <div style={{ paddingTop: "2px" }}>
                    <div
                      style={{
                        width: "16px",
                        height: "16px",
                        borderRadius: "50%",
                        border: isSelected ? "5px solid #0f172a" : "1.5px solid #94a3b8",
                        background: "#ffffff",
                        boxSizing: "border-box",
                        transition: "all 0.15s ease",
                      }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "13.5px", fontWeight: isSelected ? 600 : 500, color: "#1e293b" }}>
                        {m.title}
                      </span>
                      {m.recommended && (
                        <span
                          style={{
                            background: "#eaf7ee",
                            color: "#166534",
                            fontSize: "11px",
                            fontWeight: 600,
                            padding: "2px 8px",
                            borderRadius: "10px",
                          }}
                        >
                          Recommended
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: "12.5px", color: "#64748b", marginTop: "2px" }}>
                      {m.desc}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ borderTop: "1px solid #f1f2f4", paddingTop: "14px" }}>
            <TextField
              label="Button / tab label"
              value={buttonText}
              onChange={onButtonTextChange}
              helpText="Shown to shoppers on your storefront"
              autoComplete="off"
            />
          </div>
        </BlockStack>
      </Card>

      {/* Card 2: Measurement Guidance */}
      <Card>
        <BlockStack gap="400">
          <Text as="h2" variant="headingMd">
            Measurement guidance
          </Text>

          <Select
            label="Fit guidance note"
            options={[
              { label: "None", value: "none" },
              { label: "True to size (Fits as expected)", value: "true_to_size" },
              { label: "Runs small (Recommend sizing up)", value: "runs_small" },
              { label: "Runs large (Recommend sizing down)", value: "runs_large" },
            ]}
            value={fitNote}
            onChange={(val) =>
              onFitNoteChange(val as "none" | "runs_small" | "true_to_size" | "runs_large")
            }
            helpText={
              fitNote === "true_to_size"
                ? "Fits as expected"
                : fitNote === "runs_small"
                ? "Recommend sizing up"
                : fitNote === "runs_large"
                ? "Recommend sizing down"
                : undefined
            }
          />

          <TextField
            label="How to measure instructions"
            multiline={5}
            value={measurementInstructions}
            onChange={onMeasurementInstructionsChange}
            placeholder={"Waist: Measure around your natural waistline.\nHip: Measure around the fullest part of your hips.\nInseam: Measure from the crotch to the ankle."}
            helpText="Displayed alongside the size chart"
            autoComplete="off"
          />
        </BlockStack>
      </Card>
    </BlockStack>
  );
}
