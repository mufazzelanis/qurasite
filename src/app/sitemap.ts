import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { getSetting } from "@/lib/settings";
import { abs } from "@/lib/seo";

export const revalidate = 3600;

/** /sitemap.xml — every public page, refreshed hourly */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const seo = await getSetting("seo");
  if (!seo.indexable) return [];
  const [products, categories, landings, guides] = await Promise.all([
    db.product.findMany({ where: { active: true }, select: { slug: true, updatedAt: true, image: true, gallery: true } }),
    db.category.findMany({ where: { active: true }, select: { slug: true } }),
    db.landingPage.findMany({ where: { active: true }, select: { slug: true, updatedAt: true } }),
    db.page.findMany({ where: { active: true, noindex: false }, select: { slug: true, updatedAt: true } }),
  ]).catch(() => [[], [], [], []] as const);

  const now = new Date();
  return [
    { url: abs("/"), lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: abs("/shop"), lastModified: now, changeFrequency: "daily", priority: 0.9 },
    ...landings.map((l) => ({ url: abs(`/${l.slug}`), lastModified: l.updatedAt, changeFrequency: "weekly" as const, priority: 0.9 })),
    ...products.map((p) => ({ url: abs(`/p/${p.slug}`), lastModified: p.updatedAt, changeFrequency: "weekly" as const, priority: 0.8, images: [p.image, ...p.gallery].map(abs) })),
    ...categories.map((c) => ({ url: abs(`/category/${c.slug}`), lastModified: now, changeFrequency: "weekly" as const, priority: 0.7 })),
    ...guides.map((g) => ({ url: abs(`/${g.slug}`), lastModified: g.updatedAt, changeFrequency: "monthly" as const, priority: 0.5 })),
    { url: abs("/track"), changeFrequency: "yearly", priority: 0.3 },
  ];
}
