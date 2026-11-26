import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { AppProvider as PolarisAppProvider } from "@shopify/polaris";
import enTranslations from "@shopify/polaris/locales/en.json";
import { describe, expect, it } from "vitest";

process.env.SHOPIFY_APP_URL = "https://example.com";
process.env.SHOPIFY_API_KEY = "test_key";
process.env.SHOPIFY_API_SECRET = "test_secret";
process.env.SCOPES = "read_products";

async function waitForRouter(router: ReturnType<typeof createMemoryRouter>) {
  if (router.state.initialized) return;

  await new Promise<void>((resolve) => {
    const unsubscribe = router.subscribe((state) => {
      if (state.initialized) {
        unsubscribe();
        resolve();
      }
    });
  });
}

describe("embedded admin navigation", () => {
  it("renders create-chart actions as real links with Shopify context", async () => {
    const { default: ChartsList } = await import(
      "../app/routes/app.charts._index"
    );
    const search =
      "?shop=pot-app-test-store.myshopify.com&host=test-host&embedded=1";
    const destination = `/app/charts/new${search}`;

    const router = createMemoryRouter(
      [
        {
          path: "/app/charts",
          loader: () => ({ charts: [] }),
          element: (
            <PolarisAppProvider i18n={enTranslations}>
              <ChartsList />
            </PolarisAppProvider>
          ),
        },
      ],
      { initialEntries: [`/app/charts${search}`] },
    );

    await waitForRouter(router);
    const html = renderToStaticMarkup(<RouterProvider router={router} />);
    const encodedDestination = destination.replaceAll("&", "&amp;");

    expect(
      html.split(`href="${encodedDestination}"`).length - 1,
    ).toBe(2);
    expect(html).toContain(
      '<ui-title-bar title="Size Charts"></ui-title-bar>',
    );
  });

  it("renders dashboard create-chart actions as real links with Shopify context", async () => {
    const { default: Dashboard } = await import("../app/routes/app._index");
    const search =
      "?shop=pot-app-test-store.myshopify.com&host=test-host&embedded=1";
    const destination = `/app/charts/new${search}`;

    const router = createMemoryRouter(
      [
        {
          path: "/app",
          loader: () => ({
            shopDomain: "pot-app-test-store.myshopify.com",
            charts: [],
          }),
          element: (
            <PolarisAppProvider i18n={enTranslations}>
              <Dashboard />
            </PolarisAppProvider>
          ),
        },
      ],
      { initialEntries: [`/app${search}`] },
    );

    await waitForRouter(router);
    const html = renderToStaticMarkup(<RouterProvider router={router} />);
    const encodedDestination = destination.replaceAll("&", "&amp;");

    expect(
      html.split(`href="${encodedDestination}"`).length - 1,
    ).toBe(2);
    expect(html).toContain(
      '<ui-title-bar title="Size Chart Dashboard"></ui-title-bar>',
    );
  });

  it("renders NewChart form and elements properly", async () => {
    const { default: NewChart } = await import("../app/routes/app.charts.new");
    const search =
      "?shop=pot-app-test-store.myshopify.com&host=test-host&embedded=1";

    const router = createMemoryRouter(
      [
        {
          path: "/app/charts/new",
          loader: () => null,
          element: (
            <PolarisAppProvider i18n={enTranslations}>
              <NewChart />
            </PolarisAppProvider>
          ),
        },
      ],
      { initialEntries: [`/app/charts/new${search}`] },
    );

    await waitForRouter(router);
    const html = renderToStaticMarkup(<RouterProvider router={router} />);
    expect(html).toContain("Create New Size Chart");
    expect(html).toContain("Measurements");
    expect(html).toContain("+ Add row");
    expect(html).toContain("+ Add column");
  });

  it("filters charts by word boundaries so searching 'men' excludes 'Women\\'s bottoms'", async () => {
    const { matchChartSearch } = await import("../app/routes/app.charts._index");

    const mensTop = {
      name: "men's top",
      status: "active",
      displayMode: "popup",
      fitNote: "true_to_size",
    };
    const womensBottoms = {
      name: "Women's bottoms",
      status: "active",
      displayMode: "popup",
      fitNote: "true_to_size",
    };

    // "men" must match "men's top" and NOT "Women's bottoms"
    expect(matchChartSearch(mensTop, "men")).toBe(true);
    expect(matchChartSearch(womensBottoms, "men")).toBe(false);

    // "women" must match "Women's bottoms" and NOT "men's top"
    expect(matchChartSearch(womensBottoms, "women")).toBe(true);
    expect(matchChartSearch(mensTop, "women")).toBe(false);

    // "top" matches mensTop only
    expect(matchChartSearch(mensTop, "top")).toBe(true);
    expect(matchChartSearch(womensBottoms, "top")).toBe(false);

    // "bottom" matches womensBottoms only
    expect(matchChartSearch(womensBottoms, "bottom")).toBe(true);
    expect(matchChartSearch(mensTop, "bottom")).toBe(false);

    // Empty search matches both
    expect(matchChartSearch(mensTop, "")).toBe(true);
    expect(matchChartSearch(womensBottoms, "")).toBe(true);
  });
});
