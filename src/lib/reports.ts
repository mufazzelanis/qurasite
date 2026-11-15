import "server-only";
import { db } from "./db";

/** Daily revenue / orders series in Bangladesh time (UTC+6), zero-filled. */
export async function dailySeries(from: Date, to: Date) {
  const rows = await db.$queryRaw<{ d: Date; orders: number; revenue: number; delivered: number }[]>`
    SELECT date_trunc('day', "createdAt" + interval '6 hours') AS d,
           count(*)::int AS orders,
           coalesce(sum(total) FILTER (WHERE status <> 'CANCELLED'), 0)::int AS revenue,
           coalesce(sum(total) FILTER (WHERE status = 'DELIVERED'), 0)::int AS delivered
    FROM "Order"
    WHERE "createdAt" >= ${from} AND "createdAt" <= ${to}
    GROUP BY 1 ORDER BY 1`;
  const map = new Map(rows.map((r) => [new Date(r.d).toISOString().slice(0, 10), r]));
  const out: { date: string; label: string; orders: number; revenue: number; delivered: number }[] = [];
  const cur = new Date(from.getTime() + 6 * 3600_000);
  cur.setUTCHours(0, 0, 0, 0);
  const end = new Date(to.getTime() + 6 * 3600_000);
  while (cur <= end) {
    const k = cur.toISOString().slice(0, 10);
    const r = map.get(k);
    out.push({
      date: k,
      label: cur.toLocaleDateString("en-GB", { day: "2-digit", month: "short", timeZone: "UTC" }),
      orders: r?.orders ?? 0,
      revenue: r?.revenue ?? 0,
      delivered: r?.delivered ?? 0,
    });
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return out;
}

export async function funnel(from: Date, to: Date) {
  const names = ["PageView", "ViewContent", "AddToCart", "InitiateCheckout", "Purchase"];
  const rows = await db.$queryRaw<{ name: string; sessions: number }[]>`
    SELECT name, count(DISTINCT coalesce("sessionId", id))::int AS sessions
    FROM "AnalyticsEvent"
    WHERE "createdAt" >= ${from} AND "createdAt" <= ${to}
    GROUP BY name`;
  return names.map((n) => ({ name: n, sessions: rows.find((r) => r.name === n)?.sessions ?? 0 }));
}

export function bdDayStart(daysAgo = 0) {
  const now = new Date(Date.now() + 6 * 3600_000);
  now.setUTCHours(0, 0, 0, 0);
  now.setUTCDate(now.getUTCDate() - daysAgo);
  return new Date(now.getTime() - 6 * 3600_000);
}
