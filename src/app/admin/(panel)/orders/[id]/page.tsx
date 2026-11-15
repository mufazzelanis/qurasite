import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Ban, MapPin, MessageCircle, Phone, Printer, RefreshCw, Trash2, Truck } from "lucide-react";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { checkFraud } from "@/lib/fraud";
import { DELIVERY_LABELS, STATUS_META, cn, taka } from "@/lib/utils";
import { addBlock, deleteOrder, sendToSteadfast, syncSteadfast, updateOrderStatus } from "@/app/admin/actions";
import { RiskBadge } from "@/components/admin/RiskBadge";

export default async function OrderDetail({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin("orders");
  const { id } = await params;
  const order = await db.order.findUnique({ where: { id }, include: { items: true, history: { orderBy: { createdAt: "desc" } } } });
  if (!order) notFound();
  const [fraud, others, blocked, visit] = await Promise.all([
    checkFraud({ phone: order.phone, ip: order.ip, excludeOrderId: order.id }),
    db.order.findMany({ where: { phone: order.phone, id: { not: order.id } }, orderBy: { createdAt: "desc" }, take: 10 }),
    db.blocklist.findFirst({ where: { type: "phone", value: order.phone } }),
    order.visitId ? db.pageVisit.findUnique({ where: { id: order.visitId } }) : null,
  ]);
  const dt = (d: Date) => d.toLocaleString("en-GB", { timeZone: "Asia/Dhaka", dateStyle: "medium", timeStyle: "short" });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/admin/orders" className="a-btn-light !px-2.5"><ArrowLeft className="size-4" /></Link>
          <div>
            <h1 className="font-mono text-2xl font-bold">#{order.orderNo}</h1>
            <p className="text-sm text-zinc-500">{dt(order.createdAt)} · {order.source === "shop" ? "Main site" : `/${order.source}`}</p>
          </div>
          <span className={cn("rounded-full px-3 py-1 text-sm font-medium", STATUS_META[order.status].color)}>{STATUS_META[order.status].label}</span>
        </div>
        <div className="flex gap-2">
          <Link href={`/admin/orders/print?ids=${order.id}`} target="_blank" className="a-btn-light"><Printer className="size-4" /> Invoice</Link>
          <form action={deleteOrder}>
            <input type="hidden" name="id" value={order.id} />
            <button className="a-btn-light !text-rose-600"><Trash2 className="size-4" /> Delete</button>
          </form>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <div className="a-card">
            <h2 className="mb-4 font-semibold">Items</h2>
            <div className="divide-y divide-zinc-100">
              {order.items.map((i) => (
                <div key={i.id} className="flex justify-between py-2.5 text-sm">
                  <span>
                    {i.name} <span className="text-zinc-400">× {i.quantity} @ {taka(i.price)}</span>
                    {i.source && <span className="ml-2 rounded bg-gold-100 px-1.5 text-[10px] font-bold text-gold-700">{i.source === "post" ? "ONE-CLICK ADD" : "COMBO"}</span>}
                  </span>
                  <span className="font-medium">{taka(i.price * i.quantity)}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 space-y-1 border-t border-zinc-100 pt-3 text-sm">
              <Row l="Subtotal" v={taka(order.subtotal)} />
              {order.discount > 0 && <Row l="Combo savings (already in prices)" v={taka(order.discount)} muted />}
              {order.couponDiscount > 0 && <Row l={`Coupon ${order.couponCode}`} v={`- ${taka(order.couponDiscount)}`} />}
              <Row l={`Delivery (${DELIVERY_LABELS[order.deliveryArea]})`} v={taka(order.deliveryCharge)} />
              <div className="flex justify-between text-base font-bold"><span>Total</span><span>{taka(order.total)}</span></div>
              {order.advanceAmount > 0 && (
                <>
                  <Row l={`Advance via ${order.paymentMethod} · TrxID ${order.paymentTrxId}`} v={`- ${taka(order.advanceAmount)}`} />
                  <div className="flex justify-between font-bold text-brand-700"><span>Collect on delivery</span><span>{taka(order.total - order.advanceAmount)}</span></div>
                </>
              )}
            </div>
          </div>

          <div className="a-card">
            <h2 className="mb-4 font-semibold">Update status</h2>
            <form action={updateOrderStatus} className="grid gap-3 sm:grid-cols-2">
              <input type="hidden" name="id" value={order.id} />
              <label className="text-sm">Status
                <select name="status" defaultValue={order.status} className="a-input mt-1">
                  {Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </label>
              <label className="text-sm">Courier
                <select name="courier" defaultValue={order.courier || ""} className="a-input mt-1">
                  <option value="">—</option>
                  {["Steadfast", "Pathao", "RedX", "Paperfly", "Sundarban", "SA Paribahan", "Other"].map((c) => <option key={c}>{c}</option>)}
                </select>
              </label>
              <label className="text-sm">Tracking code<input name="trackingCode" defaultValue={order.trackingCode || ""} className="a-input mt-1" /></label>
              <label className="text-sm">Note (visible in customer tracking)<input name="note" placeholder="e.g. Customer confirmed on call" className="a-input mt-1" /></label>
              <label className="text-sm sm:col-span-2">Internal note (only admins see this)<textarea name="adminNote" rows={2} defaultValue={order.adminNote || ""} className="a-input mt-1" /></label>
              <div className="sm:col-span-2"><button className="a-btn">Save changes</button> <span className="text-xs text-zinc-400">Customer gets an SMS on status change (if SMS is on)</span></div>
            </form>
          </div>

          <div className="a-card">
            <h2 className="mb-3 flex items-center gap-2 font-semibold"><Truck className="size-4" /> Steadfast courier</h2>
            {order.consignmentId ? (
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <span>Consignment <b className="font-mono">{order.consignmentId}</b> · Tracking <b className="font-mono">{order.trackingCode}</b></span>
                <form action={syncSteadfast}><input type="hidden" name="id" value={order.id} /><button className="a-btn-light !py-1.5"><RefreshCw className="size-4" /> Sync status</button></form>
              </div>
            ) : (
              <form action={sendToSteadfast} className="flex flex-wrap items-center gap-3">
                <input type="hidden" name="id" value={order.id} />
                <button className="a-btn">🚚 Send to Steadfast — COD {taka(order.total - order.advanceAmount)}</button>
                <span className="text-xs text-zinc-400">Set API keys in Payments & Delivery first</span>
              </form>
            )}
          </div>

          <div className="a-card">
            <h2 className="mb-4 font-semibold">Timeline</h2>
            <ol className="relative space-y-4 border-l-2 border-zinc-100 pl-5">
              {order.history.map((h) => (
                <li key={h.id} className="relative">
                  <span className="absolute -left-[27px] top-1 size-3 rounded-full bg-brand-700 ring-4 ring-white" />
                  <p className="text-sm font-medium">{STATUS_META[h.status].label}{h.note && <span className="font-normal text-zinc-500"> — {h.note}</span>}</p>
                  <p className="text-xs text-zinc-400">{dt(h.createdAt)}{h.by && ` · ${h.by}`}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>

        <div className="space-y-6">
          <div className="a-card space-y-3 text-sm">
            <h2 className="font-semibold">Customer</h2>
            <p className="text-base font-semibold">{order.customerName} {order.phoneVerified && <span className="rounded bg-emerald-100 px-1.5 text-xs text-emerald-700">OTP ✓</span>}</p>
            <div className="flex gap-2">
              <a href={`tel:${order.phone}`} className="a-btn flex-1 justify-center"><Phone className="size-4" />{order.phone}</a>
              <a href={`https://wa.me/88${order.phone}`} target="_blank" rel="noreferrer" className="a-btn-light"><MessageCircle className="size-4" /></a>
            </div>
            <p className="flex gap-2 text-zinc-600"><MapPin className="mt-0.5 size-4 shrink-0" />{order.address}</p>
            {order.notes && <p className="rounded-lg bg-amber-50 p-3 text-amber-900">📝 {order.notes}</p>}
            {order.adminNote && <p className="rounded-lg bg-sky-50 p-3 text-sky-900">🔒 {order.adminNote}</p>}
          </div>

          <div className="a-card space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Fraud check</h2>
              <RiskBadge score={fraud.score} />
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-zinc-50 p-2"><p className="text-lg font-bold">{fraud.history.total}</p><p className="text-xs text-zinc-500">Other orders</p></div>
              <div className="rounded-lg bg-emerald-50 p-2"><p className="text-lg font-bold text-emerald-700">{fraud.history.delivered}</p><p className="text-xs text-zinc-500">Delivered</p></div>
              <div className="rounded-lg bg-rose-50 p-2"><p className="text-lg font-bold text-rose-700">{fraud.history.cancelled + fraud.history.returned}</p><p className="text-xs text-zinc-500">Cancel/Return</p></div>
            </div>
            {fraud.courier && <p className="rounded-lg bg-sky-50 p-2 text-sky-800">Courier: {fraud.courier.success}/{fraud.courier.total} delivered ({fraud.courier.ratio}%)</p>}
            {order.fraudFlags.length > 0 && (
              <div>
                <p className="mb-1 text-xs font-semibold uppercase text-zinc-400">At order time</p>
                <ul className="list-inside list-disc text-zinc-600">{order.fraudFlags.map((f) => <li key={f}>{f}</li>)}</ul>
              </div>
            )}
            {blocked ? (
              <p className="rounded-lg bg-rose-50 p-2 text-rose-700">This phone is blocklisted</p>
            ) : (
              <form action={addBlock} className="flex gap-2">
                <input type="hidden" name="type" value="phone" />
                <input type="hidden" name="value" value={order.phone} />
                <input type="hidden" name="back" value={`/admin/orders/${order.id}`} />
                <input name="reason" placeholder="Reason" className="a-input" />
                <button className="a-btn-light !text-rose-600"><Ban className="size-4" /> Block</button>
              </form>
            )}
            <p className="break-all text-xs text-zinc-400">IP: {order.ip} · {order.userAgent?.slice(0, 80)}</p>
          </div>

          <div className="a-card space-y-1 text-sm">
            <h2 className="mb-2 font-semibold">Attribution</h2>
            <p>Page: <b>{order.source === "shop" ? "Main site" : `/${order.source}`}</b></p>
            <p>UTM: {order.utmSource || "direct"} / {order.utmMedium || "—"} / {order.utmCampaign || "—"}</p>
            {visit && <p>Visit: {visit.source} · {visit.device} · {visit.browser} · {Math.round(visit.durationSec / 60)} min on page</p>}
            <p className="text-xs text-zinc-400">FB click id: {order.fbc ? "yes" : "no"} · FB browser id: {order.fbp ? "yes" : "no"}</p>
          </div>

          {others.length > 0 && (
            <div className="a-card text-sm">
              <h2 className="mb-2 font-semibold">Previous orders ({others.length})</h2>
              {others.map((o) => (
                <Link key={o.id} href={`/admin/orders/${o.id}`} className="flex justify-between py-1.5 hover:text-brand-700">
                  <span className="font-mono">#{o.orderNo}</span>
                  <span className={cn("rounded-full px-2 text-xs", STATUS_META[o.status].color)}>{STATUS_META[o.status].label}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ l, v, muted }: { l: string; v: string; muted?: boolean }) {
  return (
    <div className={cn("flex justify-between", muted ? "text-zinc-400" : "text-zinc-500")}>
      <span>{l}</span>
      <span>{v}</span>
    </div>
  );
}
