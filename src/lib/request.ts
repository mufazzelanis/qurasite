import "server-only";
import { headers } from "next/headers";

export async function clientInfo() {
  const h = await headers();
  const ip =
    h.get("cf-connecting-ip") ||
    h.get("x-real-ip") ||
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "0.0.0.0";
  const userAgent = h.get("user-agent") || "";
  return { ip, userAgent };
}

export function deviceFromUA(ua: string) {
  if (/tablet|ipad/i.test(ua)) return "Tablet";
  if (/mobile|android|iphone/i.test(ua)) return "Mobile";
  return "Desktop";
}

// Simple in-memory rate limiter (per server instance)
const hits = new Map<string, { n: number; reset: number }>();
export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const cur = hits.get(key);
  if (!cur || cur.reset < now) {
    hits.set(key, { n: 1, reset: now + windowMs });
    return true;
  }
  cur.n++;
  return cur.n <= limit;
}
