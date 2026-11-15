import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { bdStartOfDay } from "@/lib/periods";

export const dynamic = "force-dynamic";
const ACTIVE_MS = 40_000;

export async function GET(req: Request) {
  const scope = new URL(req.url).searchParams.get("scope") || "landing"; // landing | all
  const now = Date.now();
  const activeSince = new Date(now - ACTIVE_MS);
  const five = new Date(now - 5 * 60_000);
  const lp = scope === "landing" ? { landingSlug: { not: null } } : {};
  const activeWhere = { ...lp, leftAt: null, lastSeen: { gte: activeSince } };

  const [active, arrived5, left5, visitsToday, stages, recentOrders, pending, series, arrivals, leaves, bySlug] = await Promise.all([
    db.pageVisit.findMany({
      where: activeWhere,
      orderBy: { startedAt: "desc" },
      take: 100,
      select: { id: true, path: true, landingSlug: true, device: true, os: true, browser: true, source: true, stage: true, maxScroll: true, startedAt: true },
    }),
    db.pageVisit.count({ where: { ...lp, startedAt: { gte: five } } }),
    db.pageVisit.count({ where: { ...lp, OR: [{ leftAt: { gte: five } }, { leftAt: null, lastSeen: { gte: five, lt: activeSince } }] } }),
    db.pageVisit.count({ where: { ...lp, startedAt: { gte: bdStartOfDay(new Date()) } } }),
    db.pageVisit.groupBy({ by: ["stage"], where: activeWhere, _count: true }),
    db.order.findMany({ orderBy: { createdAt: "desc" }, take: 8, select: { id: true, orderNo: true, customerName: true, total: true, status: true, fraudScore: true, createdAt: true, source: true } }),
    db.order.count({ where: { status: "PENDING" } }),
    // people on the pages, minute by minute, last 30 minutes
    db.$queryRaw<{ m: Date; n: number }[]>`
      SELECT g.m, count(v.id)::int AS n
      FROM generate_series(date_trunc('minute', now()) - interval '29 minutes', date_trunc('minute', now()), interval '1 minute') AS g(m)
      LEFT JOIN "PageVisit" v
        ON v."startedAt" < g.m + interval '1 minute'
       AND COALESCE(v."leftAt", v."lastSeen") >= g.m
       AND (${scope} <> 'landing' OR v."landingSlug" IS NOT NULL)
      GROUP BY g.m ORDER BY g.m`,
    db.pageVisit.findMany({ where: { ...lp, startedAt: { gte: new Date(now - 30 * 60_000) } }, orderBy: { startedAt: "desc" }, take: 25, select: { id: true, path: true, source: true, device: true, startedAt: true } }),
    db.pageVisit.findMany({ where: { ...lp, leftAt: { gte: new Date(now - 30 * 60_000) } }, orderBy: { leftAt: "desc" }, take: 25, select: { id: true, path: true, source: true, device: true, leftAt: true } }),
    db.pageVisit.groupBy({ by: ["landingSlug"], where: activeWhere, _count: true }),
  ]);

  const feed = [
    ...arrivals.map((a) => ({ id: a.id + "a", type: "arrived" as const, path: a.path, source: a.source, device: a.device, at: a.startedAt })),
    ...leaves.map((l) => ({ id: l.id + "l", type: "left" as const, path: l.path, source: l.source, device: l.device, at: l.leftAt! })),
  ]
    .sort((a, b) => +b.at - +a.at)
    .slice(0, 30);

  const stage = (s: string) => stages.find((x) => x.stage === s)?._count ?? 0;

  return NextResponse.json({
    online: active.length,
    active,
    arrived5,
    left5,
    visitsToday,
    onForm: stage("form"),
    top: stage("top"),
    reading: stage("reading"),
    series: series.map((s) => s.n),
    feed,
    bySlug: bySlug.map((b) => ({ slug: b.landingSlug || "main site", n: b._count })),
    recentOrders,
    pending,
  });
}
