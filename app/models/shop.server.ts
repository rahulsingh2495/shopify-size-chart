import prisma from "../db.server";

export async function getOrCreateShop(shopDomain: string, accessToken?: string) {
  return prisma.shop.upsert({
    where: { shopDomain },
    create: {
      shopDomain,
      accessToken: accessToken || null,
      plan: "free",
    },
    update: {
      ...(accessToken ? { accessToken } : {}),
    },
  });
}

export async function getShopSettings(shopId: string) {
  return prisma.displaySettings.findFirst({
    where: { shopId, sizeChartId: null },
  });
}

export async function upsertShopSettings(
  shopId: string,
  data: {
    primaryColor?: string | null;
    textColor?: string | null;
    borderStyle?: string | null;
    customCss?: string | null;
  },
) {
  const existing = await getShopSettings(shopId);
  if (existing) {
    return prisma.displaySettings.update({
      where: { id: existing.id },
      data,
    });
  } else {
    return prisma.displaySettings.create({
      data: {
        shopId,
        sizeChartId: null,
        ...data,
      },
    });
  }
}
