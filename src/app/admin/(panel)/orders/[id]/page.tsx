import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Ban,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  Clock,
  CreditCard,
  ExternalLink,
  Globe,
  Lock,
  MapPin,
  MessageCircle,
  MessageSquareText,
  Monitor,
  Package,
  PackageCheck,
  Phone,
  Printer,
  RefreshCw,
  RotateCcw,
  Save,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Trash2,
  Truck,
  User,
  XCircle,
} from "lucide-react";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { checkFraud } from "@/lib/fraud";
import { DELIVERY_LABELS, STATUS_META, cn, taka } from "@/lib/utils";
import { addBlock, deleteOrder, sendToSteadfast, syncSteadfast, updateOrderStatus } from "@/app/admin/actions";
import ConfirmButton from "@/components/admin/ConfirmButton";
import CopyButton from "@/components/admin/CopyButton";

const FLOW = ["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED"] as const;
type Status = keyof typeof STATUS_META;

const STEP_ICON: Record<string, typeof Clock> = { PENDING: Clock, CONFIRMED: CheckCircle2, PROCESSING: Package, SHIPPED: Truck, DELIVERED: PackageCheck, CANCELLED: XCircle, RETURNED: RotateCcw };
const DOT: Record<string, string> = {
  PENDING: "bg-amber-500",
  CONFIRMED: "bg-sky-500",
  PROCESSING: "bg-indigo-500",
  SHIPPED: "bg-violet-500",
  DELIVERED: "bg-emerald-500",
  CANCELLED: "bg-rose-500",
  RETURNED: "bg-zinc-500",
};
/** The obvious next move for each status → one-click buttons */
const NEXT: Record<string, { to: Status; label: string }[]> = {
  PENDING: [{ to: "CONFIRMED", label: "Confirm order" }],
  CONFIRMED: [{ to: "PROCESSING", label: "Start packing" }, { to: "SHIPPED", label: "Mark shipped" }],
  PROCESSING: [{ to: "SHIPPED", label: "Mark shipped" }],
  SHIPPED: [{ to: "DELIVERED", label: "Mark delivered" }, { to: "RETURNED", label: "Returned" }],
  DELIVERED: [],
  CANCELLED: [{ to: "PENDING", label: "Re-open" }],
  RETURNED: [],
};
const COURIERS = ["Steadfast", "Pathao", "RedX", "Paperfly", "Sundarban", "SA Paribahan", "Other"];

export default async function OrderDetail({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin("orders");
  const { id } = await params;
  const order = await db.order.findUnique({ where: { id }, include: { items: { include: { product: { select: { image: true, slug: true } } } }, history: { orderBy: { createdAt: "desc" } } } });
  if (!order) notFound();
  const [fraud, others, blocked, visit] = await Promise.all([
    checkFraud({ phone: order.phone, ip: order.ip, excludeOrderId: order.id }),
    db.order.findMany({ where: { phone: order.phone, id: { not: order.id } }, orderBy: { createdAt: "desc" }, take: 10, select: { id: true, orderNo: true, status: true, total: true, createdAt: true } }),
    db.blocklist.findFirst({ where: { type: "phone", value: order.phone } }),
    order.visitId ? db.pageVisit.findUnique({ where: { id: order.visitId } }) : null,
  ]);

  const dt = (d: Date) => d.toLocaleString("en-GB", { timeZone: "Asia/Dhaka", dateStyle: "medium", timeStyle: "short" });
  const ago = (d: Date) => {
    const m = Math.round((Date.now() - +d) / 60000);
    return m < 1 ? "just now" : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} days ago`;
  };
  const status = order.status as Status;
  const meta = STATUS_META[status];
  const dead = status === "CANCELLED" || status === "RETURNED";
  const stepIdx = FLOW.indexOf(status as (typeof FLOW)[number]);
  // when each status was first reached
  const reached = new Map<string, Date>();
  for (const h of [...order.history].reverse()) if (!reached.has(h.status)) reached.set(h.status, h.createdAt);
  const collect = order.total - order.advanceAmount;
  const units = order.items.reduce((a, i) => a + i.quantity, 0);
  const lifetime = others.filter((o) => o.status === "DELIVERED").reduce((a, o) => a + o.total, 0);
  const initials = order.customerName.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "?";
  const risk = fraud.score >= 70 ? { tone: "rose", label: "High risk", Icon: ShieldAlert } : fraud.score >= 40 ? { tone: "amber", label: "Medium risk", Icon: ShieldAlert } : { tone: "emerald", label: "Safe", Icon: ShieldCheck };
  const riskColor = { rose: "#f43f5e", amber: "#f59e0b", emerald: "#10b981" }[risk.tone]!;
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.address)}`;
  const sourceLabel = order.source === "shop" ? "Main site" : `/${order.source}`;

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-10">
      {/* ── Hero header ── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-900 via-brand-800 to-brand-700 p-5 text-white shadow-xl shadow-brand-900/20 sm:p-7">
        <div className="pointer-events-none absolute -top-24 -right-16 size-72 rounded-full bg-gold-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 size-64 rounded-full bg-emerald-300/10 blur-3xl" />

        <div className="relative flex flex-wrap items-start justify-between gap-5">
          <div className="flex min-w-0 items-start gap-3">
            <Link href="/admin/orders" className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/10 ring-1 ring-white/15 transition hover:bg-white/20" aria-label="Back to orders">
              <ArrowLeft className="size-4" />
            </Link>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-mono text-2xl font-bold tracking-tight sm:text-3xl">#{order.orderNo}</h1>
                <CopyButton text={order.orderNo} label="Copy order number" className="text-white/60 hover:!bg-white/10 hover:text-white" />
                <span className={cn("rounded-full px-3 py-1 text-xs font-bold", meta.color)}>{meta.label}</span>
                {order.phoneVerified && <span className="rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold ring-1 ring-white/20">OTP verified ✓</span>}
              </div>
              <p className="mt-1.5 flex flex-wrap items-center gap-x-2 text-sm text-white/70">
                <span>{dt(order.createdAt)}</span>
                <span className="text-white/30">•</span>
                <span>{ago(order.createdAt)}</span>
                <span className="text-white/30">•</span>
                <span className="flex items-center gap-1">
                  <Globe className="size-3.5" /> {sourceLabel}
                </span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <a href={`tel:${order.phone}`} className="flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-brand-900 shadow-sm transition hover:bg-gold-50">
              <Phone className="size-4" /> Call
            </a>
            <a href={`https://wa.me/88${order.phone}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-xl bg-[#25d366] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-105">
              <MessageCircle className="size-4" /> WhatsApp
            </a>
            <Link href={`/admin/orders/print?ids=${order.id}`} target="_blank" className="flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold ring-1 ring-white/20 transition hover:bg-white/20">
              <Printer className="size-4" /> Invoice
            </Link>
            <form action={deleteOrder}>
              <input type="hidden" name="id" value={order.id} />
              <ConfirmButton message={`Delete order #${order.orderNo} permanently? This cannot be undone.`} className="grid size-9 place-items-center rounded-xl bg-white/10 ring-1 ring-white/20 transition hover:bg-rose-500" title="Delete order">
                <Trash2 className="size-4" />
              </ConfirmButton>
            </form>
          </div>
        </div>

        {/* key numbers */}
        <div className="relative mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <HeroStat label="Order total" value={taka(order.total)} />
          <HeroStat label={order.advanceAmount ? "Collect on delivery" : "Cash on delivery"} value={taka(collect)} accent />
          <HeroStat label="Items" value={`${units} pcs`} sub={`${order.items.length} product${order.items.length > 1 ? "s" : ""}`} />
          <HeroStat label="Payment" value={order.paymentMethod} sub={order.advanceAmount ? `${taka(order.advanceAmount)} paid` : "pay on delivery"} />
        </div>
      </div>

      {/* ── Progress stepper ── */}
      <div className="rounded-2xl border border-zinc-200/70 bg-white p-5 shadow-sm">
        {dead ? (
          <div className={cn("flex items-center gap-3 rounded-xl p-4", status === "CANCELLED" ? "bg-rose-50 text-rose-700" : "bg-zinc-100 text-zinc-700")}>
            {status === "CANCELLED" ? <XCircle className="size-6" /> : <RotateCcw className="size-6" />}
            <div>
              <p className="font-semibold">Order {meta.label.toLowerCase()}</p>
              <p className="text-sm opacity-80">{reached.get(status) ? dt(reached.get(status)!) : ""} · stock was put back</p>
            </div>
          </div>
        ) : (
          <ol className="flex items-start">
            {FLOW.map((s, i) => {
              const Icon = STEP_ICON[s];
              const done = i < stepIdx;
              const current = i === stepIdx;
              return (
                <li key={s} className="relative flex flex-1 flex-col items-center text-center">
                  {i > 0 && <span className={cn("absolute top-5 right-1/2 h-1 w-full -translate-y-1/2 rounded-full", i <= stepIdx ? "bg-brand-600" : "bg-zinc-100")} />}
                  <span
                    className={cn(
                      "relative z-10 grid size-10 place-items-center rounded-full ring-4 ring-white transition",
                      done && "bg-brand-600 text-white",
                      current && "bg-brand-800 text-white shadow-lg shadow-brand-700/40",
                      !done && !current && "bg-zinc-100 text-zinc-400",
                    )}
                  >
                    {current && <span className="absolute inset-0 animate-ping rounded-full bg-brand-500/30" />}
                    <Icon className="size-4.5" />
                  </span>
                  <span className={cn("mt-2 text-xs font-semibold sm:text-sm", done || current ? "text-zinc-900" : "text-zinc-400")}>{STATUS_META[s].label}</span>
                  <span className="hidden text-[11px] text-zinc-400 sm:block">{reached.get(s) ? dt(reached.get(s)!) : "—"}</span>
                </li>
              );
            })}
          </ol>
        )}

        {NEXT[status]?.length ? (
          <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-zinc-100 pt-4">
            <span className="mr-1 text-xs font-semibold tracking-wide text-zinc-400 uppercase">Quick action</span>
            {NEXT[status].map((n, k) => (
              <form key={n.to} action={updateOrderStatus}>
                <input type="hidden" name="id" value={order.id} />
                <input type="hidden" name="status" value={n.to} />
                <button className={cn("flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition", k === 0 && n.to !== "RETURNED" ? "bg-brand-800 text-white shadow-md shadow-brand-900/20 hover:bg-brand-700" : "border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50")}>
                  {n.label} <ChevronRight className="size-4" />
                </button>
              </form>
            ))}
            {!dead && status !== "DELIVERED" && (
              <form action={updateOrderStatus} className="ml-auto">
                <input type="hidden" name="id" value={order.id} />
                <input type="hidden" name="status" value="CANCELLED" />
                <ConfirmButton message={`Cancel order #${order.orderNo}? Stock will be returned.`} className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-50">
                  <XCircle className="size-4" /> Cancel order
                </ConfirmButton>
              </form>
            )}
          </div>
        ) : null}
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        {/* ── Main column ── */}
        <div className="space-y-6">
          {/* items + payment */}
          <Card icon={Package} title="Items" right={<span className="text-sm text-zinc-400">{units} pcs</span>}>
            <ul className="divide-y divide-zinc-100">
              {order.items.map((i) => (
                <li key={i.id} className="flex items-center gap-4 py-3 first:pt-0">
                  <div className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-cream to-brand-50 ring-1 ring-zinc-200/70">
                    {i.product?.image && <Image src={i.product.image} alt="" fill sizes="64px" className="object-contain p-1.5" />}
                    <span className="absolute -top-0 -right-0 grid min-w-5 place-items-center rounded-bl-lg bg-brand-800 px-1 text-[11px] font-bold text-white">×{i.quantity}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium leading-snug">{i.name}</p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-zinc-400">
                      {taka(i.price)} each
                      {i.source && <span className="rounded-md bg-gold-100 px-1.5 py-0.5 text-[10px] font-bold text-gold-700">{i.source === "post" ? "⚡ ONE-CLICK ADD" : "🍯 COMBO"}</span>}
                      {i.product?.slug && (
                        <Link href={`/p/${i.product.slug}`} target="_blank" className="flex items-center gap-0.5 hover:text-brand-700">
                          view <ExternalLink className="size-3" />
                        </Link>
                      )}
                    </p>
                  </div>
                  <p className="font-semibold tabular-nums">{taka(i.price * i.quantity)}</p>
                </li>
              ))}
            </ul>

            <div className="mt-4 space-y-2 rounded-2xl bg-zinc-50 p-4 text-sm">
              <Row l="Subtotal" v={taka(order.subtotal)} />
              {order.discount > 0 && <Row l="Combo savings (already in prices)" v={taka(order.discount)} muted />}
              {order.couponDiscount > 0 && <Row l={`Coupon ${order.couponCode}`} v={`− ${taka(order.couponDiscount)}`} green />}
              <Row l={`Delivery · ${DELIVERY_LABELS[order.deliveryArea]}`} v={taka(order.deliveryCharge)} />
              <div className="flex justify-between border-t border-dashed border-zinc-300 pt-2 text-base font-bold">
                <span>Total</span>
                <span className="tabular-nums">{taka(order.total)}</span>
              </div>
              {order.advanceAmount > 0 && (
                <>
                  <Row l={`Advance via ${order.paymentMethod}`} v={`− ${taka(order.advanceAmount)}`} green />
                  {order.paymentTrxId && (
                    <div className="flex items-center justify-between text-xs text-zinc-500">
                      <span className="flex items-center gap-1">
                        <CreditCard className="size-3.5" /> TrxID <span className="font-mono text-zinc-700">{order.paymentTrxId}</span>
                      </span>
                      <CopyButton text={order.paymentTrxId} label="Copy TrxID" />
                    </div>
                  )}
                </>
              )}
              <div className="mt-1 flex items-center justify-between rounded-xl bg-brand-800 px-4 py-3 text-white">
                <span className="text-sm font-medium text-white/80">Collect from customer</span>
                <span className="text-xl font-bold tabular-nums">{taka(collect)}</span>
              </div>
            </div>
          </Card>

          {/* update status */}
          <Card icon={RefreshCw} title="Update order" desc="Customer gets an SMS when the status changes (if SMS is on).">
            <form action={updateOrderStatus} className="space-y-5">
              <input type="hidden" name="id" value={order.id} />
              <fieldset>
                <legend className="mb-2 text-sm font-medium text-zinc-700">Status</legend>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(STATUS_META) as Status[]).map((s) => (
                    <label key={s} className="cursor-pointer">
                      <input type="radio" name="status" value={s} defaultChecked={s === status} className="peer sr-only" />
                      <span className="flex items-center gap-2 rounded-xl border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-600 transition peer-checked:border-brand-700 peer-checked:bg-brand-50 peer-checked:text-brand-900 peer-checked:ring-2 peer-checked:ring-brand-600/20 peer-focus-visible:ring-2 hover:bg-zinc-50">
                        <span className={cn("size-2 rounded-full", DOT[s])} />
                        {STATUS_META[s].label}
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Courier">
                  <select name="courier" defaultValue={order.courier || ""} className="a-input">
                    <option value="">—</option>
                    {COURIERS.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Tracking code">
                  <input name="trackingCode" defaultValue={order.trackingCode || ""} className="a-input font-mono" />
                </Field>
              </div>
              <Field label="Note for the customer" hint="Shown on the customer's tracking page">
                <input name="note" placeholder="e.g. Customer confirmed on call" className="a-input" />
              </Field>
              <Field label="Internal note" hint="Only admins see this" icon={Lock}>
                <textarea name="adminNote" rows={2} defaultValue={order.adminNote || ""} className="a-input" />
              </Field>
              <button className="a-btn !rounded-xl px-5">
                <Save className="size-4" /> Save changes
              </button>
            </form>
          </Card>

          {/* courier */}
          <Card icon={Truck} title="Steadfast courier">
            {order.consignmentId ? (
              <div className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Mono label="Consignment ID" value={order.consignmentId} />
                  <Mono label="Tracking code" value={order.trackingCode || "—"} />
                </div>
                <div className="flex flex-wrap gap-2">
                  <form action={syncSteadfast}>
                    <input type="hidden" name="id" value={order.id} />
                    <button className="a-btn-light !rounded-xl">
                      <RefreshCw className="size-4" /> Sync status
                    </button>
                  </form>
                  {order.trackingCode && (
                    <a href={`https://steadfast.com.bd/t/${order.trackingCode}`} target="_blank" rel="noreferrer" className="a-btn-light !rounded-xl">
                      <ExternalLink className="size-4" /> Track on Steadfast
                    </a>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-4 rounded-2xl border-2 border-dashed border-zinc-200 p-4">
                <span className="grid size-12 place-items-center rounded-2xl bg-brand-50 text-2xl">🚚</span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">Not sent to a courier yet</p>
                  <p className="text-xs text-zinc-500">Creates a Steadfast parcel with COD {taka(collect)}. Set the API keys in Payments & Delivery first.</p>
                </div>
                <form action={sendToSteadfast}>
                  <input type="hidden" name="id" value={order.id} />
                  <button className="a-btn !rounded-xl">
                    <Truck className="size-4" /> Send to Steadfast
                  </button>
                </form>
              </div>
            )}
          </Card>

          {/* timeline */}
          <Card icon={Clock} title="Timeline">
            <ol className="relative">
              {order.history.map((h, k) => {
                const Icon = STEP_ICON[h.status as Status] ?? CircleDot;
                return (
                  <li key={h.id} className="relative flex gap-4 pb-5 last:pb-0">
                    {k < order.history.length - 1 && <span className="absolute top-9 bottom-0 left-[17px] w-0.5 bg-zinc-100" />}
                    <span className={cn("relative z-10 grid size-9 shrink-0 place-items-center rounded-full text-white ring-4 ring-white", DOT[h.status])}>
                      <Icon className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1 pt-1">
                      <p className="text-sm font-semibold">
                        {STATUS_META[h.status].label}
                        {k === 0 && <span className="ml-2 rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold text-zinc-500 uppercase">latest</span>}
                      </p>
                      {h.note && <p className="mt-1 rounded-lg bg-zinc-50 px-3 py-1.5 text-sm text-zinc-600">{h.note}</p>}
                      <p className="mt-1 text-xs text-zinc-400">
                        {dt(h.createdAt)}
                        {h.by && (
                          <>
                            {" "}
                            · by <span className="text-zinc-500">{h.by}</span>
                          </>
                        )}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </Card>
        </div>

        {/* ── Sidebar ── */}
        <aside className="space-y-6 xl:sticky xl:top-6">
          {/* customer */}
          <Card icon={User} title="Customer">
            <div className="flex items-center gap-3">
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-gold-300 to-gold-500 text-lg font-bold text-white shadow-md shadow-gold-500/30">{initials}</span>
              <div className="min-w-0">
                <p className="truncate text-base font-semibold">{order.customerName}</p>
                <p className="text-xs text-zinc-500">{others.length ? `${others.length + 1} orders · ${taka(lifetime)} delivered before` : "First order 🎉"}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-zinc-50 px-3 py-2">
              <Phone className="size-4 text-zinc-400" />
              <a href={`tel:${order.phone}`} className="flex-1 font-mono text-sm font-semibold hover:text-brand-700">
                {order.phone}
              </a>
              <CopyButton text={order.phone} label="Copy phone" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <QuickLink href={`tel:${order.phone}`} icon={Phone} label="Call" />
              <QuickLink href={`https://wa.me/88${order.phone}`} icon={MessageCircle} label="WhatsApp" external />
              <QuickLink href={`sms:${order.phone}`} icon={MessageSquareText} label="SMS" />
            </div>
            <div className="rounded-xl border border-zinc-200 p-3">
              <div className="flex gap-2 text-sm text-zinc-700">
                <MapPin className="mt-0.5 size-4 shrink-0 text-brand-600" />
                <p className="flex-1 leading-relaxed">{order.address}</p>
                <CopyButton text={order.address} label="Copy address" />
              </div>
              <div className="mt-2 flex items-center justify-between border-t border-zinc-100 pt-2 text-xs">
                <span className="rounded-md bg-brand-50 px-2 py-0.5 font-medium text-brand-700">{DELIVERY_LABELS[order.deliveryArea]}</span>
                <a href={mapsUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 font-medium text-brand-700 hover:underline">
                  Open map <ExternalLink className="size-3" />
                </a>
              </div>
            </div>
            {order.notes && (
              <div className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-100">
                <p className="mb-0.5 text-[11px] font-semibold tracking-wide text-amber-600 uppercase">Customer note</p>
                {order.notes}
              </div>
            )}
            {order.adminNote && (
              <div className="rounded-xl bg-sky-50 p-3 text-sm text-sky-900 ring-1 ring-sky-100">
                <p className="mb-0.5 flex items-center gap-1 text-[11px] font-semibold tracking-wide text-sky-600 uppercase">
                  <Lock className="size-3" /> Internal note
                </p>
                {order.adminNote}
              </div>
            )}
          </Card>

          {/* fraud */}
          <Card icon={risk.Icon} title="Fraud check">
            <div className="flex items-center gap-4">
              <Gauge score={fraud.score} color={riskColor} />
              <div>
                <p className="font-semibold" style={{ color: riskColor }}>
                  {risk.label}
                </p>
                <p className="text-xs text-zinc-500">Risk score {fraud.score} / 100</p>
                {fraud.courier && (
                  <p className="mt-1 text-xs text-zinc-600">
                    Courier record: <b>{fraud.courier.ratio}%</b> delivered ({fraud.courier.success}/{fraud.courier.total})
                  </p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <Mini value={fraud.history.total} label="Other orders" />
              <Mini value={fraud.history.delivered} label="Delivered" tone="emerald" />
              <Mini value={fraud.history.cancelled + fraud.history.returned} label="Cancel / return" tone="rose" />
            </div>
            {order.fraudFlags.length > 0 && (
              <div className="rounded-xl bg-rose-50/60 p-3 ring-1 ring-rose-100">
                <p className="mb-1.5 text-[11px] font-semibold tracking-wide text-rose-500 uppercase">Flags at order time</p>
                <ul className="space-y-1 text-sm text-rose-900">
                  {order.fraudFlags.map((f) => (
                    <li key={f} className="flex gap-2">
                      <ShieldAlert className="mt-0.5 size-3.5 shrink-0 text-rose-500" /> {f}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {blocked ? (
              <p className="flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-sm font-medium text-rose-700 ring-1 ring-rose-100">
                <Ban className="size-4" /> This phone is blocklisted
              </p>
            ) : (
              <form action={addBlock} className="flex gap-2">
                <input type="hidden" name="type" value="phone" />
                <input type="hidden" name="value" value={order.phone} />
                <input type="hidden" name="back" value={`/admin/orders/${order.id}`} />
                <input name="reason" placeholder="Reason (optional)" className="a-input !rounded-xl" />
                <ConfirmButton message={`Block ${order.phone}? Future orders from this number will be rejected.`} className="a-btn-light shrink-0 !rounded-xl !text-rose-600 hover:!bg-rose-50">
                  <Ban className="size-4" /> Block
                </ConfirmButton>
              </form>
            )}
          </Card>

          {/* attribution */}
          <Card icon={Globe} title="Where it came from">
            <dl className="space-y-2.5 text-sm">
              <Attr label="Page" value={sourceLabel} />
              <Attr label="Source" value={order.utmSource || "direct"} />
              {(order.utmMedium || order.utmCampaign) && <Attr label="Campaign" value={[order.utmMedium, order.utmCampaign].filter(Boolean).join(" / ")} />}
              {visit && (
                <>
                  <Attr label="Device" value={`${visit.device} · ${visit.browser}`} icon={/mobile|phone/i.test(visit.device ?? "") ? Smartphone : Monitor} />
                  <Attr label="Time on page" value={`${Math.max(0, Math.round(visit.durationSec / 60))} min`} />
                </>
              )}
            </dl>
            <div className="flex flex-wrap gap-1.5">
              <Pill on={!!order.fbc}>FB click id</Pill>
              <Pill on={!!order.fbp}>FB browser id</Pill>
            </div>
            <details className="text-xs text-zinc-400">
              <summary className="cursor-pointer hover:text-zinc-600">Technical details</summary>
              <p className="mt-2 break-all">IP: {order.ip}</p>
              <p className="mt-1 break-all">{order.userAgent}</p>
            </details>
          </Card>

          {/* history */}
          {others.length > 0 && (
            <Card icon={Clock} title={`Previous orders (${others.length})`}>
              <ul className="-mx-2 space-y-1">
                {others.map((o) => (
                  <li key={o.id}>
                    <Link href={`/admin/orders/${o.id}`} className="flex items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-zinc-50">
                      <span className={cn("size-2 shrink-0 rounded-full", DOT[o.status])} />
                      <span className="min-w-0 flex-1">
                        <span className="block font-mono text-sm font-semibold">#{o.orderNo}</span>
                        <span className="text-xs text-zinc-400">{dt(o.createdAt)}</span>
                      </span>
                      <span className="text-right">
                        <span className="block text-sm font-semibold tabular-nums">{taka(o.total)}</span>
                        <span className={cn("rounded-full px-2 text-[10px] font-semibold", STATUS_META[o.status].color)}>{STATUS_META[o.status].label}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </aside>
      </div>
    </div>
  );
}

// ───────────────────────────────────────────── small pieces

function HeroStat({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className={cn("rounded-2xl p-3.5 ring-1 backdrop-blur", accent ? "bg-gold-400 text-brand-950 ring-gold-300" : "bg-white/10 ring-white/15")}>
      <p className={cn("text-[11px] font-semibold tracking-wide uppercase", accent ? "text-brand-900/70" : "text-white/60")}>{label}</p>
      <p className="mt-0.5 truncate text-xl font-bold tabular-nums">{value}</p>
      {sub && <p className={cn("truncate text-xs", accent ? "text-brand-900/70" : "text-white/60")}>{sub}</p>}
    </div>
  );
}

function Card({ icon: Icon, title, desc, right, children }: { icon: typeof Clock; title: string; desc?: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-zinc-200/70 bg-white shadow-sm">
      <header className="flex items-center gap-3 border-b border-zinc-100 px-5 py-3.5">
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-700 ring-1 ring-brand-100">
          <Icon className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold leading-tight">{title}</h2>
          {desc && <p className="text-xs text-zinc-500">{desc}</p>}
        </div>
        {right}
      </header>
      <div className="space-y-4 p-5">{children}</div>
    </section>
  );
}

function Row({ l, v, muted, green }: { l: string; v: string; muted?: boolean; green?: boolean }) {
  return (
    <div className={cn("flex justify-between gap-4", muted ? "text-zinc-400" : green ? "text-emerald-700" : "text-zinc-600")}>
      <span>{l}</span>
      <span className="shrink-0 tabular-nums">{v}</span>
    </div>
  );
}

function Field({ label, hint, icon: Icon, children }: { label: string; hint?: string; icon?: typeof Lock; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1.5 flex items-center gap-1.5 font-medium text-zinc-700">
        {Icon && <Icon className="size-3.5 text-zinc-400" />}
        {label}
        {hint && <span className="font-normal text-zinc-400">· {hint}</span>}
      </span>
      {children}
    </label>
  );
}

function Mono({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-zinc-50 px-3 py-2">
      <div className="min-w-0">
        <p className="text-[11px] font-semibold tracking-wide text-zinc-400 uppercase">{label}</p>
        <p className="truncate font-mono text-sm font-semibold">{value}</p>
      </div>
      {value !== "—" && <CopyButton text={value} label={`Copy ${label}`} />}
    </div>
  );
}

function QuickLink({ href, icon: Icon, label, external }: { href: string; icon: typeof Phone; label: string; external?: boolean }) {
  return (
    <a href={href} target={external ? "_blank" : undefined} rel={external ? "noreferrer" : undefined} className="flex flex-col items-center gap-1 rounded-xl border border-zinc-200 py-2 text-xs font-medium text-zinc-600 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-800">
      <Icon className="size-4" />
      {label}
    </a>
  );
}

function Gauge({ score, color }: { score: number; color: string }) {
  const r = 26;
  const c = Math.PI * r; // half circle
  return (
    <svg viewBox="0 0 64 38" className="h-14 w-24 shrink-0" aria-label={`Risk score ${score}`}>
      <path d="M6 34 A26 26 0 0 1 58 34" fill="none" stroke="#f4f4f5" strokeWidth="7" strokeLinecap="round" />
      <path d="M6 34 A26 26 0 0 1 58 34" fill="none" stroke={color} strokeWidth="7" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c - (Math.min(100, score) / 100) * c} />
      <text x="32" y="33" textAnchor="middle" className="fill-zinc-900 text-[14px] font-bold">
        {score}
      </text>
    </svg>
  );
}

function Mini({ value, label, tone }: { value: number; label: string; tone?: "emerald" | "rose" }) {
  return (
    <div className={cn("rounded-xl p-2.5", tone === "emerald" ? "bg-emerald-50" : tone === "rose" ? "bg-rose-50" : "bg-zinc-50")}>
      <p className={cn("text-lg font-bold tabular-nums", tone === "emerald" ? "text-emerald-700" : tone === "rose" ? "text-rose-700" : "text-zinc-900")}>{value}</p>
      <p className="text-[11px] leading-tight text-zinc-500">{label}</p>
    </div>
  );
}

function Attr({ label, value, icon: Icon }: { label: string; value: string; icon?: typeof Globe }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-zinc-500">{label}</dt>
      <dd className="flex items-center gap-1.5 truncate text-right font-medium text-zinc-800">
        {Icon && <Icon className="size-3.5 text-zinc-400" />}
        {value}
      </dd>
    </div>
  );
}

function Pill({ on, children }: { on: boolean; children: React.ReactNode }) {
  return <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-medium ring-1", on ? "bg-blue-50 text-blue-700 ring-blue-100" : "bg-zinc-50 text-zinc-400 ring-zinc-200")}>{on ? "✓" : "✕"} {children}</span>;
}
