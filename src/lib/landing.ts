import "server-only";
import { unstable_cache } from "next/cache";
import { db } from "./db";
import { productSelect } from "./catalog";
import { mergeLandingContent } from "./settings-defaults";

/** Landing page + its products, cached (tag "landing") and cleared when admin saves. */
export const getLanding = unstable_cache(
  async (slug: string) => {
    const lp = await db.landingPage.findUnique({ where: { slug } });
    if (!lp || !lp.active) return null;
    const ids = [lp.productId, ...lp.extraIds, ...lp.addonIds];
    const products = await db.product.findMany({ where: { id: { in: ids }, active: true }, select: productSelect });
    const byId = new Map(products.map((p) => [p.id, p]));
    const main = byId.get(lp.productId) || null;
    const mains = [lp.productId, ...lp.extraIds].map((id) => byId.get(id)).filter((p): p is NonNullable<typeof p> => !!p && !p.isAddon);
    const addons = lp.addonIds.map((id) => byId.get(id)).filter((p): p is NonNullable<typeof p> => !!p);
    return { ...lp, content: mergeLandingContent(lp.content), main, mains, addons };
  },
  ["landing-page"],
  { tags: ["landing"], revalidate: 3600 },
);

export const getLandingSlugs = unstable_cache(
  async () => (await db.landingPage.findMany({ where: { active: true }, select: { slug: true } })).map((l) => l.slug),
  ["landing-slugs"],
  { tags: ["landing"], revalidate: 3600 },
);
