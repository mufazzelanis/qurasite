import Image from "next/image";
import { ArrowDown, BadgeCheck, Flame, Leaf, ShieldCheck, ShoppingBag, Sparkles, Star, Truck } from "lucide-react";
import { taka } from "@/lib/utils";
import type { LandingSettings } from "@/lib/settings-defaults";
import type { HeroLayout } from "@/lib/landing-designs";
import Countdown from "./Countdown";

const CHIPS = [
  { e: "🌾", t: "চাল", c: "left-[0%] top-[16%]", d: "0s" },
  { e: "🥜", t: "বাদাম", c: "right-[0%] top-[8%]", d: ".6s" },
  { e: "🍯", t: "মধু", c: "left-[-2%] bottom-[30%]", d: "1.2s" },
  { e: "🌽", t: "ভুট্টা", c: "right-[-2%] bottom-[36%]", d: "1.8s" },
];

type Props = { copy: LandingSettings; image: string; price?: number; comparePrice?: number | null; layout?: HeroLayout };

const off = (price?: number, compare?: number | null) => (price && compare && compare > price ? Math.round((1 - price / compare) * 100) : 0);

/** Server-rendered hero (5 layouts); entrance animation is CSS only. Image is `priority` for fast LCP. */
export default function LpHero(p: Props) {
  switch (p.layout) {
    case "centered":
      return <Centered {...p} />;
    case "bold":
      return <Bold {...p} />;
    case "luxe":
      return <Luxe {...p} />;
    case "story":
      return <Story {...p} />;
    default:
      return <Orbit {...p} />;
  }
}

// ── shared bits ─────────────────────────────────────────

function Price({ price, comparePrice, offerText, big }: { price?: number; comparePrice?: number | null; offerText?: string; big?: boolean }) {
  if (!price) return null;
  return (
    <div className="fade-up flex flex-wrap items-end gap-x-3 gap-y-2 [animation-delay:.22s]">
      <span className={`font-display font-extrabold text-brand-800 ${big ? "text-5xl sm:text-6xl" : "text-4xl"}`}>{taka(price)}</span>
      {comparePrice && comparePrice > price && <span className="mb-1 text-xl text-brand-900/40 line-through">{taka(comparePrice)}</span>}
      {offerText && <span className="mb-1.5 rounded-full bg-gold-500 px-3 py-1 text-sm font-semibold text-white">{offerText}</span>}
    </div>
  );
}

function Cta({ ghost = true, label = "এখনই অর্ডার করুন" }: { ghost?: boolean; label?: string }) {
  return (
    <div className="fade-up flex flex-wrap gap-3 [animation-delay:.3s]">
      <a href="#order" data-track="order_button" className="btn-gold shine flex-1 px-8 py-4 text-lg sm:flex-none">
        <ShoppingBag className="size-5" /> {label}
      </a>
      {ghost && (
        <a href="#benefits" className="btn-ghost hidden px-7 py-4 text-lg sm:inline-flex">
          উপকারিতা দেখুন <ArrowDown className="size-4 animate-bounce" />
        </a>
      )}
    </div>
  );
}

function Trust({ copy }: { copy: LandingSettings }) {
  return (
    <div className="fade-up flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-brand-900/70 [animation-delay:.38s]">
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
      <span className="flex items-center gap-1.5">
        <Truck className="size-4 text-brand-600" /> ক্যাশ অন ডেলিভারি
      </span>
      <span className="flex items-center gap-1.5">
        <BadgeCheck className="size-4 text-brand-600" /> ১০০% প্রাকৃতিক
      </span>
    </div>
  );
}

function Title({ copy, className = "" }: { copy: LandingSettings; className?: string }) {
  return (
    <h1 className={`fade-up font-display font-extrabold tracking-tight text-brand-900 [animation-delay:.08s] ${className}`}>
      {copy.heroTitle}
      <br />
      <span className="relative inline-block animate-[shimmer_6s_linear_infinite] bg-[length:200%_auto] text-gradient">
        {copy.heroHighlight}
        <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 300 12" fill="none" aria-hidden>
          <path d="M2 9C60 3 140 2 298 7" stroke="var(--color-gold-500)" strokeWidth="4" strokeLinecap="round" className="draw" />
        </svg>
      </span>
    </h1>
  );
}

// ── 1. Classic Natural: product in an orbit with floating ingredient chips ──
function Orbit({ copy, image, price, comparePrice }: Props) {
  return (
    <section className="relative overflow-hidden pb-12 pt-6 sm:pb-20 sm:pt-12">
      <div className="grain-bg absolute inset-0" />
      <div className="absolute -left-32 top-10 size-[380px] animate-blob bg-brand-300/30 blur-3xl" />
      <div className="absolute -right-24 top-40 size-[420px] animate-blob bg-gold-300/40 blur-3xl [animation-delay:-5s]" />

      <div className="container-x relative grid items-center gap-8 lg:grid-cols-2 lg:gap-14">
        <div className="order-2 space-y-6 lg:order-1">
          <span className="eyebrow fade-up">
            <Leaf className="size-4" /> {copy.heroBadge}
          </span>
          <Title copy={copy} className="text-[2.3rem] leading-[1.18] sm:text-6xl lg:text-[4rem]" />
          <p className="fade-up max-w-xl text-base leading-relaxed text-brand-900/70 [animation-delay:.16s] sm:text-lg">{copy.heroSubtitle}</p>
          <Price price={price} comparePrice={comparePrice} offerText={copy.offerText} />
          {copy.offerEndsAt && <Countdown endsAt={copy.offerEndsAt} />}
          <Cta />
          <Trust copy={copy} />
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

// ── 2. Fresh Minimal: centered headline, big product card below ──
function Centered({ copy, image, price, comparePrice }: Props) {
  return (
    <section className="relative overflow-hidden pt-10 pb-14 sm:pt-16 sm:pb-20">
      <div className="absolute inset-x-0 top-0 h-[70%] bg-gradient-to-b from-brand-50 to-transparent" />
      <div className="container-x relative mx-auto max-w-4xl space-y-6 text-center">
        <span className="fade-up inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white px-4 py-1.5 text-sm font-semibold text-brand-700 shadow-sm">
          <Sparkles className="size-4" /> {copy.heroBadge}
        </span>
        <Title copy={copy} className="text-[2.2rem] leading-[1.15] sm:text-6xl" />
        <p className="fade-up mx-auto max-w-2xl text-base leading-relaxed text-brand-900/60 [animation-delay:.16s] sm:text-lg">{copy.heroSubtitle}</p>
        <div className="flex justify-center">
          <Price price={price} comparePrice={comparePrice} offerText={copy.offerText} />
        </div>
        {copy.offerEndsAt && (
          <div className="flex justify-center">
            <Countdown endsAt={copy.offerEndsAt} />
          </div>
        )}
        <div className="flex justify-center">
          <Cta ghost={false} />
        </div>
      </div>

      <div className="container-x relative mt-12 max-w-5xl">
        <div className="zoom-in relative mx-auto aspect-[16/10] overflow-hidden rounded-[2rem] border border-brand-100 bg-white shadow-[0_30px_80px_-30px_rgba(15,118,110,0.35)]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,var(--color-brand-50),transparent_65%)]" />
          <Image src={image} alt={copy.heroHighlight} fill priority fetchPriority="high" sizes="(max-width:1024px) 100vw, 1024px" className="object-contain p-8 sm:p-14" />
          <div className="absolute inset-x-4 bottom-4 flex flex-wrap justify-center gap-2 sm:inset-x-8 sm:bottom-6">
            {["১০০% প্রাকৃতিক", "ক্যাশ অন ডেলিভারি", "দেখে নিয়ে পেমেন্ট"].map((t) => (
              <span key={t} className="flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-brand-800 shadow-sm ring-1 ring-brand-100 backdrop-blur sm:text-sm">
                <BadgeCheck className="size-4 text-brand-600" /> {t}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ── 3. Bold Offer: urgency bar, giant discount stamp ──
function Bold({ copy, image, price, comparePrice }: Props) {
  const pct = off(price, comparePrice);
  return (
    <section className="relative overflow-hidden">
      <div className="bg-brand-800 py-2 text-center text-sm font-bold text-white">
        <span className="inline-flex items-center gap-2">
          <Flame className="size-4 animate-pulse text-gold-300" /> {copy.offerText || "সীমিত সময়ের অফার"} <Flame className="size-4 animate-pulse text-gold-300" />
        </span>
      </div>
      <div className="relative pt-8 pb-14 sm:pt-12 sm:pb-20">
        <div className="absolute inset-0 bg-[repeating-linear-gradient(135deg,transparent_0_22px,color-mix(in_oklab,var(--color-gold-400)_10%,transparent)_22px_44px)]" />
        <div className="container-x relative grid items-center gap-8 lg:grid-cols-[1.1fr_1fr]">
          <div className="order-2 space-y-6 lg:order-1">
            <span className="fade-up inline-flex -rotate-1 items-center gap-2 rounded-lg bg-gold-400 px-4 py-1.5 text-sm font-extrabold text-brand-900 shadow-md">⚡ {copy.heroBadge}</span>
            <Title copy={copy} className="text-[2.4rem] leading-[1.1] uppercase sm:text-6xl lg:text-7xl" />
            <p className="fade-up max-w-xl text-base font-medium leading-relaxed text-brand-900/75 [animation-delay:.16s] sm:text-lg">{copy.heroSubtitle}</p>
            <Price price={price} comparePrice={comparePrice} big />
            {copy.offerEndsAt && <Countdown endsAt={copy.offerEndsAt} />}
            <Cta ghost={false} label="এখনই অর্ডার করুন — স্টক সীমিত!" />
            <Trust copy={copy} />
          </div>
          <div className="relative order-1 mx-auto aspect-square w-full max-w-[320px] sm:max-w-[480px] lg:order-2">
            <div className="absolute inset-[6%] rounded-[2.5rem] bg-white shadow-[0_30px_70px_-25px_rgba(185,28,28,0.45)] ring-4 ring-gold-300" />
            <div className="zoom-in absolute inset-[12%]">
              <Image src={image} alt={copy.heroHighlight} fill priority fetchPriority="high" sizes="(max-width:640px) 260px, 420px" className="object-contain drop-shadow-2xl" />
            </div>
            {pct > 0 && (
              <div className="absolute -top-2 -right-2 grid size-28 rotate-12 place-items-center rounded-full bg-brand-800 text-center text-white shadow-2xl ring-4 ring-white sm:size-36">
                <span className="font-display leading-none">
                  <b className="block text-4xl sm:text-5xl">{pct}%</b>
                  <span className="text-sm font-bold text-gold-300 sm:text-base">ছাড়!</span>
                </span>
              </div>
            )}
            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-gold-400 px-5 py-2 text-sm font-extrabold whitespace-nowrap text-brand-900 shadow-lg">🚚 সারা দেশে ক্যাশ অন ডেলিভারি</div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── 4. Premium Dark: spotlight on the product, elegant type ──
function Luxe({ copy, image, price, comparePrice }: Props) {
  return (
    <section className="relative overflow-hidden pt-10 pb-16 sm:pt-16 sm:pb-24">
      <div className="absolute top-0 left-1/2 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,color-mix(in_oklab,var(--color-gold-400)_22%,transparent),transparent_70%)]" />
      <div className="container-x relative grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
        <div className="relative mx-auto aspect-square w-full max-w-[320px] sm:max-w-[460px]">
          <div className="absolute inset-[8%] rounded-full border border-gold-400/30" />
          <div className="absolute inset-[16%] rounded-full border border-gold-400/15" />
          <div className="absolute inset-[18%] rounded-full bg-[radial-gradient(circle,color-mix(in_oklab,var(--color-gold-400)_30%,transparent),transparent_70%)] blur-2xl" />
          <div className="zoom-in absolute inset-[14%] animate-float">
            <Image src={image} alt={copy.heroHighlight} fill priority fetchPriority="high" sizes="(max-width:640px) 240px, 400px" className="object-contain drop-shadow-[0_30px_40px_rgba(0,0,0,0.6)]" />
          </div>
        </div>
        <div className="space-y-6">
          <p className="fade-up flex items-center gap-3 text-xs font-semibold tracking-[0.3em] text-gold-400 uppercase">
            <span className="h-px w-10 bg-gold-400" /> {copy.heroBadge}
          </p>
          <Title copy={copy} className="text-[2.3rem] leading-[1.15] sm:text-6xl" />
          <p className="fade-up max-w-xl text-base leading-relaxed text-brand-900/60 [animation-delay:.16s] sm:text-lg">{copy.heroSubtitle}</p>
          <Price price={price} comparePrice={comparePrice} offerText={copy.offerText} />
          {copy.offerEndsAt && <Countdown endsAt={copy.offerEndsAt} />}
          <Cta />
          <div className="fade-up grid grid-cols-3 gap-3 border-t border-gold-400/20 pt-6 text-center text-xs text-brand-900/60 [animation-delay:.38s] sm:text-sm">
            <span className="flex flex-col items-center gap-1.5">
              <ShieldCheck className="size-5 text-gold-400" /> ১০০% খাঁটি
            </span>
            <span className="flex flex-col items-center gap-1.5">
              <Truck className="size-5 text-gold-400" /> হোম ডেলিভারি
            </span>
            <span className="flex flex-col items-center gap-1.5">
              <BadgeCheck className="size-5 text-gold-400" /> প্রিমিয়াম মান
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── 5. Earthy Story: full-width photo with the story card on top ──
function Story({ copy, image, price, comparePrice }: Props) {
  return (
    <section className="relative pt-4 pb-14 sm:pt-6 sm:pb-20">
      <div className="container-x">
        <div className="relative overflow-hidden rounded-[2rem] bg-brand-100">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_50%,var(--color-gold-100),transparent_60%)]" />
          <div className="relative grid items-center gap-6 p-6 sm:p-10 lg:grid-cols-[1.1fr_1fr] lg:p-14">
            <div className="order-2 space-y-5 lg:order-1">
              <span className="fade-up inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-1.5 text-sm font-semibold text-brand-700 backdrop-blur">
                <Leaf className="size-4" /> {copy.heroBadge}
              </span>
              <Title copy={copy} className="text-[2.2rem] leading-[1.15] sm:text-5xl lg:text-6xl" />
              <p className="fade-up max-w-xl rounded-2xl bg-white/70 p-4 text-base leading-relaxed text-brand-900/75 backdrop-blur [animation-delay:.16s] sm:text-lg">“{copy.heroSubtitle}”</p>
              <Price price={price} comparePrice={comparePrice} offerText={copy.offerText} />
              {copy.offerEndsAt && <Countdown endsAt={copy.offerEndsAt} />}
              <Cta />
            </div>
            <div className="relative order-1 mx-auto aspect-[4/5] w-full max-w-[280px] sm:max-w-[400px] lg:order-2">
              <div className="absolute inset-0 rotate-3 rounded-[2rem] bg-gold-400/30" />
              <div className="absolute inset-0 -rotate-2 overflow-hidden rounded-[2rem] bg-white shadow-2xl">
                <Image src={image} alt={copy.heroHighlight} fill priority fetchPriority="high" sizes="(max-width:640px) 280px, 400px" className="object-contain p-6" />
              </div>
              <div className="absolute -bottom-4 -left-4 rounded-2xl bg-brand-800 px-4 py-3 text-white shadow-xl">
                <p className="text-xs text-white/70">গ্রাম থেকে সরাসরি</p>
                <p className="font-display text-lg font-bold">হাতে তৈরি ✋</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="container-x mt-6">
        <Trust copy={copy} />
      </div>
    </section>
  );
}
