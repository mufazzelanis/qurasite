"use client";
import Image from "next/image";
import { Check, Globe, X } from "lucide-react";
import { cn } from "@/lib/utils";

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
export const SITE_HOST = SITE_URL.replace(/^https?:\/\//, "");

/** Google cuts titles around 60 chars and descriptions around 160 */
export const LIMITS = { title: [30, 60], desc: [120, 160] } as const;

export function lengthTone(len: number, [min, max]: readonly [number, number]) {
  if (!len) return { tone: "zinc", text: "Empty" } as const;
  if (len > max) return { tone: "rose", text: "Too long — Google will cut it" } as const;
  if (len < min) return { tone: "amber", text: "A bit short" } as const;
  return { tone: "emerald", text: "Perfect length" } as const;
}

const BAR = { zinc: "bg-zinc-300", rose: "bg-rose-500", amber: "bg-amber-500", emerald: "bg-emerald-500" } as const;
const TXT = { zinc: "text-zinc-400", rose: "text-rose-600", amber: "text-amber-600", emerald: "text-emerald-600" } as const;

/** Thin progress bar + "42 / 60" under an input */
export function LengthMeter({ len, limits }: { len: number; limits: readonly [number, number] }) {
  const t = lengthTone(len, limits);
  return (
    <div className="mt-1.5">
      <div className="h-1 overflow-hidden rounded-full bg-zinc-100">
        <div className={cn("h-full rounded-full transition-all duration-300", BAR[t.tone])} style={{ width: `${Math.min(100, (len / limits[1]) * 100)}%` }} />
      </div>
      <div className="mt-1 flex justify-between text-[11px]">
        <span className={TXT[t.tone]}>{t.text}</span>
        <span className="text-zinc-400 tabular-nums">
          {len} / {limits[1]}
        </span>
      </div>
    </div>
  );
}

const cut = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s);

/** How the page looks in Google search results */
export function GooglePreview({ title, desc, path, image }: { title: string; desc: string; path: string; image?: string }) {
  const crumbs = path.split("/").filter(Boolean);
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 font-[arial,sans-serif]">
      <div className="flex gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2.5">
            <span className="grid size-7 shrink-0 place-items-center rounded-full border border-zinc-200 bg-zinc-50">
              <Globe className="size-3.5 text-zinc-500" />
            </span>
            <div className="min-w-0 leading-tight">
              <p className="truncate text-[13px] text-[#202124]">{SITE_HOST}</p>
              <p className="truncate text-[12px] text-[#4d5156]">
                {SITE_URL}
                {crumbs.map((c) => ` › ${c}`)}
              </p>
            </div>
          </div>
          <p className="mt-1.5 line-clamp-1 text-[19px] leading-snug text-[#1a0dab] hover:underline">{cut(title || "Page title", 62)}</p>
          <p className="mt-0.5 line-clamp-2 text-[13.5px] leading-[1.5] text-[#4d5156]">{desc ? cut(desc, 162) : <span className="italic text-zinc-400">Google will pick text from the page. Write a description to control it.</span>}</p>
        </div>
        {image && (
          <div className="relative hidden size-[92px] shrink-0 overflow-hidden rounded-lg bg-zinc-50 sm:block">
            <Image src={image} alt="" fill sizes="92px" className="object-contain" />
          </div>
        )}
      </div>
    </div>
  );
}

/** Facebook / WhatsApp share card */
export function SocialPreview({ title, desc, image }: { title: string; desc: string; image: string }) {
  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
      <div className="relative aspect-[1.91/1] bg-gradient-to-br from-cream to-brand-50">{image && <Image src={image} alt="" fill sizes="480px" className="object-contain p-4" />}</div>
      <div className="border-t border-zinc-200 bg-[#f0f2f5] px-3 py-2.5">
        <p className="text-[11px] tracking-wide text-[#65676b] uppercase">{SITE_HOST}</p>
        <p className="line-clamp-1 text-[15px] font-semibold text-[#050505]">{title || "Page title"}</p>
        <p className="line-clamp-1 text-[13px] text-[#65676b]">{desc || "Description"}</p>
      </div>
    </div>
  );
}

export type SeoCheck = { ok: boolean; label: string; hint?: string };

/** Score ring (0–100) + checklist */
export function SeoScore({ checks }: { checks: SeoCheck[] }) {
  const score = Math.round((checks.filter((c) => c.ok).length / Math.max(1, checks.length)) * 100);
  const tone = score >= 80 ? "emerald" : score >= 50 ? "amber" : "rose";
  const color = { emerald: "#10b981", amber: "#f59e0b", rose: "#f43f5e" }[tone];
  const label = { emerald: "Great", amber: "Needs work", rose: "Poor" }[tone];
  const r = 26;
  const c = 2 * Math.PI * r;
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <svg viewBox="0 0 64 64" className="size-16 shrink-0 -rotate-90" aria-hidden>
          <circle cx="32" cy="32" r={r} fill="none" stroke="#f4f4f5" strokeWidth="7" />
          <circle cx="32" cy="32" r={r} fill="none" stroke={color} strokeWidth="7" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c - (score / 100) * c} className="transition-all duration-500" />
          <text x="32" y="32" textAnchor="middle" dominantBaseline="central" transform="rotate(90 32 32)" className="fill-zinc-900 text-[17px] font-bold">
            {score}
          </text>
        </svg>
        <div>
          <p className={cn("font-semibold", TXT[tone])}>{label}</p>
          <p className="text-xs text-zinc-500">
            {checks.filter((x) => x.ok).length} of {checks.length} checks passed
          </p>
        </div>
      </div>
      <ul className="space-y-2">
        {checks.map((x) => (
          <li key={x.label} className="flex gap-2 text-sm">
            <span className={cn("mt-0.5 grid size-4 shrink-0 place-items-center rounded-full", x.ok ? "bg-emerald-100 text-emerald-600" : "bg-zinc-100 text-zinc-400")}>{x.ok ? <Check className="size-3" strokeWidth={3} /> : <X className="size-3" strokeWidth={3} />}</span>
            <span className={cn("leading-tight", x.ok ? "text-zinc-600" : "text-zinc-800")}>
              {x.label}
              {!x.ok && x.hint && <span className="block text-xs text-zinc-400">{x.hint}</span>}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/(^-|-$)/g, "");
