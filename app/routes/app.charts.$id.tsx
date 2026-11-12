import { useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useActionData, useLoaderData, useNavigate, useNavigation, useSubmit } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  BlockStack,
  TextField,
  Select,
  Button,
  Banner,
  InlineStack,
  Badge,
  Text,
} from "@shopify/polaris";
import { authenticateAdmin } from "../utils/auth.server";
import { getOrCreateShop } from "../models/shop.server";
import { getSizeChart, updateSizeChart, deleteSizeChart, duplicateSizeChart } from "../models/chart.server";
import { setAssignments } from "../models/assignment.server";
import { ChartTableEditor } from "../components/ChartTableEditor";
import { DisplayModePicker } from "../components/DisplayModePicker";
import { AssignmentEditor } from "../components/AssignmentEditor";
import type { BaseUnit, DisplayMode, FitNote, Status, SetAssignmentInput } from "../types/chart";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { session } = await authenticateAdmin(request);
  const shop = await getOrCreateShop(session.shop, session.accessToken);

  const chart = await getSizeChart(params.id as string);
  if (!chart || chart.shopId !== shop.id) {
    throw new Response("Size Chart Not Found", { status: 404 });
  }

  return json({ chart });
};

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const { session, redirect } = await authenticateAdmin(request);
  const shop = await getOrCreateShop(session.shop, session.accessToken);
  const chartId = params.id as string;

  const existing = await getSizeChart(chartId);
  if (!existing || existing.shopId !== shop.id) {
    throw new Response("Unauthorized", { status: 403 });
  }

  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "delete") {
    await deleteSizeChart(chartId);
    return redirect("/app/charts");
  }

  if (intent === "duplicate") {
    const dup = await duplicateSizeChart(chartId);
    return redirect(`/app/charts/${dup.id}`);
  }

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

  let columns = existing.table?.columns || [];
  let rows = existing.table?.rows || [];
  let baseUnit: BaseUnit = (existing.table?.baseUnit as BaseUnit) || "cm";

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

  await updateSizeChart(chartId, {
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
      await setAssignments(chartId, assignments);
    } catch {
      // fallback
    }
  }

  return json({ success: true });
};

export default function EditChart() {
  const { chart } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const submit = useSubmit();
  const navigation = useNavigation();
  const actionData = useActionData<{ error?: string; success?: boolean }>();

  const isSubmitting = navigation.state === "submitting";

  const [name, setName] = useState(chart.name);
  const [status, setStatus] = useState<Status>(chart.status as Status);
  const [fitNote, setFitNote] = useState<FitNote>(chart.fitNote as FitNote);
  const [displayMode, setDisplayMode] = useState<DisplayMode>(chart.displayMode as DisplayMode);
  const [buttonText, setButtonText] = useState(chart.buttonText);
  const [measurementInstructions, setMeasurementInstructions] = useState(
    chart.measurementInstructions || "",
  );

  const [tableData, setTableData] = useState<{
    columns: string[];
    rows: string[][];
    baseUnit: BaseUnit;
  }>({
    columns: chart.table?.columns || ["Size"],
    rows: chart.table?.rows || [["S"]],
    baseUnit: (chart.table?.baseUnit as BaseUnit) || "cm",
  });

  const [assignments, setAssignmentsState] = useState<SetAssignmentInput[]>(
    chart.assignments?.map((a) => ({
      targetType: a.targetType as any,
      targetValue: a.targetValue,
      priority: a.priority,
    })) || [],
  );

  const handleSave = () => {
    submit(
      {
        intent: "save",
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

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this size chart?")) {
      submit({ intent: "delete" }, { method: "post" });
    }
  };

  const handleDuplicate = () => {
    submit({ intent: "duplicate" }, { method: "post" });
  };

  return (
    <Page
      title={chart.name}
      subtitle={`Last updated ${new Date(chart.updatedAt).toLocaleDateString()}`}
      backAction={{
        content: "Size Charts",
        onAction: () => navigate("/app/charts"),
      }}
      primaryAction={{
        content: "Save Changes",
        loading: isSubmitting,
        onAction: handleSave,
      }}
      secondaryActions={[
        {
          content: "Targeting Rules",
          onAction: () => navigate(`/app/charts/${chart.id}/assignments`),
        },
        {
          content: "Duplicate",
          onAction: handleDuplicate,
        },
        {
          content: "Delete Chart",
          destructive: true,
          onAction: handleDelete,
        },
      ]}
    >
      <BlockStack gap="500">
        {actionData?.error && (
          <Banner tone="critical">{actionData.error}</Banner>
        )}
        {actionData?.success && (
          <Banner tone="success">Size chart updated successfully!</Banner>
        )}

        <Layout>
          <Layout.Section>
            <BlockStack gap="400">
              <Card>
                <BlockStack gap="400">
                  <InlineStack align="space-between" blockAlign="center">
                    <Text as="h2" variant="headingMd">
                      Chart Details
                    </Text>
                    <Badge tone={status === "active" ? "success" : "info"}>
                      {status.toUpperCase()}
                    </Badge>
                  </InlineStack>

                  <TextField
                    label="Size Chart Name"
                    value={name}
                    onChange={setName}
                    autoComplete="off"
                  />

                  <Select
                    label="Status"
                    options={[
                      { label: "Active (Visible on matching products)", value: "active" },
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
                  <Button variant="primary" size="large" fullWidth onClick={handleSave} loading={isSubmitting}>
                    Save Changes
                  </Button>
                  <Button fullWidth url="/app/charts">
                    Back to Charts
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
