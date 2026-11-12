import { redirect } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

/**
 * Authenticates an admin request.
 * If this is an embedded document request missing shop/host query parameters
 * (e.g. from App Bridge NavMenu or direct sub-route navigation),
 * it recovers the shop and host from the referer or database and redirects
 * to the same URL with shop, host, and embedded=1 parameters to trigger the
 * App Bridge token exchange bounce page instead of redirecting to /auth/login.
 */
export async function authenticateAdmin(request: Request) {
  const url = new URL(request.url);
  const sessionToken = request.headers.get("authorization");

  if (!sessionToken) {
    let shop = url.searchParams.get("shop");
    let host = url.searchParams.get("host");

    if (!shop || !host) {
      const referer = request.headers.get("referer");
      if (referer) {
        const match = referer.match(/admin\.shopify\.com\/store\/([^/?#]+)/);
        if (match) {
          shop = `${match[1]}.myshopify.com`;
          host = Buffer.from(`${shop}/admin`).toString("base64").replace(/=/g, "");
        }
      }

      if (!shop) {
        const lastShop = await prisma.shop.findFirst({
          where: { NOT: { shopDomain: { contains: "admin-test" } } },
          orderBy: { updatedAt: "desc" },
        });
        if (lastShop) {
          shop = lastShop.shopDomain;
          host = Buffer.from(`${shop}/admin`).toString("base64").replace(/=/g, "");
        }
      }

      if (shop && host) {
        url.searchParams.set("shop", shop);
        url.searchParams.set("host", host);
        url.searchParams.set("embedded", "1");
        throw redirect(url.pathname + url.search);
      }
    }
  }

  return authenticate.admin(request);
}
