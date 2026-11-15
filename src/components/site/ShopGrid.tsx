"use client";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import ProductCard, { type CardProduct } from "@/components/shop/ProductCard";
import { cn } from "@/lib/utils";

type P = CardProduct & { tagline: string | null; categoryId: string | null };

const SORTS = [
  ["featured", "জনপ্রিয়"],
  ["low", "কম দাম"],
  ["high", "বেশি দাম"],
] as const;

export default function ShopGrid({ products, categories, initialCategory = "" }: { products: P[]; categories: { id: string; name: string; nameBn: string | null }[]; initialCategory?: string }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState(initialCategory);
  const [sort, setSort] = useState<(typeof SORTS)[number][0]>("featured");

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    const r = products.filter((p) => (!cat || p.categoryId === cat) && (!s || [p.name, p.nameBn, p.tagline].some((x) => x?.toLowerCase().includes(s))));
    if (sort === "low") r.sort((a, b) => a.price - b.price);
    if (sort === "high") r.sort((a, b) => b.price - a.price);
    return r;
  }, [products, q, sort, cat]);

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
      {categories.length > 0 && (
        <div className="mb-8 flex justify-start gap-2 overflow-x-auto pb-1 sm:justify-center [scrollbar-width:none]">
          {[{ id: "", name: "সব", nameBn: "সব" }, ...categories].map((c) => (
            <button key={c.id} onClick={() => setCat(c.id)} className={cn("shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition", cat === c.id ? "border-gold-500 bg-gold-500 text-white" : "border-brand-900/10 bg-white text-brand-800")}>
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
