import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "./db";
import { bdDate, bdStartOfDay } from "./periods";

export const VISIT_PERIODS = [
  ["today", "Today"],
  ["yesterday", "Yesterday"],
  ["3d", "Last 3 days"],
  ["7d", "Last 7 days"],
  ["30d", "Last 30 days"],
  ["month", "This month"],
  ["all", "All (90 days)"],
] as const;

export const ORDER_BUTTONS = ["order_button", "sticky_bar", "confirm_order", "combo", "buy_now"];

export type VisitFilters = { p?: string; from?: string; to?: string; fh?: string; th?: string; slug?: string; page?: string };

export function visitRange(f: VisitFilters) {
  const DAY = 86400_000;
  const today = bdStartOfDay(new Date());
  let from = today;
  let to = new Date();
  if (f.from || f.to) {
    from = f.from ? bdDate(f.from) : new Date(Date.now() - 90 * DAY);
    to = f.to ? new Date(bdDate(f.to).getTime() + DAY - 1) : new Date();
  } else {
    switch (f.p) {
      case "yesterday":
        from = new Date(today.getTime() - DAY);
        to = new Date(today.getTime() - 1);
        break;
      case "3d":
        from = new Date(today.getTime() - 2 * DAY);
        break;
      case "7d":
        from = new Date(today.getTime() - 6 * DAY);
        break;
      case "30d":
        from = new Date(today.getTime() - 29 * DAY);
        break;
      case "month": {
        const bd = new Date(Date.now() + 6 * 3600_000);
        from = new Date(Date.UTC(bd.getUTCFullYear(), bd.getUTCMonth(), 1) - 6 * 3600_000);
        break;
      }
      case "all":
        from = new Date(Date.now() - 90 * DAY);
        break;
    }
  }
  return { from, to };
}

/** WHERE clause shared by all visitor queries (date range, BD hour window, landing page) */
function where(f: VisitFilters, col: "startedAt" | "createdAt", table: "v" | "c") {
  const { from, to } = visitRange(f);
  const t = Prisma.raw(`${table}."${col}"`);
  const parts: Prisma.Sql[] = [Prisma.sql`${t} >= ${from}`, Prisma.sql`${t} <= ${to}`];
  const fh = f.fh !== undefined && f.fh !== "" ? Number(f.fh) : null;
  const th = f.th !== undefined && f.th !== "" ? Number(f.th) : null;
  if (fh !== null) parts.push(Prisma.sql`extract(hour from ${t} + interval '6 hours') >= ${fh}`);
  if (th !== null) parts.push(Prisma.sql`extract(hour from ${t} + interval '6 hours') <= ${th}`);
  const slugCol = Prisma.raw(`${table}."landingSlug"`);
  if (f.slug === "_main") parts.push(Prisma.sql`${slugCol} IS NULL`);
  else if (f.slug) parts.push(Prisma.sql`${slugCol} = ${f.slug}`);
  else parts.push(Prisma.sql`${slugCol} IS NOT NULL`); // default: landing pages only
  return Prisma.join(parts, " AND ");
}

export async function visitorStats(f: VisitFilters) {
  const wv = where(f, "startedAt", "v");
  const wc = where(f, "createdAt", "c");
  const btn = Prisma.join(ORDER_BUTTONS);

  const [totals, clicks, hourly, sources, devices, pages] = await Promise.all([
    db.$queryRaw<{ visits: number; ips: number; form: number; clicked: number; orders: number; avg: number }[]>`
      SELECT count(*)::int AS visits, count(DISTINCT v.ip)::int AS ips,
             count(*) FILTER (WHERE v."reachedForm")::int AS form,
             count(*) FILTER (WHERE v."clickedOrder")::int AS clicked,
             count(DISTINCT v."orderNo")::int AS orders,
             coalesce(avg(v."durationSec"), 0)::int AS avg
      FROM "PageVisit" v WHERE ${wv}`,
    db.$queryRaw<{ n: number; visitors: number }[]>`
      SELECT count(*)::int AS n, count(DISTINCT coalesce(c."visitId", c."sessionId"))::int AS visitors
      FROM "ClickEvent" c WHERE ${wc} AND c.button IN (${btn})`,
    db.$queryRaw<{ h: number; visits: number; clicks: number }[]>`
      SELECT g.h::int AS h,
        (SELECT count(*) FROM "PageVisit" v WHERE ${wv} AND extract(hour from v."startedAt" + interval '6 hours') = g.h)::int AS visits,
        (SELECT count(*) FROM "ClickEvent" c WHERE ${wc} AND c.button IN (${btn}) AND extract(hour from c."createdAt" + interval '6 hours') = g.h)::int AS clicks
      FROM generate_series(0, 23) AS g(h) ORDER BY g.h`,
    db.$queryRaw<{ source: string; n: number }[]>`SELECT v.source, count(*)::int AS n FROM "PageVisit" v WHERE ${wv} GROUP BY 1 ORDER BY 2 DESC`,
    db.$queryRaw<{ device: string; n: number }[]>`SELECT coalesce(v.device,'Other') AS device, count(*)::int AS n FROM "PageVisit" v WHERE ${wv} GROUP BY 1 ORDER BY 2 DESC`,
    db.$queryRaw<{ slug: string | null; visits: number; clicks: number; orders: number }[]>`
      SELECT v."landingSlug" AS slug, count(*)::int AS visits,
             count(*) FILTER (WHERE v."clickedOrder")::int AS clicks,
             count(DISTINCT v."orderNo")::int AS orders
      FROM "PageVisit" v WHERE ${wv} GROUP BY 1 ORDER BY 2 DESC`,
  ]);

  const withVisits = hourly.filter((h) => h.visits > 0);
  const peak = withVisits.length ? withVisits.reduce((a, b) => (b.visits > a.visits ? b : a)) : null;
  const quiet = hourly.reduce((a, b) => (b.visits < a.visits ? b : a), hourly[0]);
  return { t: totals[0], clicks: clicks[0], hourly, peak, quiet, sources, devices, pages };
}

export async function clickLog(f: VisitFilters, perPage = 25) {
  const wc = where(f, "createdAt", "c");
  const page = Math.max(1, Number(f.page || 1));
  const [rows, count] = await Promise.all([
    db.$queryRaw<
      { id: string; createdAt: Date; button: string; label: string | null; amount: number | null; ip: string | null; device: string | null; os: string | null; browser: string | null; path: string; afterSec: number; orderNo: string | null; ipCount: number }[]
    >`
      SELECT c.*, count(*) OVER (PARTITION BY c.ip)::int AS "ipCount"
      FROM "ClickEvent" c WHERE ${wc}
      ORDER BY c."createdAt" DESC LIMIT ${perPage} OFFSET ${(page - 1) * perPage}`,
    db.$queryRaw<{ n: number }[]>`SELECT count(*)::int AS n FROM "ClickEvent" c WHERE ${wc}`,
  ]);
  return { rows, total: count[0]?.n ?? 0, page, pages: Math.max(1, Math.ceil((count[0]?.n ?? 0) / perPage)) };
}
