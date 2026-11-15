import Link from "next/link";
import { Copy, ExternalLink, Pencil, Trash2 } from "lucide-react";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { deleteLanding, duplicateLanding } from "@/app/admin/actions";
import CreateLandingForm from "@/components/admin/CreateLandingForm";
import { cn, taka } from "@/lib/utils";

export default async function LandingPages() {
  await requireAdmin("landing");
  const since = new Date(Date.now() - 30 * 86400_000);
  const [pages, products, visits, orders] = await Promise.all([
    db.landingPage.findMany({ orderBy: { createdAt: "desc" } }),
    db.product.findMany({ where: { active: true }, select: { id: true, name: true, nameBn: true, isAddon: true }, orderBy: { sortOrder: "asc" } }),
    db.pageVisit.groupBy({ by: ["landingSlug"], where: { startedAt: { gte: since }, landingSlug: { not: null } }, _count: true }),
    db.order.groupBy({ by: ["source"], where: { createdAt: { gte: since }, status: { notIn: ["CANCELLED", "RETURNED"] } }, _count: true, _sum: { total: true } }),
  ]);
  const site = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const host = site.replace(/^https?:\/\//, "").replace(/\/$/, "");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Landing Pages</h1>
        <p className="text-sm text-zinc-500">Every landing page lives at <b>{host}/your-name</b>. Create as many as you want — each has its own products, texts, combo, pixel and stats.</p>
      </div>

      <CreateLandingForm host={host} products={products} pages={pages.map((p) => ({ id: p.id, slug: p.slug }))} />

      <div className="grid gap-4 lg:grid-cols-2">
        {pages.map((p) => {
          const v = visits.find((x) => x.landingSlug === p.slug)?._count ?? 0;
          const o = orders.find((x) => x.source === p.slug);
          const conv = v ? (((o?._count ?? 0) / v) * 100).toFixed(1) : "0";
          return (
            <div key={p.id} className="a-card">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-lg font-semibold">{p.title}</p>
                  <a href={`/${p.slug}`} target="_blank" className="font-mono text-sm text-brand-700 hover:underline">{host}/{p.slug}</a>
                </div>
                <span className={cn("shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold", p.active ? "bg-emerald-100 text-emerald-700" : "bg-zinc-200 text-zinc-600")}>{p.active ? "Live" : "Hidden"}</span>
              </div>
              <div className="my-4 grid grid-cols-4 gap-2 text-center">
                {[
                  ["Visits", v],
                  ["Orders", o?._count ?? 0],
                  ["Revenue", taka(o?._sum.total ?? 0)],
                  ["Conversion", `${conv}%`],
                ].map(([l, n]) => (
                  <div key={l as string} className="rounded-xl bg-zinc-50 p-2">
                    <p className="font-bold">{n}</p>
                    <p className="text-[11px] text-zinc-500">{l} · 30d</p>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                <Link href={`/admin/landing/${p.id}`} className="a-btn !py-1.5"><Pencil className="size-3.5" /> Edit</Link>
                <a href={`/${p.slug}`} target="_blank" className="a-btn-light !py-1.5"><ExternalLink className="size-3.5" /> Open</a>
                <Link href={`/admin/visitors?p=7d&slug=${p.slug}`} className="a-btn-light !py-1.5">Visitors</Link>
                <form action={duplicateLanding}><input type="hidden" name="id" value={p.id} /><button className="a-btn-light !py-1.5"><Copy className="size-3.5" /> Duplicate</button></form>
                <form action={deleteLanding} className="ml-auto"><input type="hidden" name="id" value={p.id} /><button className="a-btn-light !py-1.5 !text-rose-600"><Trash2 className="size-3.5" /></button></form>
              </div>
            </div>
          );
        })}
      </div>
      {!pages.length && <p className="a-card py-12 text-center text-zinc-400">No landing pages yet — create your first one above.</p>}
    </div>
  );
}
