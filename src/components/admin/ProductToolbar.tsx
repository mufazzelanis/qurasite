"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowUpDown, LayoutGrid, Loader2, Rows3, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

export const PRODUCT_SORTS = [
  ["order", "Display order"],
  ["newest", "Newest first"],
  ["best", "Best selling"],
  ["revenue", "Top revenue"],
  ["price-asc", "Price: low → high"],
  ["price-desc", "Price: high → low"],
  ["stock-asc", "Stock: low → high"],
  ["name", "Name A → Z"],
] as const;

/** Search (debounced), category + sort selects and grid/table switch — all kept in the URL */
export default function ProductToolbar({ categories }: { categories: { id: string; name: string; count: number }[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [pending, start] = useTransition();
  const [q, setQ] = useState(sp.get("q") ?? "");
  const input = useRef<HTMLInputElement>(null);

  const push = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(patch)) (v ? next.set(k, v) : next.delete(k));
    start(() => router.replace(`${pathname}${next.size ? `?${next}` : ""}`, { scroll: false }));
  };

  // debounce typing → URL
  useEffect(() => {
    if (q === (sp.get("q") ?? "")) return;
    const t = setTimeout(() => push({ q: q.trim() || null }), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  // "/" focuses search
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.key === "/" && !/INPUT|TEXTAREA|SELECT/.test(t.tagName) && !t.isContentEditable) {
        e.preventDefault();
        input.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const view = sp.get("view") === "table" ? "table" : "grid";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="relative min-w-56 flex-1">
        {pending ? <Loader2 className="absolute top-1/2 left-3 size-4 -translate-y-1/2 animate-spin text-brand-600" /> : <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400" />}
        <input
          ref={input}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name, Bangla name or slug…"
          className="a-input !rounded-xl !py-2.5 !pr-16 !pl-9"
        />
        {q ? (
          <button type="button" onClick={() => setQ("")} className="absolute top-1/2 right-2 grid size-6 -translate-y-1/2 place-items-center rounded-md text-zinc-400 hover:bg-zinc-100" aria-label="Clear search">
            <X className="size-3.5" />
          </button>
        ) : (
          <kbd className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 rounded border border-zinc-200 px-1.5 text-[10px] text-zinc-400">/</kbd>
        )}
      </label>

      <select value={sp.get("cat") ?? ""} onChange={(e) => push({ cat: e.target.value || null })} className="a-input !w-auto !rounded-xl !py-2.5" aria-label="Category">
        <option value="">All categories</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name} ({c.count})
          </option>
        ))}
        <option value="none">Uncategorised</option>
      </select>

      <label className="relative">
        <ArrowUpDown className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-zinc-400" />
        <select value={sp.get("sort") ?? "order"} onChange={(e) => push({ sort: e.target.value === "order" ? null : e.target.value })} className="a-input !w-auto !rounded-xl !py-2.5 !pl-8" aria-label="Sort">
          {PRODUCT_SORTS.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </label>

      <div className="flex rounded-xl border border-zinc-300 bg-white p-0.5" role="group" aria-label="View">
        {(
          [
            ["grid", LayoutGrid, "Grid view"],
            ["table", Rows3, "Table view"],
          ] as const
        ).map(([v, Icon, label]) => (
          <button
            key={v}
            type="button"
            title={label}
            aria-pressed={view === v}
            onClick={() => push({ view: v === "grid" ? null : v })}
            className={cn("grid size-9 place-items-center rounded-[10px] transition", view === v ? "bg-brand-800 text-white shadow-sm" : "text-zinc-500 hover:bg-zinc-100")}
          >
            <Icon className="size-4" />
          </button>
        ))}
      </div>
    </div>
  );
}
