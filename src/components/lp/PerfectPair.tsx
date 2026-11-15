"use client";
import Image from "next/image";
import { useState } from "react";
import { Check, Plus, ShoppingBag, Sparkles } from "lucide-react";
import { COMBO_EVENT } from "@/components/order/LandingOrderForm";
import type { OrderProduct } from "@/components/order/CheckoutCore";
import { cn, taka } from "@/lib/utils";
import { track } from "@/lib/track-client";
import type { LandingContent } from "@/lib/settings-defaults";

type Named = { slug?: string; name: string; nameBn: string | null };
const isGur = (p: Named) => /gur|jaggery|গুড়/i.test(`${p.slug ?? ""} ${p.name} ${p.nameBn ?? ""}`);
const layerColor = (p: Named) => (isGur(p) ? "#8a4b1f" : "#e8a317");

// Illustrative taste profile — each add-on boosts the base mix
const BASE = { মিষ্টতা: 25, এনার্জি: 60, পুষ্টি: 70, স্বাদ: 55 };
const BOOST = { মিষ্টতা: 35, এনার্জি: 18, পুষ্টি: 12, স্বাদ: 22 };

/** Interactive "Perfect Pair" combo builder — CSS transitions only (no animation library). */
export default function PerfectPair({ main, addons, cfg }: { main: OrderProduct; addons: OrderProduct[]; cfg: LandingContent["combo"] }) {
  const [sel, setSel] = useState<string[]>(addons.map((a) => a.id));
  const chosen = addons.filter((a) => sel.includes(a.id));
  const meter = Object.fromEntries(Object.entries(BASE).map(([k, v]) => [k, Math.min(100, v + BOOST[k as keyof typeof BOOST] * chosen.length)]));
  const unit = (a: OrderProduct) => (a.comboPrice != null && a.comboPrice < a.price ? a.comboPrice : a.price);
  const total = main.price + chosen.reduce((s, a) => s + unit(a), 0);
  const regular = main.price + chosen.reduce((s, a) => s + a.price, 0);
  const toggle = (id: string) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const orderCombo = () => {
    track("AddToCart", { value: total, contentIds: [main.id, ...sel], contentName: "Qura Combo" });
    dispatchEvent(new CustomEvent(COMBO_EVENT, { detail: { ids: sel } }));
    document.getElementById("order")?.scrollIntoView({ behavior: "smooth" });
  };

  const baseH = 70;
  const layerH = 34;

  return (
    <section id="combo" className="relative scroll-mt-16 overflow-hidden py-16 sm:py-24">
      <div className="absolute inset-0 bg-gradient-to-b from-cream via-gold-50 to-cream" />
      <div className="absolute left-1/2 top-20 size-[500px] -translate-x-1/2 animate-blob bg-gold-200/40 blur-3xl" />

      <div className="container-x relative">
        <div className="reveal mx-auto mb-10 max-w-2xl text-center sm:mb-14">
          <span className="eyebrow">
            <Sparkles className="size-4" /> {cfg.pairBadge}
          </span>
          <h2 className="section-title mt-4">
            {cfg.pairTitle} <span className="text-gradient">{cfg.pairHighlight}</span>
          </h2>
          <p className="mt-3 text-base text-brand-900/65 sm:text-lg">{cfg.pairText}</p>
        </div>

        <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-12">
          {/* glass */}
          <div className="card relative mx-auto w-full max-w-md overflow-hidden p-6 sm:p-8">
            <div className="grid grid-cols-[120px_1fr] items-end gap-5 sm:grid-cols-[150px_1fr] sm:gap-6">
              <svg viewBox="0 0 150 240" className="w-full drop-shadow-xl" role="img" aria-label="কুঁড়া কম্বো গ্লাস">
                <defs>
                  <clipPath id="glass">
                    <path d="M20 20 L130 20 L118 225 Q117 232 110 232 L40 232 Q33 232 32 225 Z" />
                  </clipPath>
                  <linearGradient id="qura" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0" stopColor="#f1dcb5" />
                    <stop offset="1" stopColor="#d9b98a" />
                  </linearGradient>
                </defs>
                <g clipPath="url(#glass)">
                  <rect x="0" y="0" width="150" height="240" fill="#fffaf0" />
                  <rect x="0" y={232 - baseH} width="150" height={baseH} fill="url(#qura)" />
                  {addons.map((a, i) => {
                    const idx = chosen.findIndex((c) => c.id === a.id);
                    const on = idx >= 0;
                    const y = 232 - baseH - layerH * ((on ? idx : i) + 1);
                    return (
                      <g key={a.id} style={{ transition: "transform .6s cubic-bezier(.22,1.4,.36,1), opacity .4s", transform: `translateY(${on ? 0 : -60}px)`, opacity: on ? 1 : 0 }}>
                        <rect x="0" y={y} width="150" height={layerH} fill={layerColor(a)} opacity="0.85" />
                        <path d={`M0 ${y} Q 37 ${y - 6} 75 ${y} T 150 ${y} V ${y + 6} H 0 Z`} fill={layerColor(a)} />
                      </g>
                    );
                  })}
                  {[30, 60, 95, 115].map((x, i) => (
                    <circle key={x} cx={x} cy={225} r={3 + (i % 2)} fill="#fff" className="bubble" style={{ animationDelay: `${i * 0.6}s` }} />
                  ))}
                </g>
                <path d="M20 20 L130 20 L118 225 Q117 232 110 232 L40 232 Q33 232 32 225 Z" fill="none" stroke="#0d4524" strokeOpacity="0.25" strokeWidth="3" />
                <path d="M30 30 L36 200" stroke="#fff" strokeWidth="5" strokeLinecap="round" opacity="0.7" />
              </svg>

              <div className="space-y-3">
                <p className="text-xs font-bold uppercase tracking-wider text-gold-600 sm:text-sm">স্বাদ মিটার</p>
                {Object.entries(meter).map(([k, v]) => (
                  <div key={k}>
                    <div className="mb-1 flex justify-between text-sm font-medium text-brand-900/75">
                      <span>{k}</span>
                      <span>{v}%</span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-brand-900/10">
                      <div className="h-full rounded-full bg-gradient-to-r from-brand-600 to-gold-500 transition-[width] duration-700 ease-out" style={{ width: `${v}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-sm font-semibold text-brand-800">
              <span className="rounded-full bg-cream-dark px-3 py-1">🌾 কুঁড়া</span>
              {chosen.map((a) => (
                <span key={a.id} className="flex items-center gap-1">
                  <Plus className="size-3.5 text-gold-500" />
                  <span className="rounded-full px-3 py-1 text-white" style={{ background: layerColor(a) }}>
                    {isGur(a) ? "🟤" : "🍯"} {(a.nameBn || a.name).split(/[—-]/)[0].trim()}
                  </span>
                </span>
              ))}
            </div>
          </div>

          {/* picker */}
          <div>
            <p className="mb-3 font-semibold text-brand-900/70">আপনার কম্বো বানান — ট্যাপ করে যোগ/বাদ দিন:</p>
            <div className="space-y-3">
              {addons.map((a) => {
                const on = sel.includes(a.id);
                const u = unit(a);
                return (
                  <button
                    type="button"
                    key={a.id}
                    onClick={() => toggle(a.id)}
                    aria-pressed={on}
                    className={cn("flex w-full items-center gap-3 rounded-2xl border-2 bg-white p-3 text-left transition active:scale-[.98] sm:gap-4", on ? "border-gold-500 shadow-lg shadow-gold-500/15" : "border-brand-900/10 opacity-80")}
                  >
                    <div className="relative size-14 shrink-0 rounded-xl bg-cream sm:size-16">
                      <Image src={a.image} alt={a.name} fill sizes="64px" className="object-contain p-1" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-brand-900">{a.nameBn || a.name}</p>
                      {a.addonNote && <p className="text-sm text-brand-900/55">{a.addonNote}</p>}
                    </div>
                    <div className="text-right">
                      <p className="font-display text-lg font-extrabold text-brand-800">{taka(u)}</p>
                      {u < a.price && <p className="text-xs text-rose-500 line-through">{taka(a.price)}</p>}
                    </div>
                    <span className={cn("grid size-7 shrink-0 place-items-center rounded-full border-2 transition", on ? "border-gold-500 bg-gold-500 text-white" : "border-brand-900/20")}>
                      {on ? <Check className="size-4" strokeWidth={3} /> : <Plus className="size-4 text-brand-900/40" />}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2.5 sm:gap-3">
              {cfg.tips.map((t, i) => (
                <div key={i} className="rounded-2xl bg-white/70 p-3">
                  <p className="font-semibold text-brand-900">
                    {t.emoji} {t.title}
                  </p>
                  <p className="text-xs leading-relaxed text-brand-900/60">{t.text}</p>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-2xl bg-brand-800 p-5 text-white">
              <div className="mb-3 flex items-end justify-between gap-3">
                <div>
                  <p className="text-sm text-white/70">{chosen.length ? "কম্বো মোট" : "শুধু কুঁড়া"}</p>
                  <p className="font-display text-3xl font-extrabold">
                    {taka(total)} {regular > total && <span className="text-base font-normal text-white/50 line-through">{taka(regular)}</span>}
                  </p>
                </div>
                {regular > total && <span className="rounded-full bg-gold-500 px-3 py-1.5 text-sm font-bold">সাশ্রয় {taka(regular - total)}</span>}
              </div>
              <button type="button" onClick={orderCombo} data-track="combo" data-amount={total} className="btn-gold shine w-full py-4 text-lg">
                <ShoppingBag className="size-5" /> {chosen.length ? "এই কম্বো অর্ডার করুন" : "শুধু কুঁড়া অর্ডার করুন"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
