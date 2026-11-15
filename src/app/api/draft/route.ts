import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";

/** Saves partially-filled checkout forms → Admin → Incomplete Orders (call & recover). */
export async function POST(req: Request) {
  const sid = (await cookies()).get("qf_sid")?.value;
  if (!sid) return NextResponse.json({ ok: false });
  const b = await req.json().catch(() => ({}));
  const clip = (v: unknown, n: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, n) : null);
  const data = { name: clip(b.name, 80), phone: clip(b.phone, 20), address: clip(b.address, 300), cart: b.cart ?? undefined, source: clip(b.source, 80) };
  if (!data.phone) return NextResponse.json({ ok: false });
  try {
    await db.draftOrder.upsert({
      where: { sessionId: sid },
      create: { sessionId: sid, ...data },
      update: { ...data, converted: false },
    });
  } catch {}
  return NextResponse.json({ ok: true });
}
