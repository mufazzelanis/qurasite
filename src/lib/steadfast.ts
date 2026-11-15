import "server-only";
import { getSetting } from "./settings";

/**
 * Steadfast Courier API (portal.packzy.com). Keys from Steadfast panel → API.
 * Verify field names against your Steadfast API docs if they change.
 */
async function call(path: string, init?: RequestInit) {
  const c = await getSetting("courier");
  if (!c.steadfastApiKey || !c.steadfastSecretKey) throw new Error("Steadfast API key not set (Admin → Payments → Courier)");
  const res = await fetch(`${c.steadfastBaseUrl.replace(/\/$/, "")}${path}`, {
    ...init,
    headers: { "Api-Key": c.steadfastApiKey, "Secret-Key": c.steadfastSecretKey, "Content-Type": "application/json", ...(init?.headers || {}) },
    signal: AbortSignal.timeout(15000),
    cache: "no-store",
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j?.message || `Steadfast error ${res.status}`);
  return j;
}

export async function steadfastCreate(o: { orderNo: string; customerName: string; phone: string; address: string; total: number; advanceAmount: number; notes?: string | null }) {
  const j = await call("/create_order", {
    method: "POST",
    body: JSON.stringify({
      invoice: o.orderNo,
      recipient_name: o.customerName,
      recipient_phone: o.phone,
      recipient_address: o.address,
      cod_amount: Math.max(0, o.total - o.advanceAmount),
      note: o.notes || "",
    }),
  });
  const c = j?.consignment;
  if (!c?.consignment_id) throw new Error(j?.message || "Steadfast did not return a consignment");
  return { consignmentId: String(c.consignment_id), trackingCode: String(c.tracking_code || ""), status: String(c.status || "") };
}

export async function steadfastStatus(consignmentId: string) {
  const j = await call(`/status_by_cid/${consignmentId}`);
  return String(j?.delivery_status || "unknown");
}

/** Map Steadfast delivery_status → our order status */
export function mapSteadfast(s: string) {
  if (/^delivered/.test(s) || s === "partial_delivered") return "DELIVERED" as const;
  if (/cancelled/.test(s)) return "RETURNED" as const;
  if (/pending|in_review|hold/.test(s)) return "SHIPPED" as const;
  return null;
}
