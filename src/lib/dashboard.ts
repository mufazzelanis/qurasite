import "server-only";
import { db } from "./db";
import type { Range } from "./periods";

const NOT_BAD = { notIn: ["CANCELLED", "RETURNED"] as ("CANCELLED" | "RETURNED")[] };

async function kpis(from: Date, to: Date) {
  const range = { createdAt: { gte: from, lte: to } };
  const [all, good, items, delivered, bad, phones, newCustomers] = await Promise.all([
    db.order.count({ where: range }),
    db.order.aggregate({ where: { ...range, status: NOT_BAD }, _sum: { total: true }, _count: true }),
    db.orderItem.aggregate({ where: { order: { ...range, status: NOT_BAD } }, _sum: { quantity: true } }),
    db.order.aggregate({ where: { ...range, status: "DELIVERED" }, _sum: { total: true }, _count: true }),
    db.order.count({ where: { ...range, status: { in: ["CANCELLED", "RETURNED"] } } }),
    db.order.groupBy({ by: ["phone"], where: range }),
    db.$queryRaw<{ n: number }[]>`
      SELECT count(*)::int AS n FROM (
        SELECT phone, min("createdAt") AS first FROM "Order" GROUP BY phone
      ) t WHERE t.first >= ${from} AND t.first <= ${to}`,
  ]);
  const revenue = good._sum.total || 0;
  return {
    orders: all,
    revenue,
    avg: good._count ? Math.round(revenue / good._count) : 0,
    items: items._sum.quantity || 0,
    delivered: delivered._count,
    deliveredRevenue: delivered._sum.total || 0,
    bad,
    customers: phones.length,
    newCustomers: newCustomers[0]?.n ?? 0,
  };
}

export async function dashboardData(r: Range) {
  const range = { createdAt: { gte: r.from, lte: r.to } };
  const hourly = r.to.getTime() - r.from.getTime() <= 2 * 86400_000;
  const unit = hourly ? "hour" : r.to.getTime() - r.from.getTime() > 400 * 86400_000 ? "month" : "day";

  const [cur, prev, series, byStatus, latest, best, bySource, byArea, pendingNow, landings] = await Promise.all([
    kpis(r.from, r.to),
    kpis(r.prevFrom, r.prevTo),
    db.$queryRaw<{ d: Date; orders: number; revenue: number }[]>`
      SELECT date_trunc(${unit}, "createdAt" + interval '6 hours') AS d,
             count(*)::int AS orders,
             coalesce(sum(total) FILTER (WHERE status NOT IN ('CANCELLED','RETURNED')), 0)::int AS revenue
      FROM "Order" WHERE "createdAt" >= ${r.from} AND "createdAt" <= ${r.to}
      GROUP BY 1 ORDER BY 1`,
    db.order.groupBy({ by: ["status"], where: range, _count: true }),
    db.order.findMany({ where: range, orderBy: { createdAt: "desc" }, take: 7, select: { id: true, orderNo: true, customerName: true, phone: true, total: true, status: true, createdAt: true } }),
    bestSellerRevenue(r.from, r.to),
    db.order.groupBy({ by: ["source"], where: { ...range, status: NOT_BAD }, _count: true, _sum: { total: true } }),
    db.order.groupBy({ by: ["deliveryArea"], where: range, _count: true }),
    db.order.count({ where: { status: "PENDING" } }),
    db.landingPage.findMany({ select: { slug: true, title: true } }),
  ]);

  // zero-fill series
  const OFF = 6 * 3600_000;
  const step = unit === "hour" ? 3600_000 : 86400_000;
  const map = new Map(series.map((s) => [new Date(s.d).getTime(), s]));
  const points: { label: string; revenue: number; orders: number }[] = [];
  if (unit === "month") {
    for (const s of series) points.push({ label: new Date(s.d).toLocaleDateString("en-GB", { month: "short", year: "2-digit", timeZone: "UTC" }), revenue: s.revenue, orders: s.orders });
  } else {
    let t = new Date(r.from.getTime() + OFF);
    if (unit === "day") t.setUTCHours(0, 0, 0, 0);
    else t.setUTCMinutes(0, 0, 0);
    const end = r.to.getTime() + OFF;
    for (; t.getTime() <= end && points.length < 400; t = new Date(t.getTime() + step)) {
      const s = map.get(t.getTime());
      points.push({
        label: unit === "hour" ? `${t.getUTCHours()}:00` : t.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }),
        revenue: s?.revenue ?? 0,
        orders: s?.orders ?? 0,
      });
    }
  }

  const titles = new Map(landings.map((l) => [l.slug, l.title]));
  const delivered = byStatus.find((s) => s.status === "DELIVERED")?._count ?? 0;
  const returned = byStatus.find((s) => s.status === "RETURNED")?._count ?? 0;

  return {
    cur,
    prev,
    points,
    byStatus,
    deliverySuccess: delivered + returned ? Math.round((delivered / (delivered + returned)) * 100) : 0,
    latest,
    best,
    bySource: bySource
      .map((s) => ({ key: s.source, label: s.source === "shop" ? "Main site (shop)" : titles.get(s.source) || `/${s.source}`, orders: s._count, revenue: s._sum.total || 0 }))
      .sort((a, b) => b.revenue - a.revenue),
    byArea: byArea.map((a) => ({ area: a.deliveryArea, n: a._count })).sort((a, b) => b.n - a.n),
    pendingNow,
  };
}

/** Best sellers revenue (sum price*qty) — groupBy can't multiply, so use SQL */
export async function bestSellerRevenue(from: Date, to: Date) {
  return db.$queryRaw<{ name: string; qty: number; revenue: number }[]>`
    SELECT i.name, sum(i.quantity)::int AS qty, sum(i.price * i.quantity)::int AS revenue
    FROM "OrderItem" i JOIN "Order" o ON o.id = i."orderId"
    WHERE o."createdAt" >= ${from} AND o."createdAt" <= ${to} AND o.status NOT IN ('CANCELLED','RETURNED')
    GROUP BY i.name ORDER BY qty DESC LIMIT 6`;
}
