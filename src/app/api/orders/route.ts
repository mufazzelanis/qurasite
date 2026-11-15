import { NextResponse } from "next/server";
import { createOrder } from "@/lib/orders";
import { clientInfo, rateLimit } from "@/lib/request";

export async function POST(req: Request) {
  const ctx = await clientInfo();
  if (!rateLimit(`order:${ctx.ip}`, 8, 10 * 60 * 1000)) {
    return NextResponse.json({ error: "অনেকবার চেষ্টা করা হয়েছে। কিছুক্ষণ পর আবার চেষ্টা করুন।" }, { status: 429 });
  }
  let r: Awaited<ReturnType<typeof createOrder>>;
  try {
    r = await createOrder(await req.json().catch(() => ({})), ctx);
  } catch (e) {
    console.error("order failed", e);
    return NextResponse.json({ error: "সার্ভারে সমস্যা হয়েছে। একটু পর আবার চেষ্টা করুন অথবা আমাদের কল করুন।" }, { status: 500 });
  }
  if (!r.ok) return NextResponse.json({ error: r.error, needOtp: r.needOtp, advance: r.advance }, { status: r.status });
  return NextResponse.json(r);
}
