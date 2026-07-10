import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://gecele.az";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${BASE}/`, changeFrequency: "daily", priority: 1 },
    { url: `${BASE}/ev-sahibi`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE}/giris`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE}/qaydalar`, changeFrequency: "yearly", priority: 0.4 },
    { url: `${BASE}/mexfilik`, changeFrequency: "yearly", priority: 0.4 },
    { url: `${BASE}/leghvetme`, changeFrequency: "yearly", priority: 0.4 },
    { url: `${BASE}/elaqe`, changeFrequency: "yearly", priority: 0.4 },
  ];

  try {
    const listings = await prisma.listing.findMany({
      where: { status: "approved" },
      select: { slug: true },
    });
    const listingRoutes: MetadataRoute.Sitemap = listings.map((l) => ({
      url: `${BASE}/ev/${l.slug}`,
      changeFrequency: "weekly",
      priority: 0.8,
    }));
    return [...staticRoutes, ...listingRoutes];
  } catch {
    // Verilənlər bazası əlçatan deyilsə (məs. build vaxtı) yalnız statik marşrutlar
    return staticRoutes;
  }
}
