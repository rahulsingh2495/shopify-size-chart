import { useState } from "react";
import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useNavigate, useSubmit } from "@remix-run/react";
import {
  Page,
  Card,
  BlockStack,
  InlineStack,
  Text,
  Button,
  Badge,
  IndexTable,
  TextField,
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

  return json({ charts });
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

export default function ChartsList() {
  const { charts } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const submit = useSubmit();
  const [search, setSearch] = useState("");

  const filteredCharts = charts.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()),
  );

  const handleDuplicate = (chartId: string) => {
    submit({ intent: "duplicate", chartId }, { method: "post" });
  };

  const handleDelete = (chartId: string) => {
    if (confirm("Are you sure you want to delete this size chart?")) {
      submit({ intent: "delete", chartId }, { method: "post" });
    }
  };

  return (
    <Page
      title="Size Charts"
      primaryAction={{
        content: "Create Size Chart",
        onAction: () => navigate("/app/charts/new"),
      }}
      backAction={{
        content: "Dashboard",
        onAction: () => navigate("/app"),
      }}
    >
      <TitleBar title="Size Charts">
        <button variant="primary" onClick={() => navigate("/app/charts/new")}>
          Create Size Chart
        </button>
      </TitleBar>
      <BlockStack gap="400">
        <Card>
          <BlockStack gap="400">
            <TextField
              label="Search size charts"
              labelHidden
              placeholder="Search by chart name..."
              value={search}
              onChange={setSearch}
              clearButton
              onClearButtonClick={() => setSearch("")}
              autoComplete="off"
            />

            {filteredCharts.length === 0 ? (
              <EmptyState
                heading={search ? "No size charts match your search" : "No size charts yet"}
                action={
                  search
                    ? undefined
                    : {
                        content: "Create Size Chart",
                        onAction: () => navigate("/app/charts/new"),
                      }
                }
                image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
              >
                <p>
                  {search
                    ? "Try clearing your search term to see all size charts."
                    : "Create unlimited size charts and assign them to your products or collections."}
                </p>
              </EmptyState>
            ) : (
              <IndexTable
                resourceName={{ singular: "size chart", plural: "size charts" }}
                itemCount={filteredCharts.length}
                headings={[
                  { title: "Name" },
                  { title: "Status" },
                  { title: "Fit Guidance" },
                  { title: "Display Mode" },
                  { title: "Targeting" },
                  { title: "Actions" },
                ]}
                selectable={false}
              >
                {filteredCharts.map((chart, index) => (
                  <IndexTable.Row id={chart.id} key={chart.id} position={index}>
                    <IndexTable.Cell>
                      <Button
                        variant="plain"
                        onClick={() => navigate(`/app/charts/${chart.id}`)}
                      >
                        {chart.name}
                      </Button>
                    </IndexTable.Cell>
                    <IndexTable.Cell>
                      <Badge tone={chart.status === "active" ? "success" : "info"}>
                        {chart.status.toUpperCase()}
                      </Badge>
                    </IndexTable.Cell>
                    <IndexTable.Cell>
                      {chart.fitNote !== "none" ? chart.fitNote.replace(/_/g, " ") : "None"}
                    </IndexTable.Cell>
                    <IndexTable.Cell>{chart.displayMode}</IndexTable.Cell>
                    <IndexTable.Cell>
                      {chart.assignmentCount > 0 ? (
                        <Badge tone="attention">{`${chart.assignmentCount} rule(s)`}</Badge>
                      ) : (
                        <Text as="span" tone="subdued">
                          Not assigned
                        </Text>
                      )}
                    </IndexTable.Cell>
                    <IndexTable.Cell>
                      <InlineStack gap="100">
                        <Button
                          size="micro"
                          onClick={() => navigate(`/app/charts/${chart.id}`)}
                        >
                          Edit
                        </Button>
                        <Button
                          size="micro"
                          onClick={() => navigate(`/app/charts/${chart.id}/assignments`)}
                        >
                          Targeting
                        </Button>
                        <Button
                          size="micro"
                          onClick={() => handleDuplicate(chart.id)}
                        >
                          Duplicate
                        </Button>
                        <Button
                          size="micro"
                          tone="critical"
                          variant="plain"
                          onClick={() => handleDelete(chart.id)}
                        >
                          Delete
                        </Button>
                      </InlineStack>
                    </IndexTable.Cell>
                  </IndexTable.Row>
                ))}
              </IndexTable>
            )}
          </BlockStack>
        </Card>
      </BlockStack>
    </Page>
  );
}
