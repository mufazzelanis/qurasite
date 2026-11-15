"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { CalendarClock } from "lucide-react";
import { PERIODS } from "@/lib/periods";
import { cn } from "@/lib/utils";

export default function PeriodTabs({ current, label }: { current: string; label: string }) {
  const sp = useSearchParams();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState(sp.get("from") || "");
  const [to, setTo] = useState(sp.get("to") || "");
  const href = (p: string) => {
    const q = new URLSearchParams(sp);
    q.set("p", p);
    q.delete("from");
    q.delete("to");
    return `?${q}`;
  };
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1 rounded-xl border border-zinc-200 bg-white p-1">
          {PERIODS.map(([k, l]) => (
            <Link key={k} href={href(k)} className={cn("rounded-lg px-3 py-1.5 text-sm font-medium transition", current === k ? "bg-brand-700 text-white" : "text-zinc-600 hover:bg-zinc-100")}>
              {l}
            </Link>
          ))}
        </div>
        <div className="relative">
          <button onClick={() => setOpen(!open)} className={cn("a-btn-light", current === "custom" && "border-brand-700 text-brand-700")}>
            <CalendarClock className="size-4" /> Custom range
          </button>
          {open && (
            <div className="absolute left-0 top-12 z-20 w-72 space-y-2 rounded-xl border border-zinc-200 bg-white p-4 shadow-xl">
              <label className="block text-xs text-zinc-500">From<input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="a-input mt-1" /></label>
              <label className="block text-xs text-zinc-500">To<input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="a-input mt-1" /></label>
              <button
                className="a-btn w-full justify-center"
                onClick={() => {
                  const q = new URLSearchParams(sp);
                  q.set("p", "custom");
                  if (from) q.set("from", from);
                  if (to) q.set("to", to);
                  setOpen(false);
                  router.push(`?${q}`);
                }}
              >
                Apply
              </button>
            </div>
          )}
        </div>
      </div>
      <p className="text-sm text-zinc-500">
        <b className="text-zinc-700">{label}</b> · compared with the same days of the previous period
      </p>
    </div>
  );
}
