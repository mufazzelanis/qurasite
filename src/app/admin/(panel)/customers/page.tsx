import Link from "next/link";
import { Ban, MessageCircle, Phone, Search } from "lucide-react";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { addBlock } from "@/app/admin/actions";
import { cn, taka } from "@/lib/utils";

type Row = { phone: string; name: string; address: string; orders: number; spent: number; delivered: number; bad: number; last: Date; first: Date };

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string; sort?: string; page?: string }> }) {
  await requireAdmin("customers");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page || 1));
  const per = 30;
  const q = sp.q?.trim();
  const filter = q ? Prisma.sql`WHERE phone ILIKE ${"%" + q + "%"} OR "customerName" ILIKE ${"%" + q + "%"}` : Prisma.empty;
  const order = sp.sort === "spent" ? Prisma.sql`spent DESC` : sp.sort === "orders" ? Prisma.sql`orders DESC` : Prisma.sql`last DESC`;

  const [rows, total, blocked] = await Promise.all([
    db.$queryRaw<Row[]>`
      SELECT phone,
        (array_agg("customerName" ORDER BY "createdAt" DESC))[1] AS name,
        (array_agg(address ORDER BY "createdAt" DESC))[1] AS address,
        count(*)::int AS orders,
        coalesce(sum(total) FILTER (WHERE status NOT IN ('CANCELLED','RETURNED')), 0)::int AS spent,
        count(*) FILTER (WHERE status = 'DELIVERED')::int AS delivered,
        count(*) FILTER (WHERE status IN ('CANCELLED','RETURNED'))::int AS bad,
        max("createdAt") AS last, min("createdAt") AS first
      FROM "Order" ${filter}
      GROUP BY phone ORDER BY ${order} LIMIT ${per} OFFSET ${(page - 1) * per}`,
    db.$queryRaw<{ n: number }[]>`SELECT count(DISTINCT phone)::int AS n FROM "Order" ${filter}`,
    db.blocklist.findMany({ where: { type: "phone" }, select: { value: true } }),
  ]);
  const blockedSet = new Set(blocked.map((b) => b.value));
  const n = total[0]?.n ?? 0;
  const pages = Math.max(1, Math.ceil(n / per));
  const qs = (o: Record<string, string | number | undefined>) => "?" + new URLSearchParams(Object.entries({ ...sp, ...o }).filter(([, v]) => v !== undefined && v !== "") as [string, string][]);

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Customers <span className="text-base font-normal text-zinc-400">({n})</span></h1>
      <form className="a-card flex flex-wrap gap-3 !p-4">
        <div className="relative min-w-60 flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
          <input name="q" defaultValue={q} placeholder="Phone or name" className="a-input pl-9" />
        </div>
        <select name="sort" defaultValue={sp.sort || ""} className="a-input !w-48">
          <option value="">Latest order</option>
          <option value="spent">Most spent</option>
          <option value="orders">Most orders</option>
        </select>
        <button className="a-btn">Search</button>
      </form>
      <div className="a-card overflow-x-auto !p-0">
        <table className="w-full min-w-[900px]">
          <thead className="border-b border-zinc-100 bg-zinc-50/60">
            <tr>{["Customer", "Orders", "Spent", "Delivery success", "First / last order", ""].map((h) => <th key={h} className="a-th">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {rows.map((r) => {
              const finished = r.delivered + r.bad;
              const rate = finished ? Math.round((r.delivered / finished) * 100) : null;
              return (
                <tr key={r.phone} className="hover:bg-zinc-50">
                  <td className="a-td">
                    <p className="font-medium">{r.name} {blockedSet.has(r.phone) && <span className="ml-1 rounded bg-rose-100 px-1.5 text-[10px] font-bold text-rose-700">BLOCKED</span>}</p>
                    <p className="text-xs text-zinc-500">{r.phone}</p>
                    <p className="max-w-72 truncate text-xs text-zinc-400">{r.address}</p>
                  </td>
                  <td className="a-td"><Link href={`/admin/orders?q=${r.phone}`} className="font-semibold text-brand-700 hover:underline">{r.orders}</Link></td>
                  <td className="a-td font-semibold">{taka(r.spent)}</td>
                  <td className="a-td">
                    {rate === null ? <span className="text-xs text-zinc-400">—</span> : (
                      <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", rate >= 80 ? "bg-emerald-100 text-emerald-700" : rate >= 50 ? "bg-amber-100 text-amber-800" : "bg-rose-100 text-rose-700")}>
                        {rate}% ({r.delivered}/{finished})
                      </span>
                    )}
                  </td>
                  <td className="a-td text-xs text-zinc-500">
                    {new Date(r.first).toLocaleDateString("en-GB", { timeZone: "Asia/Dhaka" })}<br />{new Date(r.last).toLocaleDateString("en-GB", { timeZone: "Asia/Dhaka" })}
                  </td>
                  <td className="a-td">
                    <div className="flex justify-end gap-1.5">
                      <a href={`tel:${r.phone}`} className="a-btn-light !p-2"><Phone className="size-3.5" /></a>
                      <a href={`https://wa.me/88${r.phone}`} target="_blank" rel="noreferrer" className="a-btn-light !p-2"><MessageCircle className="size-3.5" /></a>
                      {!blockedSet.has(r.phone) && (
                        <form action={addBlock}>
                          <input type="hidden" name="type" value="phone" />
                          <input type="hidden" name="value" value={r.phone} />
                          <input type="hidden" name="reason" value="Blocked from customers list" />
                          <button className="a-btn-light !p-2 !text-rose-600" title="Block"><Ban className="size-3.5" /></button>
                        </form>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {!rows.length && <tr><td colSpan={6} className="py-14 text-center text-sm text-zinc-400">No customers yet</td></tr>}
          </tbody>
        </table>
      </div>
      {pages > 1 && (
        <div className="flex items-center justify-center gap-2 text-sm">
          {page > 1 && <Link href={qs({ page: page - 1 })} className="a-btn-light">← Prev</Link>}
          <span className="text-zinc-500">Page {page} / {pages}</span>
          {page < pages && <Link href={qs({ page: page + 1 })} className="a-btn-light">Next →</Link>}
        </div>
      )}
    </div>
  );
}
