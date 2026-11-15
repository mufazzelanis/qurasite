import Link from "next/link";
import { Prisma } from "@prisma/client";
import { Activity, Globe, Server, ShoppingBag } from "lucide-react";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { getSetting } from "@/lib/settings";
import { FB_EVENTS } from "@/lib/settings-defaults";
import { bdDate, bdStartOfDay } from "@/lib/periods";
import { cn } from "@/lib/utils";
import Pager from "@/components/admin/Pager";
import { ConnectionCheck, PixelSettingsForm, RetryFailed, TestEvent } from "@/components/admin/PixelAdmin";

export const dynamic = "force-dynamic";

type F = { p?: string; from?: string; to?: string; tod?: string; ev?: string; ip?: string; dev?: string; tab?: string; page?: string };
const DAY = 86400_000;
const PER_PAGE = 50;
const LOG_PERIODS = [
  ["today", "Today"],
  ["yesterday", "Yesterday"],
  ["7d", "Last 7 days"],
  ["30d", "Last 30 days"],
] as const;
const TOD: Record<string, [number, number, string]> = {
  night: [0, 6, "Night (12–6 AM)"],
  morning: [6, 12, "Morning (6 AM–12 PM)"],
  afternoon: [12, 18, "Afternoon (12–6 PM)"],
  evening: [18, 24, "Evening (6 PM–12 AM)"],
};
const fmt = (d: Date) => d.toLocaleString("en-GB", { timeZone: "Asia/Dhaka", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true });
const n = (x: bigint | number | null | undefined) => Number(x || 0);

function range(f: F) {
  const today = bdStartOfDay(new Date());
  if (f.from || f.to) return { from: f.from ? bdDate(f.from) : new Date(today.getTime() - 29 * DAY), to: f.to ? new Date(bdDate(f.to).getTime() + DAY) : new Date(Date.now() + 60_000) };
  switch (f.p) {
    case "today":
      return { from: today, to: new Date(Date.now() + 60_000) };
    case "yesterday":
      return { from: new Date(today.getTime() - DAY), to: today };
    case "30d":
      return { from: new Date(today.getTime() - 29 * DAY), to: new Date(Date.now() + 60_000) };
    default:
      return { from: new Date(today.getTime() - 6 * DAY), to: new Date(Date.now() + 60_000) };
  }
}

export default async function PixelPage({ searchParams }: { searchParams: Promise<F> }) {
  await requireAdmin("system");
  const f = await searchParams;
  const t = await getSetting("tracking");
  const today = bdStartOfDay(new Date());
  const weekFrom = new Date(today.getTime() - 6 * DAY);

  // ── log filters ──
  const r = range(f);
  const page = Math.max(1, Number(f.page) || 1);
  const base: Prisma.Sql[] = [Prisma.sql`"createdAt" >= ${r.from}`, Prisma.sql`"createdAt" < ${r.to}`];
  if (f.tod && TOD[f.tod]) base.push(Prisma.sql`EXTRACT(HOUR FROM "createdAt" + interval '6 hours') >= ${TOD[f.tod][0]} AND EXTRACT(HOUR FROM "createdAt" + interval '6 hours') < ${TOD[f.tod][1]}`);
  if (f.ev) base.push(Prisma.sql`"eventName" = ${f.ev}`);
  if (f.ip) base.push(Prisma.sql`ip LIKE ${f.ip.trim() + "%"}`);
  if (f.dev) base.push(Prisma.sql`device = ${f.dev}`);
  const conds = f.tab === "failed" ? [...base, Prisma.sql`result = 'failed'`] : base;
  const W = Prisma.sql`WHERE ${Prisma.join(conds, " AND ")}`;
  const WB = Prisma.sql`WHERE ${Prisma.join(base, " AND ")}`;

  const [day, week, byEvent, failedRetry, rows, total, topIps, meta, landings, contentPages] = await Promise.all([
    db.capiLog.groupBy({ by: ["result"], where: { createdAt: { gte: new Date(Date.now() - DAY) }, isTest: false }, _count: true }),
    db.$queryRaw<{ d: string; sent: bigint; failed: bigint }[]>`
      SELECT to_char("createdAt" + interval '6 hours', 'YYYY-MM-DD') d,
             COUNT(*) FILTER (WHERE result = 'sent') sent, COUNT(*) FILTER (WHERE result = 'failed') failed
      FROM "CapiLog" WHERE "createdAt" >= ${weekFrom} AND "isTest" = false GROUP BY 1`,
    db.capiLog.groupBy({ by: ["eventName", "result"], where: { createdAt: { gte: weekFrom }, isTest: false, result: { not: "bot" } }, _count: true }),
    db.capiLog.count({ where: { result: "failed", createdAt: { gte: new Date(Date.now() - 7 * DAY) } } }),
    db.$queryRaw<{ id: string; createdAt: Date; eventName: string; eventId: string; pixelId: string; pixelLabel: string | null; orderNo: string | null; source: string | null; result: string; status: number; response: string | null; ip: string | null; device: string | null; os: string | null; browser: string | null; isTest: boolean }[]>`
      SELECT id, "createdAt", "eventName", "eventId", "pixelId", "pixelLabel", "orderNo", source, result, status, response, ip, device, os, browser, "isTest"
      FROM "CapiLog" ${W} ORDER BY "createdAt" DESC LIMIT ${PER_PAGE} OFFSET ${(page - 1) * PER_PAGE}`,
    db.$queryRaw<{ c: bigint }[]>`SELECT COUNT(*) c FROM "CapiLog" ${W}`,
    db.$queryRaw<{ ip: string; c: bigint }[]>`SELECT ip, COUNT(*) c FROM "CapiLog" ${WB} AND ip IS NOT NULL GROUP BY ip ORDER BY c DESC LIMIT 6`,
    db.$queryRaw<{ uniq: bigint; bots: bigint }[]>`SELECT COUNT(DISTINCT ip) FILTER (WHERE result <> 'bot') uniq, COUNT(*) FILTER (WHERE result = 'bot') bots FROM "CapiLog" ${WB}`,
    db.landingPage.findMany({ orderBy: { createdAt: "asc" }, select: { slug: true, title: true, active: true, pixelMode: true, pixelIds: true } }),
    db.page.findMany({ orderBy: { sortOrder: "asc" }, select: { slug: true, title: true, active: true, pixelMode: true, pixelIds: true } }),
  ]);

  // ── summary ──
  const dayCount = (k: string) => day.find((x) => x.result === k)?._count || 0;
  const sent24 = dayCount("sent");
  const failed24 = dayCount("failed");
  const withToken = t.pixels.filter((p) => p.token).length;
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekFrom.getTime() + i * DAY + 6 * 3600_000).toISOString().slice(0, 10);
    const row = week.find((w) => w.d === d);
    return { d, sent: n(row?.sent), failed: n(row?.failed) };
  });
  const weekSent = days.reduce((a, x) => a + x.sent, 0);
  const weekAll = days.reduce((a, x) => a + x.sent + x.failed, 0);
  const max = Math.max(1, ...days.map((x) => x.sent + x.failed));
  const evNames = [...new Set([...FB_EVENTS.map(([k]) => k as string), ...byEvent.map((e) => e.eventName)])];
  const evStats = evNames
    .map((name) => {
      const s = byEvent.filter((e) => e.eventName === name);
      const all = s.reduce((a, x) => a + x._count, 0);
      return { name, all, sent: s.find((x) => x.result === "sent")?._count || 0 };
    })
    .filter((e) => e.all > 0)
    .sort((a, b) => b.all - a.all);
  const totalRows = n(total[0]?.c);
  const pages = Math.max(1, Math.ceil(totalRows / PER_PAGE));
  const libName = (id: string) => t.pixels.find((p) => p.id === id)?.label || id;
  const pixelName = (id: string, label: string | null) => label || libName(id);
  // where each pixel fires: main site + every landing page + every content page
  const siteIds = t.pixels.filter((p) => p.id && p.site !== false).map((p) => p.id);
  const routes = [
    { kind: "Main site", path: "/", title: "Home, shop, products, checkout", active: true, mode: "site", ids: siteIds },
    ...landings.map((l) => ({ kind: "Landing", path: `/${l.slug}`, title: l.title, active: l.active, mode: l.pixelMode, ids: l.pixelMode === "own" ? l.pixelIds : l.pixelMode === "site" ? siteIds : [] })),
    ...contentPages.map((p) => ({ kind: "Page", path: `/${p.slug}`, title: p.title, active: p.active, mode: p.pixelMode, ids: p.pixelMode === "own" ? p.pixelIds : p.pixelMode === "site" ? siteIds : [] })),
  ];

  const qs = (o: Partial<Record<keyof F, string | undefined>>) =>
    "?" + new URLSearchParams(Object.entries({ ...f, ...o }).filter(([, v]) => v !== undefined && v !== "") as [string, string][]).toString();
  const activePeriod = f.from || f.to ? "" : f.p || "7d";
  const trigger = { placed: "On order", confirmed: "On confirm", delivered: "On delivery" }[t.purchaseTrigger];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Facebook Pixel & Conversions API</h1>
        <p className="text-sm text-zinc-500">Browser pixel and server-side events, deduplicated by a shared event ID.</p>
      </div>

      {/* status cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat icon={Globe} label="Browser pixel" value={t.browserEnabled && t.pixels.length ? "Active" : "Off"} ok={t.browserEnabled && t.pixels.length > 0} sub={`${t.pixels.length} pixel · ${t.pixels.map((p) => p.id).join(", ") || "not set"}`} />
        <Stat icon={Server} label="Conversions API" value={t.capiEnabled && withToken ? "Active" : "Off"} ok={t.capiEnabled && withToken > 0} sub={`${withToken} pixel · Graph ${t.graphVersion}`} />
        <Stat icon={Activity} label="Server events (24h)" value={(sent24 + failed24).toLocaleString()} sub={`${sent24.toLocaleString()} delivered · ${failed24} failed`} warn={failed24 > 0} />
        <Stat icon={ShoppingBag} label="Purchase reported" value={trigger} sub={`${t.browserEnabled && t.purchaseTrigger === "placed" ? "Browser + server" : "Server only"} · value: ${t.purchaseValue === "total" ? "order total" : "products only"}`} />
      </div>
      {t.fbTestEventCode && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          ⚠ Test Event Code <b>{t.fbTestEventCode}</b> is on — every server event goes to “Test events” only. Remove it before running ads.
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          {/* 7-day chart */}
          <div className="a-card">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm text-zinc-500">Server events · last 7 days</p>
                <p className="text-2xl font-bold">
                  {weekAll.toLocaleString()} <span className="text-sm font-medium text-emerald-600">{weekAll ? Math.round((weekSent / weekAll) * 1000) / 10 : 100}% delivered</span>
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs text-zinc-500">
                <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-emerald-500" /> Delivered</span>
                <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-rose-500" /> Failed</span>
              </div>
            </div>
            <div className="mt-6 flex h-48 items-end gap-2 sm:gap-4">
              {days.map((x) => (
                <div key={x.d} className="group flex h-full flex-1 flex-col items-center justify-end gap-1.5">
                  <span className="text-[11px] font-medium text-zinc-500 opacity-0 transition group-hover:opacity-100">{(x.sent + x.failed).toLocaleString()}</span>
                  <div className="flex w-full max-w-14 flex-col justify-end overflow-hidden rounded-t-md bg-zinc-100" style={{ height: `${Math.max(2, ((x.sent + x.failed) / max) * 100)}%` }}>
                    {x.failed > 0 && <div className="bg-rose-500" style={{ height: `${(x.failed / (x.sent + x.failed)) * 100}%` }} />}
                    <div className="flex-1 bg-emerald-500" />
                  </div>
                  <span className="text-[11px] text-zinc-400">{new Date(x.d + "T00:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" })}</span>
                </div>
              ))}
            </div>
          </div>

          <PixelSettingsForm initial={{ ...t, pixels: t.pixels.map((p) => ({ id: p.id, label: p.label, tokenTail: p.token ? p.token.slice(-4) : "", site: p.site !== false })) }} />

          {/* where each pixel fires */}
          <div className="a-card space-y-3">
            <div>
              <h2 className="font-semibold">Where each pixel fires</h2>
              <p className="text-sm text-zinc-500">Browser pixel and Conversions API follow the same rule. Change a landing page or page in its own editor.</p>
            </div>
            <div className="-mx-5 overflow-x-auto">
              <table className="w-full min-w-[620px] text-sm">
                <thead className="border-y border-zinc-100 bg-zinc-50/70">
                  <tr>
                    <th className="a-th">Where</th>
                    <th className="a-th">Setting</th>
                    <th className="a-th">Facebook pixels</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {routes.map((r) => (
                    <tr key={r.kind + r.path} className={cn(!r.active && "opacity-50")}>
                      <td className="a-td">
                        <span className={cn("mr-2 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase", r.kind === "Main site" ? "bg-brand-100 text-brand-800" : r.kind === "Landing" ? "bg-gold-100 text-gold-700" : "bg-sky-100 text-sky-700")}>{r.kind}</span>
                        <a href={r.path} target="_blank" className="font-mono text-xs text-brand-700 hover:underline">
                          {r.path}
                        </a>
                        <p className="mt-0.5 truncate text-xs text-zinc-400">{r.title}</p>
                      </td>
                      <td className="a-td text-xs">{r.kind === "Main site" ? "Pixels ticked “main site”" : r.mode === "own" ? "Own pixels" : r.mode === "none" ? "No pixel" : "Same as main site"}</td>
                      <td className="a-td">
                        {r.ids.length ? (
                          <div className="flex flex-wrap gap-1">
                            {r.ids.map((id) => (
                              <span key={id} title={id} className={cn("rounded-md px-1.5 py-0.5 text-[11px] font-medium", t.pixels.some((p) => p.id === id) ? "bg-zinc-100 text-zinc-700" : "bg-amber-50 text-amber-700")}>
                                {libName(id)}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-zinc-400">— none —</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-zinc-400">Amber = pixel not in the library (uses the primary token for server events).</p>
          </div>
        </div>

        {/* right column */}
        <div className="space-y-5">
          <ConnectionCheck />
          <TestEvent defaultCode={t.fbTestEventCode} />
          <div className="a-card space-y-3">
            <h3 className="font-semibold">By event · last 7 days</h3>
            {evStats.length === 0 && <p className="text-sm text-zinc-400">No server events yet.</p>}
            {evStats.map((e) => (
              <div key={e.name}>
                <div className="flex justify-between text-sm">
                  <span>{e.name}</span>
                  <span className="text-zinc-500">{e.sent.toLocaleString()} / {e.all.toLocaleString()}</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-rose-100">
                  <div className="h-full rounded-full bg-emerald-500" style={{ width: `${(e.sent / e.all) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="a-card space-y-2 text-sm text-zinc-600">
            <h3 className="font-semibold text-zinc-900">How it works</h3>
            <ul className="list-disc space-y-1.5 pl-4 text-xs leading-relaxed">
              <li>Browser and server send each event with the same <b>event ID</b>, so Meta counts each event once.</li>
              <li>Server events include <b>_fbp / _fbc</b> (ad click IDs are captured on landing), IP and device.</li>
              <li>Purchase adds SHA-256 hashed <b>phone (880…)</b>, name and country for high match quality.</li>
              <li>Temporary errors are retried automatically for 7 days; anything still failing can be retried below.</li>
              <li>Bots and crawlers are logged but never sent. Access tokens stay on the server — the browser only sees pixel IDs.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* ── server event log ── */}
      <div className="a-card space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold">Server event log</h2>
            <p className="text-sm text-zinc-500">{totalRows.toLocaleString()} Conversions API requests in this range · every event is kept for 30 days.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-center">
              <p className="text-[10px] font-semibold uppercase text-emerald-700">Visitors · unique IPs</p>
              <p className="text-lg font-bold text-emerald-800">{n(meta[0]?.uniq).toLocaleString()}</p>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-center">
              <p className="text-[10px] font-semibold uppercase text-zinc-500">Bot events</p>
              <p className="text-lg font-bold text-zinc-700">{n(meta[0]?.bots).toLocaleString()}</p>
            </div>
            <div className="ml-1 flex overflow-hidden rounded-lg border border-zinc-200 text-sm">
              <Link href={qs({ tab: undefined, page: undefined })} className={cn("px-3 py-1.5", f.tab !== "failed" ? "bg-brand-700 text-white" : "hover:bg-zinc-50")}>All</Link>
              <Link href={qs({ tab: "failed", page: undefined })} className={cn("px-3 py-1.5", f.tab === "failed" ? "bg-rose-600 text-white" : "hover:bg-zinc-50")}>Failed</Link>
            </div>
            <RetryFailed count={failedRetry} />
          </div>
        </div>

        <form className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase text-zinc-400">Date</span>
            {LOG_PERIODS.map(([k, l]) => (
              <Link key={k} href={qs({ p: k, from: undefined, to: undefined, page: undefined })} className={cn("rounded-lg border px-3 py-1.5 text-sm", activePeriod === k ? "border-brand-700 bg-brand-700 text-white" : "border-zinc-200 hover:bg-zinc-50")}>
                {l}
              </Link>
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-[1fr_1fr_1fr_1fr_1fr_1fr_auto]">
            <label className="text-xs text-zinc-500">From<input type="date" name="from" defaultValue={f.from} className="a-input mt-1" /></label>
            <label className="text-xs text-zinc-500">To<input type="date" name="to" defaultValue={f.to} className="a-input mt-1" /></label>
            <label className="text-xs text-zinc-500">Time of day
              <select name="tod" defaultValue={f.tod ?? ""} className="a-input mt-1">
                <option value="">Any time</option>
                {Object.entries(TOD).map(([k, [, , l]]) => <option key={k} value={k}>{l}</option>)}
              </select>
            </label>
            <label className="text-xs text-zinc-500">Event
              <select name="ev" defaultValue={f.ev ?? ""} className="a-input mt-1">
                <option value="">All events</option>
                {[...FB_EVENTS.map(([k]) => k), "Search", "Contact"].map((k) => <option key={k}>{k}</option>)}
              </select>
            </label>
            <label className="text-xs text-zinc-500">IP address<input name="ip" defaultValue={f.ip} placeholder="e.g. 103.88.12.40" className="a-input mt-1" /></label>
            <label className="text-xs text-zinc-500">Device
              <select name="dev" defaultValue={f.dev ?? ""} className="a-input mt-1">
                <option value="">All devices</option>
                <option>Phone</option>
                <option>Computer</option>
                <option>Tablet</option>
              </select>
            </label>
            {f.p && !f.from && !f.to && <input type="hidden" name="p" value={f.p} />}
            {f.tab && <input type="hidden" name="tab" value={f.tab} />}
            <button className="a-btn self-end">Filter</button>
          </div>
        </form>

        {topIps.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-semibold uppercase text-zinc-400">Top IPs</span>
            {topIps.map((x) => (
              <Link key={x.ip} href={qs({ ip: x.ip, page: undefined })} className={cn("rounded-md border px-2 py-1 font-mono", f.ip === x.ip ? "border-brand-700 bg-brand-50" : "border-zinc-200 hover:bg-zinc-50")}>
                {x.ip} <b className="ml-1 text-zinc-500">{n(x.c)}</b>
              </Link>
            ))}
            {f.ip && <Link href={qs({ ip: undefined, page: undefined })} className="text-rose-600 hover:underline">clear</Link>}
          </div>
        )}

        <div className="-mx-5 overflow-x-auto">
          <table className="w-full min-w-[1100px] text-sm">
            <thead>
              <tr>
                {["Time", "Event", "Pixel", "Order", "Result", "IP", "Device", "Facebook response"].map((h) => <th key={h} className="a-th">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((x) => (
                <tr key={x.id} className="border-t border-zinc-100 align-top hover:bg-zinc-50/60">
                  <td className="a-td whitespace-nowrap text-zinc-600">{fmt(x.createdAt)}</td>
                  <td className="a-td">
                    <span className={cn("rounded-md px-2 py-0.5 text-xs font-semibold", x.eventName === "Purchase" ? "bg-emerald-100 text-emerald-800" : x.eventName === "OrderCancelled" ? "bg-rose-100 text-rose-700" : x.eventName === "PageView" ? "bg-zinc-100 text-zinc-700" : "bg-sky-100 text-sky-800")}>{x.eventName}</span>
                    {x.isTest && <span className="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">TEST</span>}
                    <p className="mt-1 max-w-44 truncate font-mono text-[10px] text-zinc-400" title={x.eventId}>{x.eventId}</p>
                  </td>
                  <td className="a-td">
                    <p className="text-xs">{pixelName(x.pixelId, x.pixelLabel)}{x.source && x.source !== "shop" && <span className="text-zinc-400"> · /{x.source.replace(/^page:/, "")}</span>}</p>
                    <p className="font-mono text-[10px] text-zinc-400">{x.pixelId}</p>
                  </td>
                  <td className="a-td text-xs">{x.orderNo && x.orderNo !== "TEST" ? <Link href={`/admin/orders?q=${x.orderNo}`} className="font-semibold text-brand-700 hover:underline">#{x.orderNo}</Link> : <span className="text-zinc-300">—</span>}</td>
                  <td className="a-td">
                    {x.result === "sent" ? (
                      <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">Sent {x.status}</span>
                    ) : x.result === "bot" ? (
                      <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-zinc-500">Bot</span>
                    ) : (
                      <span className="rounded-md bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-700">Failed {x.status || ""}</span>
                    )}
                  </td>
                  <td className="a-td font-mono text-xs">
                    {x.ip ? <Link href={qs({ ip: x.ip, page: undefined })} className="hover:underline">{x.ip}</Link> : "—"}
                  </td>
                  <td className="a-td text-xs">
                    <p>{x.device === "Phone" ? "📱" : x.device === "Tablet" ? "📱" : "💻"} {x.device || "—"}</p>
                    <p className="text-zinc-400">{[x.os, x.browser].filter(Boolean).join(" · ")}</p>
                  </td>
                  <td className={cn("a-td max-w-72 text-xs", x.result === "failed" ? "text-rose-600" : "text-zinc-500")}>
                    <p className="line-clamp-2 break-all" title={x.response || ""}>{x.response}</p>
                  </td>
                </tr>
              ))}
              {!rows.length && (
                <tr>
                  <td colSpan={8} className="a-td py-10 text-center text-zinc-400">
                    No server events in this range. {!withToken && "Add a Pixel ID + Conversions API token above to start sending."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="-mx-5 -mb-5 border-t border-zinc-100">
          <Pager page={page} pages={pages} href={(p) => qs({ page: String(p) })} note={`${PER_PAGE} per page`} />
        </div>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value, sub, ok, warn }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; sub: string; ok?: boolean; warn?: boolean }) {
  return (
    <div className="a-card">
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-500">{label}</p>
        <Icon className="size-4 text-zinc-400" />
      </div>
      <p className={cn("mt-2 flex items-center gap-2 text-2xl font-bold", ok === false && "text-zinc-400", warn && "text-rose-600")}>
        {ok !== undefined && <span className={cn("size-2.5 rounded-full", ok ? "bg-emerald-500 shadow-[0_0_0_4px] shadow-emerald-100" : "bg-zinc-300")} />}
        {value}
      </p>
      <p className="mt-1 truncate text-xs text-zinc-400" title={sub}>{sub}</p>
    </div>
  );
}
