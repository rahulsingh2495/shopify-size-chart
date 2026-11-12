import { useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useActionData, useNavigate, useNavigation, useSubmit } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  BlockStack,
  TextField,
  Select,
  Button,
  Banner,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { getOrCreateShop } from "../models/shop.server";
import { createSizeChart } from "../models/chart.server";
import { setAssignments } from "../models/assignment.server";
import { ChartTableEditor } from "../components/ChartTableEditor";
import { DisplayModePicker } from "../components/DisplayModePicker";
import { AssignmentEditor } from "../components/AssignmentEditor";
import type { BaseUnit, DisplayMode, FitNote, Status, SetAssignmentInput } from "../types/chart";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return json({});
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = await getOrCreateShop(session.shop, session.accessToken);

  const formData = await request.formData();
  const name = (formData.get("name") as string)?.trim();
  const status = (formData.get("status") as Status) || "draft";
  const fitNote = (formData.get("fitNote") as FitNote) || "none";
  const displayMode = (formData.get("displayMode") as DisplayMode) || "popup";
  const buttonText = (formData.get("buttonText") as string) || "Size Guide";
  const measurementInstructions = (formData.get("measurementInstructions") as string) || "";
  const tableDataRaw = formData.get("tableData") as string;
  const assignmentsRaw = formData.get("assignments") as string;

  if (!name) {
    return json({ error: "Please enter a chart name." }, { status: 400 });
  }

  let columns = ["Size", "Chest (in)", "Waist (in)"];
  let rows = [
    ["S", "34-36", "28-30"],
    ["M", "38-40", "32-34"],
    ["L", "42-44", "36-38"],
  ];
  let baseUnit: BaseUnit = "inch";

  if (tableDataRaw) {
    try {
      const parsed = JSON.parse(tableDataRaw);
      if (parsed.columns) columns = parsed.columns;
      if (parsed.rows) rows = parsed.rows;
      if (parsed.baseUnit) baseUnit = parsed.baseUnit;
    } catch {
      // fallback to defaults
    }
  }

  const chart = await createSizeChart({
    shopId: shop.id,
    name,
    status,
    fitNote,
    displayMode,
    buttonText,
    measurementInstructions,
    columns,
    rows,
    baseUnit,
  });

  if (assignmentsRaw) {
    try {
      const assignments: SetAssignmentInput[] = JSON.parse(assignmentsRaw);
      if (assignments.length > 0) {
        await setAssignments(chart.id, assignments);
      }
    } catch {
      // fallback
    }
  }

  return redirect(`/app/charts/${chart.id}`);
};

export default function NewChart() {
  const navigate = useNavigate();
  const submit = useSubmit();
  const navigation = useNavigation();
  const actionData = useActionData<typeof action>();

  const isSubmitting = navigation.state === "submitting";

  const [name, setName] = useState("Men's Classic Tops");
  const [status, setStatus] = useState<Status>("active");
  const [fitNote, setFitNote] = useState<FitNote>("true_to_size");
  const [displayMode, setDisplayMode] = useState<DisplayMode>("popup");
  const [buttonText, setButtonText] = useState("Size Guide");
  const [measurementInstructions, setMeasurementInstructions] = useState(
    "Chest: Measure around the fullest part of your chest under your arms.\nWaist: Measure around your natural waistline.",
  );

  const [tableData, setTableData] = useState<{
    columns: string[];
    rows: string[][];
    baseUnit: BaseUnit;
  }>({
    columns: ["Size", "Chest (in)", "Waist (in)", "Length (in)"],
    rows: [
      ["S", "36 - 38", "30 - 32", "28"],
      ["M", "40 - 42", "33 - 35", "29"],
      ["L", "44 - 46", "36 - 38", "30"],
      ["XL", "48 - 50", "39 - 41", "31"],
    ],
    baseUnit: "inch",
  });

  const [assignments, setAssignmentsState] = useState<SetAssignmentInput[]>([
    {
      targetType: "all_products",
      targetValue: "*",
      priority: 0,
    },
  ]);

  const handleSubmit = () => {
    submit(
      {
        name,
        status,
        fitNote,
        displayMode,
        buttonText,
        measurementInstructions,
        tableData: JSON.stringify(tableData),
        assignments: JSON.stringify(assignments),
      },
      { method: "post" },
    );
  };

  return (
    <Page
      title="Create New Size Chart"
      backAction={{
        content: "Size Charts",
        url: "/app/charts",
      }}
      primaryAction={{
        content: "Save Chart",
        loading: isSubmitting,
        onAction: handleSubmit,
      }}
    >
      <BlockStack gap="500">
        {actionData?.error && (
          <Banner tone="critical">{actionData.error}</Banner>
        )}

        <Layout>
          <Layout.Section>
            <BlockStack gap="400">
              <Card>
                <BlockStack gap="400">
                  <TextField
                    label="Size Chart Name"
                    value={name}
                    onChange={setName}
                    placeholder="e.g. T-Shirts & Polos"
                    helpText="Internal name for organizing your size charts"
                    autoComplete="off"
                  />

                  <Select
                    label="Status"
                    options={[
                      { label: "Active (Visible on storefront matching products)", value: "active" },
                      { label: "Draft (Hidden from storefront)", value: "draft" },
                    ]}
                    value={status}
                    onChange={(val) => setStatus(val as Status)}
                  />
                </BlockStack>
              </Card>

              <ChartTableEditor
                columns={tableData.columns}
                rows={tableData.rows}
                baseUnit={tableData.baseUnit}
                onChange={setTableData}
              />

              <AssignmentEditor
                assignments={assignments}
                onChange={setAssignmentsState}
              />
            </BlockStack>
          </Layout.Section>

          <Layout.Section variant="oneThird">
            <BlockStack gap="400">
              <DisplayModePicker
                displayMode={displayMode}
                buttonText={buttonText}
                fitNote={fitNote}
                measurementInstructions={measurementInstructions}
                onDisplayModeChange={setDisplayMode}
                onButtonTextChange={setButtonText}
                onFitNoteChange={setFitNote}
                onMeasurementInstructionsChange={setMeasurementInstructions}
              />

              <Card>
                <BlockStack gap="300">
                  <Button variant="primary" size="large" fullWidth onClick={handleSubmit} loading={isSubmitting}>
                    Save Size Chart
                  </Button>
                  <Button fullWidth url="/app/charts">
                    Cancel
                  </Button>
                </BlockStack>
              </Card>
            </BlockStack>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}
