import "server-only";
import { createHash } from "crypto";
import { Prisma } from "@prisma/client";
import { db } from "./db";
import { getSetting } from "./settings";
import { SERVER_ONLY_EVENTS, type FbPixel, type TrackingSettings } from "./settings-defaults";
import { parseUA } from "./ua";

const sha = (v?: string | null) => (v ? createHash("sha256").update(v.trim().toLowerCase()).digest("hex") : undefined);
const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");

/** Crawlers, link previews, headless browsers and scripts — logged but never sent to Facebook */
export const BOT_RE = /bot|crawl|spider|slurp|facebookexternalhit|facebookcatalog|meta-externalagent|preview|headless|lighthouse|pagespeed|python|curl|wget|axios|node-fetch|undici|go-http|java\/|okhttp|phantomjs|puppeteer|playwright/i;
export const isBot = (ua?: string | null) => !ua || BOT_RE.test(ua);

export type CapiEvent = {
  pixelId?: string; // landing-page specific pixel
  eventName: string;
  eventId: string; // the browser pixel uses the same id → Facebook de-duplicates
  url?: string;
  ip?: string | null;
  userAgent?: string | null;
  fbp?: string | null;
  fbc?: string | null;
  user?: { phone?: string; name?: string; city?: string; externalId?: string };
  custom?: Record<string, unknown>;
  orderNo?: string;
  source?: string; // "shop" | landing slug
  testCode?: string; // overrides the saved test event code (admin "Send test event")
  force?: boolean; // ignore the on/off switches (admin test)
};

/** Which pixels receive a server event: the landing page's own pixel, or every configured pixel. */
function targets(t: TrackingSettings, pixelId?: string): FbPixel[] {
  const withToken = t.pixels.filter((p) => p.id && p.token);
  if (pixelId) {
    const own = t.pixels.find((p) => p.id === pixelId);
    const token = own?.token || withToken[0]?.token; // landing pixel uses the primary token unless it has its own
    return token ? [{ id: pixelId, label: own?.label || "Landing page pixel", token }] : [];
  }
  return withToken;
}

function buildEvent(e: CapiEvent) {
  const phone = e.user?.phone ? "88" + e.user.phone.replace(/^\+?88/, "") : undefined; // 8801XXXXXXXXX
  const [fn, ...rest] = (e.user?.name || "").split(" ");
  const serverOnly = SERVER_ONLY_EVENTS.includes(e.eventName);
  return {
    event_name: e.eventName,
    event_time: Math.floor(Date.now() / 1000),
    event_id: e.eventId,
    action_source: serverOnly ? "system_generated" : "website",
    event_source_url: e.url || (e.source && e.source !== "shop" ? `${SITE}/${e.source}` : `${SITE}/`),
    user_data: {
      client_ip_address: e.ip || undefined,
      client_user_agent: e.userAgent || undefined,
      fbp: e.fbp || undefined,
      fbc: e.fbc || undefined,
      ph: phone ? [sha(phone)] : undefined,
      fn: fn ? [sha(fn)] : undefined,
      ln: rest.length ? [sha(rest.join(" "))] : undefined,
      ct: e.user?.city ? [sha(e.user.city.replace(/\s/g, ""))] : undefined,
      country: [sha("bd")],
      external_id: e.user?.externalId ? [sha(e.user.externalId)] : undefined,
    },
    custom_data: e.custom,
  };
}

async function post(version: string, pixel: FbPixel, body: object) {
  try {
    const res = await fetch(`https://graph.facebook.com/${version}/${pixel.id}/events?access_token=${encodeURIComponent(pixel.token)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000),
    });
    const j = (await res.json().catch(() => ({}))) as { events_received?: number; fbtrace_id?: string; error?: { message?: string; error_user_msg?: string; fbtrace_id?: string } };
    if (res.ok) return { ok: true, status: res.status, response: `Received ${j.events_received ?? 0} · trace ${j.fbtrace_id ?? "-"}` };
    return { ok: false, status: res.status, response: (j.error?.error_user_msg || j.error?.message || res.statusText || "Error").slice(0, 400) };
  } catch (err) {
    return { ok: false, status: 0, response: `Network error: ${(err as Error).message}`.slice(0, 400) };
  }
}

/** Facebook Conversions API. Sends to every configured pixel and logs each request. Never throws. */
export async function sendCapi(e: CapiEvent) {
  try {
    const t = await getSetting("tracking");
    if (!e.force) {
      if (!t.capiEnabled) return { skipped: "capi off" };
      if (e.eventName in t.events && !t.events[e.eventName as keyof typeof t.events]) return { skipped: "event off" };
      if (e.eventName === "PageView" && !t.serverPageView) return { skipped: "server PageView off" };
    }
    const list = targets(t, e.pixelId);
    if (!list.length) return { skipped: "no pixel" };

    const { device, os, browser } = parseUA(e.userAgent || "");
    const base = { eventName: e.eventName, eventId: e.eventId.slice(0, 120), orderNo: e.orderNo, source: e.source, ip: e.ip, device, os, browser };
    const bot = !e.force && !SERVER_ONLY_EVENTS.includes(e.eventName) && e.eventName !== "Purchase" && isBot(e.userAgent);
    if (bot) {
      await db.capiLog.createMany({ data: list.map((p) => ({ ...base, pixelId: p.id, pixelLabel: p.label || null, result: "bot", response: "Bot / crawler — not sent" })) });
      return { skipped: "bot" };
    }

    const testCode = e.testCode ?? t.fbTestEventCode;
    const body = { data: [buildEvent(e)], ...(testCode ? { test_event_code: testCode } : {}) };
    const results = await Promise.all(
      list.map(async (p) => {
        const r = await post(t.graphVersion || "v23.0", p, body);
        await db.capiLog.create({
          data: {
            ...base,
            pixelId: p.id,
            pixelLabel: p.label || null,
            result: r.ok ? "sent" : "failed",
            status: r.status,
            response: r.response,
            isTest: !!testCode,
            payload: r.ok ? undefined : (body as Prisma.InputJsonValue),
          },
        });
        return r;
      }),
    );
    housekeeping(t).catch(() => {});
    return { ok: results.every((r) => r.ok), results };
  } catch (err) {
    console.error("CAPI", err);
    return { error: true };
  }
}

/** Retry temporary failures (network / 5xx / rate limit) for up to 7 days; delete logs older than 30 days. */
export async function retryFailed(t?: TrackingSettings, limit = 25) {
  t ??= await getSetting("tracking");
  const rows = await db.capiLog.findMany({
    where: { result: "failed", retries: { lt: 6 }, createdAt: { gte: new Date(Date.now() - 7 * 86400_000) }, OR: [{ status: 0 }, { status: { gte: 500 } }, { status: 429 }] },
    orderBy: { createdAt: "asc" },
    take: limit,
  });
  let fixed = 0;
  for (const row of rows) {
    const pixel = t.pixels.find((p) => p.id === row.pixelId) || (t.pixels[0]?.token ? { ...t.pixels[0], id: row.pixelId } : null);
    if (!pixel?.token || !row.payload) continue;
    const r = await post(t.graphVersion || "v23.0", pixel, row.payload as object);
    if (r.ok) fixed++;
    await db.capiLog.update({
      where: { id: row.id },
      data: { result: r.ok ? "sent" : "failed", status: r.status, response: r.ok ? `${r.response} · retried` : r.response, retries: { increment: 1 }, ...(r.ok ? { payload: Prisma.DbNull } : {}) },
    });
  }
  return { tried: rows.length, fixed };
}

async function housekeeping(t: TrackingSettings) {
  const roll = Math.random();
  if (roll < 0.02) await retryFailed(t, 10);
  else if (roll < 0.025) await db.capiLog.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 30 * 86400_000) } } });
}

/** Admin "Verify connection": asks Facebook whether each pixel + token pair works. */
export async function verifyPixels() {
  const t = await getSetting("tracking");
  if (!t.pixels.length) return [{ id: "-", label: "", ok: false, message: "No pixel added yet" }];
  return Promise.all(
    t.pixels.map(async (p) => {
      if (!p.token) return { id: p.id, label: p.label, ok: false, message: "No Conversions API token — browser pixel only" };
      try {
        const res = await fetch(`https://graph.facebook.com/${t.graphVersion || "v23.0"}/${p.id}?fields=name,last_fired_time,is_unavailable&access_token=${encodeURIComponent(p.token)}`, { signal: AbortSignal.timeout(8000), cache: "no-store" });
        const j = (await res.json().catch(() => ({}))) as { name?: string; last_fired_time?: string; is_unavailable?: boolean; error?: { message?: string } };
        if (!res.ok) return { id: p.id, label: p.label, ok: false, message: j.error?.message || `HTTP ${res.status}` };
        const fired = j.last_fired_time ? `last event received ${new Date(j.last_fired_time).toLocaleString("en-GB", { timeZone: "Asia/Dhaka" })}` : "no event received yet";
        return { id: p.id, label: p.label, ok: !j.is_unavailable, message: `Connected to “${j.name || p.id}” · ${fired}` };
      } catch (err) {
        return { id: p.id, label: p.label, ok: false, message: `Network error: ${(err as Error).message}` };
      }
    }),
  );
}

/** Purchase value according to the settings (order total, or products only without delivery). */
export function purchaseValue(t: TrackingSettings, o: { total: number; deliveryCharge: number }) {
  return t.purchaseValue === "products" ? o.total - o.deliveryCharge : o.total;
}

type OrderForCapi = {
  id: string;
  orderNo: string;
  total: number;
  deliveryCharge: number;
  phone: string;
  customerName: string;
  source: string;
  ip: string | null;
  userAgent: string | null;
  fbp: string | null;
  fbc: string | null;
  items: { productId: string; quantity: number; price: number }[];
};

/** Server Purchase for an order. eventId = order.id (same as the browser Purchase on the thank-you page). */
export async function sendOrderPurchase(o: OrderForCapi, url?: string) {
  const t = await getSetting("tracking");
  const pixelId = o.source !== "shop" ? (await db.landingPage.findUnique({ where: { slug: o.source }, select: { pixelId: true } }))?.pixelId || undefined : undefined;
  return sendCapi({
    pixelId,
    eventName: "Purchase",
    eventId: o.id,
    url,
    ip: o.ip,
    userAgent: o.userAgent,
    fbp: o.fbp,
    fbc: o.fbc,
    orderNo: o.orderNo,
    source: o.source,
    user: { phone: o.phone, name: o.customerName, externalId: o.phone },
    custom: {
      currency: "BDT",
      value: purchaseValue(t, o),
      content_type: "product",
      content_ids: [...new Set(o.items.map((i) => i.productId))],
      contents: o.items.map((i) => ({ id: i.productId, quantity: i.quantity, item_price: i.price })),
      num_items: o.items.reduce((a, i) => a + i.quantity, 0),
      order_id: o.orderNo,
    },
  });
}

/** Called when an admin (or Steadfast sync) changes an order status. */
export async function capiForStatus(o: OrderForCapi, status: string) {
  const t = await getSetting("tracking");
  const reached = (s: string) => ["CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED"].indexOf(s);
  // delayed Purchase (only once per order)
  const due = (t.purchaseTrigger === "confirmed" && reached(status) >= 0) || (t.purchaseTrigger === "delivered" && status === "DELIVERED");
  if (due && !(await db.capiLog.findFirst({ where: { orderNo: o.orderNo, eventName: "Purchase", result: "sent", eventId: o.id }, select: { id: true } }))) {
    await sendOrderPurchase(o);
  }
  if (status === "DELIVERED" || status === "CANCELLED") {
    const name = status === "DELIVERED" ? "OrderDelivered" : "OrderCancelled";
    const pixelId = o.source !== "shop" ? (await db.landingPage.findUnique({ where: { slug: o.source }, select: { pixelId: true } }))?.pixelId || undefined : undefined;
    await sendCapi({
      pixelId,
      eventName: name,
      eventId: `${name}-${o.id}`,
      ip: o.ip,
      userAgent: o.userAgent,
      fbp: o.fbp,
      fbc: o.fbc,
      orderNo: o.orderNo,
      source: o.source,
      user: { phone: o.phone, name: o.customerName, externalId: o.phone },
      custom: { currency: "BDT", value: purchaseValue(t, o), order_id: o.orderNo },
    });
  }
}
