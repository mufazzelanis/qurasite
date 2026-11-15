import { requireAdmin } from "@/lib/session";
import Link from "next/link";
import { db } from "@/lib/db";
import { bdDayStart, dailySeries, funnel } from "@/lib/reports";
import { DELIVERY_LABELS, STATUS_META, cn, taka } from "@/lib/utils";
import { BarList, Donut, SalesChart } from "@/components/admin/Charts";

const RANGES = [
  ["7", "7 days"],
  ["30", "30 days"],
  ["90", "90 days"],
  ["365", "1 year"],
] as const;

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  await requireAdmin("reports");
  const days = Math.min(365, Math.max(1, Number((await searchParams).days || 30)));
  const from = bdDayStart(days - 1);
  const to = new Date();
  const range = { createdAt: { gte: from, lte: to } };

  const [series, fun, byStatus, byArea, bySource, topItems, totals, delivered] = await Promise.all([
    dailySeries(from, to),
    funnel(from, to),
    db.order.groupBy({ by: ["status"], where: range, _count: true, _sum: { total: true } }),
    db.order.groupBy({ by: ["deliveryArea"], where: { ...range, status: { not: "CANCELLED" } }, _count: true }),
    db.order.groupBy({ by: ["utmSource"], where: { ...range, status: { not: "CANCELLED" } }, _count: true, _sum: { total: true } }),
    db.orderItem.groupBy({ by: ["name"], where: { order: { ...range, status: { not: "CANCELLED" } } }, _sum: { quantity: true }, orderBy: { _sum: { quantity: "desc" } }, take: 8 }),
    db.order.aggregate({ where: { ...range, status: { not: "CANCELLED" } }, _sum: { total: true, deliveryCharge: true }, _count: true, _avg: { total: true } }),
    db.order.aggregate({ where: { ...range, status: "DELIVERED" }, _sum: { total: true }, _count: true }),
  ]);

  const finished = byStatus.filter((s) => ["DELIVERED", "RETURNED", "CANCELLED"].includes(s.status)).reduce((a, s) => a + s._count, 0);
  const successRate = finished ? Math.round((delivered._count / finished) * 100) : 0;
  const visitors = fun[0].sessions;
  const conv = visitors ? ((fun[4].sessions / visitors) * 100).toFixed(2) : "0";

  const cards = [
    ["Gross sales", taka(totals._sum.total || 0), `${totals._count} orders`],
    ["Delivered revenue", taka(delivered._sum.total || 0), `${delivered._count} delivered`],
    ["Avg. order value", taka(Math.round(totals._avg.total || 0)), "excl. cancelled"],
    ["Delivery success", `${successRate}%`, "delivered / finished"],
    ["Conversion rate", `${conv}%`, `${visitors} visitors`],
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Sales Reports</h1>
        <div className="flex gap-1 rounded-xl bg-white p-1 shadow-sm">
          {RANGES.map(([d, l]) => (
            <Link key={d} href={`?days=${d}`} className={cn("rounded-lg px-3 py-1.5 text-sm font-medium", String(days) === d ? "bg-brand-800 text-white" : "text-zinc-600 hover:bg-zinc-100")}>{l}</Link>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map(([l, v, s]) => (
          <div key={l} className="a-card">
            <p className="text-sm text-zinc-500">{l}</p>
            <p className="mt-1 text-2xl font-extrabold text-brand-900">{v}</p>
            <p className="text-xs text-zinc-400">{s}</p>
          </div>
        ))}
      </div>

      <div className="a-card">
        <h2 className="mb-4 font-semibold">Revenue & orders</h2>
        <SalesChart data={series} />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="a-card">
          <h2 className="mb-4 font-semibold">Conversion funnel (unique sessions)</h2>
          <div className="space-y-3">
            {fun.map((f, i) => {
              const pct = visitors ? (f.sessions / visitors) * 100 : 0;
              return (
                <div key={f.name}>
                  <div className="mb-1 flex justify-between text-sm"><span>{f.name}</span><span className="font-semibold">{f.sessions} <span className="font-normal text-zinc-400">({pct.toFixed(1)}%)</span></span></div>
                  <div className="h-7 overflow-hidden rounded-lg bg-zinc-100">
                    <div className="h-full rounded-lg bg-gradient-to-r from-brand-700 to-gold-500" style={{ width: `${Math.max(pct, 1)}%`, opacity: 1 - i * 0.12 }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="a-card">
          <h2 className="mb-4 font-semibold">Top products (units)</h2>
          <BarList data={topItems.map((t) => ({ name: t.name, qty: t._sum.quantity || 0 }))} nameKey="name" valueKey="qty" />
        </div>
        <div className="a-card">
          <h2 className="mb-4 font-semibold">Orders by status</h2>
          <Donut data={byStatus.map((s) => ({ name: STATUS_META[s.status].label, value: s._count }))} />
        </div>
        <div className="a-card">
          <h2 className="mb-4 font-semibold">Delivery area</h2>
          <Donut data={byArea.map((s) => ({ name: DELIVERY_LABELS[s.deliveryArea], value: s._count }))} />
        </div>
        <div className="a-card xl:col-span-2">
          <h2 className="mb-4 font-semibold">Sales by traffic source (UTM)</h2>
          <table className="w-full text-sm">
            <thead><tr className="border-b text-left text-zinc-500"><th className="py-2">Source</th><th>Orders</th><th>Revenue</th></tr></thead>
            <tbody>
              {bySource.sort((a, b) => (b._sum.total || 0) - (a._sum.total || 0)).map((s) => (
                <tr key={s.utmSource || "direct"} className="border-b border-zinc-50">
                  <td className="py-2 font-medium">{s.utmSource || "direct / organic"}</td>
                  <td>{s._count}</td>
                  <td className="font-semibold">{taka(s._sum.total || 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
