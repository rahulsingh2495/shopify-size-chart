import React from "react";
import {
  Card,
  BlockStack,
  Text,
  Select,
  TextField,
  RadioButton,
  InlineStack,
  Box,
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
  return (
    <Card>
      <BlockStack gap="400">
        <Text as="h2" variant="headingMd">
          Display & Guidance Options
        </Text>

        <BlockStack gap="200">
          <Text as="span" variant="bodyMd" fontWeight="semibold">
            Display Mode
          </Text>
          <RadioButton
            label="Popup Modal (Recommended - opens responsive modal when button clicked)"
            checked={displayMode === "popup"}
            id="display-popup"
            name="displayMode"
            onChange={() => onDisplayModeChange("popup")}
          />
          <RadioButton
            label="Inline (Embedded directly on the product page)"
            checked={displayMode === "inline"}
            id="display-inline"
            name="displayMode"
            onChange={() => onDisplayModeChange("inline")}
          />
          <RadioButton
            label="Accordion (Collapsible drawer below product details)"
            checked={displayMode === "accordion"}
            id="display-accordion"
            name="displayMode"
            onChange={() => onDisplayModeChange("accordion")}
          />
          <RadioButton
            label="Floating Button (Fixed button pinned to screen edge)"
            checked={displayMode === "floating"}
            id="display-floating"
            name="displayMode"
            onChange={() => onDisplayModeChange("floating")}
          />
        </BlockStack>

        {(displayMode === "popup" || displayMode === "accordion" || displayMode === "floating") && (
          <TextField
            label="Button / Tab Label"
            value={buttonText}
            onChange={onButtonTextChange}
            helpText="The label shoppers see on the storefront (e.g. Size Guide, Sizing Details)"
            autoComplete="off"
          />
        )}

        <Select
          label="Fit Guidance Note"
          options={[
            { label: "None", value: "none" },
            { label: "Runs Small (We recommend sizing up)", value: "runs_small" },
            { label: "True to Size (Fits as expected)", value: "true_to_size" },
            { label: "Runs Large (We recommend sizing down)", value: "runs_large" },
          ]}
          value={fitNote}
          onChange={(val) =>
            onFitNoteChange(val as "none" | "runs_small" | "true_to_size" | "runs_large")
          }
          helpText="Highlights fit expectations for customers above the chart"
        />

        <TextField
          label="How to Measure Instructions"
          multiline={4}
          value={measurementInstructions}
          onChange={onMeasurementInstructionsChange}
          placeholder="e.g. Bust: Measure around the fullest part of your chest..."
          helpText="Helpful measuring tips displayed alongside the size chart"
          autoComplete="off"
        />
      </BlockStack>
    </Card>
  );
}
