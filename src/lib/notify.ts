import "server-only";
import { getSetting } from "./settings";

const fill = (tpl: string, v: Record<string, string | number | null | undefined>) =>
  tpl.replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? ""));

/**
 * Generic SMS gateway (works with most BD providers: BulkSMSBD, SMS.net.bd, Alpha SMS…).
 * Configure the URL in Admin → Email, SMS & OTP with {phone} {message} {apiKey} {senderId}.
 */
export async function sendSms(phone: string, message: string) {
  const s = await getSetting("sms");
  if (!s.enabled || !s.apiUrl) return { skipped: true };
  const to = "88" + phone.replace(/^\+?88/, "");
  const vars = { phone: to, message, apiKey: s.apiKey, senderId: s.senderId };
  try {
    if (s.method === "POST") {
      const [url, query] = s.apiUrl.split("?");
      const body = new URLSearchParams(fill(query || "", Object.fromEntries(Object.entries(vars).map(([k, v]) => [k, encodeURIComponent(v)]))));
      if (!query) Object.entries(vars).forEach(([k, v]) => body.set(k, v));
      const r = await fetch(url, { method: "POST", body, signal: AbortSignal.timeout(8000) });
      return { ok: r.ok, status: r.status };
    }
    const url = fill(s.apiUrl, Object.fromEntries(Object.entries(vars).map(([k, v]) => [k, encodeURIComponent(v)])));
    const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
    return { ok: r.ok, status: r.status };
  } catch (e) {
    console.error("SMS error", e);
    return { ok: false };
  }
}

type OrderLike = { orderNo: string; customerName: string; phone: string; total: number; trackingCode?: string | null };

export async function smsForStatus(order: OrderLike, status: string) {
  const s = await getSetting("sms");
  const tpl = { PENDING: s.templates.placed, CONFIRMED: s.templates.confirmed, SHIPPED: s.templates.shipped, DELIVERED: s.templates.delivered, CANCELLED: s.templates.cancelled }[status];
  if (!tpl) return;
  await sendSms(order.phone, fill(tpl, { name: order.customerName, orderNo: order.orderNo, total: order.total, tracking: order.trackingCode || "" }));
}

export async function notifyNewOrder(order: OrderLike & { items: { name: string; quantity: number }[]; address: string }) {
  const [s, e, site] = await Promise.all([getSetting("sms"), getSetting("email"), getSetting("site")]);
  const vars = { name: order.customerName, orderNo: order.orderNo, total: order.total, phone: order.phone };
  const jobs: Promise<unknown>[] = [smsForStatus(order, "PENDING")];
  if (s.adminPhone) jobs.push(sendSms(s.adminPhone, fill(s.templates.adminNewOrder, vars)));
  if (e.enabled && e.host && e.notifyTo) {
    jobs.push(
      (async () => {
        const nodemailer = await import("nodemailer");
        const t = nodemailer.createTransport({ host: e.host, port: e.port, secure: e.port === 465, auth: { user: e.user, pass: e.pass } });
        await t.sendMail({
          from: e.from || e.user,
          to: e.notifyTo,
          subject: `🛒 New order ${order.orderNo} — ৳${order.total}`,
          html: `<h2>${site.name}: new order ${order.orderNo}</h2><p><b>${order.customerName}</b> · ${order.phone}<br>${order.address}</p><ul>${order.items
            .map((i) => `<li>${i.name} × ${i.quantity}</li>`)
            .join("")}</ul><p><b>Total: ৳${order.total}</b></p>`,
        });
      })().catch((err) => console.error("email error", err)),
    );
  }
  await Promise.allSettled(jobs);
}

export { fill as fillTemplate };
