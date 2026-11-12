import { useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useActionData, useLoaderData, useNavigate, useNavigation, useSubmit } from "@remix-run/react";
import {
  Page,
  BlockStack,
  Button,
  Banner,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { getOrCreateShop } from "../models/shop.server";
import { getSizeChart } from "../models/chart.server";
import { setAssignments, getAssignments } from "../models/assignment.server";
import { AssignmentEditor } from "../components/AssignmentEditor";
import type { SetAssignmentInput } from "../types/chart";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = await getOrCreateShop(session.shop, session.accessToken);

  const chart = await getSizeChart(params.id as string);
  if (!chart || chart.shopId !== shop.id) {
    throw new Response("Size Chart Not Found", { status: 404 });
  }

  const assignments = await getAssignments(chart.id);

  return json({
    chart,
    assignments: assignments.map((a) => ({
      targetType: a.targetType as any,
      targetValue: a.targetValue,
      priority: a.priority,
    })),
  });
};

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = await getOrCreateShop(session.shop, session.accessToken);
  const chartId = params.id as string;

  const existing = await getSizeChart(chartId);
  if (!existing || existing.shopId !== shop.id) {
    throw new Response("Unauthorized", { status: 403 });
  }

  const formData = await request.formData();
  const assignmentsRaw = formData.get("assignments") as string;

  if (assignmentsRaw) {
    try {
      const assignments: SetAssignmentInput[] = JSON.parse(assignmentsRaw);
      await setAssignments(chartId, assignments);
    } catch {
      return json({ error: "Invalid assignments payload" }, { status: 400 });
    }
  } else {
    await setAssignments(chartId, []);
  }

  return json({ success: true });
};

export default function ChartAssignmentsPage() {
  const { chart, assignments: initialAssignments } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const submit = useSubmit();
  const navigation = useNavigation();
  const actionData = useActionData<{ error?: string; success?: boolean }>();

  const isSubmitting = navigation.state === "submitting";

  const [assignments, setAssignmentsState] = useState<SetAssignmentInput[]>(
    initialAssignments as SetAssignmentInput[],
  );

  const handleSave = () => {
    submit(
      { assignments: JSON.stringify(assignments) },
      { method: "post" },
    );
  };

  return (
    <Page
      title={`Targeting: ${chart.name}`}
      subtitle="Define which products or collections display this size chart"
      backAction={{
        content: "Chart Editor",
        url: `/app/charts/${chart.id}`,
      }}
      primaryAction={{
        content: "Save Targeting Rules",
        loading: isSubmitting,
        onAction: handleSave,
      }}
    >
      <BlockStack gap="400">
        {actionData?.error && (
          <Banner tone="critical">{actionData.error}</Banner>
        )}
        {actionData?.success && (
          <Banner tone="success">Targeting rules updated successfully!</Banner>
        )}

        <AssignmentEditor
          assignments={assignments}
          onChange={setAssignmentsState}
        />

        <div style={{ marginTop: "1rem" }}>
          <Button variant="primary" size="large" onClick={handleSave} loading={isSubmitting}>
            Save Targeting Rules
          </Button>
        </div>
      </BlockStack>
    </Page>
  );
}
