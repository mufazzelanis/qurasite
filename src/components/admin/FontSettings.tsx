"use client";
import { useMemo, useState, useTransition } from "react";
import { Check, Heading, Loader2, RotateCcw, Save, ShoppingBag, Type } from "lucide-react";
import { toast } from "sonner";
import { saveSettingsAction } from "@/app/admin/actions";
import { DEFAULT_TYPOGRAPHY, FONTS, fontByKey, fontVar, typographyVars, type FontScript, type TypographySettings } from "@/lib/font-catalog";
import { cn } from "@/lib/utils";

const ff = (key: string) => `var(${fontVar(key)}), system-ui, sans-serif`;
const SAMPLE = {
  bn: { big: "প্রকৃতির সেরা স্বাদ", small: "চাল, বাদাম, ডাল ও গমের প্রাকৃতিক মিশ্রণ। ১০০% খাঁটি, সারা দেশে ক্যাশ অন ডেলিভারি।" },
  en: { big: "Nature in Every Spoon", small: "The quick brown fox jumps over the lazy dog — 0123456789" },
};

export default function FontSettings({ initial }: { initial: TypographySettings }) {
  const [v, setV] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [pending, start] = useTransition();
  const [tab, setTab] = useState<Record<FontScript, "body" | "heading">>({ bn: "body", en: "body" });
  const dirty = JSON.stringify(v) !== JSON.stringify(saved);
  const vars = useMemo(() => typographyVars(v) as React.CSSProperties, [v]);

  const key = (s: FontScript, part: "body" | "heading") => (s === "bn" ? (part === "body" ? "bnBody" : "bnHeading") : part === "body" ? "enBody" : "enHeading") as keyof TypographySettings;
  const choose = (s: FontScript, fontKey: string) => {
    const k = key(s, tab[s]);
    setV((o) => {
      const n = { ...o, [k]: fontKey };
      // picking a body font while heading = old body font keeps them paired
      const hk = key(s, "heading");
      if (tab[s] === "body" && o[hk] === o[k]) n[hk] = fontKey;
      return n;
    });
  };

  const save = () =>
    start(async () => {
      const r = await saveSettingsAction("typography", v);
      if (r && "error" in r && r.error) return void toast.error(String(r.error));
      setSaved(v);
      toast.success("Fonts saved — live on the whole site");
    });

  return (
    <div className="space-y-6 pb-20">
      {/* ── live preview (uses the picked fonts right now) ── */}
      <section style={vars} className="overflow-hidden rounded-3xl border border-zinc-200/70 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-3">
          <p className="text-xs font-bold tracking-wider text-zinc-400 uppercase">Live preview</p>
          <p className="text-xs text-zinc-400">
            {fontByKey(v.bnBody)?.name} + {fontByKey(v.enBody)?.name}
          </p>
        </div>
        <div className="grid gap-6 bg-gradient-to-br from-cream via-white to-brand-50 p-6 sm:p-8 lg:grid-cols-[1.4fr_1fr]" style={{ fontFamily: "var(--font-en), var(--font-bn), system-ui" }}>
          <div>
            <span className="inline-flex rounded-full bg-gold-100 px-3 py-1 text-xs font-semibold text-gold-700">১০০% প্রাকৃতিক · Natural</span>
            <h2 className="mt-4 text-3xl leading-tight font-extrabold text-brand-900 sm:text-5xl" style={{ fontFamily: "var(--font-en-h), var(--font-bn-h), system-ui" }}>
              প্রতিদিনের শক্তি, <span className="text-gold-600">এক চামচে</span> প্রকৃতি
            </h2>
            <p className="mt-4 max-w-lg text-[17px] leading-relaxed text-brand-900/70">
              Qura Food — চাল, বাদাম, ডাল, গম, ভুট্টা ও মটরের প্রাকৃতিক মিশ্রণ। No preservatives, সারা বাংলাদেশে ক্যাশ অন ডেলিভারি।
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <span className="inline-flex items-center gap-2 rounded-full bg-gold-500 px-6 py-3 font-semibold text-white shadow-lg shadow-gold-500/30">
                <ShoppingBag className="size-4" /> এখনই অর্ডার করুন
              </span>
              <span className="inline-flex items-center rounded-full border border-brand-900/15 bg-white px-6 py-3 font-semibold text-brand-800">Shop now</span>
            </div>
          </div>
          <div className="rounded-3xl bg-white p-5 shadow-xl shadow-brand-900/10">
            <p className="text-xs font-semibold tracking-wide text-gold-600 uppercase">Best seller</p>
            <h3 className="mt-1 text-xl font-bold text-brand-900" style={{ fontFamily: "var(--font-en-h), var(--font-bn-h), system-ui" }}>
              কুঁড়া মিক্স — ৫০০ গ্রাম
            </h3>
            <p className="text-sm text-brand-900/60">Qura Mix 500gm · ২ প্যাক</p>
            <p className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-brand-800">৳1,500</span>
              <span className="text-sm text-zinc-400 line-through">৳1,600</span>
            </p>
            <ul className="mt-3 space-y-1 text-sm text-brand-900/70">
              <li>✓ ঢাকায় ১–২ দিনে ডেলিভারি</li>
              <li>✓ Cash on delivery all over Bangladesh</li>
            </ul>
          </div>
        </div>
      </section>

      {/* ── pickers ── */}
      <div className="grid gap-6 xl:grid-cols-2">
        {(["bn", "en"] as const).map((s) => {
          const current = v[key(s, tab[s])];
          return (
            <section key={s} className="rounded-2xl border border-zinc-200/70 bg-white shadow-sm">
              <header className="flex flex-wrap items-center gap-3 border-b border-zinc-100 px-5 py-4">
                <span className="grid size-9 place-items-center rounded-xl bg-brand-50 text-lg font-bold text-brand-700 ring-1 ring-brand-100">{s === "bn" ? "অ" : "Aa"}</span>
                <div className="min-w-0 flex-1">
                  <h2 className="font-semibold">{s === "bn" ? "বাংলা ফন্ট" : "English font"}</h2>
                  <p className="text-xs text-zinc-500">{s === "bn" ? "Used for every Bangla letter on the site" : "Used for English letters and numbers 0–9"}</p>
                </div>
                <div className="inline-flex rounded-xl bg-zinc-100 p-1">
                  {(
                    [
                      ["body", "Body text", Type],
                      ["heading", "Headings", Heading],
                    ] as const
                  ).map(([p, label, Icon]) => (
                    <button key={p} type="button" onClick={() => setTab((t) => ({ ...t, [s]: p }))} className={cn("flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition", tab[s] === p ? "bg-white text-brand-800 shadow-sm" : "text-zinc-500 hover:text-zinc-800")}>
                      <Icon className="size-3.5" /> {label}
                    </button>
                  ))}
                </div>
              </header>

              <div className="grid gap-3 p-4 sm:grid-cols-2">
                {FONTS.filter((f) => f.script === s).map((f) => {
                  const on = current === f.key;
                  const usedFor = [v[key(s, "body")] === f.key && "Body", v[key(s, "heading")] === f.key && "Headings"].filter(Boolean).join(" + ");
                  return (
                    <button
                      key={f.key}
                      type="button"
                      onClick={() => choose(s, f.key)}
                      className={cn("group relative overflow-hidden rounded-2xl border-2 p-4 text-left transition", on ? "border-brand-700 bg-brand-50/50 shadow-md" : "border-zinc-200 hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-md")}
                    >
                      {on && (
                        <span className="absolute top-3 right-3 grid size-6 place-items-center rounded-full bg-brand-700 text-white">
                          <Check className="size-3.5" strokeWidth={3} />
                        </span>
                      )}
                      <p className={cn("text-2xl leading-snug text-brand-900", tab[s] === "heading" ? "font-bold" : "font-medium")} style={{ fontFamily: ff(f.key) }}>
                        {SAMPLE[s].big}
                      </p>
                      <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-zinc-600" style={{ fontFamily: ff(f.key) }}>
                        {SAMPLE[s].small}
                      </p>
                      <div className="mt-3 flex items-center gap-2 border-t border-zinc-100 pt-2.5">
                        <span className="text-sm font-semibold text-zinc-800">{f.name}</span>
                        <span className="rounded-md bg-zinc-100 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-500 uppercase">{f.style}</span>
                        {usedFor && <span className="ml-auto text-[11px] font-semibold text-brand-700">{usedFor}</span>}
                      </div>
                      <p className="mt-1 text-[11px] leading-snug text-zinc-400">{f.desc}</p>
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      <div className="rounded-2xl bg-sky-50 p-4 text-sm text-sky-900 ring-1 ring-sky-100">
        <b>How mixing works:</b> in a line like “কুঁড়া মিক্স Qura Mix ৳800”, Bangla letters automatically use the Bangla font and English letters + numbers use the English font. Headings use the heading fonts. Applies to the main site, every landing page, pages and the admin panel.
      </div>

      {/* save bar */}
      <div className="sticky bottom-4 z-20 flex justify-end">
        <div className="flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white/95 p-2 pl-4 shadow-2xl shadow-zinc-900/15 backdrop-blur">
          <span className={cn("text-sm font-medium", dirty ? "text-amber-600" : "text-zinc-400")}>{dirty ? "● Unsaved changes" : "Saved"}</span>
          <button type="button" onClick={() => setV(DEFAULT_TYPOGRAPHY)} className="a-btn-light !rounded-xl !py-1.5" title="Hind Siliguri + Plus Jakarta Sans">
            <RotateCcw className="size-4" /> Default
          </button>
          {dirty && (
            <button type="button" onClick={() => setV(saved)} className="a-btn-light !rounded-xl !py-1.5">
              Discard
            </button>
          )}
          <button type="button" onClick={save} disabled={!dirty || pending} className="a-btn !rounded-xl !py-1.5">
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Save fonts
          </button>
        </div>
      </div>
    </div>
  );
}
