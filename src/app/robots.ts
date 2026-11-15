import type { MetadataRoute } from "next";
import { getSetting } from "@/lib/settings";
import { abs } from "@/lib/seo";

export const revalidate = 3600;

/** /robots.txt — private areas are never crawled; the whole site is blocked while "indexable" is off */
export default async function robots(): Promise<MetadataRoute.Robots> {
  const seo = await getSetting("seo");
  if (!seo.indexable) return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api", "/checkout", "/order/"] },
    sitemap: abs("/sitemap.xml"),
    host: abs("/"),
  };
}
