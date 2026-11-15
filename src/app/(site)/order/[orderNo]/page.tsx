import Link from "next/link";
import { notFound } from "next/navigation";
import { BookOpen, ChevronRight, CircleCheck, Gift, Heart, Leaf, Phone, Shield, Soup, Star, Truck, type LucideIcon } from "lucide-react";
import PurchaseEvent from "@/components/tracking/PurchaseEvent";
import Confetti from "@/components/site/Confetti";
import PostPurchaseOffer from "@/components/order/PostPurchaseOffer";
import { db } from "@/lib/db";
import { getActiveProducts } from "@/lib/catalog";
import { getSetting } from "@/lib/settings";
import { STATUS_META, taka } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "অর্ডার সফল", robots: { index: false } };

const ICONS: Record<string, LucideIcon> = { book: BookOpen, spoon: Soup, leaf: Leaf, heart: Heart, truck: Truck, shield: Shield, phone: Phone, star: Star, gift: Gift };
const AREA: Record<string, string> = { INSIDE_DHAKA: "ঢাকার ভিতরে", SUB_DHAKA: "ঢাকার আশেপাশে", OUTSIDE_DHAKA: "ঢাকার বাইরে" };
const METHOD: Record<string, string> = { COD: "ক্যাশ অন ডেলিভারি", BKASH: "বিকাশ", NAGAD: "নগদ", ROCKET: "রকেট" };

export default async function ThankYou({ params, searchParams }: { params: Promise<{ orderNo: string }>; searchParams: Promise<{ e?: string }> }) {
  const { orderNo } = await params;
  const { e } = await searchParams;
  const order = await db.order.findUnique({ where: { orderNo }, include: { items: true } });
  if (!order) notFound();
  const [site, upsell, products, tracking, ty] = await Promise.all([getSetting("site"), getSetting("upsell"), getActiveProducts(), getSetting("tracking"), getSetting("thankYou")]);

  // the token (= order id) proves this is the customer who just ordered — only they see address & phone
  const owner = e === order.id;
  const fresh = owner && Date.now() - order.createdAt.getTime() < 30 * 60 * 1000;
  const endsAt = order.createdAt.getTime() + upsell.postPurchaseMinutes * 60_000;
  const inOrder = new Set(order.items.map((i) => i.productId));
  const offer = owner && upsell.postPurchaseEnabled && order.status === "PENDING" && Date.now() < endsAt ? products.filter((p) => p.isAddon && !inOrder.has(p.id)) : [];

  const date = order.createdAt.toLocaleDateString("bn-BD", { timeZone: "Asia/Dhaka", day: "numeric", month: "long", year: "numeric" });
  const due = order.total - order.advanceAmount;
  const method = order.advanceAmount > 0 ? `${METHOD[order.paymentMethod] || order.paymentMethod} (অগ্রিম) + ক্যাশ অন ডেলিভারি` : METHOD.COD;
  const subtotal = order.items.reduce((a, i) => a + i.price * i.quantity, 0);

  const info = [
    ["অর্ডার নম্বর", order.orderNo],
    ["তারিখ", date],
    ["সর্বমোট", taka(order.total)],
    ["পেমেন্ট মেথড", order.advanceAmount > 0 ? METHOD[order.paymentMethod] || order.paymentMethod : METHOD.COD],
  ];
  const rows: [string, React.ReactNode][] = [
    ["সাবটোটাল", taka(subtotal)],
    ...(order.couponDiscount > 0 ? [[`কুপন (${order.couponCode})`, `− ${taka(order.couponDiscount)}`] as [string, string]] : []),
    [
      "ডেলিভারি চার্জ",
      <>
        {order.deliveryCharge ? taka(order.deliveryCharge) : "ফ্রি"} <span className="text-xs text-brand-900/45">({AREA[order.deliveryArea]})</span>
      </>,
    ],
    ["সর্বমোট", <b key="t">{taka(order.total)}</b>],
    ...(order.advanceAmount > 0 ? [[`অগ্রিম পাঠানো (${METHOD[order.paymentMethod]})`, `− ${taka(order.advanceAmount)}`] as [string, string]] : []),
    ["পেমেন্ট মেথড", method],
  ];

  return (
    <section className="bg-white">
      {fresh && <Confetti />}
      {fresh && tracking.purchaseTrigger === "placed" && <PurchaseEvent eventId={order.id} value={tracking.purchaseValue === "products" ? order.total - order.deliveryCharge : order.total} contentIds={order.items.map((i) => i.productId)} numItems={order.items.reduce((a, i) => a + i.quantity, 0)} />}

      <div className="mx-auto max-w-2xl px-4 py-10 sm:py-14">
        {/* heading */}
        <div className="text-center">
          <div className="mx-auto mb-4 grid size-16 place-items-center rounded-full bg-brand-50 ring-8 ring-brand-50/50 animate-[pop_.5s_ease-out]">
            <CircleCheck className="size-9 text-brand-600" />
          </div>
          <h1 className="font-display text-3xl font-extrabold leading-tight text-brand-600 sm:text-4xl">{ty.heading}</h1>
          <p className="mx-auto mt-3 max-w-lg text-lg font-semibold text-brand-900/80 sm:text-xl">{ty.subheading}</p>
        </div>

        <p className="mt-8 font-semibold text-brand-900">ধন্যবাদ{owner ? `, ${order.customerName}` : ""}! আপনার অর্ডারটি আমরা পেয়েছি।</p>

        {/* info strip */}
        <div className="mt-3 grid grid-cols-2 gap-y-4 rounded-xl bg-zinc-100/80 p-5 sm:grid-cols-4">
          {info.map(([k, v], i) => (
            <div key={k} className={i % 2 ? "border-l border-dashed border-zinc-300 pl-4 sm:pl-4" : i ? "sm:border-l sm:border-dashed sm:border-zinc-300 sm:pl-4" : ""}>
              <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">{k}</p>
              <p className="mt-1 text-sm font-bold text-brand-900">{v}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-sm text-brand-900/60">
          {order.advanceAmount > 0 ? `অগ্রিম ${taka(order.advanceAmount)} পেয়েছি (TrxID: ${order.paymentTrxId})। বাকি ${taka(due)} ডেলিভারির সময় দেবেন।` : ty.codNote}
        </p>

        {offer.length > 0 && (
          <div className="mt-6">
            <PostPurchaseOffer orderNo={order.orderNo} token={order.id} addons={offer} endsAt={endsAt} title={upsell.postPurchaseTitle} />
          </div>
        )}

        {/* order details */}
        <div className="mt-6 rounded-xl bg-zinc-100/80 p-5 sm:p-6">
          <h2 className="text-lg font-bold text-brand-900">অর্ডারের বিবরণ</h2>
          <table className="mt-4 w-full text-sm">
            <thead>
              <tr className="border-b border-dashed border-zinc-300 text-left">
                <th className="pb-2 font-semibold">পণ্য</th>
                <th className="pb-2 text-right font-semibold">মোট</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((i) => (
                <tr key={i.id} className="border-b border-dashed border-zinc-300">
                  <td className="py-2.5 text-brand-700">
                    {i.name} <b className="text-brand-900">× {i.quantity}</b> {i.source && <span className="ml-1 rounded bg-gold-100 px-1.5 text-[10px] font-bold text-gold-700">কম্বো</span>}
                  </td>
                  <td className="py-2.5 text-right">{taka(i.price * i.quantity)}</td>
                </tr>
              ))}
              {rows.map(([k, v]) => (
                <tr key={k}>
                  <td className="pt-3 text-brand-900/70">{k}</td>
                  <td className="pt-3 text-right">{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-4 flex items-center justify-between rounded-lg bg-brand-700 px-4 py-3 text-white">
            <span className="font-semibold">ডেলিভারিতে দেবেন</span>
            <span className="font-display text-xl font-extrabold">{taka(due)}</span>
          </div>
        </div>

        {/* addresses — only for the customer who placed the order */}
        {owner && (
          <div className="mt-4 grid gap-6 rounded-xl bg-zinc-100/80 p-5 sm:grid-cols-2 sm:p-6">
            <div>
              <h2 className="text-lg font-bold text-brand-900">বিলিং ঠিকানা</h2>
              <address className="mt-3 space-y-0.5 text-sm not-italic text-brand-900/70">
                <p className="font-medium text-brand-900">{order.customerName}</p>
                <p>{order.address}</p>
                <p>{order.phone}</p>
              </address>
            </div>
            <div>
              <h2 className="text-lg font-bold text-brand-900">ডেলিভারি ঠিকানা</h2>
              <p className="mt-3 text-sm text-brand-900/70">বিলিং ঠিকানাতেই পাঠানো হবে · {AREA[order.deliveryArea]}</p>
              {order.notes && <p className="mt-2 text-sm text-brand-900/60">নোট: {order.notes}</p>}
            </div>
          </div>
        )}
        {!owner && (
          <p className="mt-4 rounded-xl bg-zinc-100/80 p-4 text-sm text-brand-900/70">
            অর্ডারের বর্তমান অবস্থা: <b>{STATUS_META[order.status].bn}</b>
          </p>
        )}

        {/* guides */}
        {ty.guides.length > 0 && (
          <div className="mt-6 rounded-2xl border border-brand-100 bg-gradient-to-b from-brand-50 to-white p-5 sm:p-6">
            <h2 className="font-display text-xl font-extrabold text-brand-800">{ty.guidesTitle}</h2>
            <div className="mt-4 space-y-3">
              {ty.guides.map((g) => {
                const Icon = ICONS[g.icon] || BookOpen;
                return (
                  <Link key={g.title + g.href} href={g.href || "#"} className="group flex items-center gap-4 rounded-xl bg-white p-3.5 shadow-sm ring-1 ring-brand-900/5 transition hover:-translate-y-0.5 hover:shadow-md">
                    <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700"><Icon className="size-5" /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-bold text-brand-800">{g.title}</span>
                      {g.subtitle && <span className="block text-sm text-brand-900/60">{g.subtitle}</span>}
                    </span>
                    <ChevronRight className="size-5 shrink-0 text-brand-700 transition group-hover:translate-x-1" />
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link href={`/track?q=${order.orderNo}`} className="btn-green flex-1">
            <Truck className="size-4" /> অর্ডার ট্র্যাক করুন
          </Link>
          <a href={`tel:${site.phone}`} data-track="call" className="btn-ghost flex-1">
            <Phone className="size-4" /> কোনো প্রশ্ন? কল করুন {site.phone}
          </a>
        </div>
      </div>
    </section>
  );
}
