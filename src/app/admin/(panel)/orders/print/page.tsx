import Image from "next/image";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { getSetting } from "@/lib/settings";
import { DELIVERY_LABELS, taka } from "@/lib/utils";
import PrintButton from "@/components/admin/PrintButton";

/** One or many invoices — each prints on its own page */
export default async function PrintInvoices({ searchParams }: { searchParams: Promise<{ ids?: string }> }) {
  await requireAdmin("orders", "export");
  const ids = ((await searchParams).ids || "").split(",").filter(Boolean).slice(0, 200);
  const [orders, site, inv] = await Promise.all([
    db.order.findMany({ where: { id: { in: ids } }, include: { items: true }, orderBy: { createdAt: "asc" } }),
    getSetting("site"),
    getSetting("invoice"),
  ]);
  return (
    <div>
      <PrintButton />
      {orders.map((o) => (
        <div key={o.id} className="mx-auto mb-8 max-w-2xl break-after-page bg-white p-10 text-sm text-zinc-800 shadow print:mb-0 print:p-6 print:shadow-none">
          <div className="flex items-start justify-between border-b pb-5">
            <div>
              <Image src="/brand/logo-en-t.png" alt="" width={170} height={64} className="h-12 w-auto" />
              <p className="mt-1 text-xs text-zinc-500">{inv.companyLine}</p>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold">{inv.title}</p>
              <p className="font-mono">#{o.orderNo}</p>
              <p>{o.createdAt.toLocaleDateString("en-GB", { timeZone: "Asia/Dhaka" })}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-6 py-5">
            <div>
              <p className="text-xs uppercase text-zinc-400">From</p>
              <p className="font-semibold">{site.name}</p>
              <p>{site.address}</p>
              <p>{site.phone}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-zinc-400">Deliver to</p>
              <p className="font-semibold">{o.customerName}</p>
              <p>{o.address}</p>
              <p className="font-semibold">{o.phone}</p>
            </div>
          </div>
          <table className="w-full">
            <thead><tr className="border-y bg-zinc-50 text-left"><th className="p-2">Item</th><th className="p-2">Qty</th><th className="p-2 text-right">Price</th><th className="p-2 text-right">Total</th></tr></thead>
            <tbody>
              {o.items.map((i) => (
                <tr key={i.id} className="border-b"><td className="p-2">{i.name}</td><td className="p-2">{i.quantity}</td><td className="p-2 text-right">{taka(i.price)}</td><td className="p-2 text-right">{taka(i.price * i.quantity)}</td></tr>
              ))}
            </tbody>
          </table>
          <div className="ml-auto mt-4 w-72 space-y-1">
            <div className="flex justify-between"><span>Subtotal</span><span>{taka(o.subtotal)}</span></div>
            {o.couponDiscount > 0 && <div className="flex justify-between"><span>Coupon {o.couponCode}</span><span>- {taka(o.couponDiscount)}</span></div>}
            <div className="flex justify-between"><span>Delivery ({DELIVERY_LABELS[o.deliveryArea]})</span><span>{taka(o.deliveryCharge)}</span></div>
            {o.advanceAmount > 0 && <div className="flex justify-between"><span>Paid ({o.paymentMethod})</span><span>- {taka(o.advanceAmount)}</span></div>}
            <div className="flex justify-between border-t pt-1 text-base font-bold"><span>Collect (COD)</span><span>{taka(o.total - o.advanceAmount)}</span></div>
          </div>
          {(inv.showSource || inv.showFraudScore) && (
            <p className="mt-4 text-xs text-zinc-400">
              {inv.showSource && `Source: ${o.source === "shop" ? "Main site" : "/" + o.source}`} {inv.showFraudScore && ` · Risk ${o.fraudScore}`}
            </p>
          )}
          {o.notes && <p className="mt-4 rounded bg-zinc-50 p-2 text-xs">Note: {o.notes}</p>}
          <p className="mt-8 text-center text-xs text-zinc-500">{inv.footerNote}</p>
        </div>
      ))}
      {!orders.length && <p className="p-10 text-center text-zinc-400">No orders selected</p>}
    </div>
  );
}
