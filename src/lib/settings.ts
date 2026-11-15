import "server-only";
import { unstable_cache, revalidateTag } from "next/cache";
import { db } from "./db";
import { DEFAULT_SETTINGS, SERVER_ONLY_EVENTS, type AllSettings } from "./settings-defaults";

export * from "./settings-defaults";

type Key = keyof AllSettings;

function merge<K extends Key>(key: K, stored: unknown): AllSettings[K] {
  const d = DEFAULT_SETTINGS[key] as Record<string, unknown>;
  const s = (stored && typeof stored === "object" ? stored : {}) as Record<string, unknown>;
  const out: Record<string, unknown> = { ...d, ...s };
  // one level deep merge for nested objects (e.g. sms.templates, payments.bkash)
  for (const k of Object.keys(d)) {
    if (d[k] && typeof d[k] === "object" && !Array.isArray(d[k])) out[k] = { ...(d[k] as object), ...((s[k] as object) || {}) };
  }
  if (key === "tracking") {
    // migrate the old single-pixel settings
    const t = out as AllSettings["tracking"];
    if (!Array.isArray(t.pixels)) t.pixels = [];
    if (!t.pixels.length && t.fbPixelId) t.pixels = [{ id: t.fbPixelId, label: "", token: t.fbCapiToken || "" }];
    delete t.fbPixelId;
    delete t.fbCapiToken;
  }
  return out as AllSettings[K];
}

/** Cached read (cache cleared on save) — keeps landing pages fast */
const readAll = unstable_cache(
  async () => {
    const rows = await db.setting.findMany();
    return Object.fromEntries(rows.map((r) => [r.key, r.value]));
  },
  ["settings-all"],
  { tags: ["settings"], revalidate: 3600 },
);

export async function getSetting<K extends Key>(key: K): Promise<AllSettings[K]> {
  try {
    const all = await readAll();
    return merge(key, all[key]);
  } catch {
    return DEFAULT_SETTINGS[key];
  }
}

export async function getAllSettings(): Promise<AllSettings> {
  const keys = Object.keys(DEFAULT_SETTINGS) as Key[];
  const vals = await Promise.all(keys.map((k) => getSetting(k)));
  return Object.fromEntries(keys.map((k, i) => [k, vals[i]])) as AllSettings;
}

export async function saveSetting<K extends Key>(key: K, value: AllSettings[K]) {
  await db.setting.upsert({
    where: { key },
    create: { key, value: value as object },
    update: { value: value as object },
  });
  revalidateTag("settings");
}

/** Public tracking config only (no tokens) — safe to send to the browser */
export async function getPublicTracking() {
  const t = await getSetting("tracking");
  return {
    fbBrowser: t.browserEnabled,
    fbPixelIds: t.browserEnabled ? t.pixels.map((p) => p.id).filter(Boolean) : [],
    // events the browser pixel may fire (Purchase only when reported at order time)
    fbEvents: Object.entries(t.events)
      .filter(([k, on]) => on && !SERVER_ONLY_EVENTS.includes(k) && (k !== "Purchase" || t.purchaseTrigger === "placed"))
      .map(([k]) => k),
    ga4Id: t.ga4Id,
    gtmId: t.gtmId,
    tiktokPixelId: t.tiktokPixelId,
  };
}
