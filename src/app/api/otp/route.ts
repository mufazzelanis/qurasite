import { NextResponse } from "next/server";
import { createHash, randomInt } from "crypto";
import { db } from "@/lib/db";
import { getSetting } from "@/lib/settings";
import { sendSms, fillTemplate } from "@/lib/notify";
import { clientInfo, rateLimit } from "@/lib/request";
import { normalizeBdPhone } from "@/lib/utils";

const hash = (s: string) => createHash("sha256").update(s).digest("hex");

/** POST {phone} → sends code.  POST {phone, code} → verifies. */
export async function POST(req: Request) {
  const { ip } = await clientInfo();
  const b = await req.json().catch(() => ({}));
  const phone = normalizeBdPhone(String(b.phone || ""));
  if (!phone) return NextResponse.json({ error: "সঠিক মোবাইল নাম্বার দিন" }, { status: 400 });

  if (!b.code) {
    if (!rateLimit(`otp:${ip}`, 5, 15 * 60_000) || !rateLimit(`otp:${phone}`, 3, 15 * 60_000))
      return NextResponse.json({ error: "কিছুক্ষণ পর আবার চেষ্টা করুন" }, { status: 429 });
    const sms = await getSetting("sms");
    const code = String(randomInt(1000, 9999));
    await db.otpCode.create({ data: { phone, codeHash: hash(phone + code), expiresAt: new Date(Date.now() + 5 * 60_000) } });
    const r = await sendSms(phone, fillTemplate(sms.templates.otp, { code }));
    if ("ok" in r && !r.ok) return NextResponse.json({ error: "SMS পাঠানো যায়নি, কল করুন" }, { status: 502 });
    return NextResponse.json({ ok: true });
  }

  const otp = await db.otpCode.findFirst({ where: { phone, verified: false, expiresAt: { gte: new Date() } }, orderBy: { createdAt: "desc" } });
  if (!otp || otp.attempts >= 5) return NextResponse.json({ error: "কোডের মেয়াদ শেষ, আবার পাঠান" }, { status: 400 });
  if (otp.codeHash !== hash(phone + String(b.code).trim())) {
    await db.otpCode.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } });
    return NextResponse.json({ error: "কোড সঠিক নয়" }, { status: 400 });
  }
  await db.otpCode.update({ where: { id: otp.id }, data: { verified: true } });
  return NextResponse.json({ ok: true });
}
