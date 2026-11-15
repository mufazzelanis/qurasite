import { requireAdmin } from "@/lib/session";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { db } from "@/lib/db";
import { addBlock, removeBlock } from "@/app/admin/actions";
import { RiskBadge } from "@/components/admin/RiskBadge";
import FraudLookup from "@/components/admin/FraudLookup";
import { taka } from "@/lib/utils";

export default async function FraudPage() {
  await requireAdmin("reports");
  const [blocks, risky] = await Promise.all([
    db.blocklist.findMany({ orderBy: { createdAt: "desc" } }),
    db.order.findMany({ where: { fraudScore: { gte: 40 } }, orderBy: { createdAt: "desc" }, take: 20 }),
  ]);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Fraud Checker</h1>
        <p className="text-sm text-zinc-500">Check any phone number, block fake customers, and review risky orders. Configure thresholds and courier API in Settings → Fraud.</p>
      </div>

      <FraudLookup />

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="a-card">
          <h2 className="mb-4 font-semibold">Risky orders</h2>
          <div className="divide-y divide-zinc-100">
            {risky.map((o) => (
              <Link key={o.id} href={`/admin/orders/${o.id}`} className="flex items-center gap-3 py-2.5 text-sm hover:text-brand-700">
                <span className="font-mono text-xs">{o.orderNo}</span>
                <span className="flex-1 truncate">{o.customerName} · {o.phone}</span>
                <span>{taka(o.total)}</span>
                <RiskBadge score={o.fraudScore} />
              </Link>
            ))}
            {!risky.length && <p className="py-8 text-center text-sm text-zinc-400">No risky orders</p>}
          </div>
        </div>

        <div className="a-card">
          <h2 className="mb-4 font-semibold">Blocklist ({blocks.length})</h2>
          <form action={addBlock} className="mb-4 flex flex-wrap gap-2">
            <select name="type" className="a-input !w-28"><option value="phone">Phone</option><option value="ip">IP</option></select>
            <input name="value" required placeholder="01XXXXXXXXX or IP" className="a-input min-w-40 flex-1" />
            <input name="reason" placeholder="Reason" className="a-input min-w-32 flex-1" />
            <button className="a-btn">Block</button>
          </form>
          <div className="divide-y divide-zinc-100">
            {blocks.map((b) => (
              <div key={b.id} className="flex items-center gap-3 py-2 text-sm">
                <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs uppercase">{b.type}</span>
                <span className="font-mono">{b.value}</span>
                <span className="flex-1 truncate text-zinc-500">{b.reason}</span>
                <form action={removeBlock}><input type="hidden" name="id" value={b.id} /><button className="text-rose-600"><Trash2 className="size-4" /></button></form>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
