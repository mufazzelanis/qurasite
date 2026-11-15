import "server-only";
import { db } from "./db";
import { getSetting } from "./settings";

export type FraudResult = {
  score: number; // 0 (safe) – 100 (very risky)
  flags: string[];
  blocked: boolean;
  history: { total: number; delivered: number; cancelled: number; returned: number };
  courier?: { total: number; success: number; cancel: number; ratio: number } | null;
};

const DAY = 24 * 60 * 60 * 1000;

/**
 * Fraud checker. Combines:
 *  1. Blocklist (phone / IP)
 *  2. Own order history of this phone (delivered vs cancelled/returned)
 *  3. Velocity: too many orders from same phone / IP in 24h
 *  4. Text heuristics (fake names, short address)
 *  5. Optional courier success-ratio API (configure in Admin → Settings → Fraud)
 */
export async function checkFraud(input: {
  phone: string;
  ip?: string | null;
  name?: string;
  address?: string;
  excludeOrderId?: string;
}): Promise<FraudResult> {
  const cfg = await getSetting("fraud");
  const flags: string[] = [];
  let score = 0;

  const blocked = await db.blocklist.findFirst({
    where: {
      OR: [{ type: "phone", value: input.phone }, ...(input.ip ? [{ type: "ip", value: input.ip }] : [])],
    },
  });
  if (blocked) {
    flags.push(`Blocklisted ${blocked.type}${blocked.reason ? `: ${blocked.reason}` : ""}`);
    score = 100;
  }

  const notThis = input.excludeOrderId ? { id: { not: input.excludeOrderId } } : {};
  const past = await db.order.groupBy({
    by: ["status"],
    where: { phone: input.phone, ...notThis },
    _count: true,
  });
  const count = (s: string) => past.find((p) => p.status === s)?._count ?? 0;
  const history = {
    total: past.reduce((a, p) => a + p._count, 0),
    delivered: count("DELIVERED"),
    cancelled: count("CANCELLED"),
    returned: count("RETURNED"),
  };
  const bad = history.cancelled + history.returned;
  if (bad > 0) {
    const ratio = bad / Math.max(1, history.delivered + bad);
    score += Math.round(ratio * 50);
    flags.push(`${bad} cancelled/returned of ${history.delivered + bad} finished orders`);
  }
  if (history.delivered >= 2 && bad === 0) score -= 15; // loyal customer

  const since = new Date(Date.now() - DAY);
  const phoneToday = await db.order.count({ where: { phone: input.phone, createdAt: { gte: since }, ...notThis } });
  if (phoneToday >= cfg.maxOrdersPerPhonePerDay) {
    score += 40;
    flags.push(`${phoneToday} orders from this phone in 24h`);
  } else if (phoneToday > 0) {
    score += 10;
    flags.push(`Repeat order within 24h`);
  }

  if (input.ip) {
    const ipToday = await db.order.count({ where: { ip: input.ip, createdAt: { gte: since }, ...notThis } });
    if (ipToday >= cfg.maxOrdersPerIpPerDay) {
      score += 30;
      flags.push(`${ipToday} orders from this IP in 24h`);
    }
  }

  if (input.name && (input.name.trim().length < 3 || /^(test|abc|asdf|xyz|fake)/i.test(input.name.trim()))) {
    score += 20;
    flags.push("Suspicious name");
  }
  if (input.address && input.address.trim().length < 10) {
    score += 15;
    flags.push("Address too short");
  }

  let courier: FraudResult["courier"] = null;
  if (cfg.courierApiUrl) {
    courier = await courierCheck(cfg.courierApiUrl, cfg.courierApiKey, input.phone);
    if (courier && courier.total > 0) {
      if (courier.ratio < 50) {
        score += 35;
        flags.push(`Courier success only ${courier.ratio}% (${courier.success}/${courier.total})`);
      } else if (courier.ratio >= 85) score -= 10;
    }
  }

  score = Math.max(0, Math.min(100, score));
  return { score, flags, blocked: !!blocked || score >= cfg.blockScore, history, courier };
}

/**
 * Generic courier fraud-check API call. Most BD courier-check services return
 * total / success / cancel parcel counts. Adjust the field names below to match
 * the provider you subscribe to.
 */
async function courierCheck(urlTpl: string, key: string, phone: string) {
  try {
    const res = await fetch(urlTpl.replace("{phone}", phone), {
      headers: { Authorization: `Bearer ${key}`, Accept: "application/json" },
      signal: AbortSignal.timeout(4000),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const j = await res.json();
    const s = j?.courierData?.summary ?? j?.summary ?? j?.data ?? j;
    const total = Number(s.total_parcel ?? s.total ?? 0);
    const success = Number(s.success_parcel ?? s.success ?? s.delivered ?? 0);
    const cancel = Number(s.cancelled_parcel ?? s.cancel ?? s.cancelled ?? total - success);
    return { total, success, cancel, ratio: total ? Math.round((success / total) * 100) : 100 };
  } catch {
    return null;
  }
}
