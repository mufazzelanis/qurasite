import "server-only";
import { unstable_cache } from "next/cache";
import { db } from "./db";
import { parseBlocks } from "./page-blocks";

/** Cached reads — cleared by revalidateTag("pages") when a page is saved */
export const getPageBySlug = unstable_cache(
  async (slug: string) => {
    try {
      const p = await db.page.findFirst({ where: { slug, active: true } });
      return p ? { ...p, blocks: parseBlocks(p.blocks) } : null;
    } catch {
      return null;
    }
  },
  ["page-by-slug"],
  { tags: ["pages"], revalidate: 3600 },
);

/** Pages linked in the header / footer */
export const getMenuPages = unstable_cache(
  async () => {
    try {
      return await db.page.findMany({ where: { active: true, menu: { in: ["header", "footer"] } }, orderBy: [{ sortOrder: "asc" }, { title: "asc" }], select: { slug: true, title: true, menu: true } });
    } catch {
      return [];
    }
  },
  ["menu-pages"],
  { tags: ["pages"], revalidate: 3600 },
);

export const getPageSlugs = unstable_cache(
  async () => {
    try {
      return (await db.page.findMany({ where: { active: true }, select: { slug: true } })).map((p) => p.slug);
    } catch {
      return [];
    }
  },
  ["page-slugs"],
  { tags: ["pages"], revalidate: 3600 },
);
