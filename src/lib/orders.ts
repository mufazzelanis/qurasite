import "server-only";
import { after } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { db } from "./db";
import { getSetting } from "./settings";
import { checkFraud } from "./fraud";
import { sendOrderPurchase } from "./capi";
import { evaluateCoupon } from "./coupon";
import { notifyNewOrder } from "./notify";
import { deliveryFor, priceCart } from "./pricing";
import { normalizeBdPhone } from "./utils";
import { bdHour } from "./periods";
import { mergeLandingContent } from "./settings-defaults";

export const orderSchema = z.object({
  name: z.string().trim().min(2, "নাম লিখুন").max(80),
  phone: z.string().trim().min(10).max(20),
  address: z.string().trim().min(5, "সম্পূর্ণ ঠিকানা লিখুন").max(300),
  notes: z.string().trim().max(500).optional(),
  area: z.enum(["INSIDE_DHAKA", "SUB_DHAKA", "OUTSIDE_DHAKA"]),
  items: z.array(z.object({ productId: z.string(), quantity: z.number().int().min(1).max(20) })).min(1).max(30),
  coupon: z.string().trim().max(40).optional(),
  paymentMethod: z.enum(["COD", "BKASH", "NAGAD", "ROCKET"]).default("COD"),
  trxId: z.string().trim().max(40).optional(),
  source: z.string().trim().max(80).default("shop"), // "shop" or landing slug
  visitId: z.string().max(40).optional(),
  url: z.string().max(500).optional(),
});
export type OrderInput = z.infer<typeof orderSchema>;

type Result =
  | { ok: true; orderNo: string; eventId: string; total: number }
  | { ok: false; status: number; error: string; needOtp?: boolean; advance?: number };

/** Server-side quote: what the customer must pay (also used by /api/quote) */
export async function quote(input: Pick<OrderInput, "items" | "area" | "coupon"> & { source?: string }) {
  const products = await db.product.findMany({ where: { id: { in: input.items.map((i) => i.productId) }, active: true } });
  const [delivery, upsell, payments] = await Promise.all([getSetting("delivery"), getSetting("upsell"), getSetting("payments")]);

  let comboEnabled = upsell.enabled;
  if (input.source && input.source !== "shop") {
    const lp = await db.landingPage.findUnique({ where: { slug: input.source } });
    if (lp) comboEnabled = mergeLandingContent(lp.content).combo.enabled;
  }

  const lines = input.items
    .map((i) => {
      const p = products.find((x) => x.id === i.productId);
      return p ? { product: { ...p, comboPrice: comboEnabled ? p.comboPrice : null }, quantity: i.quantity } : null;
    })
    .filter((x): x is NonNullable<typeof x> => !!x);

  const priced = priceCart(lines);
  const coupon = await evaluateCoupon(input.coupon, priced.subtotal);
  const afterCoupon = priced.subtotal - coupon.discount;
  const deliveryCharge = deliveryFor(input.area, afterCoupon, delivery);
  const total = afterCoupon + deliveryCharge;

  let advance = 0;
  const needsAdvance = payments.advanceMode !== "none" && (!payments.advanceOutsideDhakaOnly || input.area === "OUTSIDE_DHAKA");
  if (needsAdvance) advance = payments.advanceMode === "full" ? total : deliveryCharge;
  if (!payments.codEnabled) advance = total;

  return { lines, priced, coupon, deliveryCharge, total, advance };
}

export async function createOrder(raw: unknown, ctx: { ip: string; userAgent: string }): Promise<Result> {
  const parsed = orderSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, status: 400, error: parsed.error.issues[0]?.message || "তথ্য সঠিক নয়" };
  const input = parsed.data;
  const phone = normalizeBdPhone(input.phone);
  if (!phone) return { ok: false, status: 400, error: "সঠিক ১১ ডিজিটের মোবাইল নাম্বার দিন" };

  const q = await quote(input);
  if (!q.lines.length) return { ok: false, status: 400, error: "পণ্য পাওয়া যায়নি" };
  for (const l of q.lines) {
    if (l.product.stock < l.quantity) return { ok: false, status: 400, error: `${l.product.nameBn || l.product.name} স্টকে নেই` };
  }
  if (input.coupon && !q.coupon.ok) return { ok: false, status: 400, error: ("error" in q.coupon && q.coupon.error) || "কুপন সঠিক নয়" };

  // advance payment (bKash / Nagad / Rocket)
  if (q.advance > 0) {
    if (input.paymentMethod === "COD" || !input.trxId || input.trxId.length < 6) {
      return { ok: false, status: 402, error: `অর্ডার কনফার্ম করতে ৳${q.advance} অগ্রিম পাঠিয়ে Transaction ID দিন`, advance: q.advance };
    }
  }

  const fraud = await checkFraud({ phone, ip: ctx.ip, name: input.name, address: input.address });
  if (fraud.blocked) return { ok: false, status: 403, error: "অর্ডারটি সম্পন্ন করা যায়নি। অনুগ্রহ করে কল করুন।" };

  // OTP verification (optional, can be limited to risky customers)
  const sms = await getSetting("sms");
  let phoneVerified = false;
  if (sms.enabled && sms.otpEnabled) {
    const ok = await db.otpCode.findFirst({ where: { phone, verified: true, createdAt: { gte: new Date(Date.now() - 30 * 60_000) } } });
    phoneVerified = !!ok;
    if (!ok && fraud.score >= sms.otpMinRisk) return { ok: false, status: 428, error: "মোবাইল নাম্বার ভেরিফাই করুন", needOtp: true };
  }

  const jar = await cookies();
  const sessionId = jar.get("qf_sid")?.value;
  const fbp = jar.get("_fbp")?.value;
  const fbc = jar.get("_fbc")?.value;
  let utm: { s?: string; m?: string; c?: string } = {};
  try {
    utm = JSON.parse(jar.get("qf_utm")?.value || "{}");
  } catch {}

  const source = input.source || "shop";
  const order = await db.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: {
        orderNo: `tmp-${crypto.randomUUID()}`,
        customerName: input.name,
        phone,
        address: input.address,
        notes: input.notes || null,
        deliveryArea: input.area,
        deliveryCharge: q.deliveryCharge,
        subtotal: q.priced.subtotal,
        discount: q.priced.comboSavings,
        couponCode: q.coupon.code,
        couponDiscount: q.coupon.discount,
        total: q.total,
        paymentMethod: q.advance > 0 ? input.paymentMethod : "COD",
        advanceAmount: q.advance > 0 ? q.advance : 0,
        paymentTrxId: q.advance > 0 ? input.trxId : null,
        phoneVerified,
        source,
        fraudScore: fraud.score,
        fraudFlags: fraud.flags,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
        sessionId,
        visitId: input.visitId,
        fbp,
        fbc,
        utmSource: utm.s,
        utmMedium: utm.m,
        utmCampaign: utm.c || null,
        hourBd: bdHour(new Date()),
        items: {
          create: q.priced.items.map((l) => ({
            productId: l.product.id,
            name: l.product.nameBn || l.product.name,
            price: l.unit,
            quantity: l.quantity,
            source: l.product.isAddon && q.priced.hasMain ? "bump" : null,
          })),
        },
        history: { create: { status: "PENDING", note: "Order placed", by: "Customer" } },
      },
    });
    const orderNo = `${source === "shop" ? "QF" : "LP"}${10000 + created.seq}`;
    const o = await tx.order.update({ where: { id: created.id }, data: { orderNo }, include: { items: true } });
    for (const l of q.lines) await tx.product.update({ where: { id: l.product.id }, data: { stock: { decrement: l.quantity } } });
    if (q.coupon.ok) await tx.coupon.update({ where: { code: q.coupon.code! }, data: { used: { increment: 1 } } });
    if (sessionId) await tx.draftOrder.updateMany({ where: { sessionId }, data: { converted: true } });
    return o;
  });

  after(async () => {
    try {
      // link visit + button clicks of this session to the order (Live Visitors "Result" column)
      if (input.visitId) await db.pageVisit.updateMany({ where: { id: input.visitId }, data: { orderNo: order.orderNo } });
      if (sessionId) {
        await db.clickEvent.updateMany({ where: { sessionId, orderNo: null, createdAt: { gte: new Date(Date.now() - 86400_000) } }, data: { orderNo: order.orderNo } });
        await db.pageVisit.updateMany({ where: { sessionId, orderNo: null, startedAt: { gte: new Date(Date.now() - 86400_000) } }, data: { orderNo: order.orderNo } });
      }
      await db.analyticsEvent.create({ data: { name: "Purchase", sessionId, value: order.total, path: source === "shop" ? "/checkout" : `/${source}` } });
      // Purchase now, or later when the order is confirmed / delivered (Admin → Facebook Pixel)
      if ((await getSetting("tracking")).purchaseTrigger === "placed") await sendOrderPurchase(order, input.url);
      await notifyNewOrder(order);
    } catch (e) {
      console.error("post-order", e);
    }
  });

  return { ok: true, orderNo: order.orderNo, eventId: order.id, total: order.total };
}
