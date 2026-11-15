import { NextResponse, after } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { sendCapi } from "@/lib/capi";
import { clientInfo, rateLimit } from "@/lib/request";

const ALLOWED = new Set(["ViewContent", "AddToCart", "InitiateCheckout", "Purchase", "Search", "Contact", "Lead"]);

/** Browser events → stored for funnel reports + forwarded to Facebook CAPI (deduped by event_id). */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || !ALLOWED.has(body.name)) return NextResponse.json({ ok: false }, { status: 400 });

  const { ip, userAgent } = await clientInfo();
  if (!rateLimit(`ev:${ip}`, 120, 60_000)) return NextResponse.json({ ok: false }, { status: 429 });

  const jar = await cookies();
  const sessionId = jar.get("qf_sid")?.value;
  const fbp = jar.get("_fbp")?.value;
  const fbc = jar.get("_fbc")?.value;
  const data = body.data || {};

  after(async () => {
    // Purchase is recorded + sent server-side when the order is created
    if (body.serverSent) return;
    await db.analyticsEvent.create({
      data: { name: body.name, sessionId, path: safePath(body.url), value: Number(data.value) || null },
    });
    const slug = typeof body.slug === "string" ? body.slug.slice(0, 80) : undefined;
    const pixelId = slug ? (await db.landingPage.findUnique({ where: { slug }, select: { pixelId: true } }))?.pixelId || undefined : undefined;
    await sendCapi({
      pixelId,
      source: slug || "shop",
      eventName: body.name,
      eventId: String(body.eventId),
      url: body.url,
      ip,
      userAgent,
      fbp,
      fbc,
      custom: {
        currency: "BDT",
        value: data.value,
        content_ids: data.contentIds,
        content_name: data.contentName,
        content_type: "product",
        num_items: data.numItems,
      },
    });
  });

  return NextResponse.json({ ok: true });
}

function safePath(url?: string) {
  try {
    return url ? new URL(url).pathname : null;
  } catch {
    return null;
  }
}
