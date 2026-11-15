import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { clientInfo, rateLimit } from "@/lib/request";
import { normalizeBdPhone } from "@/lib/utils";

/** Public order tracking by order number or phone. */
export async function GET(req: Request) {
  const { ip } = await clientInfo();
  if (!rateLimit(`track:${ip}`, 20, 60_000)) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const q = (new URL(req.url).searchParams.get("q") || "").trim();
  if (!q) return NextResponse.json({ orders: [] });
  const phone = normalizeBdPhone(q);

  const orders = await db.order.findMany({
    where: phone ? { phone } : { orderNo: q.toUpperCase() },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: {
      orderNo: true,
      customerName: true,
      status: true,
      total: true,
      courier: true,
      trackingCode: true,
      createdAt: true,
      items: { select: { name: true, quantity: true } },
      history: { select: { status: true, note: true, createdAt: true }, orderBy: { createdAt: "asc" } },
    },
  });

  // mask the name for privacy
  return NextResponse.json({
    orders: orders.map((o) => ({ ...o, customerName: o.customerName.slice(0, 2) + "***" })),
  });
}
