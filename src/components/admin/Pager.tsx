import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** 1 2 … 7 8 9 … 20 */
export function pageList(cur: number, total: number) {
  const arr = [...new Set([1, 2, cur - 1, cur, cur + 1, total - 1, total].filter((p) => p >= 1 && p <= total))].sort((a, b) => a - b);
  const out: number[] = [];
  arr.forEach((p, i) => {
    if (i && p - arr[i - 1] > 1) out.push(0);
    out.push(p);
  });
  return out;
}

/** "Page 1 of 5"  ‹ 1 2 … 5 › — `href(page)` builds the link */
export default function Pager({ page, pages, href, note }: { page: number; pages: number; href: (p: number) => string; note?: string }) {
  const btn = "grid h-9 min-w-9 place-items-center rounded-lg px-2 text-sm transition";
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm text-zinc-500">
      <span>
        Page {page} of {pages}
        {note && <span className="text-zinc-400"> · {note}</span>}
      </span>
      {pages > 1 && (
        <div className="flex items-center gap-1">
          {page > 1 ? (
            <Link href={href(page - 1)} className={cn(btn, "hover:bg-zinc-100")} aria-label="Previous page"><ChevronLeft className="size-4" /></Link>
          ) : (
            <span className={cn(btn, "text-zinc-300")}><ChevronLeft className="size-4" /></span>
          )}
          {pageList(page, pages).map((p, i) =>
            p === 0 ? (
              <span key={`g${i}`} className="px-1 text-zinc-400">…</span>
            ) : (
              <Link key={p} href={href(p)} className={cn(btn, p === page ? "bg-brand-700 font-semibold text-white" : "text-zinc-700 hover:bg-zinc-100")}>
                {p}
              </Link>
            ),
          )}
          {page < pages ? (
            <Link href={href(page + 1)} className={cn(btn, "hover:bg-zinc-100")} aria-label="Next page"><ChevronRight className="size-4" /></Link>
          ) : (
            <span className={cn(btn, "text-zinc-300")}><ChevronRight className="size-4" /></span>
          )}
        </div>
      )}
    </div>
  );
}
