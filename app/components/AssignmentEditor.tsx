import React from "react";
import {
  Card,
  BlockStack,
  InlineStack,
  Text,
  Select,
  TextField,
} from "@shopify/polaris";
import { TargetType, SetAssignmentInput } from "../types/chart";

export interface AssignmentEditorProps {
  assignments: SetAssignmentInput[];
  onChange: (assignments: SetAssignmentInput[]) => void;
}

const TARGET_TYPE_OPTIONS = [
  { label: "All Products (Store-wide Fallback)", value: "all_products" },
  { label: "Collection (by Collection ID)", value: "collection" },
  { label: "Specific Product (by ID or handle)", value: "product" },
  { label: "Product Tag", value: "tag" },
  { label: "Vendor", value: "vendor" },
  { label: "Product Type", value: "product_type" },
];

export function AssignmentEditor({ assignments, onChange }: AssignmentEditorProps) {
  const handleAdd = () => {
    onChange([
      ...assignments,
      {
        targetType: "all_products",
        targetValue: "*",
        priority: assignments.length,
      },
    ]);
  };

  const handleRemove = (index: number) => {
    onChange(assignments.filter((_, i) => i !== index));
  };

  const handleChange = (
    index: number,
    field: keyof SetAssignmentInput,
    value: any,
  ) => {
    const updated = assignments.map((item, i) => {
      if (i === index) {
        const next = { ...item, [field]: value };
        if (field === "targetType" && value === "all_products") {
          next.targetValue = "*";
        }
        return next;
      }
      return item;
    });
    onChange(updated);
  };

  return (
    <Card>
      <BlockStack gap="400">
        <InlineStack align="space-between" blockAlign="center">
          <Text as="h2" variant="headingMd">
            Product targeting
          </Text>
          <button
            type="button"
            onClick={handleAdd}
            style={{
              background: "#ffffff",
              border: "1px solid #d4d7dc",
              borderRadius: "6px",
              padding: "6px 12px",
              fontSize: "12.5px",
              fontWeight: 500,
              color: "#202223",
              cursor: "pointer",
            }}
          >
            + Add targeting rule
          </button>
        </InlineStack>

        {/* Info Box */}
        <div
          style={{
            background: "#eff6ff",
            border: "1px solid #bfdbfe",
            borderRadius: "8px",
            padding: "10px 14px",
            fontSize: "12.5px",
            color: "#1e3a8a",
            lineHeight: 1.5,
          }}
        >
          <div style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
            <span style={{ fontSize: "14px", marginTop: "1px" }}>ℹ️</span>
            <div>
              <strong>Matching order:</strong> Specific product &rarr; Collection &rarr; Tag &rarr; Vendor &rarr; Product type &rarr; All products
              <div style={{ color: "#3b82f6", marginTop: "2px" }}>
                Within the same category, lower priority numbers win.
              </div>
            </div>
          </div>
        </div>

        {assignments.length === 0 ? (
          <Text as="p" variant="bodyMd" tone="subdued">
            No targeting rules assigned yet. This size chart won&apos;t appear on storefront products until assigned.
          </Text>
        ) : (
          <BlockStack gap="300">
            {assignments.map((assignment, index) => (
              <div
                key={index}
                style={{
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  padding: "14px 16px",
                  background: "#ffffff",
                }}
              >
                <BlockStack gap="300">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "13px", fontWeight: 700, color: "#1e293b" }}>
                      Rule {index + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemove(index)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#ef4444",
                        fontSize: "12.5px",
                        fontWeight: 500,
                        cursor: "pointer",
                        padding: 0,
                      }}
                    >
                      Remove rule
                    </button>
                  </div>

                  <InlineStack gap="300" wrap={false} blockAlign="end">
                    <div style={{ minWidth: "200px", flex: 1 }}>
                      <Select
                        label="Target type"
                        options={TARGET_TYPE_OPTIONS}
                        value={assignment.targetType}
                        onChange={(val) =>
                          handleChange(index, "targetType", val as TargetType)
                        }
                      />
                    </div>

                    {assignment.targetType !== "all_products" && (
                      <div style={{ flex: 2 }}>
                        <TextField
                          label={
                            assignment.targetType === "product"
                              ? "Product ID, Handle, or GID"
                              : assignment.targetType === "collection"
                              ? "Collection ID or GID"
                              : assignment.targetType === "tag"
                              ? "Tag Name (e.g. summer-dresses)"
                              : assignment.targetType === "vendor"
                              ? "Vendor Name (e.g. Nike)"
                              : "Product Type (e.g. T-Shirts)"
                          }
                          value={assignment.targetValue}
                          onChange={(val) =>
                            handleChange(index, "targetValue", val)
                          }
                          autoComplete="off"
                        />
                      </div>
                    )}

                    <div style={{ width: "90px" }}>
                      <TextField
                        label="Priority"
                        type="number"
                        value={String(assignment.priority ?? 0)}
                        onChange={(val) =>
                          handleChange(index, "priority", parseInt(val, 10) || 0)
                        }
                        autoComplete="off"
                      />
                    </div>
                  </InlineStack>
                </BlockStack>
              </div>
            ))}
          </BlockStack>
        )}
      </BlockStack>
    </Card>
  );
}
