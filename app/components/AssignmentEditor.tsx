import React from "react";
import {
  Card,
  BlockStack,
  InlineStack,
  Text,
  Select,
  TextField,
  Button,
  Banner,
} from "@shopify/polaris";
import { TargetType, SetAssignmentInput } from "../types/chart";

export interface AssignmentEditorProps {
  assignments: SetAssignmentInput[];
  onChange: (assignments: SetAssignmentInput[]) => void;
}

const TARGET_TYPE_OPTIONS = [
  { label: "Specific Product (by ID or handle)", value: "product" },
  { label: "Collection (by Collection ID)", value: "collection" },
  { label: "Product Tag", value: "tag" },
  { label: "Vendor", value: "vendor" },
  { label: "Product Type", value: "product_type" },
  { label: "All Products (Store-wide Fallback)", value: "all_products" },
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
            Product Targeting Rules
          </Text>
          <Button onClick={handleAdd}>+ Add Targeting Rule</Button>
        </InlineStack>

        <Banner tone="info">
          Matching order: Specific Product &gt; Collection &gt; Tag &gt; Vendor &gt; Product Type &gt; All Products.
          If multiple charts match the same category, lower priority number wins.
        </Banner>

        {assignments.length === 0 ? (
          <Text as="p" variant="bodyMd" tone="subdued">
            No targeting rules assigned yet. This size chart won&apos;t appear on storefront products until assigned.
          </Text>
        ) : (
          <BlockStack gap="300">
            {assignments.map((assignment, index) => (
              <Card key={index} roundedAbove="sm">
                <BlockStack gap="300">
                  <InlineStack align="space-between" blockAlign="center">
                    <Text as="span" variant="bodySm" fontWeight="bold">
                      Rule #{index + 1}
                    </Text>
                    <Button
                      variant="plain"
                      tone="critical"
                      onClick={() => handleRemove(index)}
                    >
                      Remove Rule
                    </Button>
                  </InlineStack>

                  <InlineStack gap="300" wrap={false} blockAlign="end">
                    <div style={{ minWidth: "220px", flex: 1 }}>
                      <Select
                        label="Target Type"
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

                    <div style={{ width: "100px" }}>
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
              </Card>
            ))}
          </BlockStack>
        )}
      </BlockStack>
    </Card>
  );
}
