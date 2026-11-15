"use client";
import { useEffect, useState } from "react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { Monitor, Smartphone, Tablet } from "lucide-react";
import { ago } from "./LiveLandingPanel";

export function HourChart({ data }: { data: { h: number; visits: number; clicks: number }[] }) {
  const fmt = (h: number) => (h === 0 ? "12 AM" : h < 12 ? `${h} AM` : h === 12 ? "12 PM" : `${h - 12} PM`);
  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} barGap={1}>
          <XAxis dataKey="h" tickFormatter={fmt} ticks={[0, 6, 12, 18, 23]} tick={{ fontSize: 10, fill: "#a1a1aa" }} axisLine={false} tickLine={false} />
          <Tooltip labelFormatter={(h) => `${fmt(Number(h))} – ${fmt((Number(h) + 1) % 24)}`} contentStyle={{ borderRadius: 12, fontSize: 12 }} />
          <Bar dataKey="visits" name="Visits" fill="#16a34a" radius={[3, 3, 0, 0]} />
          <Bar dataKey="clicks" name="Order clicks" fill="#eab308" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

type V = { id: string; path: string; device: string | null; os: string | null; browser: string | null; source: string; stage: string; maxScroll: number; startedAt: string };
const DEV = { Phone: Smartphone, Tablet, Computer: Monitor } as Record<string, typeof Monitor>;
const STAGE: Record<string, [string, string]> = { top: ["Top of page", "bg-zinc-100 text-zinc-600"], reading: ["Reading", "bg-sky-100 text-sky-700"], form: ["On order form", "bg-amber-100 text-amber-800"] };

/** Who is on the landing pages right now (updates every 3s) */
export function LiveVisitorList() {
  const [list, setList] = useState<V[]>([]);
  const [, tick] = useState(0);
  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch("/api/admin/live?scope=landing", { cache: "no-store" })
        .then((r) => r.json())
        .then((j) => alive && setList(j.active || []))
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
  return (
    <div className="a-card">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-semibold">
          <span className="size-2.5 animate-pulse rounded-full bg-emerald-500" /> On the landing pages right now
        </h2>
        <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">{list.length} active</span>
      </div>
      {!list.length ? (
        <p className="py-10 text-center text-sm text-zinc-400">Nobody is on a landing page right now. Visitors appear here the moment they open one.</p>
      ) : (
        <div className="divide-y divide-zinc-100">
          {list.map((v) => {
            const I = DEV[v.device || "Computer"] || Monitor;
            const [sl, sc] = STAGE[v.stage] || STAGE.top;
            return (
              <div key={v.id} className="flex flex-wrap items-center gap-3 py-2.5 text-sm">
                <I className="size-4 text-zinc-500" />
                <span className="font-mono text-xs">{v.path}</span>
                <span className="text-xs text-zinc-500">{v.source} · {v.os} · {v.browser}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${sc}`}>{sl}</span>
                <span className="text-xs text-zinc-400">scrolled {v.maxScroll}%</span>
                <span className="ml-auto text-xs text-zinc-400">opened {ago(v.startedAt)}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
