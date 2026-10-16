import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useNavigate } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  BlockStack,
  InlineStack,
  Text,
  Button,
  Banner,
  Badge,
  IndexTable,
  EmptyState,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { getOrCreateShop } from "../models/shop.server";
import { listSizeCharts, duplicateSizeChart, deleteSizeChart } from "../models/chart.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = await getOrCreateShop(session.shop, session.accessToken);
  const charts = await listSizeCharts(shop.id);

  return json({
    shopDomain: session.shop,
    charts,
  });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  await authenticate.admin(request);
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

export default function Dashboard() {
  const { charts, shopDomain } = useLoaderData<typeof loader>();
  const navigate = useNavigate();

  const activeCount = charts.filter((c) => c.status === "active").length;
  const draftCount = charts.filter((c) => c.status === "draft").length;

  return (
    <Page
      title="Size Chart Dashboard"
      primaryAction={{
        content: "Create Size Chart",
        onAction: () => navigate("/app/charts/new"),
      }}
    >
      <BlockStack gap="500">
        <Banner title="Quick Setup Guide" tone="info">
          <BlockStack gap="200">
            <Text as="p" variant="bodyMd">
              1. <strong>Create a Size Chart:</strong> Build your sizing table manually or import from CSV.
            </Text>
            <Text as="p" variant="bodyMd">
              2. <strong>Target Products:</strong> Assign your chart by product, collection, tag, vendor, or store-wide.
            </Text>
            <Text as="p" variant="bodyMd">
              3. <strong>Enable in Theme:</strong> Go to Online Store &gt; Themes &gt; Customize, navigate to a Product template, and add the <strong>Size Chart</strong> App Block.
            </Text>
          </BlockStack>
        </Banner>

        <Layout>
          <Layout.Section variant="oneThird">
            <Card>
              <BlockStack gap="200">
                <Text as="h3" variant="headingSm" tone="subdued">
                  Active Charts
                </Text>
                <Text as="p" variant="heading2xl">
                  {activeCount}
                </Text>
                <Text as="p" variant="bodySm" tone="subdued">
                  Live on matching products
                </Text>
              </BlockStack>
            </Card>
          </Layout.Section>

          <Layout.Section variant="oneThird">
            <Card>
              <BlockStack gap="200">
                <Text as="h3" variant="headingSm" tone="subdued">
                  Draft Charts
                </Text>
                <Text as="p" variant="heading2xl">
                  {draftCount}
                </Text>
                <Text as="p" variant="bodySm" tone="subdued">
                  Hidden from storefront
                </Text>
              </BlockStack>
            </Card>
          </Layout.Section>

          <Layout.Section variant="oneThird">
            <Card>
              <BlockStack gap="200">
                <Text as="h3" variant="headingSm" tone="subdued">
                  Plan & Privacy
                </Text>
                <Text as="p" variant="heading2xl">
                  Free Forever
                </Text>
                <Text as="p" variant="bodySm" tone="subdued">
                  Unlimited charts · No watermark · Zero customer tracking
                </Text>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>

        <Card>
          <BlockStack gap="400">
            <InlineStack align="space-between" blockAlign="center">
              <Text as="h2" variant="headingMd">
                Recent Size Charts
              </Text>
              {charts.length > 0 && (
                <Button variant="plain" onClick={() => navigate("/app/charts")}>
                  {`View all (${charts.length})`}
                </Button>
              )}
            </InlineStack>

            {charts.length === 0 ? (
              <EmptyState
                heading="Create your first size chart"
                action={{
                  content: "Create Size Chart",
                  onAction: () => navigate("/app/charts/new"),
                }}
                image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
              >
                <p>
                  Help your shoppers find the right fit and reduce return rates with responsive, watermark-free size charts.
                </p>
              </EmptyState>
            ) : (
              <IndexTable
                resourceName={{ singular: "size chart", plural: "size charts" }}
                itemCount={Math.min(charts.length, 5)}
                headings={[
                  { title: "Name" },
                  { title: "Status" },
                  { title: "Display Mode" },
                  { title: "Assignments" },
                  { title: "Actions" },
                ]}
                selectable={false}
              >
                {charts.slice(0, 5).map((chart, index) => (
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
                      <InlineStack gap="200">
                        <Button
                          size="micro"
                          onClick={() => navigate(`/app/charts/${chart.id}`)}
                        >
                          Edit
                        </Button>
                        <Button
                          size="micro"
                          onClick={() =>
                            navigate(`/app/charts/${chart.id}/assignments`)
                          }
                        >
                          Targeting
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
