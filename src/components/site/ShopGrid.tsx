"use client";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import ProductCard, { type CardProduct } from "@/components/shop/ProductCard";
import { cn } from "@/lib/utils";
import { descendantIds } from "@/lib/category-tree";

type P = CardProduct & { tagline: string | null; categoryId: string | null };
type C = { id: string; name: string; nameBn: string | null; parentId: string | null; slug: string; sortOrder: number };

const SORTS = [
  ["featured", "জনপ্রিয়"],
  ["low", "কম দাম"],
  ["high", "বেশি দাম"],
] as const;

/** chips = categories offered as filters (default: top level). Picking a parent also shows its subcategories' products. */
export default function ShopGrid({ products, categories, chips, initialCategory = "" }: { products: P[]; categories: C[]; chips?: C[]; initialCategory?: string }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState(initialCategory);
  const [sort, setSort] = useState<(typeof SORTS)[number][0]>("featured");

  const chipList = chips ?? categories.filter((c) => !c.parentId || !categories.some((x) => x.id === c.parentId));
  const scope = useMemo(() => (cat ? descendantIds(categories, cat) : null), [categories, cat]);

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    const r = products.filter((p) => (!scope || (!!p.categoryId && scope.has(p.categoryId))) && (!s || [p.name, p.nameBn, p.tagline].some((x) => x?.toLowerCase().includes(s))));
    if (sort === "low") r.sort((a, b) => a.price - b.price);
    if (sort === "high") r.sort((a, b) => b.price - a.price);
    return r;
  }, [products, q, sort, scope]);

  return (
    <>
      <div className="mx-auto mb-5 flex max-w-3xl flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-5 top-1/2 size-5 -translate-y-1/2 text-brand-700" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="পণ্য খুঁজুন..." className="input h-13 rounded-full pl-14 text-base shadow-lg shadow-brand-900/5" />
        </div>
        <div className="flex gap-1 rounded-full bg-white p-1.5 shadow-lg shadow-brand-900/5">
          {SORTS.map(([k, l]) => (
            <button key={k} onClick={() => setSort(k)} className={cn("flex-1 rounded-full px-4 py-2 text-sm font-semibold transition", sort === k ? "bg-brand-800 text-white" : "text-brand-900/60")}>
              {l}
            </button>
          ))}
        </div>
      </div>
      {chipList.length > 0 && (
        <div className="mb-8 flex justify-start gap-2 overflow-x-auto pb-1 sm:justify-center [scrollbar-width:none]">
          {[{ id: initialCategory, name: "সব", nameBn: "সব" }, ...chipList].map((c) => (
            <button key={c.id || "all"} onClick={() => setCat(c.id)} className={cn("shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition", cat === c.id ? "border-gold-500 bg-gold-500 text-white" : "border-brand-900/10 bg-white text-brand-800")}>
              {c.nameBn || c.name}
            </button>
          ))}
        </div>
      )}
      <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
        {list.map((p, i) => (
          <ProductCard key={p.id} p={p} priority={i < 2} />
        ))}
      </div>
      {!list.length && <p className="py-20 text-center text-brand-900/50">কোনো পণ্য পাওয়া যায়নি</p>}
    </>
  );
}
