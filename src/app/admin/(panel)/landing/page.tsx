import Link from "next/link";
import { BarChart3, Copy, Eye, EyeOff, ExternalLink, MousePointerClick, Palette, Pencil, Rocket, ShoppingBag, Target, Trash2, TrendingUp, Users, Wallet } from "lucide-react";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { can } from "@/lib/permissions";
import { deleteLanding, duplicateLanding, toggleLanding } from "@/app/admin/actions";
import { mergeLandingContent } from "@/lib/settings-defaults";
import { designByKey } from "@/lib/landing-designs";
import { cn, taka } from "@/lib/utils";
import NewLandingWizard from "@/components/admin/NewLandingWizard";
import DesignMock from "@/components/admin/DesignMock";
import ConfirmButton from "@/components/admin/ConfirmButton";
import CopyButton from "@/components/admin/CopyButton";

export default async function LandingPages() {
  const me = await requireAdmin("landing");
  const since = new Date(Date.now() - 30 * 86400_000);
  const [pages, allProducts, visits, orders, contentPages] = await Promise.all([
    db.landingPage.findMany({ orderBy: { createdAt: "desc" } }),
    db.product.findMany({ select: { id: true, name: true, nameBn: true, isAddon: true, image: true, price: true, active: true }, orderBy: { sortOrder: "asc" } }),
    db.pageVisit.groupBy({ by: ["landingSlug"], where: { startedAt: { gte: since }, landingSlug: { not: null } }, _count: true }),
    db.order.groupBy({ by: ["source"], where: { createdAt: { gte: since }, status: { notIn: ["CANCELLED", "RETURNED"] } }, _count: true, _sum: { total: true } }),
    db.page.findMany({ select: { slug: true } }),
  ]);
  const products = allProducts.filter((p) => p.active);
  const productById = new Map(allProducts.map((p) => [p.id, p]));
  const site = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const host = site.replace(/^https?:\/\//, "").replace(/\/$/, "");

  const rows = pages.map((p) => {
    const v = visits.find((x) => x.landingSlug === p.slug)?._count ?? 0;
    const o = orders.find((x) => x.source === p.slug);
    const n = o?._count ?? 0;
    const content = mergeLandingContent(p.content);
    return { ...p, product: productById.get(p.productId) ?? null, content, design: designByKey(content.design), visits: v, orders: n, revenue: o?._sum.total ?? 0, conv: v ? (n / v) * 100 : 0 };
  });
  const tot = rows.reduce((a, r) => ({ visits: a.visits + r.visits, orders: a.orders + r.orders, revenue: a.revenue + r.revenue }), { visits: 0, orders: 0, revenue: 0 });
  const avgConv = tot.visits ? (tot.orders / tot.visits) * 100 : 0;
  const best = [...rows].sort((a, b) => b.revenue - a.revenue)[0];
  const canCreate = can(me, "landing", "create");
  const canEdit = can(me, "landing", "edit");
  const canDelete = can(me, "landing", "delete");

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Landing Pages</h1>
          <p className="mt-1 text-sm text-zinc-500">
            High-converting sales pages at <b className="font-mono">{host}/your-page</b> — each with its own design, products, combo offer, Facebook pixel and stats.
          </p>
        </div>
        {canCreate && (
          <NewLandingWizard
            host={host}
            products={products}
            pages={rows.map((p) => ({ id: p.id, slug: p.slug, title: p.title }))}
            previewSlug={rows.find((r) => r.active)?.slug ?? rows[0]?.slug ?? null}
            taken={[...rows.map((r) => r.slug), ...contentPages.map((p) => p.slug)]}
          />
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Kpi icon={Rocket} label="Landing pages" value={String(rows.length)} sub={`${rows.filter((r) => r.active).length} live · ${rows.filter((r) => !r.active).length} draft`} />
        <Kpi icon={Users} label="Visitors · 30d" value={tot.visits.toLocaleString("en-IN")} sub="unique page visits" tone="sky" />
        <Kpi icon={ShoppingBag} label="Orders · 30d" value={tot.orders.toLocaleString("en-IN")} sub="excl. cancelled / returned" tone="violet" />
        <Kpi icon={Wallet} label="Revenue · 30d" value={taka(tot.revenue)} sub={best?.revenue ? `Top: /${best.slug}` : "—"} tone="gold" />
        <Kpi icon={TrendingUp} label="Conversion" value={`${avgConv.toFixed(1)}%`} sub="orders ÷ visitors" tone={avgConv >= 3 ? "emerald" : "zinc"} />
      </div>

      {/* pages */}
      {rows.length ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((p) => (
            <article key={p.id} className={cn("group flex flex-col overflow-hidden rounded-3xl border bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-zinc-900/5", p.active ? "border-zinc-200/70" : "border-dashed border-zinc-300")}>
              {/* preview */}
              <Link href={`/admin/landing/${p.id}`} className="relative block">
                <DesignMock d={p.design} image={p.content.heroImage && p.content.heroImage !== "/brand/logo-card-t.png" ? p.content.heroImage : (p.product?.image ?? undefined)} primary={p.content.primary} accent={p.content.accent} className={cn("transition duration-500 group-hover:scale-[1.02]", !p.active && "opacity-60 grayscale")} />
                <span className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-zinc-700 shadow-sm backdrop-blur">
                  <Palette className="size-3" /> {p.design.name}
                </span>
                <span className={cn("absolute top-3 right-3 flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold shadow-sm", p.active ? "bg-emerald-500 text-white" : "bg-zinc-700 text-white")}>
                  <span className={cn("size-1.5 rounded-full", p.active ? "animate-pulse bg-white" : "bg-zinc-400")} />
                  {p.active ? "LIVE" : "DRAFT"}
                </span>
              </Link>

              <div className="flex flex-1 flex-col gap-4 p-5">
                <div className="min-w-0">
                  <Link href={`/admin/landing/${p.id}`} className="line-clamp-1 text-lg font-bold hover:text-brand-700">
                    {p.title}
                  </Link>
                  <div className="mt-0.5 flex items-center gap-1">
                    <a href={`/${p.slug}`} target="_blank" className="truncate font-mono text-xs text-brand-700 hover:underline">
                      {host}/{p.slug}
                    </a>
                    <CopyButton text={`${site.replace(/\/$/, "")}/${p.slug}`} label="Copy link" className="!size-6 text-zinc-400" />
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
                    {p.product && <span className="rounded-md bg-zinc-100 px-1.5 py-0.5 text-zinc-600">{p.product.nameBn || p.product.name}</span>}
                    <span className={cn("flex items-center gap-1 rounded-md px-1.5 py-0.5", p.pixelMode === "own" ? "bg-violet-50 text-violet-700" : p.pixelMode === "none" ? "bg-rose-50 text-rose-600" : "bg-zinc-100 text-zinc-600")}>
                      <Target className="size-3" /> {p.pixelMode === "own" ? `Own pixel${p.pixelIds.length > 1 ? `s (${p.pixelIds.length})` : ""}` : p.pixelMode === "none" ? "No pixel" : "Site pixel"}
                    </span>
                  </div>
                </div>

                {/* stats */}
                <div className="grid grid-cols-3 divide-x divide-zinc-100 rounded-2xl bg-zinc-50 py-2.5 text-center">
                  <Stat label="Visitors" value={p.visits.toLocaleString("en-IN")} />
                  <Stat label="Orders" value={p.orders.toLocaleString("en-IN")} />
                  <Stat label="Revenue" value={taka(p.revenue)} />
                </div>
                <div>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="text-zinc-500">Conversion · 30 days</span>
                    <span className={cn("font-bold tabular-nums", p.conv >= 3 ? "text-emerald-600" : p.conv > 0 ? "text-amber-600" : "text-zinc-400")}>{p.conv.toFixed(1)}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-zinc-100">
                    <div className={cn("h-full rounded-full", p.conv >= 3 ? "bg-emerald-500" : "bg-amber-400")} style={{ width: `${Math.min(100, (p.conv / 6) * 100)}%` }} />
                  </div>
                </div>

                {/* actions */}
                <div className="mt-auto flex items-center gap-1.5 pt-1">
                  {canEdit ? (
                    <Link href={`/admin/landing/${p.id}`} className="a-btn flex-1 justify-center !rounded-xl !py-2">
                      <Pencil className="size-3.5" /> Edit
                    </Link>
                  ) : (
                    <Link href={`/admin/landing/${p.id}`} className="a-btn-light flex-1 justify-center !rounded-xl !py-2">
                      <Eye className="size-3.5" /> View
                    </Link>
                  )}
                  <a href={`/${p.slug}`} target="_blank" className="a-btn-light !rounded-xl !px-2.5 !py-2" title="Open live page">
                    <ExternalLink className="size-4" />
                  </a>
                  <Link href={`/admin/visitors?p=7d&slug=${p.slug}`} className="a-btn-light !rounded-xl !px-2.5 !py-2" title="Visitors & funnel">
                    <BarChart3 className="size-4" />
                  </Link>
                  {canEdit && (
                    <form action={toggleLanding}>
                      <input type="hidden" name="id" value={p.id} />
                      <button className="a-btn-light !rounded-xl !px-2.5 !py-2" title={p.active ? "Unpublish (make draft)" : "Publish"}>
                        {p.active ? <EyeOff className="size-4" /> : <MousePointerClick className="size-4" />}
                      </button>
                    </form>
                  )}
                  {canCreate && (
                    <form action={duplicateLanding}>
                      <input type="hidden" name="id" value={p.id} />
                      <button className="a-btn-light !rounded-xl !px-2.5 !py-2" title="Duplicate (A/B test)">
                        <Copy className="size-4" />
                      </button>
                    </form>
                  )}
                  {canDelete && (
                    <form action={deleteLanding}>
                      <input type="hidden" name="id" value={p.id} />
                      <ConfirmButton message={`Delete /${p.slug}? Ads pointing to it will show 404.`} className="a-btn-light !rounded-xl !px-2.5 !py-2 !text-rose-600 hover:!bg-rose-50" title="Delete">
                        <Trash2 className="size-4" />
                      </ConfirmButton>
                    </form>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="grid place-items-center rounded-3xl border-2 border-dashed border-zinc-300 bg-white py-20 text-center">
          <span className="grid size-16 place-items-center rounded-2xl bg-brand-50 text-brand-700">
            <Rocket className="size-8" />
          </span>
          <p className="mt-4 text-lg font-bold">Create your first landing page</p>
          <p className="mt-1 max-w-sm text-sm text-zinc-500">Pick one of 5 designs, choose a product — the page is ready in under a minute.</p>
        </div>
      )}
    </div>
  );
}

const TONES = {
  brand: "bg-brand-50 text-brand-700 ring-brand-100",
  sky: "bg-sky-50 text-sky-700 ring-sky-100",
  violet: "bg-violet-50 text-violet-700 ring-violet-100",
  gold: "bg-gold-50 text-gold-700 ring-gold-100",
  emerald: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  zinc: "bg-zinc-50 text-zinc-600 ring-zinc-200",
} as const;

function Kpi({ icon: Icon, label, value, sub, tone = "brand" }: { icon: typeof Rocket; label: string; value: string; sub: string; tone?: keyof typeof TONES }) {
  return (
    <div className="rounded-2xl border border-zinc-200/70 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl ring-1", TONES[tone])}>
          <Icon className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-xs font-medium tracking-wide text-zinc-500 uppercase">{label}</p>
          <p className="truncate text-xl font-bold tabular-nums">{value}</p>
        </div>
      </div>
      <p className="mt-2 truncate text-xs text-zinc-500">{sub}</p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 px-1">
      <p className="truncate text-sm font-bold tabular-nums">{value}</p>
      <p className="text-[10px] font-medium tracking-wide text-zinc-400 uppercase">{label}</p>
    </div>
  );
}
