"use client";

type FbqFn = (...args: unknown[]) => void;
declare global {
  interface Window {
    fbq?: FbqFn;
    gtag?: (...args: unknown[]) => void;
    ttq?: { track: (n: string, d?: object, o?: object) => void; page: () => void };
    dataLayer?: unknown[];
    __qfCfg?: { ev: string[]; slug: string | null };
  }
}

export type TrackData = {
  value?: number;
  currency?: string;
  contentIds?: string[];
  contentName?: string;
  numItems?: number;
};

const GA_MAP: Record<string, string> = {
  ViewContent: "view_item",
  AddToCart: "add_to_cart",
  InitiateCheckout: "begin_checkout",
  Purchase: "purchase",
  Search: "search",
  Contact: "generate_lead",
};

/**
 * Fires an event to Facebook Pixel, GA4, TikTok and our own server.
 * The server forwards it to the Facebook Conversions API with the SAME
 * event_id so Facebook de-duplicates browser + server events.
 */
export function track(name: string, data: TrackData = {}, opts: { eventId?: string; serverSent?: boolean } = {}) {
  if (typeof window === "undefined") return;
  const eventId = opts.eventId || crypto.randomUUID();
  const params = {
    value: data.value,
    currency: data.currency || "BDT",
    content_ids: data.contentIds,
    content_name: data.contentName,
    content_type: "product",
    num_items: data.numItems,
  };

  const cfg = window.__qfCfg;
  // events switched off in Admin → Facebook Pixel are not fired by the browser pixel
  const fbOn = !cfg || cfg.ev.includes(name) || !["PageView", "ViewContent", "AddToCart", "InitiateCheckout", "Purchase"].includes(name);
  try {
    if (fbOn) window.fbq?.("track", name, params, { eventID: eventId });
  } catch {}
  try {
    window.gtag?.("event", GA_MAP[name] || name, { value: data.value, currency: "BDT", transaction_id: name === "Purchase" ? eventId : undefined });
  } catch {}
  try {
    window.ttq?.track(name === "Purchase" ? "CompletePayment" : name, { value: data.value, currency: "BDT" }, { event_id: eventId });
  } catch {}

  const body = JSON.stringify({ name, eventId, url: location.href, slug: cfg?.slug || undefined, data, serverSent: !!opts.serverSent });
  if (navigator.sendBeacon) navigator.sendBeacon("/api/events", new Blob([body], { type: "application/json" }));
  else fetch("/api/events", { method: "POST", body, keepalive: true, headers: { "Content-Type": "application/json" } });
}
