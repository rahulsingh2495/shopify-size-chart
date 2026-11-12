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
  Text,
} from "@shopify/polaris";
import { authenticateAdmin } from "../utils/auth.server";
import { getOrCreateShop, getShopSettings, upsertShopSettings } from "../models/shop.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticateAdmin(request);
  const shop = await getOrCreateShop(session.shop, session.accessToken);
  const settings = await getShopSettings(shop.id);

  return json({
    shopDomain: session.shop,
    settings: settings || {
      primaryColor: "#000000",
      textColor: "#202223",
      borderStyle: "rounded",
      customCss: "",
    },
  });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticateAdmin(request);
  const shop = await getOrCreateShop(session.shop, session.accessToken);

  const formData = await request.formData();
  const primaryColor = (formData.get("primaryColor") as string) || "#000000";
  const textColor = (formData.get("textColor") as string) || "#202223";
  const borderStyle = (formData.get("borderStyle") as string) || "rounded";
  const customCss = (formData.get("customCss") as string) || "";

  await upsertShopSettings(shop.id, {
    primaryColor,
    textColor,
    borderStyle,
    customCss,
  });

  return json({ success: true });
};

export default function SettingsPage() {
  const { settings, shopDomain } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const submit = useSubmit();
  const navigation = useNavigation();
  const actionData = useActionData<typeof action>();

  const isSubmitting = navigation.state === "submitting";

  const [primaryColor, setPrimaryColor] = useState(settings.primaryColor || "#000000");
  const [textColor, setTextColor] = useState(settings.textColor || "#202223");
  const [borderStyle, setBorderStyle] = useState(settings.borderStyle || "rounded");
  const [customCss, setCustomCss] = useState(settings.customCss || "");

  const handleSave = () => {
    submit(
      { primaryColor, textColor, borderStyle, customCss },
      { method: "post" },
    );
  };

  return (
    <Page
      title="Storefront Display Settings"
      subtitle="Customize global theme colors and styles for your size charts"
      backAction={{
        content: "Dashboard",
        onAction: () => navigate("/app"),
      }}
      primaryAction={{
        content: "Save Settings",
        loading: isSubmitting,
        onAction: handleSave,
      }}
    >
      <BlockStack gap="500">
        {actionData?.success && (
          <Banner tone="success">Settings saved successfully!</Banner>
        )}

        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  Styling Defaults
                </Text>

                <TextField
                  label="Primary Accent Color"
                  value={primaryColor}
                  onChange={setPrimaryColor}
                  helpText="Used for table header highlights, primary buttons, and tabs (e.g. #111827 or #008060)"
                  autoComplete="off"
                />

                <TextField
                  label="Text Color"
                  value={textColor}
                  onChange={setTextColor}
                  helpText="Default text color inside charts (e.g. #202223)"
                  autoComplete="off"
                />

                <Select
                  label="Corner Border Style"
                  options={[
                    { label: "Rounded (Modern 8px radius)", value: "rounded" },
                    { label: "Sharp (Crisp rectangular edges)", value: "sharp" },
                    { label: "Pill (Extra soft 16px radius)", value: "pill" },
                  ]}
                  value={borderStyle}
                  onChange={setBorderStyle}
                />

                <TextField
                  label="Custom CSS (Optional)"
                  multiline={4}
                  value={customCss}
                  onChange={setCustomCss}
                  placeholder=".size-chart-table { font-size: 14px; }"
                  helpText="Optional CSS snippet injected into your storefront size chart"
                  autoComplete="off"
                />
              </BlockStack>
            </Card>
          </Layout.Section>

          <Layout.Section variant="oneThird">
            <Card>
              <BlockStack gap="300">
                <Text as="h2" variant="headingMd">
                  Theme App Extension
                </Text>
                <Text as="p" variant="bodySm" tone="subdued">
                  Our app never modifies your theme code directly. You can enable or reposition the size chart block anytime:
                </Text>
                <ol style={{ paddingLeft: "1.2rem", fontSize: "0.875rem", lineHeight: "1.5" }}>
                  <li>Go to <strong>Online Store &gt; Themes</strong>.</li>
                  <li>Click <strong>Customize</strong>.</li>
                  <li>Select the <strong>Default Product</strong> template.</li>
                  <li>Click <strong>Add Block</strong> and choose <strong>Size Chart</strong>.</li>
                </ol>
                <Button variant="primary" fullWidth onClick={handleSave} loading={isSubmitting}>
                  Save Settings
                </Button>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}
