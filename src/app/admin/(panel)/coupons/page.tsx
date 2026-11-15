import { Trash2 } from "lucide-react";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { deleteCoupon, saveCoupon } from "@/app/admin/actions";
import { cn, taka } from "@/lib/utils";

export default async function CouponsPage() {
  await requireAdmin("marketing");
  const coupons = await db.coupon.findMany({ orderBy: { createdAt: "desc" } });
  const usage = await db.order.groupBy({ by: ["couponCode"], where: { couponCode: { not: null } }, _sum: { couponDiscount: true, total: true }, _count: true });
  return (
    <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
      <form action={saveCoupon} className="a-card h-fit space-y-3">
        <h2 className="font-semibold">New coupon</h2>
        <input name="code" required placeholder="CODE (e.g. QURA50)" className="a-input uppercase" />
        <div className="grid grid-cols-2 gap-2">
          <select name="type" className="a-input"><option value="FLAT">৳ Flat</option><option value="PERCENT">% Percent</option></select>
          <input name="value" type="number" required placeholder="Value" className="a-input" />
        </div>
        <input name="minOrder" type="number" placeholder="Min order ৳ (optional)" className="a-input" />
        <input name="maxDiscount" type="number" placeholder="Max discount ৳ (for %)" className="a-input" />
        <input name="usageLimit" type="number" placeholder="Usage limit (empty = unlimited)" className="a-input" />
        <label className="block text-xs text-zinc-500">Expires<input name="expiresAt" type="datetime-local" className="a-input mt-1" /></label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked /> Active</label>
        <button className="a-btn">Create coupon</button>
      </form>
      <div className="space-y-3">
        <h1 className="text-2xl font-bold">Coupons ({coupons.length})</h1>
        {coupons.map((c) => {
          const u = usage.find((x) => x.couponCode === c.code);
          const expired = c.expiresAt && c.expiresAt < new Date();
          return (
            <div key={c.id} className="a-card flex flex-wrap items-center gap-4">
              <span className="rounded-lg border-2 border-dashed border-gold-400 bg-gold-50 px-3 py-1.5 font-mono text-lg font-bold">{c.code}</span>
              <div className="flex-1 text-sm">
                <p className="font-semibold">{c.type === "PERCENT" ? `${c.value}% off` : `${taka(c.value)} off`}{c.maxDiscount ? ` (max ${taka(c.maxDiscount)})` : ""}{c.minOrder ? ` · min ${taka(c.minOrder)}` : ""}</p>
                <p className="text-xs text-zinc-500">
                  Used {c.used}{c.usageLimit ? `/${c.usageLimit}` : ""} · {u?._count ?? 0} orders · {taka(u?._sum.total ?? 0)} sales · {taka(u?._sum.couponDiscount ?? 0)} discount given
                  {c.expiresAt && ` · expires ${c.expiresAt.toLocaleString("en-GB", { timeZone: "Asia/Dhaka", dateStyle: "medium", timeStyle: "short" })}`}
                </p>
              </div>
              <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", c.active && !expired ? "bg-emerald-100 text-emerald-700" : "bg-zinc-200 text-zinc-600")}>{expired ? "Expired" : c.active ? "Active" : "Off"}</span>
              <form action={saveCoupon} className="flex gap-2">
                {Object.entries({ id: c.id, code: c.code, type: c.type, value: c.value, minOrder: c.minOrder, maxDiscount: c.maxDiscount ?? "", usageLimit: c.usageLimit ?? "", expiresAt: c.expiresAt ? new Date(c.expiresAt.getTime() + 6 * 3600_000).toISOString().slice(0, 16) : "" }).map(([k, v]) => (
                  <input key={k} type="hidden" name={k} value={String(v)} />
                ))}
                {!c.active && <input type="hidden" name="active" value="on" />}
                <button className="a-btn-light !py-1.5">{c.active ? "Turn off" : "Turn on"}</button>
              </form>
              <form action={deleteCoupon}><input type="hidden" name="id" value={c.id} /><button className="a-btn-light !py-1.5 !text-rose-600"><Trash2 className="size-4" /></button></form>
            </div>
          );
        })}
        {!coupons.length && <p className="a-card py-10 text-center text-zinc-400">No coupons yet</p>}
      </div>
    </div>
  );
}
