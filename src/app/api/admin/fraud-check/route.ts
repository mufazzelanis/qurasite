import { NextResponse } from "next/server";
import { checkFraud } from "@/lib/fraud";
import { normalizeBdPhone } from "@/lib/utils";

export async function GET(req: Request) {
  const phone = normalizeBdPhone(new URL(req.url).searchParams.get("phone") || "");
  if (!phone) return NextResponse.json({ error: "Invalid phone number" }, { status: 400 });
  return NextResponse.json({ phone, ...(await checkFraud({ phone })) });
}
