import Link from "next/link";
import { ArrowRight, Boxes, Clock, PackageCheck, RefreshCcw, ShoppingBag, Target, Users, Wallet } from "lucide-react";
import { dashboardData } from "@/lib/dashboard";
import { getRange, pctChange } from "@/lib/periods";
import { db } from "@/lib/db";
import { DELIVERY_LABELS, STATUS_META, cn, taka } from "@/lib/utils";
import PeriodTabs from "@/components/admin/PeriodTabs";
import LiveLandingPanel from "@/components/admin/LiveLandingPanel";
import RevenueChart from "@/components/admin/RevenueChart";

const DOT: Record<string, string> = { PENDING: "bg-amber-400", CONFIRMED: "bg-sky-500", PROCESSING: "bg-indigo-500", SHIPPED: "bg-violet-500", DELIVERED: "bg-emerald-500", CANCELLED: "bg-rose-500", RETURNED: "bg-zinc-500" };

function Delta({ cur, prev, inverse }: { cur: number; prev: number; inverse?: boolean }) {
  const c = pctChange(cur, prev);
  if (c === null) return <span className="text-emerald-600">▲ new</span>;
  if (c === 0) return <span className="text-zinc-400">—</span>;
  const good = inverse ? c < 0 : c > 0;
  return <span className={good ? "text-emerald-600" : "text-rose-600"}>{c > 0 ? "▲" : "▼"} {Math.abs(c)}%</span>;
}

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ p?: string; from?: string; to?: string; denied?: string }> }) {
  const sp = await searchParams;
  const r = getRange(sp.p || "month", sp.from, sp.to);
  const [d, firstLanding] = await Promise.all([dashboardData(r), db.landingPage.findFirst({ where: { active: true }, select: { slug: true } })]);
  const { cur, prev } = d;
  const totalStatus = d.byStatus.reduce((a, s) => a + s._count, 0);
  const sourceTotal = d.bySource.reduce((a, s) => a + s.revenue, 0);
  const areaTotal = d.byArea.reduce((a, s) => a + s.n, 0);
  const qs = `p=${r.key}${sp.from ? `&from=${sp.from}` : ""}${sp.to ? `&to=${sp.to}` : ""}`;

  const cards = [
    { label: "Orders", value: String(cur.orders), raw: cur.orders, prev: prev.orders, icon: ShoppingBag, tone: "text-emerald-600 bg-emerald-50" },
    { label: "Revenue", value: taka(cur.revenue), raw: cur.revenue, prev: prev.revenue, sub: "not cancelled / returned", icon: Wallet, tone: "text-sky-600 bg-sky-50" },
    { label: "Average order", value: taka(cur.avg), raw: cur.avg, prev: prev.avg, icon: Target, tone: "text-indigo-600 bg-indigo-50" },
    { label: "Items sold", value: String(cur.items), raw: cur.items, prev: prev.items, icon: Boxes, tone: "text-teal-600 bg-teal-50" },
    { label: "Delivered", value: String(cur.delivered), raw: cur.delivered, prev: prev.delivered, sub: taka(cur.deliveredRevenue), icon: PackageCheck, tone: "text-emerald-600 bg-emerald-50" },
    { label: "Cancelled / returned", value: String(cur.bad), raw: cur.bad, prev: prev.bad, sub: `${cur.orders ? ((cur.bad / cur.orders) * 100).toFixed(1) : 0}% of orders`, icon: RefreshCcw, tone: "text-rose-600 bg-rose-50", inverse: true },
    { label: "Customers", value: String(cur.customers), raw: cur.customers, prev: prev.customers, sub: `${cur.newCustomers} new`, icon: Users, tone: "text-violet-600 bg-violet-50" },
  ];

  return (
    <div className="space-y-6">
      {sp.denied && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">You don&apos;t have permission to open that section.</p>}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-zinc-500">Pick a period — every number, chart and list below follows it.</p>
        </div>
        <Link href={`/admin/orders?${qs}`} className="a-btn">
          View these orders <ArrowRight className="size-4" />
        </Link>
      </div>

      <LiveLandingPanel openHref={firstLanding ? `/${firstLanding.slug}` : undefined} />

      <PeriodTabs current={r.key} label={r.label} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="a-card">
            <div className="flex items-start justify-between">
              <p className="text-sm text-zinc-500">{c.label}</p>
              <span className={cn("grid size-9 place-items-center rounded-lg", c.tone)}>
                <c.icon className="size-4" />
              </span>
            </div>
            <p className="mt-2 text-3xl font-extrabold">{c.value}</p>
            {c.sub && <p className="text-xs text-zinc-400">{c.sub}</p>}
            <p className="mt-2 text-xs text-zinc-400">
              <Delta cur={c.raw} prev={c.prev} inverse={c.inverse} /> vs. previous period
            </p>
          </div>
        ))}
        <Link href="/admin/orders?status=PENDING" className="a-card transition hover:border-amber-300">
          <div className="flex items-start justify-between">
            <p className="text-sm text-zinc-500">Pending right now</p>
            <span className="grid size-9 place-items-center rounded-lg bg-amber-50 text-amber-600">
              <Clock className="size-4" />
            </span>
          </div>
          <p className="mt-2 text-3xl font-extrabold">{d.pendingNow}</p>
          <p className="text-xs text-zinc-400">need a confirmation call</p>
          <p className="mt-2 text-xs font-semibold text-brand-700">Review now →</p>
        </Link>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <RevenueChart data={d.points} title={`Revenue · ${r.label}`} total={cur.revenue} />
        </div>
        <div className="a-card">
          <div className="mb-3 flex items-start justify-between">
            <div>
              <p className="text-sm text-zinc-500">Orders by status</p>
              <p className="text-2xl font-extrabold">
                {totalStatus} <span className="text-sm font-normal text-zinc-400">orders</span>
              </p>
            </div>
            <p className="text-xs text-zinc-500">
              Delivery success <b className="text-zinc-900">{d.deliverySuccess}%</b>
            </p>
          </div>
          <div className="space-y-3">
            {Object.keys(STATUS_META).map((s) => {
              const c = d.byStatus.find((b) => b.status === s)?._count ?? 0;
              return (
                <Link key={s} href={`/admin/orders?status=${s}&${qs}`} className="block">
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <span className={cn("size-2 rounded-full", DOT[s])} />
                      {STATUS_META[s].label}
                    </span>
                    <span className="font-semibold">{c}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-zinc-100">
                    <div className={cn("h-full rounded-full", DOT[s])} style={{ width: `${totalStatus ? (c / totalStatus) * 100 : 0}%` }} />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="a-card !p-0 xl:col-span-2">
          <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
            <h2 className="font-semibold">Latest orders in this period</h2>
            <Link href={`/admin/orders?${qs}`} className="text-sm font-medium text-brand-700">
              View all ({cur.orders})
            </Link>
          </div>
          <div className="divide-y divide-zinc-100">
            {d.latest.map((o) => (
              <Link key={o.id} href={`/admin/orders/${o.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-zinc-50">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-zinc-100 text-sm font-bold text-zinc-600">{o.customerName[0]}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{o.customerName}</p>
                  <p className="truncate text-xs text-zinc-400">
                    #{o.orderNo} · {o.phone} · {o.createdAt.toLocaleString("en-GB", { timeZone: "Asia/Dhaka", dateStyle: "medium", timeStyle: "short" })}
                  </p>
                </div>
                <span className={cn("hidden rounded-full px-2.5 py-0.5 text-xs font-medium sm:inline", STATUS_META[o.status].color)}>● {STATUS_META[o.status].label}</span>
                <span className="w-20 text-right font-semibold">{taka(o.total)}</span>
              </Link>
            ))}
            {!d.latest.length && <p className="py-12 text-center text-sm text-zinc-400">No orders in this period</p>}
          </div>
        </div>
        <div className="a-card">
          <h2 className="mb-3 font-semibold">Best sellers</h2>
          <div className="space-y-3">
            {d.best.map((b, i) => (
              <div key={b.name} className="flex items-center gap-3 text-sm">
                <span className={cn("grid size-6 shrink-0 place-items-center rounded-full text-xs font-bold", i === 0 ? "bg-gold-100 text-gold-700" : "bg-zinc-100 text-zinc-500")}>{i + 1}</span>
                <span className="min-w-0 flex-1 truncate">{b.name}</span>
                <span className="text-right">
                  <b>{b.qty}</b> <span className="text-xs text-zinc-400">· {taka(b.revenue)}</span>
                </span>
              </div>
            ))}
            {!d.best.length && <p className="py-6 text-center text-sm text-zinc-400">No sales yet</p>}
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="a-card">
          <h2 className="mb-4 font-semibold">Sales by source</h2>
          <div className="space-y-4">
            {d.bySource.map((s) => (
              <div key={s.key}>
                <div className="mb-1 flex justify-between text-sm">
                  <span>{s.label}</span>
                  <span>
                    <b>{taka(s.revenue)}</b> <span className="text-zinc-400">· {s.orders} orders</span>
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-zinc-100">
                  <div className="h-full rounded-full bg-brand-600" style={{ width: `${sourceTotal ? (s.revenue / sourceTotal) * 100 : 0}%` }} />
                </div>
              </div>
            ))}
            {!d.bySource.length && <p className="text-sm text-zinc-400">No sales yet</p>}
          </div>
        </div>
        <div className="a-card">
          <h2 className="mb-4 font-semibold">Delivery areas</h2>
          <div className="space-y-4">
            {d.byArea.map((a) => (
              <div key={a.area}>
                <div className="mb-1 flex justify-between text-sm">
                  <span>{DELIVERY_LABELS[a.area]}</span>
                  <span>
                    <b>{a.n}</b> <span className="text-zinc-400">· {areaTotal ? Math.round((a.n / areaTotal) * 100) : 0}%</span>
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-zinc-100">
                  <div className="h-full rounded-full bg-gold-500" style={{ width: `${areaTotal ? (a.n / areaTotal) * 100 : 0}%` }} />
                </div>
              </div>
            ))}
            {!d.byArea.length && <p className="text-sm text-zinc-400">No orders yet</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
