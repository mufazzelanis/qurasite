import "server-only";
import { db } from "./db";
import { getSetting } from "./settings";
import type { PixelMode, TrackingSettings } from "./settings-defaults";

/**
 * One rule for browser pixel + Conversions API:
 *   source "shop" (or empty)  → main-site pixels (library pixels with "Main site" ticked)
 *   source "page:<slug>"      → that content page's choice
 *   source "<slug>"           → that landing page's choice
 * A page's choice: site = same as main site · own = its own list · none = no Facebook pixel.
 */
export const pageSource = (slug: string) => `page:${slug}`;

/** Pixel library for admin pickers — never includes tokens */
export async function pixelLibrary() {
  const t = await getSetting("tracking");
  return t.pixels.filter((p) => p.id).map((p) => ({ id: p.id, label: p.label, site: p.site !== false }));
}

export const sitePixelIds =(t: TrackingSettings) => t.pixels.filter((p) => p.id && p.site !== false).map((p) => p.id);

function choose(cfg: { pixelMode: string; pixelIds: string[] } | null, site: string[]) {
  if (!cfg) return site;
  const mode = cfg.pixelMode as PixelMode;
  if (mode === "none") return [];
  if (mode === "own") return [...new Set(cfg.pixelIds.map((x) => x.trim()).filter((x) => /^\d{5,20}$/.test(x)))];
  return site;
}

export async function pixelIdsFor(source?: string | null, t?: TrackingSettings): Promise<string[]> {
  const tracking = t ?? (await getSetting("tracking"));
  const site = sitePixelIds(tracking);
  if (!source || source === "shop") return site;
  try {
    if (source.startsWith("page:")) {
      return choose(await db.page.findUnique({ where: { slug: source.slice(5) }, select: { pixelMode: true, pixelIds: true } }), site);
    }
    return choose(await db.landingPage.findUnique({ where: { slug: source }, select: { pixelMode: true, pixelIds: true } }), site);
  } catch {
    return site;
  }
}
