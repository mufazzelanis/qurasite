import { requireAdmin } from "@/lib/session";
import { MessageCircle, Phone, Trash2 } from "lucide-react";
import { db } from "@/lib/db";
import { deleteDraft } from "@/app/admin/actions";

export default async function IncompletePage() {
  await requireAdmin("orders");
  const drafts = await db.draftOrder.findMany({ where: { converted: false }, orderBy: { updatedAt: "desc" }, take: 200 });
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Incomplete Orders</h1>
        <p className="text-sm text-zinc-500">Visitors who typed their phone number but did not place the order. Call them to recover the sale.</p>
      </div>
      <div className="a-card overflow-x-auto !p-0">
        <table className="w-full min-w-[760px]">
          <thead className="border-b bg-zinc-50/60">
            <tr><th className="a-th">Customer</th><th className="a-th">Address</th><th className="a-th">Cart</th><th className="a-th">Last seen</th><th className="a-th" /></tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {drafts.map((d) => {
              const cart = (Array.isArray(d.cart) ? d.cart : []) as { name: string; q: number }[];
              return (
                <tr key={d.id}>
                  <td className="a-td"><p className="font-medium">{d.name || "—"}</p><p className="text-xs text-zinc-500">{d.phone}</p></td>
                  <td className="a-td max-w-64 text-xs">{d.address || "—"}</td>
                  <td className="a-td text-xs">{cart.map((c) => `${c.name} ×${c.q}`).join(", ") || "—"}</td>
                  <td className="a-td text-xs text-zinc-500">{d.updatedAt.toLocaleString("en-GB", { timeZone: "Asia/Dhaka", dateStyle: "short", timeStyle: "short" })}</td>
                  <td className="a-td">
                    <div className="flex justify-end gap-2">
                      <a href={`tel:${d.phone}`} className="a-btn !py-1.5"><Phone className="size-3.5" /> Call</a>
                      <a href={`https://wa.me/88${d.phone?.replace(/^\+?88/, "")}`} target="_blank" rel="noreferrer" className="a-btn-light !py-1.5"><MessageCircle className="size-3.5" /></a>
                      <form action={deleteDraft}><input type="hidden" name="id" value={d.id} /><button className="a-btn-light !py-1.5 !text-rose-600"><Trash2 className="size-3.5" /></button></form>
                    </div>
                  </td>
                </tr>
              );
            })}
            {!drafts.length && <tr><td colSpan={5} className="py-16 text-center text-sm text-zinc-400">No incomplete orders 🎉</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
