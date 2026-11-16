import { NextResponse } from "next/server";
import { checkFraud } from "@/lib/fraud";
import { normalizeBdPhone } from "@/lib/utils";
import { apiAdmin } from "@/lib/session";

export async function GET(req: Request) {
  const g = await apiAdmin([
    ["reports", "view"],
    ["orders", "view"],
  ]);
  if (g.error) return g.error;
  const phone = normalizeBdPhone(new URL(req.url).searchParams.get("phone") || "");
  if (!phone) return NextResponse.json({ error: "Invalid phone number" }, { status: 400 });
  return NextResponse.json({ phone, ...(await checkFraud({ phone })) });
}
