import { NextResponse, after } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { sendCapi } from "@/lib/capi";
import { clientInfo, rateLimit } from "@/lib/request";
import { parseUA, trafficSource } from "@/lib/ua";

const ORDER_BUTTONS = new Set(["order_button", "sticky_bar", "confirm_order", "combo", "buy_now"]);
const clip = (v: unknown, n: number) => (typeof v === "string" ? v.slice(0, n) : null);

/**
 * Visitor tracking beacon. Types:
 *  start → creates a PageVisit (returns id) + PageView to CAPI
 *  ping  → heartbeat: stage (top|reading|form), scroll %, seconds on page
 *  leave → visitor closed / left the page
 *  click → order / call / WhatsApp / sticky-bar button press
 */
export async function POST(req: Request) {
  const b = await req.json().catch(() => null);
  if (!b?.type) return NextResponse.json({ ok: false }, { status: 400 });
  const jar = await cookies();
  const sid = jar.get("qf_sid")?.value || "anon";
  const { ip, userAgent } = await clientInfo();
  if (!rateLimit(`t:${ip}`, 240, 60_000)) return NextResponse.json({ ok: false }, { status: 429 });

  if (b.type === "start") {
    const { device, os, browser } = parseUA(userAgent);
    let utm: { s?: string; c?: string } = {};
    try {
      utm = JSON.parse(jar.get("qf_utm")?.value || "{}");
    } catch {}
    const path = clip(b.path, 200) || "/";
    const slug = clip(b.slug, 80);
    const visit = await db.pageVisit.create({
      data: {
        sessionId: sid,
        path,
        landingSlug: slug,
        ip,
        device,
        os,
        browser,
        source: trafficSource({ ua: userAgent, referrer: b.referrer, utmSource: utm.s, fbclid: !!b.fbclid }),
        referrer: clip(b.referrer, 300),
        utmCampaign: utm.c,
      },
      select: { id: true },
    });
    after(async () => {
      await db.analyticsEvent.create({ data: { name: "PageView", sessionId: sid, path } }).catch(() => {});
      if (b.eventId) {
        const pixelId = slug ? (await db.landingPage.findUnique({ where: { slug }, select: { pixelId: true } }))?.pixelId || undefined : undefined;
        await sendCapi({ pixelId, source: slug || "shop", eventName: "PageView", eventId: String(b.eventId), url: clip(b.url, 500) || undefined, ip, userAgent, fbp: jar.get("_fbp")?.value, fbc: jar.get("_fbc")?.value });
      }
      // keep 90 days of visit data
      if (Math.random() < 0.003) {
        const old = new Date(Date.now() - 90 * 86400_000);
        await db.pageVisit.deleteMany({ where: { startedAt: { lt: old } } });
        await db.clickEvent.deleteMany({ where: { createdAt: { lt: old } } });
        await db.capiLog.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 30 * 86400_000) } } });
      }
    });
    return NextResponse.json({ id: visit.id });
  }

  const id = clip(b.id, 40);

  if (b.type === "ping" || b.type === "leave") {
    if (!id) return NextResponse.json({ ok: false });
    const stage = ["top", "reading", "form"].includes(b.stage) ? b.stage : undefined;
    const scroll = Math.max(0, Math.min(100, Number(b.scroll) || 0));
    after(() =>
      db.$executeRaw`
        UPDATE "PageVisit" SET
          "lastSeen" = now(),
          "durationSec" = GREATEST("durationSec", ${Math.min(86400, Number(b.dur) || 0)}),
          "maxScroll" = GREATEST("maxScroll", ${scroll}),
          "stage" = COALESCE(${stage}, "stage"),
          "reachedForm" = "reachedForm" OR ${stage === "form"},
          "leftAt" = ${b.type === "leave" ? new Date() : null}
        WHERE id = ${id} AND "sessionId" = ${sid}`.catch(() => {}),
    );
    return NextResponse.json({ ok: true });
  }

  if (b.type === "click") {
    const button = clip(b.button, 30) || "other";
    const { device, os, browser } = parseUA(userAgent);
    after(async () => {
      await db.clickEvent.create({
        data: {
          visitId: id,
          sessionId: sid,
          path: clip(b.path, 200) || "/",
          landingSlug: clip(b.slug, 80),
          button,
          label: clip(b.label, 80),
          amount: Number(b.amount) || null,
          ip,
          device,
          os,
          browser,
          afterSec: Math.max(0, Math.min(86400, Number(b.after) || 0)),
        },
      });
      if (id && ORDER_BUTTONS.has(button)) await db.pageVisit.updateMany({ where: { id, sessionId: sid }, data: { clickedOrder: true } });
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: false }, { status: 400 });
}
