import Link from "next/link";
import { Clock, Hand, Moon, Percent, Sun, Users } from "lucide-react";
import LiveCount from "@/components/admin/LiveCount";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { VISIT_PERIODS, clickLog, visitorStats, type VisitFilters } from "@/lib/visitors";
import { SOURCE_LABEL } from "@/lib/ua";
import { cn, taka } from "@/lib/utils";
import { HourChart, LiveVisitorList } from "@/components/admin/VisitorWidgets";

const BTN: Record<string, string> = {
  order_button: "🛒 অর্ডার করতে ক্লিক",
  sticky_bar: "🛒 Sticky bar (phone)",
  confirm_order: "✓ অর্ডার কনফার্ম",
  combo: "🍯 কম্বো যোগ",
  buy_now: "⚡ এখনই কিনুন",
  call: "📞 Call",
  whatsapp: "💬 WhatsApp",
};
const hr = (h: number) => (h === 0 ? "12 AM" : h < 12 ? `${h} AM` : h === 12 ? "12 PM" : `${h - 12} PM`);
const dur = (s: number) => (s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, "0")}s`);

export default async function VisitorsPage({ searchParams }: { searchParams: Promise<VisitFilters> }) {
  await requireAdmin("visitors");
  const f = await searchParams;
  if (!f.p && !f.from && !f.to) f.p = "today";
  const [s, log, landings] = await Promise.all([visitorStats(f), clickLog(f), db.landingPage.findMany({ select: { slug: true, title: true }, orderBy: { createdAt: "asc" } })]);
  const title = new Map(landings.map((l) => [l.slug, l.title]));
  const visits = s.t?.visits || 0;
  const pct = (n: number) => (visits ? ((n / visits) * 100).toFixed(n / visits < 0.1 ? 1 : 0) : "0");
  const qs = (o: Record<string, string | number | undefined>) =>
    "?" + new URLSearchParams(Object.entries({ ...f, ...o }).filter(([, v]) => v !== undefined && v !== "") as [string, string][]).toString();
  const maxSource = Math.max(1, ...s.sources.map((x) => x.n));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Live Visitors</h1>
          <p className="text-sm text-zinc-500">Who is on your landing pages right now, when traffic peaks, and how many reach the order button.</p>
        </div>
        <span className="flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700">
          <span className="size-2 animate-pulse rounded-full bg-emerald-500" /> Live · updates every 3s
        </span>
      </div>

      {/* filters (plain GET form — no JS needed) */}
      <form className="a-card space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase text-zinc-400">Period</span>
          {VISIT_PERIODS.map(([k, l]) => (
            <Link key={k} href={qs({ p: k, from: undefined, to: undefined, page: undefined })} className={cn("rounded-lg border px-3 py-1.5 text-sm", f.p === k && !f.from && !f.to ? "border-brand-700 bg-brand-700 text-white" : "border-zinc-200 hover:bg-zinc-50")}>
              {l}
            </Link>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1fr_1.4fr_auto_auto]">
          <label className="text-xs text-zinc-500">From date<input type="date" name="from" defaultValue={f.from} className="a-input mt-1" /></label>
          <label className="text-xs text-zinc-500">To date<input type="date" name="to" defaultValue={f.to} className="a-input mt-1" /></label>
          <label className="text-xs text-zinc-500">From time
            <select name="fh" defaultValue={f.fh ?? ""} className="a-input mt-1"><option value="">Any</option>{Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{hr(h)}</option>)}</select>
          </label>
          <label className="text-xs text-zinc-500">To time
            <select name="th" defaultValue={f.th ?? ""} className="a-input mt-1"><option value="">Any</option>{Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{hr(h)}</option>)}</select>
          </label>
          <label className="text-xs text-zinc-500">Landing page
            <select name="slug" defaultValue={f.slug ?? ""} className="a-input mt-1">
              <option value="">All landing pages</option>
              {landings.map((l) => <option key={l.slug} value={l.slug}>/{l.slug} — {l.title}</option>)}
              <option value="_main">Main site</option>
            </select>
          </label>
          <input type="hidden" name="p" value={f.from || f.to ? "" : f.p} />
          <button className="a-btn self-end">Apply</button>
          <Link href="/admin/visitors" className="a-btn-light self-end">Reset</Link>
        </div>
      </form>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-2xl bg-gradient-to-br from-brand-700 to-brand-900 p-5 text-white">
          <p className="text-xs font-bold uppercase tracking-wider text-white/70">Active right now</p>
          <LiveCount />
        </div>
        <Stat icon={Users} label="Visitors" value={visits} sub={`${visits} visits · ${s.t?.ips || 0} unique IPs`} />
        <Stat icon={Hand} label="Order-button clicks" value={s.clicks?.n || 0} sub={`${s.clicks?.visitors || 0} visitors clicked`} />
        <Stat icon={Percent} label="Click rate" value={`${pct(s.t?.clicked || 0)}%`} sub={`Orders: ${s.t?.orders || 0} · ${pct(s.t?.orders || 0)}% conversion`} />
        <Stat icon={Clock} label="Avg. time on page" value={dur(s.t?.avg || 0)} sub="per visit" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr_2fr]">
        <div className="rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 p-5 text-white">
          <div className="flex justify-between text-xs font-bold uppercase"><span className="flex items-center gap-1"><Sun className="size-4" /> Peak time</span><span className="rounded-full bg-white/20 px-2 py-0.5">Most traffic</span></div>
          <p className="mt-2 font-display text-3xl font-extrabold">{s.peak ? `${hr(s.peak.h)} – ${hr((s.peak.h + 1) % 24)}` : "—"}</p>
          <div className="mt-3 flex justify-between text-sm"><span>Visits<br /><b className="text-2xl">{s.peak?.visits ?? 0}</b></span><span className="text-right">Order clicks<br /><b className="text-2xl">{s.peak?.clicks ?? 0}</b></span></div>
          <p className="mt-3 text-xs text-white/85">Busiest hour of the selected period — the best time to run ads and keep the phone free.</p>
        </div>
        <div className="rounded-2xl bg-gradient-to-br from-zinc-800 to-zinc-950 p-5 text-white">
          <div className="flex justify-between text-xs font-bold uppercase"><span className="flex items-center gap-1"><Moon className="size-4" /> Quiet time</span><span className="rounded-full bg-white/15 px-2 py-0.5">Least traffic</span></div>
          <p className="mt-2 font-display text-3xl font-extrabold">{s.quiet ? `${hr(s.quiet.h)} – ${hr((s.quiet.h + 1) % 24)}` : "—"}</p>
          <div className="mt-3 flex justify-between text-sm"><span>Visits<br /><b className="text-2xl">{s.quiet?.visits ?? 0}</b></span><span className="text-right">Order clicks<br /><b className="text-2xl">{s.quiet?.clicks ?? 0}</b></span></div>
          <p className="mt-3 text-xs text-white/70">Fewest visitors — a good time to lower the ad budget.</p>
        </div>
        <div className="a-card">
          <div className="mb-1 flex justify-between"><h2 className="font-semibold">Traffic by hour of day</h2><span className="flex gap-3 text-xs"><span className="flex items-center gap-1"><i className="size-2 rounded-full bg-green-600" />Visits</span><span className="flex items-center gap-1"><i className="size-2 rounded-full bg-yellow-500" />Order clicks</span></span></div>
          <HourChart data={s.hourly} />
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="a-card">
          <h2 className="font-semibold">From visit to order</h2>
          <p className="mb-4 text-xs text-zinc-400">How far visitors get in the selected period</p>
          {[
            ["1. Opened the page", visits, "bg-sky-500"],
            ["2. Reached the order form", s.t?.form || 0, "bg-violet-500"],
            ["3. Clicked an order button", s.t?.clicked || 0, "bg-pink-500"],
            ["4. Placed an order", s.t?.orders || 0, "bg-emerald-500"],
          ].map(([l, n, c]) => (
            <div key={l as string} className="mb-3">
              <div className="mb-1 flex justify-between text-sm"><span>{l}</span><span><b>{n}</b> <span className="text-xs text-zinc-400">{pct(n as number)}%</span></span></div>
              <div className="h-2 rounded-full bg-zinc-100"><div className={cn("h-full rounded-full", c as string)} style={{ width: `${visits ? ((n as number) / visits) * 100 : 0}%` }} /></div>
            </div>
          ))}
        </div>
        <div className="a-card">
          <h2 className="mb-4 font-semibold">Where visitors came from</h2>
          {Object.keys(SOURCE_LABEL).map((k) => {
            const n = s.sources.find((x) => x.source === k)?.n || 0;
            return (
              <div key={k} className="mb-3">
                <div className="mb-1 flex justify-between text-sm"><span>{SOURCE_LABEL[k]}</span><span><b>{n}</b> <span className="text-xs text-zinc-400">{pct(n)}%</span></span></div>
                <div className="h-1.5 rounded-full bg-zinc-100"><div className="h-full rounded-full bg-emerald-600" style={{ width: `${(n / maxSource) * 100}%` }} /></div>
              </div>
            );
          })}
          <p className="mb-2 mt-4 text-sm font-semibold">Devices</p>
          <div className="flex flex-wrap gap-2">{s.devices.map((d) => <span key={d.device} className="rounded-lg border border-zinc-200 px-2.5 py-1 text-xs">{d.device} <b>{d.n}</b></span>)}</div>
        </div>
        <div className="a-card">
          <h2 className="mb-4 font-semibold">By landing page</h2>
          <div className="space-y-3">
            {s.pages.map((p) => (
              <div key={p.slug || "main"} className="flex items-start justify-between gap-3 text-sm">
                <div>
                  <p className="font-semibold">{p.slug ? title.get(p.slug) || p.slug : "Main site"}</p>
                  <p className="text-xs text-zinc-400">/{p.slug || ""} · {p.clicks} clicks · {p.orders} orders · {p.visits ? ((p.orders / p.visits) * 100).toFixed(1) : 0}% conversion</p>
                </div>
                <b>{p.visits}</b>
              </div>
            ))}
            {!s.pages.length && <p className="text-sm text-zinc-400">No visits in this period</p>}
          </div>
        </div>
      </div>

      <LiveVisitorList />

      <div className="a-card !p-0">
        <div className="flex items-center justify-between px-5 py-4">
          <div>
            <h2 className="font-semibold">Order & checkout button clicks</h2>
            <p className="text-xs text-zinc-400">Every press of an order button, the sticky bar, the confirm button, Call and WhatsApp</p>
          </div>
          <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-semibold">{log.total} clicks</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead className="border-y border-zinc-100 bg-zinc-50/60">
              <tr>{["Time", "Button", "Visitor IP", "Device", "Landing page", "After", "Result"].map((h) => <th key={h} className="a-th">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {log.rows.map((c) => (
                <tr key={c.id}>
                  <td className="a-td whitespace-nowrap">{new Date(c.createdAt).toLocaleString("en-GB", { timeZone: "Asia/Dhaka", dateStyle: "medium", timeStyle: "short" })}</td>
                  <td className="a-td">
                    <span className={cn("rounded-md border px-2 py-0.5 text-xs font-medium", c.button === "confirm_order" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-sky-200 bg-sky-50 text-sky-700")}>
                      {BTN[c.button] || c.button}{c.amount ? ` ${taka(c.amount)}` : ""}
                    </span>
                    {c.label && <p className="mt-0.5 max-w-56 truncate text-[11px] text-zinc-400">{c.label}</p>}
                  </td>
                  <td className="a-td font-mono text-xs">{c.ip} {c.ipCount > 1 && <span className="ml-1 rounded bg-amber-100 px-1.5 text-[10px] font-semibold text-amber-800">{c.ipCount} times</span>}</td>
                  <td className="a-td text-xs">{c.device}<br /><span className="text-zinc-400">{c.os} · {c.browser}</span></td>
                  <td className="a-td font-mono text-xs">{c.path}</td>
                  <td className="a-td text-xs">{dur(c.afterSec)}</td>
                  <td className="a-td text-xs">{c.orderNo ? <span className="font-semibold text-emerald-600">✓ #{c.orderNo}</span> : <span className="text-zinc-400">No order yet</span>}</td>
                </tr>
              ))}
              {!log.rows.length && <tr><td colSpan={7} className="py-12 text-center text-sm text-zinc-400">No clicks in this period</td></tr>}
            </tbody>
          </table>
        </div>
        {log.pages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 text-sm">
            <span className="text-zinc-500">Page {log.page} of {log.pages}</span>
            <div className="flex gap-2">
              {log.page > 1 && <Link href={qs({ page: log.page - 1 })} className="a-btn-light">← Prev</Link>}
              {log.page < log.pages && <Link href={qs({ page: log.page + 1 })} className="a-btn-light">Next →</Link>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value, sub }: { icon: typeof Users; label: string; value: string | number; sub: string }) {
  return (
    <div className="a-card">
      <div className="flex justify-between text-sm text-zinc-500">{label}<Icon className="size-4" /></div>
      <p className="mt-2 text-3xl font-extrabold">{value}</p>
      <p className="mt-1 text-xs text-zinc-400">{sub}</p>
    </div>
  );
}
