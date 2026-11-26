import { useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useActionData, useLocation, useNavigate, useNavigation, useSubmit } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  BlockStack,
  TextField,
  Select,
  Banner,
  Text,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticateAdmin } from "../utils/auth.server";
import { getOrCreateShop } from "../models/shop.server";
import { createSizeChart } from "../models/chart.server";
import { setAssignments } from "../models/assignment.server";
import { ChartTableEditor } from "../components/ChartTableEditor";
import { DisplayModePicker } from "../components/DisplayModePicker";
import { AssignmentEditor } from "../components/AssignmentEditor";
import { LivePreviewModal } from "../components/LivePreviewModal";
import type { BaseUnit, DisplayMode, FitNote, Status, SetAssignmentInput } from "../types/chart";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticateAdmin(request);
  return null;
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session, redirect } = await authenticateAdmin(request);
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

  let columns = ["Size", "Waist (in)", "Hip (in)", "Inseam (in)"];
  let rows = [
    ["28", "28 - 29", "35 - 36", "30"],
    ["30", "30 - 31", "37 - 38", "30"],
    ["32", "32 - 33", "39 - 40", "32"],
    ["34", "34 - 35", "41 - 42", "32"],
    ["36", "36 - 37", "43 - 44", "32"],
  ];
  let baseUnit: BaseUnit = "inch";

  if (tableDataRaw) {
    try {
      const parsed = JSON.parse(tableDataRaw);
      if (parsed.columns) columns = parsed.columns;
      if (parsed.rows) rows = parsed.rows;
      if (parsed.baseUnit) baseUnit = parsed.baseUnit;
    } catch {
      // fallback
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
  const location = useLocation();
  const submit = useSubmit();
  const navigation = useNavigation();
  const actionData = useActionData<typeof action>();

  const isSubmitting = navigation.state === "submitting";

  const [name, setName] = useState("Women's bottoms");
  const [status, setStatus] = useState<Status>("active");
  const [fitNote, setFitNote] = useState<FitNote>("true_to_size");
  const [displayMode, setDisplayMode] = useState<DisplayMode>("popup");
  const [buttonText, setButtonText] = useState("Size Guide");
  const [measurementInstructions, setMeasurementInstructions] = useState(
    "Waist: Measure around your natural waistline.\nHip: Measure around the fullest part of your hips.\nInseam: Measure from the crotch to the ankle.",
  );

  const [tableData, setTableData] = useState<{
    columns: string[];
    rows: string[][];
    baseUnit: BaseUnit;
  }>({
    columns: ["Size", "Waist (in)", "Hip (in)", "Inseam (in)"],
    rows: [
      ["28", "28 - 29", "35 - 36", "30"],
      ["30", "30 - 31", "37 - 38", "30"],
      ["32", "32 - 33", "39 - 40", "32"],
      ["34", "34 - 35", "41 - 42", "32"],
      ["36", "36 - 37", "43 - 44", "32"],
    ],
    baseUnit: "inch",
  });

  const [assignments, setAssignmentsState] = useState<SetAssignmentInput[]>([
    {
      targetType: "collection",
      targetValue: "*",
      priority: 0,
    },
  ]);

  const [showPreview, setShowPreview] = useState(false);

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
      title="Create new size chart"
      backAction={{
        content: "Size charts",
        url: `/app/charts${location.search}`,
      }}
      primaryAction={{
        content: "Save chart",
        loading: isSubmitting,
        onAction: handleSubmit,
      }}
      secondaryActions={[
        {
          content: "👁️ Live preview",
          onAction: () => setShowPreview(true),
        },
      ]}
    >
      <TitleBar title="Create New Size Chart">
        <button onClick={() => setShowPreview(true)}>Live preview</button>
        <button variant="primary" onClick={handleSubmit}>
          Save chart
        </button>
      </TitleBar>

      <BlockStack gap="500">
        {actionData?.error && (
          <Banner tone="critical">{actionData.error}</Banner>
        )}

        <Layout>
          {/* Left Column (2/3) */}
          <Layout.Section>
            <BlockStack gap="400">
              {/* Card 1: Chart details */}
              <Card>
                <BlockStack gap="400">
                  <Text as="h2" variant="headingMd">
                    Chart details
                  </Text>
                  <TextField
                    label="Size chart name"
                    value={name}
                    onChange={setName}
                    placeholder="e.g. Women's bottoms"
                    helpText="Internal name for organizing your size charts"
                    autoComplete="off"
                  />

                  <Select
                    label="Status"
                    options={[
                      { label: "Active (Visible on matching storefront products)", value: "active" },
                      { label: "Draft (Hidden from storefront)", value: "draft" },
                    ]}
                    value={status}
                    onChange={(val) => setStatus(val as Status)}
                  />
                </BlockStack>
              </Card>

              {/* Card 2: Measurements */}
              <ChartTableEditor
                columns={tableData.columns}
                rows={tableData.rows}
                baseUnit={tableData.baseUnit}
                onChange={setTableData}
              />

              {/* Card 3: Product targeting */}
              <AssignmentEditor
                assignments={assignments}
                onChange={setAssignmentsState}
              />
            </BlockStack>
          </Layout.Section>

          {/* Right Column (1/3) */}
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
            </BlockStack>
          </Layout.Section>
        </Layout>
      </BlockStack>

      {/* Live Preview Modal */}
      <LivePreviewModal
        open={showPreview}
        onClose={() => setShowPreview(false)}
        chartName={name}
        buttonText={buttonText}
        fitNote={fitNote}
        measurementInstructions={measurementInstructions}
        columns={tableData.columns}
        rows={tableData.rows}
        baseUnit={tableData.baseUnit}
      />
    </Page>
  );
}
