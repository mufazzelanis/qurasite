import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

export default async function ActivityPage({ searchParams }: { searchParams: Promise<{ page?: string; who?: string }> }) {
  await requireAdmin("system");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page || 1));
  const per = 50;
  const where = sp.who ? { adminName: sp.who } : {};
  const [logs, total, people] = await Promise.all([
    db.activityLog.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * per, take: per }),
    db.activityLog.count({ where }),
    db.activityLog.groupBy({ by: ["adminName"], _count: true }),
  ]);
  const pages = Math.max(1, Math.ceil(total / per));
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Activity Log</h1>
          <p className="text-sm text-zinc-500">Who changed what, and when.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/activity" className="a-btn-light !py-1">Everyone</Link>
          {people.map((p) => <Link key={p.adminName} href={`?who=${encodeURIComponent(p.adminName)}`} className="a-btn-light !py-1">{p.adminName} ({p._count})</Link>)}
        </div>
      </div>
      <div className="a-card divide-y divide-zinc-100 !p-0">
        {logs.map((l) => (
          <div key={l.id} className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm">
            <span className="w-40 shrink-0 text-xs text-zinc-400">{l.createdAt.toLocaleString("en-GB", { timeZone: "Asia/Dhaka", dateStyle: "medium", timeStyle: "medium" })}</span>
            <span className="grid size-7 place-items-center rounded-full bg-brand-100 text-xs font-bold text-brand-800">{l.adminName[0]}</span>
            <span className="font-medium">{l.adminName}</span>
            <span className="text-zinc-600">{l.action}</span>
          </div>
        ))}
        {!logs.length && <p className="py-12 text-center text-sm text-zinc-400">No activity yet</p>}
      </div>
      {pages > 1 && (
        <div className="flex justify-center gap-2 text-sm">
          {page > 1 && <Link href={`?page=${page - 1}${sp.who ? `&who=${sp.who}` : ""}`} className="a-btn-light">← Newer</Link>}
          <span className="self-center text-zinc-500">Page {page} / {pages}</span>
          {page < pages && <Link href={`?page=${page + 1}${sp.who ? `&who=${sp.who}` : ""}`} className="a-btn-light">Older →</Link>}
        </div>
      )}
    </div>
  );
}
