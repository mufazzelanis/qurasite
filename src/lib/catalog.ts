import "server-only";
import { unstable_cache } from "next/cache";
import { db } from "./db";

export const productSelect = {
  id: true,
  name: true,
  nameBn: true,
  slug: true,
  tagline: true,
  description: true,
  price: true,
  comparePrice: true,
  image: true,
  gallery: true,
  weight: true,
  stock: true,
  featured: true,
  isAddon: true,
  comboPrice: true,
  addonNote: true,
  categoryId: true,
  seoTitle: true,
  seoDesc: true,
  imageAlt: true,
  updatedAt: true,
} as const;

/** Cached catalog reads — cleared by revalidateTag("catalog") when admin edits products. */
export const getActiveProducts = unstable_cache(
  async () => {
    try {
      return await db.product.findMany({
        where: { active: true },
        orderBy: [{ featured: "desc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
        select: productSelect,
      });
    } catch {
      return [];
    }
  },
  ["active-products"],
  { tags: ["catalog"], revalidate: 3600 },
);

export const getCategories = unstable_cache(
  async () => {
    try {
      return await db.category.findMany({ where: { active: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });
    } catch {
      return [];
    }
  },
  ["categories"],
  { tags: ["catalog"], revalidate: 3600 },
);

export const getActiveReviews = unstable_cache(
  async () => {
    try {
      return await db.review.findMany({
        where: { active: true },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: { id: true, name: true, location: true, rating: true, text: true },
      });
    } catch {
      return [];
    }
  },
  ["reviews"],
  { tags: ["catalog"], revalidate: 3600 },
);

export const getProductBySlug = unstable_cache(
  async (slug: string) => {
    try {
      return await db.product.findFirst({ where: { slug, active: true }, select: { ...productSelect, category: { select: { name: true, nameBn: true, slug: true } } } });
    } catch {
      return null;
    }
  },
  ["product-by-slug"],
  { tags: ["catalog"], revalidate: 3600 },
);
