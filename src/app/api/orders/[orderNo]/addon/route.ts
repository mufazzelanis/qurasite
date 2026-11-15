import { NextResponse, after } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSetting } from "@/lib/settings";
import { sendCapi } from "@/lib/capi";
import { clientInfo, rateLimit } from "@/lib/request";

const schema = z.object({
  token: z.string().min(10), // = order.id, only known to the customer who just ordered
  productId: z.string(),
  quantity: z.number().int().min(1).max(10).default(1),
});

/**
 * Post-purchase one-click upsell: add an add-on (honey / jaggery) to a just-placed
 * PENDING order at the combo price — no new form, same delivery, no extra charge.
 */
export async function POST(req: Request, { params }: { params: Promise<{ orderNo: string }> }) {
  const { orderNo } = await params;
  const { ip, userAgent } = await clientInfo();
  if (!rateLimit(`addon:${ip}`, 10, 10 * 60 * 1000)) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const { token, productId, quantity } = parsed.data;

  const upsell = await getSetting("upsell");
  const order = await db.order.findUnique({ where: { orderNo }, include: { items: true } });
  if (!order || order.id !== token) return NextResponse.json({ error: "অর্ডার পাওয়া যায়নি" }, { status: 404 });
  const windowMs = upsell.postPurchaseMinutes * 60 * 1000;
  if (!upsell.postPurchaseEnabled || order.status !== "PENDING" || Date.now() - order.createdAt.getTime() > windowMs) {
    return NextResponse.json({ error: "এই অফারের সময় শেষ হয়ে গেছে" }, { status: 410 });
  }

  const product = await db.product.findFirst({ where: { id: productId, active: true, isAddon: true } });
  if (!product || product.stock < quantity) return NextResponse.json({ error: "পণ্যটি স্টকে নেই" }, { status: 400 });
  const unit = product.comboPrice != null && product.comboPrice < product.price ? product.comboPrice : product.price;
  const add = unit * quantity;
  const saved = (product.price - unit) * quantity;
  const existing = order.items.find((i) => i.productId === product.id);

  const updated = await db.$transaction(async (tx) => {
    if (existing) await tx.orderItem.update({ where: { id: existing.id }, data: { quantity: { increment: quantity } } });
    else
      await tx.orderItem.create({
        data: { orderId: order.id, productId: product.id, name: product.nameBn || product.name, price: unit, quantity, source: "post" },
      });
    await tx.product.update({ where: { id: product.id }, data: { stock: { decrement: quantity } } });
    await tx.orderStatusLog.create({ data: { orderId: order.id, status: "PENDING", note: `Customer added ${product.name} ×${quantity} (one-click)` } });
    return tx.order.update({
      where: { id: order.id },
      data: { subtotal: { increment: add }, total: { increment: add }, discount: { increment: saved } },
    });
  });

  // Extra purchase value for Facebook (separate event id → not deduped against the main Purchase)
  const eventId = `${order.id}-${product.id}-${Date.now()}`;
  // when Purchase is reported later (on confirm / delivery) the add-on is already part of that order total
  after(async () => {
    if ((await getSetting("tracking")).purchaseTrigger !== "placed") return;
    await sendCapi({
      orderNo: order.orderNo,
      source: order.source,
      eventName: "Purchase",
      eventId,
      ip,
      userAgent,
      fbp: order.fbp,
      fbc: order.fbc,
      user: { phone: order.phone, name: order.customerName, externalId: order.phone },
      custom: { currency: "BDT", value: add, content_ids: [product.id], content_type: "product", order_id: `${order.orderNo}-addon` },
    });
  });

  return NextResponse.json({ ok: true, total: updated.total, added: add, eventId });
}
