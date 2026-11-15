import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  AlertTriangle,
  Copy,
  Eye,
  EyeOff,
  ExternalLink,
  Layers,
  MoreHorizontal,
  Package,
  PackageX,
  Pencil,
  Plus,
  Sparkles,
  Star,
  Trash2,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { bulkProducts, deleteProduct, duplicateProduct, toggleProductFlag, updateProductStock } from "@/app/admin/actions";
import { cn, taka } from "@/lib/utils";
import { buildTree, descendantIds, flatten } from "@/lib/category-tree";
import ProductToolbar from "@/components/admin/ProductToolbar";
import ConfirmButton from "@/components/admin/ConfirmButton";
import BulkBar from "@/components/admin/BulkBar";
import SelectAll from "@/components/admin/SelectAll";
import Dropdown from "@/components/admin/Dropdown";

const LOW_STOCK = 10;
const BULK_FORM = "bulk-products";
const BULK_OPTIONS: [string, string][] = [
  ["activate", "👁 Show on site"],
  ["hide", "🙈 Hide from site"],
  ["feature", "⭐ Mark featured"],
  ["unfeature", "☆ Remove featured"],
  ["delete", "🗑 Delete (hide if it has orders)"],
];

const TABS = [
  ["all", "All"],
  ["active", "Active"],
  ["hidden", "Hidden"],
  ["featured", "Featured"],
  ["addon", "Add-ons"],
  ["low", "Low stock"],
] as const;
type Tab = (typeof TABS)[number][0];

type SP = { q?: string; tab?: string; cat?: string; sort?: string; view?: string };

const nf = new Intl.NumberFormat("en-IN");
const compactTaka = (n: number) => (n >= 1e7 ? `৳${(n / 1e7).toFixed(2)} Cr` : n >= 1e5 ? `৳${(n / 1e5).toFixed(1)} L` : taka(n));

export default async function ProductsPage({ searchParams }: { searchParams: Promise<SP> }) {
  await requireAdmin("products");
  const sp = await searchParams;
  const tab: Tab = (TABS.some(([t]) => t === sp.tab) ? sp.tab : "all") as Tab;
  const view = sp.view === "table" ? "table" : "grid";
  const q = (sp.q ?? "").trim().toLowerCase();

  const valid = { order: { status: { notIn: ["CANCELLED", "RETURNED"] as ("CANCELLED" | "RETURNED")[] } } };
  const since = new Date(Date.now() - 30 * 86400_000);

  const [products, categories, sales, recent, landings] = await Promise.all([
    db.product.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], include: { category: { select: { name: true } } } }),
    db.category.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true, nameBn: true, slug: true, parentId: true, sortOrder: true } }),
    // revenue = Σ price × qty, so group by (product, price)
    db.orderItem.groupBy({ by: ["productId", "price"], where: valid, _sum: { quantity: true }, _count: { orderId: true } }),
    db.orderItem.groupBy({ by: ["productId"], where: { order: { ...valid.order, createdAt: { gte: since } } }, _sum: { quantity: true } }),
    db.landingPage.findMany({ select: { slug: true, title: true, active: true, productId: true, extraIds: true, addonIds: true } }),
  ]);

  // ── per-product stats ──
  const stat = new Map<string, { units: number; revenue: number; orders: number; recent: number }>();
  const s = (id: string) => stat.get(id) ?? stat.set(id, { units: 0, revenue: 0, orders: 0, recent: 0 }).get(id)!;
  for (const r of sales) {
    const qty = r._sum.quantity ?? 0;
    const x = s(r.productId);
    x.units += qty;
    x.revenue += qty * r.price;
    x.orders += r._count.orderId;
  }
  for (const r of recent) s(r.productId).recent = r._sum.quantity ?? 0;
  const usedIn = (id: string) => landings.filter((l) => l.productId === id || l.extraIds.includes(id) || l.addonIds.includes(id));

  const rows = products.map((p) => ({ ...p, st: s(p.id), lps: usedIn(p.id) }));
  type Row = (typeof rows)[number];

  // ── KPIs (whole catalog) ──
  const activeCount = rows.filter((p) => p.active).length;
  const inventoryValue = rows.filter((p) => p.active).reduce((a, p) => a + p.price * p.stock, 0);
  const unitsSold = rows.reduce((a, p) => a + p.st.units, 0);
  const revenue = rows.reduce((a, p) => a + p.st.revenue, 0);
  const recentUnits = rows.reduce((a, p) => a + p.st.recent, 0);
  const outOfStock = rows.filter((p) => p.active && p.stock <= 0).length;
  const lowStock = rows.filter((p) => p.active && p.stock > 0 && p.stock < LOW_STOCK).length;
  const best = [...rows].sort((a, b) => b.st.units - a.st.units)[0];

  // ── filter → tab counts → sort ──
  const matchQ = (p: Row) => !q || [p.name, p.nameBn, p.slug, p.category?.name].some((v) => v?.toLowerCase().includes(q));
  // a parent category also shows the products of its subcategories
  const catScope = sp.cat && sp.cat !== "none" ? descendantIds(categories, sp.cat) : null;
  const matchCat = (p: Row) => !sp.cat || (sp.cat === "none" ? !p.categoryId : !!p.categoryId && !!catScope?.has(p.categoryId));
  const base = rows.filter((p) => matchQ(p) && matchCat(p));
  const inTab: Record<Tab, (p: Row) => boolean> = {
    all: () => true,
    active: (p) => p.active,
    hidden: (p) => !p.active,
    featured: (p) => p.featured,
    addon: (p) => p.isAddon,
    low: (p) => p.stock < LOW_STOCK,
  };
  const sorters: Record<string, (a: Row, b: Row) => number> = {
    newest: (a, b) => +b.createdAt - +a.createdAt,
    best: (a, b) => b.st.units - a.st.units,
    revenue: (a, b) => b.st.revenue - a.st.revenue,
    "price-asc": (a, b) => a.price - b.price,
    "price-desc": (a, b) => b.price - a.price,
    "stock-asc": (a, b) => a.stock - b.stock,
    name: (a, b) => (a.nameBn || a.name).localeCompare(b.nameBn || b.name),
  };
  const list = base.filter(inTab[tab]);
  if (sp.sort && sorters[sp.sort]) list.sort(sorters[sp.sort]);
  const maxStock = Math.max(LOW_STOCK * 5, ...rows.map((p) => p.stock));

  const href = (patch: Partial<SP>) => {
    const next = new URLSearchParams(Object.entries({ ...sp, ...patch }).filter(([, v]) => v) as [string, string][]);
    return `/admin/products${next.size ? `?${next}` : ""}`;
  };
  const catCounts = flatten(buildTree(categories)).map((c) => {
    const scope = descendantIds(categories, c.id);
    return { id: c.id, name: `${"  ".repeat(c.depth)}${c.depth ? "└ " : ""}${c.nameBn || c.name}`, count: rows.filter((p) => p.categoryId && scope.has(p.categoryId)).length };
  });

  return (
    <div className="space-y-6 pb-20">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Products</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {rows.length} products · {activeCount} live on the site{best?.st.units ? <> · best seller <span className="font-medium text-zinc-700">{best.nameBn || best.name}</span></> : null}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/categories" className="a-btn-light !rounded-xl">
            <Layers className="size-4" /> Categories
          </Link>
          <Link href="/admin/products/new" className="a-btn !rounded-xl shadow-lg shadow-brand-900/20">
            <Plus className="size-4" /> Add product
          </Link>
        </div>
      </div>

      {/* ── KPI strip ── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi icon={Package} tone="brand" label="Catalog" value={nf.format(rows.length)} sub={`${activeCount} active · ${rows.length - activeCount} hidden`} />
        <Kpi icon={Wallet} tone="gold" label="Inventory value" value={compactTaka(inventoryValue)} sub="active stock × price" />
        <Kpi icon={TrendingUp} tone="sky" label="Revenue" value={compactTaka(revenue)} sub={`${nf.format(unitsSold)} units · ${nf.format(recentUnits)} in 30 days`} />
        <Link href={href({ tab: "low" })} className="contents">
          <Kpi
            icon={outOfStock ? PackageX : AlertTriangle}
            tone={outOfStock ? "rose" : lowStock ? "amber" : "emerald"}
            label="Stock alerts"
            value={outOfStock + lowStock ? `${outOfStock + lowStock}` : "All good"}
            sub={outOfStock + lowStock ? `${outOfStock} out · ${lowStock} below ${LOW_STOCK}` : "no product is running low"}
            interactive
          />
        </Link>
      </div>

      {/* ── Tabs + toolbar ── */}
      <div className="space-y-3 rounded-2xl border border-zinc-200/70 bg-white p-3 shadow-sm">
        <nav className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-0.5" aria-label="Filter products">
          {TABS.map(([t, label]) => {
            const n = base.filter(inTab[t]).length;
            const on = tab === t;
            return (
              <Link
                key={t}
                href={href({ tab: t === "all" ? undefined : t })}
                scroll={false}
                className={cn(
                  "flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition",
                  on ? "bg-brand-800 text-white shadow-sm" : "text-zinc-600 hover:bg-zinc-100",
                )}
              >
                {label}
                <span className={cn("rounded-full px-1.5 text-xs tabular-nums", on ? "bg-white/20" : t === "low" && n ? "bg-rose-100 text-rose-700" : "bg-zinc-100 text-zinc-500")}>{n}</span>
              </Link>
            );
          })}
        </nav>
        <Suspense>
          <ProductToolbar categories={catCounts} />
        </Suspense>
      </div>

      {/* ── Bulk form (checkboxes link to it with form="…") ── */}
      <form id={BULK_FORM} action={bulkProducts}>
        <BulkBar options={BULK_OPTIONS} />
      </form>

      {!list.length ? (
        <Empty filtered={rows.length > 0} reset={href({ q: undefined, tab: undefined, cat: undefined })} />
      ) : view === "table" ? (
        <ProductTable list={list} />
      ) : (
        <>
          <label className="flex w-fit items-center gap-2 text-sm text-zinc-500">
            <SelectAll form={BULK_FORM} /> Select all {list.length}
          </label>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {list.map((p) => (
              <ProductCard key={p.id} p={p} maxStock={maxStock} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ───────────────────────────────────────────── components

const TONES = {
  brand: "bg-brand-50 text-brand-700 ring-brand-100",
  gold: "bg-gold-50 text-gold-700 ring-gold-100",
  sky: "bg-sky-50 text-sky-700 ring-sky-100",
  rose: "bg-rose-50 text-rose-700 ring-rose-100",
  amber: "bg-amber-50 text-amber-700 ring-amber-100",
  emerald: "bg-emerald-50 text-emerald-700 ring-emerald-100",
} as const;

function Kpi({ icon: Icon, tone, label, value, sub, interactive }: { icon: typeof Package; tone: keyof typeof TONES; label: string; value: string; sub: string; interactive?: boolean }) {
  return (
    <div className={cn("relative overflow-hidden rounded-2xl border border-zinc-200/70 bg-white p-4 shadow-sm", interactive && "transition hover:-translate-y-0.5 hover:shadow-md")}>
      <div className="flex items-center gap-3">
        <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl ring-1", TONES[tone])}>
          <Icon className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-medium tracking-wide text-zinc-500 uppercase">{label}</p>
          <p className="truncate text-xl font-bold tabular-nums">{value}</p>
        </div>
      </div>
      <p className="mt-2 truncate text-xs text-zinc-500">{sub}</p>
    </div>
  );
}

type CardProduct = {
  id: string;
  name: string;
  nameBn: string | null;
  slug: string;
  image: string;
  price: number;
  comparePrice: number | null;
  comboPrice: number | null;
  stock: number;
  active: boolean;
  featured: boolean;
  isAddon: boolean;
  weight: string | null;
  category: { name: string } | null;
  st: { units: number; revenue: number; orders: number; recent: number };
  lps: { slug: string; title: string; active: boolean }[];
};

const discount = (p: CardProduct) => (p.comparePrice && p.comparePrice > p.price ? Math.round((1 - p.price / p.comparePrice) * 100) : 0);

function stockTone(stock: number) {
  if (stock <= 0) return { bar: "bg-rose-500", text: "text-rose-600", label: "Out of stock" };
  if (stock < LOW_STOCK) return { bar: "bg-amber-500", text: "text-amber-600", label: "Low stock" };
  return { bar: "bg-emerald-500", text: "text-emerald-700", label: "In stock" };
}

function FlagForm({ id, field, children, className, title }: { id: string; field: "active" | "featured"; children: React.ReactNode; className?: string; title?: string }) {
  return (
    <form action={toggleProductFlag}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="field" value={field} />
      <button className={className} title={title}>
        {children}
      </button>
    </form>
  );
}

function ProductCard({ p, maxStock }: { p: CardProduct; maxStock: number }) {
  const off = discount(p);
  const tone = stockTone(p.stock);
  return (
    <article className={cn("group relative flex flex-col rounded-2xl border bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-zinc-900/5", p.active ? "border-zinc-200/70" : "border-dashed border-zinc-300")}>
      {/* image */}
      <div className="relative aspect-[4/3] overflow-hidden rounded-t-2xl bg-gradient-to-br from-cream via-white to-brand-50">
        <Image src={p.image} alt="" fill sizes="(min-width:1536px) 25vw, (min-width:1280px) 33vw, (min-width:640px) 50vw, 100vw" className={cn("object-contain p-6 transition duration-500 group-hover:scale-105", !p.active && "opacity-50 grayscale")} />

        <input type="checkbox" name="ids" value={p.id} form={BULK_FORM} aria-label={`Select ${p.name}`} className="row-check absolute top-3 left-3 size-5 cursor-pointer rounded accent-brand-700 opacity-60 transition group-hover:opacity-100 checked:opacity-100" />

        <div className="absolute top-3 left-11 flex flex-wrap gap-1.5">
          {off > 0 && <span className="rounded-full bg-rose-600 px-2 py-0.5 text-[11px] font-bold text-white shadow-sm">-{off}%</span>}
          {p.featured && (
            <span className="flex items-center gap-1 rounded-full bg-gold-400 px-2 py-0.5 text-[11px] font-bold text-white shadow-sm">
              <Star className="size-3 fill-current" /> Featured
            </span>
          )}
          {p.isAddon && <span className="rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-semibold text-gold-700 shadow-sm ring-1 ring-gold-200">🍯 Add-on</span>}
        </div>

        <FlagForm
          id={p.id}
          field="active"
          title={p.active ? "Live — click to hide from the site" : "Hidden — click to show on the site"}
          className={cn(
            "absolute top-3 right-3 flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold shadow-sm ring-1 backdrop-blur transition",
            p.active ? "bg-emerald-50/90 text-emerald-700 ring-emerald-200 hover:bg-emerald-100" : "bg-zinc-100/90 text-zinc-500 ring-zinc-200 hover:bg-zinc-200",
          )}
        >
          <span className={cn("size-1.5 rounded-full", p.active ? "animate-pulse bg-emerald-500" : "bg-zinc-400")} />
          {p.active ? "Live" : "Hidden"}
        </FlagForm>

        {p.st.recent > 0 && (
          <span className="absolute bottom-3 left-3 flex items-center gap-1 rounded-full bg-zinc-900/75 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur">
            <Sparkles className="size-3" /> {p.st.recent} sold in 30d
          </span>
        )}
      </div>

      {/* body */}
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="min-w-0">
          <Link href={`/admin/products/${p.id}`} className="line-clamp-2 leading-snug font-semibold hover:text-brand-700">
            {p.nameBn || p.name}
          </Link>
          <p className="mt-0.5 truncate text-xs text-zinc-400">
            {p.nameBn && <>{p.name} · </>}
            {p.category?.name ?? "Uncategorised"}
            {p.weight && <> · {p.weight}</>}
          </p>
        </div>

        <div className="flex items-baseline gap-2">
          <span className="text-xl font-bold text-brand-800 tabular-nums">{taka(p.price)}</span>
          {off > 0 && <span className="text-sm text-zinc-400 line-through tabular-nums">{taka(p.comparePrice!)}</span>}
          {p.isAddon && p.comboPrice != null && <span className="ml-auto rounded-md bg-gold-50 px-1.5 py-0.5 text-xs font-semibold text-gold-700 ring-1 ring-gold-100">combo {taka(p.comboPrice)}</span>}
        </div>

        {/* stock meter */}
        <div>
          <div className="mb-1 flex justify-between text-xs">
            <span className={cn("font-medium", tone.text)}>{tone.label}</span>
            <span className="text-zinc-500 tabular-nums">{nf.format(p.stock)} units</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-zinc-100">
            <div className={cn("h-full rounded-full transition-all", tone.bar)} style={{ width: `${Math.max(p.stock > 0 ? 3 : 0, Math.min(100, (p.stock / maxStock) * 100))}%` }} />
          </div>
        </div>

        {/* stats */}
        <dl className="grid grid-cols-3 divide-x divide-zinc-100 rounded-xl bg-zinc-50 py-2 text-center">
          <Stat label="Sold" value={nf.format(p.st.units)} />
          <Stat label="Orders" value={nf.format(p.st.orders)} />
          <Stat label="Revenue" value={compactTaka(p.st.revenue)} />
        </dl>

        {p.lps.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {p.lps.slice(0, 3).map((l) => (
              <Link key={l.slug} href={`/${l.slug}`} target="_blank" title={l.title} className={cn("rounded-md px-1.5 py-0.5 text-[11px] font-medium ring-1", l.active ? "bg-brand-50 text-brand-700 ring-brand-100 hover:bg-brand-100" : "bg-zinc-50 text-zinc-400 ring-zinc-200")}>
                /{l.slug}
              </Link>
            ))}
            {p.lps.length > 3 && <span className="px-1 text-[11px] text-zinc-400">+{p.lps.length - 3}</span>}
          </div>
        )}

        {/* actions */}
        <div className="mt-auto flex items-center gap-2 pt-1">
          <Link href={`/admin/products/${p.id}`} className="a-btn flex-1 justify-center !rounded-xl !py-2">
            <Pencil className="size-3.5" /> Edit
          </Link>
          <Link href={`/p/${p.slug}`} target="_blank" className="a-btn-light !rounded-xl !px-2.5 !py-2" title="Open product page">
            <ExternalLink className="size-4" />
          </Link>
          <MoreMenu p={p} />
        </div>
      </div>
    </article>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 px-1">
      <dt className="text-[10px] font-medium tracking-wide text-zinc-400 uppercase">{label}</dt>
      <dd className="truncate text-sm font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

/** Native <details> dropdown — no client JS needed */
function MoreMenu({ p }: { p: CardProduct }) {
  const item = "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-100";
  return (
    <Dropdown
      className="relative [&[open]>summary]:bg-zinc-100"
      summaryClassName="a-btn-light cursor-pointer list-none !rounded-xl !px-2.5 !py-2 [&::-webkit-details-marker]:hidden"
      summary={<MoreHorizontal className="size-4" aria-label="More actions" />}
    >
      <div className="absolute right-0 bottom-full z-20 mb-2 w-52 rounded-xl border border-zinc-200 bg-white p-1.5 shadow-xl shadow-zinc-900/10">
        <FlagForm id={p.id} field="active" className={item}>
          {p.active ? <EyeOff className="size-4 text-zinc-400" /> : <Eye className="size-4 text-zinc-400" />}
          {p.active ? "Hide from site" : "Show on site"}
        </FlagForm>
        <FlagForm id={p.id} field="featured" className={item}>
          <Star className={cn("size-4", p.featured ? "fill-gold-400 text-gold-400" : "text-zinc-400")} />
          {p.featured ? "Remove featured" : "Mark featured"}
        </FlagForm>
        <form action={duplicateProduct}>
          <input type="hidden" name="id" value={p.id} />
          <button className={item}>
            <Copy className="size-4 text-zinc-400" /> Duplicate
          </button>
        </form>
        <div className="my-1 border-t border-zinc-100" />
        <form action={deleteProduct}>
          <input type="hidden" name="id" value={p.id} />
          <ConfirmButton
            message={p.st.orders ? `"${p.name}" has orders, so it will be hidden instead of deleted. Continue?` : `Delete "${p.name}" permanently?`}
            className={cn(item, "!text-rose-600 hover:!bg-rose-50")}
          >
            <Trash2 className="size-4" /> {p.st.orders ? "Hide (has orders)" : "Delete"}
          </ConfirmButton>
        </form>
      </div>
    </Dropdown>
  );
}

/** Compact icon actions for table rows (a dropdown would be clipped by the scroll container) */
function RowActions({ p }: { p: CardProduct }) {
  const btn = "a-btn-light !rounded-lg !px-2.5 !py-1.5";
  return (
    <div className="flex justify-end gap-1.5">
      <Link href={`/admin/products/${p.id}`} className={btn} title="Edit">
        <Pencil className="size-3.5" />
      </Link>
      <Link href={`/p/${p.slug}`} target="_blank" className={btn} title="Open product page">
        <ExternalLink className="size-3.5" />
      </Link>
      <FlagForm id={p.id} field="featured" className={btn} title={p.featured ? "Remove featured" : "Mark featured"}>
        <Star className={cn("size-3.5", p.featured && "fill-gold-400 text-gold-400")} />
      </FlagForm>
      <form action={duplicateProduct}>
        <input type="hidden" name="id" value={p.id} />
        <button className={btn} title="Duplicate">
          <Copy className="size-3.5" />
        </button>
      </form>
      <form action={deleteProduct}>
        <input type="hidden" name="id" value={p.id} />
        <ConfirmButton
          message={p.st.orders ? `"${p.name}" has orders, so it will be hidden instead of deleted. Continue?` : `Delete "${p.name}" permanently?`}
          className={cn(btn, "!text-rose-600 hover:!bg-rose-50")}
          title={p.st.orders ? "Hide (has orders)" : "Delete"}
        >
          <Trash2 className="size-3.5" />
        </ConfirmButton>
      </form>
    </div>
  );
}

function ProductTable({ list }: { list: CardProduct[] }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-zinc-200/70 bg-white shadow-sm">
      <table className="w-full min-w-[900px]">
        <thead className="border-b border-zinc-200 bg-zinc-50/70">
          <tr>
            <th className="a-th w-10 !pr-0">
              <SelectAll form={BULK_FORM} />
            </th>
            <th className="a-th">Product</th>
            <th className="a-th">Price</th>
            <th className="a-th">Stock</th>
            <th className="a-th text-right">Sold</th>
            <th className="a-th text-right">Revenue</th>
            <th className="a-th">Status</th>
            <th className="a-th" />
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {list.map((p) => {
            const off = discount(p);
            const tone = stockTone(p.stock);
            return (
              <tr key={p.id} className="group hover:bg-zinc-50/60">
                <td className="a-td !pr-0">
                  <input type="checkbox" name="ids" value={p.id} form={BULK_FORM} aria-label={`Select ${p.name}`} className="row-check size-4 accent-brand-700" />
                </td>
                <td className="a-td">
                  <div className="flex items-center gap-3">
                    <div className="relative size-12 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-cream to-brand-50 ring-1 ring-zinc-200/70">
                      <Image src={p.image} alt="" fill sizes="48px" className={cn("object-contain p-1", !p.active && "opacity-50 grayscale")} />
                    </div>
                    <div className="min-w-0">
                      <Link href={`/admin/products/${p.id}`} className="block max-w-72 truncate font-semibold text-zinc-900 hover:text-brand-700">
                        {p.nameBn || p.name}
                      </Link>
                      <p className="flex flex-wrap items-center gap-1.5 text-xs text-zinc-400">
                        /{p.slug} · {p.category?.name ?? "Uncategorised"}
                        {p.featured && <Star className="size-3 fill-gold-400 text-gold-400" />}
                        {p.isAddon && <span className="rounded bg-gold-50 px-1 font-semibold text-gold-700">add-on</span>}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="a-td whitespace-nowrap">
                  <span className="font-semibold text-brand-800 tabular-nums">{taka(p.price)}</span>
                  {off > 0 && <span className="ml-1.5 rounded bg-rose-50 px-1 text-xs font-semibold text-rose-600">-{off}%</span>}
                  {p.isAddon && p.comboPrice != null && <p className="text-xs text-gold-700">combo {taka(p.comboPrice)}</p>}
                </td>
                <td className="a-td">
                  <form action={updateProductStock} className="flex items-center gap-1.5">
                    <input type="hidden" name="id" value={p.id} />
                    <span className={cn("size-2 shrink-0 rounded-full", tone.bar)} title={tone.label} />
                    <input name="stock" type="number" min={0} defaultValue={p.stock} aria-label="Stock" className="a-input !w-20 !py-1 tabular-nums" />
                    <button className="rounded-lg px-2 py-1 text-xs font-semibold text-brand-700 opacity-0 transition group-hover:opacity-100 hover:bg-brand-50 focus:opacity-100">Save</button>
                  </form>
                </td>
                <td className="a-td text-right tabular-nums">
                  {nf.format(p.st.units)}
                  {p.st.recent > 0 && <p className="text-xs text-emerald-600">+{p.st.recent} / 30d</p>}
                </td>
                <td className="a-td text-right font-medium tabular-nums">{taka(p.st.revenue)}</td>
                <td className="a-td">
                  <FlagForm
                    id={p.id}
                    field="active"
                    title="Click to toggle"
                    className={cn("flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 transition", p.active ? "bg-emerald-50 text-emerald-700 ring-emerald-200 hover:bg-emerald-100" : "bg-zinc-100 text-zinc-500 ring-zinc-200 hover:bg-zinc-200")}
                  >
                    <span className={cn("size-1.5 rounded-full", p.active ? "bg-emerald-500" : "bg-zinc-400")} />
                    {p.active ? "Live" : "Hidden"}
                  </FlagForm>
                </td>
                <td className="a-td">
                  <RowActions p={p} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Empty({ filtered, reset }: { filtered: boolean; reset: string }) {
  return (
    <div className="grid place-items-center rounded-2xl border border-dashed border-zinc-300 bg-white px-6 py-20 text-center">
      <span className="grid size-14 place-items-center rounded-2xl bg-brand-50 text-brand-700">
        <Package className="size-7" />
      </span>
      <p className="mt-4 font-semibold">{filtered ? "No products match these filters" : "No products yet"}</p>
      <p className="mt-1 text-sm text-zinc-500">{filtered ? "Try a different search or clear the filters." : "Add your first product to start selling."}</p>
      <Link href={filtered ? reset : "/admin/products/new"} className="a-btn mt-5 !rounded-xl">
        {filtered ? "Clear filters" : (
          <>
            <Plus className="size-4" /> Add product
          </>
        )}
      </Link>
    </div>
  );
}
