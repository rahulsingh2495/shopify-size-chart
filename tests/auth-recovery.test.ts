import { describe, it, expect } from "vitest";

process.env.SHOPIFY_APP_URL = "https://example.com";
process.env.SHOPIFY_API_KEY = "test_key";
process.env.SHOPIFY_API_SECRET = "test_secret";
process.env.SCOPES = "read_products";

describe("authenticateAdmin helper", () => {
  it("redirects document request missing params to same URL with shop/host/embedded", async () => {
    const { authenticateAdmin } = await import("../app/utils/auth.server");

    // Calling authenticateAdmin on an embedded document request missing shop/host
    const req = new Request("http://localhost:3000/app/charts", {
      headers: {
        referer: "https://admin.shopify.com/store/pot-app-test-store/apps/size-chart-126/app",
      },
    });

    try {
      await authenticateAdmin(req);
      expect.fail("Should have redirected");
    } catch (e: any) {
      expect(e).toBeInstanceOf(Response);
      expect(e.status).toBe(302);
      const loc = e.headers.get("Location");
      expect(loc).toContain("/app/charts?shop=pot-app-test-store.myshopify.com&host=");
      expect(loc).toContain("&embedded=1");
    }
  });

  it("handles fallback to database shop if referer is missing", async () => {
    const { authenticateAdmin } = await import("../app/utils/auth.server");

    const req = new Request("http://localhost:3000/app/charts/new");

    try {
      await authenticateAdmin(req);
      expect.fail("Should have redirected");
    } catch (e: any) {
      expect(e).toBeInstanceOf(Response);
      expect(e.status).toBe(302);
      const loc = e.headers.get("Location");
      expect(loc).toContain("/app/charts/new?shop=");
      expect(loc).toContain("&host=");
      expect(loc).toContain("&embedded=1");
    }
  });
});
