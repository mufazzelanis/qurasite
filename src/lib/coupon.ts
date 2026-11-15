import "server-only";
import { db } from "./db";

export async function evaluateCoupon(code: string | undefined | null, subtotal: number) {
  if (!code?.trim()) return { ok: false as const, discount: 0, code: null };
  const c = await db.coupon.findUnique({ where: { code: code.trim().toUpperCase() } });
  const fail = (error: string) => ({ ok: false as const, discount: 0, code: null, error });
  if (!c || !c.active) return fail("কুপন কোডটি সঠিক নয়");
  if (c.expiresAt && c.expiresAt < new Date()) return fail("কুপনের মেয়াদ শেষ");
  if (c.usageLimit != null && c.used >= c.usageLimit) return fail("কুপনের ব্যবহার সীমা শেষ");
  if (subtotal < c.minOrder) return fail(`এই কুপনের জন্য কমপক্ষে ৳${c.minOrder} অর্ডার করতে হবে`);
  let discount = c.type === "PERCENT" ? Math.round((subtotal * c.value) / 100) : c.value;
  if (c.maxDiscount) discount = Math.min(discount, c.maxDiscount);
  discount = Math.min(discount, subtotal);
  return { ok: true as const, discount, code: c.code, id: c.id };
}
