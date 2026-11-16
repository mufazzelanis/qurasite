import { db } from "@/lib/db";
import { orderWhere } from "@/lib/order-filters";
import { apiAdmin } from "@/lib/session";

/** CSV export of orders (respects the same filters as the Orders page). Works with courier bulk upload. */
export async function GET(req: Request) {
  const g = await apiAdmin(["orders", "export"]);
  if (g.error) return g.error;
  const sp =Object.fromEntries(new URL(req.url).searchParams);
  const orders = await db.order.findMany({ where: orderWhere(sp), orderBy: { createdAt: "desc" }, include: { items: true }, take: 5000 });

  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const rows = [
    ["Order No", "Date", "Name", "Phone", "Address", "Area", "Items", "Subtotal", "Delivery", "Total", "Status", "Payment", "Advance", "TrxID", "Coupon", "Source", "Fraud Score", "Courier", "Tracking", "UTM Source", "Campaign", "Notes"],
    ...orders.map((o) => [
      o.orderNo,
      o.createdAt.toLocaleString("en-GB", { timeZone: "Asia/Dhaka" }),
      o.customerName,
      o.phone,
      o.address,
      o.deliveryArea,
      o.items.map((i) => `${i.name} x${i.quantity}`).join("; "),
      o.subtotal,
      o.deliveryCharge,
      o.total,
      o.status,
      o.paymentMethod,
      o.advanceAmount,
      o.paymentTrxId,
      o.couponCode,
      o.source === "shop" ? "Main site" : `/${o.source}`,
      o.fraudScore,
      o.courier,
      o.trackingCode,
      o.utmSource,
      o.utmCampaign,
      o.notes,
    ]),
  ];
  const csv = "﻿" + rows.map((r) => r.map(esc).join(",")).join("\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="qura-orders-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
