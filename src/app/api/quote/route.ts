import { NextResponse } from "next/server";
import { z } from "zod";
import { quote } from "@/lib/orders";

const schema = z.object({
  items: z.array(z.object({ productId: z.string(), quantity: z.number().int().min(1).max(20) })).min(1).max(30),
  area: z.enum(["INSIDE_DHAKA", "SUB_DHAKA", "OUTSIDE_DHAKA"]),
  coupon: z.string().max(40).optional(),
  source: z.string().max(80).optional(),
});

/** Checks a coupon + returns the exact server price (shown before placing the order). */
export async function POST(req: Request) {
  const p = schema.safeParse(await req.json().catch(() => ({})));
  if (!p.success) return NextResponse.json({ error: "Invalid" }, { status: 400 });
  const q = await quote(p.data);
  return NextResponse.json({
    subtotal: q.priced.subtotal,
    comboSavings: q.priced.comboSavings,
    couponOk: q.coupon.ok,
    couponCode: q.coupon.code,
    couponDiscount: q.coupon.discount,
    couponError: "error" in q.coupon ? q.coupon.error : undefined,
    deliveryCharge: q.deliveryCharge,
    total: q.total,
    advance: q.advance,
  });
}
