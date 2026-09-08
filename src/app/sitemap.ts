import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { listingHref } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const [categories, listings] = await Promise.all([
    prisma.category.findMany({ select: { slug: true } }),
    prisma.listing.findMany({
      where: { status: "ACTIVE" },
      orderBy: { publishedAt: "desc" },
      take: 5000,
      select: { id: true, slug: true, updatedAt: true },
    }),
  ]);

  return [
    { url: site, changeFrequency: "daily", priority: 1 },
    { url: `${site}/buscar`, changeFrequency: "daily", priority: 0.8 },
    ...categories.map((category) => ({
      url: `${site}/buscar?categoria=${category.slug}`,
      changeFrequency: "daily" as const,
      priority: 0.7,
    })),
    ...listings.map((listing) => ({
      url: `${site}${listingHref(listing)}`,
      lastModified: listing.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
  ];
}
