"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowDownRight, ArrowUpRight, ShoppingCart } from "lucide-react";
import { cn } from "@/lib/utils";

type Live = {
  online: number;
  arrived5: number;
  left5: number;
  visitsToday: number;
  onForm: number;
  top: number;
  reading: number;
  series: number[];
  feed: { id: string; type: "arrived" | "left"; path: string; source: string; device: string | null; at: string }[];
  bySlug: { slug: string; n: number }[];
};

export function ago(d: string | Date) {
  const s = Math.max(0, Math.floor((Date.now() - new Date(d).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ${s % 60}s ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}
const SRC: Record<string, string> = { facebook: "Facebook", google: "Google", tiktok: "TikTok", other: "Other", direct: "Direct" };

function Spark({ data }: { data: number[] }) {
  const max = Math.max(1, ...data);
  const w = 300;
  const h = 60;
  const pts = data.map((v, i) => `${(i / Math.max(1, data.length - 1)) * w},${h - (v / max) * (h - 6) - 3}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-16 w-full" preserveAspectRatio="none">
      <polyline points={pts} fill="none" stroke="#6ee7b7" strokeWidth="2" vectorEffect="non-scaling-stroke" />
      {data.length > 0 && <circle cx={w} cy={h - (data[data.length - 1] / max) * (h - 6) - 3} r="3" fill="#6ee7b7" />}
    </svg>
  );
}

/** The dark green "LIVE · LANDING PAGES" panel — refreshes every 3 seconds. */
export default function LiveLandingPanel({ openHref }: { openHref?: string }) {
  const [d, setD] = useState<Live | null>(null);
  const [, tick] = useState(0);
  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch("/api/admin/live?scope=landing", { cache: "no-store" })
        .then((r) => r.json())
        .then((j) => alive && setD(j))
        .catch(() => {});
    load();
    const t = setInterval(load, 3000);
    const t2 = setInterval(() => tick((x) => x + 1), 1000);
    return () => {
      alive = false;
      clearInterval(t);
      clearInterval(t2);
    };
  }, []);

  const peak = Math.max(0, ...(d?.series || [0]));

  return (
    <div className="grid gap-5 overflow-hidden rounded-2xl bg-gradient-to-br from-brand-800 via-brand-900 to-brand-950 p-5 text-white shadow-xl lg:grid-cols-[1.1fr_1fr_1fr]">
      <div>
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.15em] text-white/80">
            <span className="relative flex size-2.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex size-2.5 rounded-full bg-emerald-400" />
            </span>
            Live · Landing pages
          </p>
          {openHref && (
            <Link href={openHref} target="_blank" className="rounded-full border border-white/20 px-3 py-1 text-[11px] font-semibold hover:bg-white/10">
              OPEN LIVE PAGE →
            </Link>
          )}
        </div>
        <p className="mt-3 font-display text-6xl font-extrabold">{d?.online ?? "–"}</p>
        <p className="text-sm text-white/70">people are on your landing pages right now</p>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-white/[0.06] p-3 text-center">
            <p className="font-display text-xl font-bold text-emerald-300">+{d?.arrived5 ?? 0}</p>
            <p className="text-[11px] text-white/60">arrived · 5 min</p>
          </div>
          <div className="rounded-xl bg-white/[0.06] p-3 text-center">
            <p className="font-display text-xl font-bold text-rose-300">−{d?.left5 ?? 0}</p>
            <p className="text-[11px] text-white/60">left · 5 min</p>
          </div>
          <div className="rounded-xl bg-white/[0.06] p-3 text-center">
            <p className="font-display text-xl font-bold">{d?.visitsToday ?? 0}</p>
            <p className="text-[11px] text-white/60">visits today</p>
          </div>
        </div>
        <div className="mt-4">
          <div className="flex justify-between text-[11px] text-white/50">
            <span>Last 30 minutes</span>
            <span>peak {peak}</span>
          </div>
          <Spark data={d?.series || []} />
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-3 rounded-xl bg-white/[0.06] p-4">
          <ShoppingCart className="size-6 text-gold-300" />
          <div>
            <p className="font-semibold">{d?.onForm ?? 0} on the order form now</p>
            <p className="text-xs text-white/60">{d?.onForm ? "Someone is filling the form — get ready!" : "Nobody is filling the form right now"}</p>
          </div>
        </div>
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/50">Landing pages</p>
          {d?.bySlug.length ? (
            <div className="space-y-1.5">
              {d.bySlug.map((s) => (
                <div key={s.slug} className="flex justify-between rounded-lg bg-white/[0.04] px-3 py-1.5 text-sm">
                  <span>/{s.slug}</span>
                  <b>{s.n}</b>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-white/60">No one on a landing page right now.</p>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[
            ["Top of page", d?.top ?? 0],
            ["Reading", d?.reading ?? 0],
          ].map(([l, n]) => (
            <div key={l as string}>
              <div className="flex justify-between text-xs">
                <span className="text-white/70">{l}</span>
                <b>{n}</b>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-white/10">
                <div className="h-full rounded-full bg-emerald-400 transition-all" style={{ width: `${d?.online ? ((n as number) / d.online) * 100 : 0}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/50">Coming & going</p>
        <div className="max-h-64 space-y-1.5 overflow-y-auto pr-1 [scrollbar-width:thin]">
          {!d?.feed.length && <p className="text-sm text-white/50">No activity in the last 30 minutes.</p>}
          {d?.feed.map((f) => (
            <div key={f.id} className="flex items-center gap-2 rounded-lg bg-white/[0.05] px-2.5 py-2 text-xs">
              <span className={cn("grid size-5 shrink-0 place-items-center rounded-full", f.type === "arrived" ? "bg-emerald-400/20 text-emerald-300" : "bg-rose-400/20 text-rose-300")}>
                {f.type === "arrived" ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
              </span>
              <span className="min-w-0 flex-1 truncate">
                <b>{f.type === "arrived" ? "Arrived" : "Left"}</b> · {f.path} · {SRC[f.source] || f.source} · {f.device}
              </span>
              <span className="shrink-0 text-white/50">{ago(f.at)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
