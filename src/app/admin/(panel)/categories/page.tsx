import Link from "next/link";
import { Eye, FolderTree, Layers, Package, Search } from "lucide-react";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { getSetting } from "@/lib/settings";
import CategoryManager, { type Cat } from "@/components/admin/CategoryManager";

export default async function CategoriesPage() {
  await requireAdmin("products");
  const [cats, uncategorised, seo] = await Promise.all([
    db.category.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: { _count: { select: { products: true } }, products: { select: { image: true }, orderBy: { sortOrder: "asc" }, take: 4 } },
    }),
    db.product.count({ where: { categoryId: null } }),
    getSetting("seo"),
  ]);
  const data: Cat[] = cats.map(({ _count, products, ...c }) => ({ ...c, products: _count.products, thumbs: products.map((p) => p.image) }));
  const subs = cats.filter((c) => c.parentId).length;
  const withIntro = cats.filter((c) => c.description?.trim()).length;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Categories</h1>
        <p className="mt-1 text-sm text-zinc-500">Build your shop menu: categories, subcategories and deeper levels. Drag to reorder or nest.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat icon={FolderTree} label="Top level" value={cats.length - subs} />
        <Stat icon={Layers} label="Subcategories" value={subs} />
        <Stat icon={Eye} label="Visible" value={cats.filter((c) => c.active).length} />
        <Stat icon={Package} label="Uncategorised" value={uncategorised} warn={uncategorised > 0} href="/admin/products?cat=none" />
        <Stat icon={Search} label="With intro text" value={`${withIntro}/${cats.length}`} warn={withIntro < cats.length} />
      </div>

      <CategoryManager initial={data} titleSuffix={seo.titleSuffix} />
    </div>
  );
}

function Stat({ icon: Icon, label, value, warn, href }: { icon: typeof Eye; label: string; value: number | string; warn?: boolean; href?: string }) {
  const body = (
    <div className="flex h-full items-center gap-3 rounded-2xl border border-zinc-200/70 bg-white p-4 shadow-sm transition hover:shadow-md">
      <span className={warn ? "grid size-10 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-600 ring-1 ring-amber-100" : "grid size-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700 ring-1 ring-brand-100"}>
        <Icon className="size-5" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-xs font-medium tracking-wide text-zinc-500 uppercase">{label}</p>
        <p className="text-xl font-bold tabular-nums">{value}</p>
      </div>
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}
