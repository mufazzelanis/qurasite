import Image from "next/image";
import { ArrowDown, BadgeCheck, Leaf, ShoppingBag, Star, Truck } from "lucide-react";
import { taka } from "@/lib/utils";
import type { LandingSettings } from "@/lib/settings-defaults";
import Countdown from "./Countdown";

const CHIPS = [
  { e: "🌾", t: "চাল", c: "left-[0%] top-[16%]", d: "0s" },
  { e: "🥜", t: "বাদাম", c: "right-[0%] top-[8%]", d: ".6s" },
  { e: "🍯", t: "মধু", c: "left-[-2%] bottom-[30%]", d: "1.2s" },
  { e: "🌽", t: "ভুট্টা", c: "right-[-2%] bottom-[36%]", d: "1.8s" },
];

/** Server-rendered hero; entrance animation is CSS only. Image is `priority` for fast LCP. */
export default function LpHero({ copy, image, price, comparePrice }: { copy: LandingSettings; image: string; price?: number; comparePrice?: number | null }) {
  return (
    <section className="relative overflow-hidden pb-12 pt-6 sm:pb-20 sm:pt-12">
      <div className="grain-bg absolute inset-0" />
      <div className="absolute -left-32 top-10 size-[380px] animate-blob bg-brand-300/30 blur-3xl" />
      <div className="absolute -right-24 top-40 size-[420px] animate-blob bg-gold-300/40 blur-3xl [animation-delay:-5s]" />

      <div className="container-x relative grid items-center gap-8 lg:grid-cols-2 lg:gap-14">
        <div className="order-2 lg:order-1">
          <span className="eyebrow fade-up">
            <Leaf className="size-4" /> {copy.heroBadge}
          </span>
          <h1 className="fade-up mt-5 font-display text-[2.3rem] font-extrabold leading-[1.18] tracking-tight text-brand-900 [animation-delay:.08s] sm:text-6xl lg:text-[4rem]">
            {copy.heroTitle}
            <br />
            <span className="relative inline-block animate-[shimmer_6s_linear_infinite] bg-[length:200%_auto] text-gradient">
              {copy.heroHighlight}
              <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 300 12" fill="none" aria-hidden>
                <path d="M2 9C60 3 140 2 298 7" stroke="#da9128" strokeWidth="4" strokeLinecap="round" className="draw" />
              </svg>
            </span>
          </h1>
          <p className="fade-up mt-6 max-w-xl text-base leading-relaxed text-brand-900/70 [animation-delay:.16s] sm:text-lg">{copy.heroSubtitle}</p>

          {price ? (
            <div className="fade-up mt-5 flex flex-wrap items-end gap-x-3 gap-y-2 [animation-delay:.22s]">
              <span className="font-display text-4xl font-extrabold text-brand-800">{taka(price)}</span>
              {comparePrice && <span className="mb-1 text-xl text-brand-900/40 line-through">{taka(comparePrice)}</span>}
              {copy.offerText && <span className="mb-1.5 rounded-full bg-gold-500 px-3 py-1 text-sm font-semibold text-white">{copy.offerText}</span>}
            </div>
          ) : null}

          {copy.offerEndsAt && (
            <div className="mt-4">
              <Countdown endsAt={copy.offerEndsAt} />
            </div>
          )}

          <div className="fade-up mt-7 flex flex-wrap gap-3 [animation-delay:.3s]">
            <a href="#order" data-track="order_button" className="btn-gold shine flex-1 px-8 py-4 text-lg sm:flex-none">
              <ShoppingBag className="size-5" /> এখনই অর্ডার করুন
            </a>
            <a href="#benefits" className="btn-ghost hidden px-7 py-4 text-lg sm:inline-flex">
              উপকারিতা দেখুন <ArrowDown className="size-4 animate-bounce" />
            </a>
          </div>

          <div className="fade-up mt-7 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-brand-900/70 [animation-delay:.38s]">
            {copy.stats[0] && (
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  {["bg-gold-400", "bg-brand-500", "bg-gold-600", "bg-brand-700"].map((c, i) => (
                    <span key={i} className={`grid size-8 place-items-center rounded-full border-2 border-cream text-xs font-bold text-white ${c}`}>
                      {"কমরস"[i]}
                    </span>
                  ))}
                </div>
                <div>
                  <div className="flex text-gold-500">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className="size-3.5 fill-current" />
                    ))}
                  </div>
                  <span className="font-semibold">
                    {copy.stats[0].value.toLocaleString("bn-BD")}
                    {copy.stats[0].suffix} {copy.stats[0].label}
                  </span>
                </div>
              </div>
            )}
            <span className="flex items-center gap-1.5"><Truck className="size-4 text-brand-600" /> ক্যাশ অন ডেলিভারি</span>
            <span className="flex items-center gap-1.5"><BadgeCheck className="size-4 text-brand-600" /> ১০০% প্রাকৃতিক</span>
          </div>
        </div>

        <div className="relative order-1 mx-auto aspect-square w-full max-w-[300px] sm:max-w-[460px] lg:order-2 lg:max-w-[520px]">
          <div className="absolute inset-[4%] animate-spin-slow rounded-full border-2 border-dashed border-gold-400/50" />
          <div className="absolute inset-[12%] rounded-full bg-gradient-to-br from-white via-cream to-gold-100 shadow-[0_40px_100px_-30px_rgba(13,69,36,0.45)]" />
          <div className="zoom-in absolute inset-[16%] animate-float">
            <Image src={image} alt={copy.heroHighlight} fill priority fetchPriority="high" sizes="(max-width:640px) 220px, 400px" className="object-contain drop-shadow-2xl" />
          </div>
          {CHIPS.map((c) => (
            <div key={c.t} className={`absolute hidden sm:block ${c.c}`}>
              <div className="glass flex animate-float items-center gap-2 rounded-2xl px-3 py-2 shadow-lg" style={{ animationDelay: c.d }}>
                <span className="text-2xl">{c.e}</span>
                <span className="text-sm font-semibold text-brand-800">{c.t}</span>
              </div>
            </div>
          ))}
          <div className="absolute right-[2%] top-[36%] grid size-20 rotate-12 place-items-center rounded-full bg-brand-800 text-center text-white shadow-xl sm:size-28">
            <span className="font-display text-[10px] leading-tight sm:text-sm">
              কোনো
              <br />
              <b className="text-xs text-gold-300 sm:text-lg">প্রিজারভেটিভ</b>
              <br />
              নেই
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
