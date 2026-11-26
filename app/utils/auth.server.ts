import { authenticate } from "../shopify.server";
import prisma from "../db.server";

/**
 * Authenticates an admin request.
 * If this is an embedded request missing shop/host/embedded query parameters
 * (e.g. from App Bridge NavMenu, sub-route navigation, or document loads),
 * it recovers the shop and host from the referer or database and sets
 * shop, host, and embedded=1 directly on the Request before passing to Shopify.
 * This ensures Shopify's internal check never redirects to /auth/login or to
 * the app root in the Shopify admin.
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
        const activeSession = await prisma.session.findFirst({
          where: { isOnline: false },
          orderBy: { id: "desc" },
        });
        if (activeSession) {
          shop = activeSession.shop;
          host = Buffer.from(`${shop}/admin`).toString("base64").replace(/=/g, "");
        } else {
          const lastShop = await prisma.shop.findFirst({
            where: { NOT: { shopDomain: { contains: "test" } } },
            orderBy: { updatedAt: "desc" },
          });
          if (lastShop) {
            shop = lastShop.shopDomain;
            host = Buffer.from(`${shop}/admin`).toString("base64").replace(/=/g, "");
          }
        }
      }
    }

    if (shop) url.searchParams.set("shop", shop);
    if (host) url.searchParams.set("host", host);
    url.searchParams.set("embedded", "1");

    request = new Request(url.toString(), request);
  }

  return authenticate.admin(request);
}
