import Link from "next/link";
import { Clock, Download, Eye, Phone, Search } from "lucide-react";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { TIME_OF_DAY, orderWhere, type OrderFilters } from "@/lib/order-filters";
import { STATUS_META, cn, taka } from "@/lib/utils";
import { bulkOrders } from "@/app/admin/actions";
import { RiskBadge } from "@/components/admin/RiskBadge";
import SelectAll from "@/components/admin/SelectAll";
import BulkBar from "@/components/admin/BulkBar";
import Pager from "@/components/admin/Pager";

const PER_PAGE = 20;
const AREA: Record<string, string> = { INSIDE_DHAKA: "Inside Dhaka", SUB_DHAKA: "Dhaka sub-area", OUTSIDE_DHAKA: "Outside Dhaka" };
const PILL: Record<string, [dot: string, pill: string]> = {
  PENDING: ["bg-amber-500", "border-amber-200 bg-amber-50 text-amber-700"],
  CONFIRMED: ["bg-sky-500", "border-sky-200 bg-sky-50 text-sky-700"],
  PROCESSING: ["bg-indigo-500", "border-indigo-200 bg-indigo-50 text-indigo-700"],
  SHIPPED: ["bg-violet-500", "border-violet-200 bg-violet-50 text-violet-700"],
  DELIVERED: ["bg-emerald-500", "border-emerald-200 bg-emerald-50 text-emerald-700"],
  CANCELLED: ["bg-rose-500", "border-rose-200 bg-rose-50 text-rose-700"],
  RETURNED: ["bg-zinc-500", "border-zinc-200 bg-zinc-50 text-zinc-700"],
};
const SRC: Record<string, string> = { facebook: "fb", fb: "fb", instagram: "ig", ig: "ig", google: "google", tiktok: "tiktok" };
const fmt = (d: Date) => d.toLocaleString("en-GB", { timeZone: "Asia/Dhaka", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true });

function StatusPill({ status }: { status: string }) {
  const [dot, pill] = PILL[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium", pill)}>
      <span className={cn("size-1.5 rounded-full", dot)} />
      {STATUS_META[status].label}
    </span>
  );
}

export default async function OrdersPage({ searchParams }: { searchParams: Promise<OrderFilters & { page?: string }> }) {
  await requireAdmin("orders");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page || 1));
  const where = orderWhere(sp);
  const { status: _s, ...noStatus } = sp;
  void _s;

  const [orders, total, counts, hours, landings, campaigns] = await Promise.all([
    db.order.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PER_PAGE, take: PER_PAGE, include: { items: { select: { name: true, quantity: true, source: true } } } }),
    db.order.count({ where }),
    db.order.groupBy({ by: ["status"], where: orderWhere(noStatus), _count: true }),
    db.order.groupBy({ by: ["hourBd"], where: orderWhere(sp, { ignoreTod: true }), _count: true }),
    db.landingPage.findMany({ select: { slug: true, title: true }, orderBy: { createdAt: "asc" } }),
    db.order.groupBy({ by: ["utmCampaign"], where: { utmCampaign: { not: null } }, _count: true, orderBy: { _count: { utmCampaign: "desc" } }, take: 50 }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  const qs = (o: Record<string, string | number | undefined>) =>
    "?" + new URLSearchParams(Object.entries({ ...sp, ...o }).filter(([, v]) => v !== undefined && v !== "") as [string, string][]).toString();
  const allCount = counts.reduce((a, x) => a + x._count, 0);
  const todCount = (from: number, to: number) => hours.filter((h) => h.hourBd >= from && h.hourBd < to).reduce((a, h) => a + h._count, 0);
  const filtered = !!(sp.q || sp.source || sp.method || sp.pay || sp.camp || sp.from || sp.to || sp.p || sp.risk || sp.tod);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Orders</h1>
          <p className="text-sm text-zinc-500">{total.toLocaleString()} orders found</p>
        </div>
        <a href={`/api/admin/export${qs({ page: undefined })}`} className="a-btn-light"><Download className="size-4" /> Export CSV</a>
      </div>

      {/* status tabs */}
      <div className="max-w-full overflow-x-auto">
        <div className="inline-flex gap-1 rounded-xl border border-zinc-200 bg-white p-1">
          {["ALL", ...Object.keys(STATUS_META)].map((s) => {
            const c = s === "ALL" ? allCount : counts.find((x) => x.status === s)?._count ?? 0;
            const active = (sp.status || "ALL") === s;
            return (
              <Link key={s} href={qs({ status: s === "ALL" ? undefined : s, page: undefined })} className={cn("flex shrink-0 items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition", active ? "bg-brand-700 text-white" : "text-zinc-600 hover:bg-zinc-50")}>
                {s === "ALL" ? "All" : STATUS_META[s].label}
                <span className={cn("rounded-md px-1.5 text-xs", active ? "bg-white/20" : "bg-zinc-100 text-zinc-500")}>{c}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* filters */}
      <div className="a-card space-y-3">
        <form className="space-y-3">
          {sp.status && <input type="hidden" name="status" value={sp.status} />}
          {sp.tod && <input type="hidden" name="tod" value={sp.tod} />}
          {sp.p && !sp.from && !sp.to && <input type="hidden" name="p" value={sp.p} />}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
            <input name="q" defaultValue={sp.q} placeholder="Search order no, phone, name, address or TrxID…" className="a-input pl-9" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <select name="source" defaultValue={sp.source || ""} className="a-input">
              <option value="">All sources</option>
              <option value="shop">Main site</option>
              {landings.map((l) => <option key={l.slug} value={l.slug}>/{l.slug} — {l.title}</option>)}
            </select>
            <select name="method" defaultValue={sp.method || ""} className="a-input">
              <option value="">All methods</option>
              <option value="COD">Cash on delivery</option>
              <option value="BKASH">bKash</option>
              <option value="NAGAD">Nagad</option>
              <option value="ROCKET">Rocket</option>
            </select>
            <select name="pay" defaultValue={sp.pay || ""} className="a-input">
              <option value="">Any payment</option>
              <option value="advance">Advance paid</option>
              <option value="cod">Full COD (nothing paid)</option>
            </select>
            <select name="camp" defaultValue={sp.camp || ""} className="a-input">
              <option value="">All campaigns</option>
              <option value="_none">No campaign (organic)</option>
              {campaigns.filter((c) => c.utmCampaign).map((c) => <option key={c.utmCampaign} value={c.utmCampaign!}>{c.utmCampaign} ({c._count})</option>)}
            </select>
            <select name="risk" defaultValue={sp.risk || ""} className="a-input">
              <option value="">Any risk</option>
              <option value="high">High fraud risk (50+)</option>
            </select>
          </div>
          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto_auto]">
            <label className="text-xs text-zinc-500">From<input type="date" name="from" defaultValue={sp.from} className="a-input mt-1" /></label>
            <label className="text-xs text-zinc-500">To<input type="date" name="to" defaultValue={sp.to} className="a-input mt-1" /></label>
            <button className="a-btn self-end justify-center">Filter</button>
            {filtered && <Link href={sp.status ? `/admin/orders?status=${sp.status}` : "/admin/orders"} className="a-btn-light self-end justify-center">Reset</Link>}
          </div>
        </form>

        <div className="flex flex-wrap items-center gap-2 border-t border-zinc-100 pt-3">
          <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-500"><Clock className="size-3.5" /> Time of day</span>
          <Link href={qs({ tod: undefined, page: undefined })} className={cn("rounded-lg border px-3 py-1.5 text-sm font-medium", !sp.tod ? "border-brand-700 bg-brand-700 text-white" : "border-zinc-200 hover:bg-zinc-50")}>Any time</Link>
          {TIME_OF_DAY.map(([k, from, to, range, label]) => (
            <Link key={k} href={qs({ tod: k, page: undefined })} className={cn("flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm", sp.tod === k ? "border-brand-700 bg-brand-700 text-white" : "border-zinc-200 hover:bg-zinc-50")}>
              <b>{range}</b>
              <span className={cn("text-xs", sp.tod === k ? "text-white/75" : "text-zinc-500")}>{label}</span>
              <span className={cn("rounded-md px-1.5 text-xs", sp.tod === k ? "bg-white/20" : "bg-zinc-100 text-zinc-500")}>{todCount(from, to)}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* table */}
      <form action={bulkOrders}>
        <BulkBar />
        <div className="a-card overflow-hidden !p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px]">
              <thead className="border-b border-zinc-100">
                <tr>
                  <th className="a-th w-12 !pl-4"><SelectAll /></th>
                  <th className="a-th">Order</th>
                  <th className="a-th">Customer</th>
                  <th className="a-th">Address</th>
                  <th className="a-th text-right">Total</th>
                  <th className="a-th">Status</th>
                  <th className="a-th" />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {orders.map((o) => {
                  const qty = o.items.reduce((a, i) => a + i.quantity, 0);
                  const src = o.utmSource ? SRC[o.utmSource.toLowerCase()] || o.utmSource.toLowerCase() : "";
                  return (
                    <tr key={o.id} className="align-top transition hover:bg-zinc-50/70">
                      <td className="a-td !pl-4 !pt-5"><input type="checkbox" name="ids" value={o.id} className="row-check size-4" aria-label={`Select ${o.orderNo}`} /></td>
                      <td className="a-td !py-4">
                        <Link href={`/admin/orders/${o.id}`} className="font-semibold hover:text-brand-700 hover:underline">#{o.orderNo}</Link>
                        <p className="mt-0.5 whitespace-nowrap text-xs text-zinc-500">{fmt(o.createdAt)}</p>
                        <p className="mt-1 text-[11px] text-zinc-400">{o.source === "shop" ? "Main site" : `/${o.source}`}</p>
                      </td>
                      <td className="a-td !py-4">
                        <p className="font-medium">
                          {o.customerName} {o.phoneVerified && <span title="OTP verified" className="text-emerald-600">✓</span>}
                        </p>
                        <a href={`tel:${o.phone}`} className="mt-0.5 flex items-center gap-1 text-xs text-zinc-500 hover:text-brand-700"><Phone className="size-3" />{o.phone}</a>
                        {o.fraudScore >= 30 && <div className="mt-1"><RiskBadge score={o.fraudScore} /></div>}
                      </td>
                      <td className="a-td max-w-md !py-4">
                        <p className="line-clamp-2 text-sm">{o.address}</p>
                        <p className="mt-0.5 text-xs text-zinc-500">
                          {AREA[o.deliveryArea] || o.deliveryArea} · {qty} item{qty > 1 ? "s" : ""} ·{" "}
                          <span className="font-medium text-brand-700">{[...new Set(o.items.map((i) => i.name))].join(", ")}</span>
                          {o.items.some((i) => i.source) && <span className="ml-1.5 rounded bg-gold-100 px-1.5 py-px text-[10px] font-bold text-gold-700">🍯 COMBO</span>}
                        </p>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {o.utmCampaign && (
                            <Link href={qs({ camp: o.utmCampaign, page: undefined })} title="Campaign — click to filter" className="rounded border border-sky-200 bg-sky-50 px-1.5 py-px font-mono text-[11px] text-sky-700 hover:bg-sky-100">
                              {src || "utm"} · {o.utmCampaign}
                            </Link>
                          )}
                          {!o.utmCampaign && src && <span className="rounded border border-sky-200 bg-sky-50 px-1.5 py-px font-mono text-[11px] text-sky-700">{src}</span>}
                          {o.advanceAmount > 0 && <span className="rounded border border-pink-200 bg-pink-50 px-1.5 py-px text-[11px] text-pink-700">{o.paymentMethod} {taka(o.advanceAmount)} · {o.paymentTrxId}</span>}
                          {o.couponCode && <span className="rounded border border-zinc-200 bg-zinc-50 px-1.5 py-px text-[11px] text-zinc-600">🎟 {o.couponCode}</span>}
                          {o.consignmentId && <span className="rounded border border-violet-200 bg-violet-50 px-1.5 py-px text-[11px] text-violet-700">🚚 {o.courier} {o.trackingCode}</span>}
                        </div>
                      </td>
                      <td className="a-td !py-4 text-right font-semibold">{taka(o.total)}</td>
                      <td className="a-td !py-4"><StatusPill status={o.status} /></td>
                      <td className="a-td !py-4 text-right">
                        <Link href={`/admin/orders/${o.id}`} className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:border-brand-600 hover:text-brand-700">
                          <Eye className="size-3.5" /> View
                        </Link>
                      </td>
                    </tr>
                  );
                })}
                {!orders.length && (
                  <tr>
                    <td colSpan={7} className="py-16 text-center text-sm text-zinc-400">No orders found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="border-t border-zinc-100">
            <Pager page={page} pages={pages} href={(p) => qs({ page: p })} />
          </div>
        </div>
      </form>
    </div>
  );
}
