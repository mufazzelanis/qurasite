import Image from "next/image";
import { Ban, Check, ChevronDown, Droplet, Dumbbell, HeartPulse, Leaf, Quote, ShieldCheck, Sparkles, Star, Zap } from "lucide-react";
import { toBn } from "@/lib/utils";
import type { LandingSettings } from "@/lib/settings-defaults";
import Counter from "./Counter";

/* Server components only — animations are CSS (`reveal` = native scroll-driven, zero JS). */

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = { zap: Zap, dumbbell: Dumbbell, heart: HeartPulse, shield: ShieldCheck, droplet: Droplet, leaf: Leaf };

export function Heading({ eyebrow, title, sub, light }: { eyebrow: string; title: React.ReactNode; sub?: string; light?: boolean }) {
  return (
    <div className="reveal mx-auto mb-10 max-w-2xl text-center sm:mb-14">
      <span className={light ? "eyebrow bg-white/10 text-gold-300" : "eyebrow"}>
        <Sparkles className="size-4" /> {eyebrow}
      </span>
      <h2 className={`section-title mt-4 ${light ? "!text-white" : ""}`}>{title}</h2>
      {sub && <p className={`mt-3 text-base sm:text-lg ${light ? "text-white/70" : "text-brand-900/60"}`}>{sub}</p>}
    </div>
  );
}

export function TrustMarquee({ items }: { items?: string[] }) {
  const list = items || ["১০০% প্রাকৃতিক", "কোনো কৃত্রিম ফ্লেভার নেই", "কোনো প্রিজারভেটিভ নেই", "ক্যাশ অন ডেলিভারি", "সারা দেশে ডেলিভারি", "Nature in Every Spoon"];
  return (
    <div className="relative -rotate-1 overflow-hidden bg-brand-800 py-3.5 shadow-xl">
      <div className="flex w-max animate-marquee gap-8 whitespace-nowrap">
        {[...list, ...list, ...list].map((t, i) => (
          <span key={i} className="flex items-center gap-8 font-display text-base font-bold text-white sm:text-lg">
            {t} <Leaf className="size-5 text-gold-400" />
          </span>
        ))}
      </div>
    </div>
  );
}

export function Stats({ stats }: { stats: LandingSettings["stats"] }) {
  return (
    <section className="container-x py-14 sm:py-20">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {stats.map((s, i) => (
          <div key={i} className="reveal card group relative overflow-hidden p-5 text-center sm:p-6">
            <div className="absolute -right-8 -top-8 size-24 rounded-full bg-gold-100 transition-transform duration-500 group-hover:scale-150" />
            <div className="relative font-display text-3xl font-extrabold text-brand-800 sm:text-5xl">
              <Counter to={s.value} suffix={s.suffix} />
            </div>
            <p className="relative mt-1 text-sm font-medium text-brand-900/60 sm:text-base">{s.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function Ingredients({ items }: { items: LandingSettings["ingredients"] }) {
  return (
    <section id="ingredients" className="container-x scroll-mt-20 py-12 sm:py-16">
      <Heading eyebrow="কী আছে ভেতরে?" title={<>প্রকৃতির <span className="text-gradient">{toBn(items.length)}টি উপাদান</span>, এক চামচে</>} sub="প্রতিটি উপাদানের নিজস্ব ভূমিকা — একসাথে তৈরি করে সম্পূর্ণ পুষ্টি।" />
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:gap-6">
        {items.map((it, i) => (
          <div key={i} className="reveal card group relative h-full overflow-hidden p-4 text-center transition duration-500 hover:-translate-y-1 sm:p-6">
            <span className="absolute right-3 top-3 grid size-7 place-items-center rounded-full bg-gold-500 text-xs font-bold text-white">{toBn(String(i + 1).padStart(2, "0"))}</span>
            <div className="relative mx-auto mb-3 grid size-20 place-items-center sm:size-24">
              <span className="absolute inset-0 rounded-full bg-gradient-to-br from-gold-100 to-cream-dark transition-transform duration-500 group-hover:scale-110" />
              <span className="absolute inset-2 animate-spin-slow rounded-full border-2 border-dashed border-gold-400/40" />
              <span className="relative text-4xl transition-transform duration-500 group-hover:scale-125 sm:text-5xl">{it.emoji}</span>
            </div>
            <h3 className="font-display text-lg font-bold text-brand-900 sm:text-xl">{it.nameBn}</h3>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-gold-600">{it.name}</p>
            <p className="mt-1.5 text-xs text-brand-900/60 sm:text-sm">{it.benefit}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function Benefits({ items }: { items: LandingSettings["benefits"] }) {
  return (
    <section id="benefits" className="relative scroll-mt-16 overflow-hidden bg-brand-900 py-16 text-white sm:py-24">
      <div className="absolute -left-40 top-0 size-[500px] rounded-full bg-brand-600/30 blur-3xl" />
      <div className="absolute -right-40 bottom-0 size-[500px] rounded-full bg-gold-500/15 blur-3xl" />
      <div className="container-x relative">
        <Heading light eyebrow="কেন কুঁড়া ফুড?" title={<>শরীর ও মনের জন্য <span className="text-gold-400">প্রতিদিনের যত্ন</span></>} sub="প্রাকৃতিক উপাদান ও ফাইবারের দারুণ পুষ্টিগুণ — প্রতিদিন সুস্থ ও সতেজ থাকার সহজ অভ্যাস।" />
        <div className="grid gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-3">
          {items.map((b, i) => {
            const Icon = ICONS[b.icon] || Leaf;
            return (
              <div key={i} className="reveal group relative h-full overflow-hidden rounded-3xl border border-white/10 bg-white/[0.05] p-6 transition duration-500 hover:border-gold-400/40 hover:bg-white/[0.08] sm:p-7">
                <div className="mb-4 grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-gold-400 to-gold-600 shadow-lg shadow-gold-600/30 transition-transform duration-500 group-hover:-rotate-6 group-hover:scale-110 sm:size-14">
                  <Icon className="size-6 text-white sm:size-7" />
                </div>
                <h3 className="font-display text-lg font-bold sm:text-xl">{b.title}</h3>
                <p className="mt-1.5 leading-relaxed text-white/65">{b.text}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function HowTo({ steps }: { steps: LandingSettings["steps"] }) {
  const icons = ["🥄", "🥛", "🍯", "✨"];
  return (
    <section id="how" className="container-x scroll-mt-20 py-16 sm:py-24">
      <Heading eyebrow="খাওয়ার নিয়ম" title={<>মাত্র <span className="text-gradient">{toBn(steps.length)}টি সহজ ধাপে</span> তৈরি</>} sub="প্রতিদিনের রুটিনে এক গ্লাস কুঁড়া — সতেজতা ও শক্তি সারাদিন।" />
      <div className="relative grid gap-10 md:grid-cols-3">
        <div className="absolute left-[16%] right-[16%] top-14 hidden border-t-2 border-dashed border-gold-400/60 md:block" />
        {steps.map((s, i) => (
          <div key={i} className="reveal relative text-center">
            <div className="relative mx-auto mb-5 grid size-24 place-items-center sm:size-28">
              <span className="absolute inset-0 animate-pulse-ring rounded-full bg-gold-300/40" style={{ animationDelay: `${i * 0.6}s` }} />
              <span className="relative grid size-24 place-items-center rounded-full bg-white text-4xl shadow-xl ring-8 ring-gold-100 sm:size-28 sm:text-5xl">{icons[i] || "✨"}</span>
              <span className="absolute -right-1 -top-1 grid size-9 place-items-center rounded-full bg-brand-800 font-bold text-white">{toBn(i + 1)}</span>
            </div>
            <h3 className="font-display text-xl font-bold text-brand-900">{s.title}</h3>
            <p className="mt-1.5 text-brand-900/60">{s.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function PromiseSection() {
  const rows = [
    { bad: true, t: "কোনো কৃত্রিম ফ্লেভার নেই" },
    { bad: true, t: "কোনো প্রিজারভেটিভ নেই" },
    { bad: false, t: "১০০% প্রাকৃতিক উপাদান" },
    { bad: false, t: "হোল গ্রেইন ফাইবার সমৃদ্ধ" },
  ];
  return (
    <section className="container-x py-8 sm:py-10">
      <div className="card relative grid items-center gap-8 overflow-hidden p-6 md:grid-cols-2 md:p-14">
        <div className="absolute -left-20 -top-20 size-72 rounded-full bg-gold-100 blur-2xl" />
        <div className="reveal relative">
          <span className="eyebrow">আমাদের প্রতিশ্রুতি</span>
          <h2 className="section-title mt-4 !text-3xl sm:!text-4xl">
            যা আছে তা <span className="text-gradient">খাঁটি</span>, যা নেই তা ক্ষতিকর
          </h2>
          <ul className="mt-6 space-y-3.5">
            {rows.map((r, i) => (
              <li key={i} className="flex items-center gap-3 text-base font-medium sm:text-lg">
                <span className={`grid size-9 shrink-0 place-items-center rounded-full ${r.bad ? "bg-rose-100 text-rose-600" : "bg-brand-100 text-brand-700"}`}>
                  {r.bad ? <Ban className="size-5" /> : <Check className="size-5" />}
                </span>
                {r.t}
              </li>
            ))}
          </ul>
        </div>
        <div className="reveal relative overflow-hidden rounded-3xl shadow-2xl">
          <Image src="/brand/label.jpg" alt="Qura Food label" width={1600} height={362} sizes="(max-width:768px) 100vw, 600px" className="h-56 w-full object-cover object-[48%_50%] sm:h-72" />
        </div>
      </div>
    </section>
  );
}

export function Reviews({ reviews }: { reviews: { id: string; name: string; location: string | null; rating: number; text: string }[] }) {
  if (!reviews.length) return null;
  const list = [...reviews, ...reviews];
  return (
    <section id="reviews" className="scroll-mt-20 overflow-hidden py-16 sm:py-24">
      <div className="container-x">
        <Heading eyebrow="গ্রাহকদের মতামত" title={<>হাজারো মানুষের <span className="text-gradient">ভালোবাসা</span></>} />
      </div>
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-cream to-transparent sm:w-24" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-cream to-transparent sm:w-24" />
        <div className="flex w-max animate-marquee gap-4 hover:[animation-play-state:paused] sm:gap-6">
          {list.map((r, i) => (
            <div key={i} className="card w-[290px] shrink-0 p-5 sm:w-[340px] sm:p-6">
              <Quote className="mb-2 size-7 text-gold-300" />
              <p className="leading-relaxed text-brand-900/75">{r.text}</p>
              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="grid size-10 place-items-center rounded-full bg-gradient-to-br from-brand-600 to-brand-800 font-bold text-white">{r.name[0]}</span>
                  <div>
                    <p className="font-semibold text-brand-900">{r.name}</p>
                    {r.location && <p className="text-xs text-brand-900/50">{r.location}</p>}
                  </div>
                </div>
                <div className="flex text-gold-500">
                  {Array.from({ length: r.rating }).map((_, k) => (
                    <Star key={k} className="size-4 fill-current" />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Native <details> accordion — zero JavaScript */
export function Faq({ faqs }: { faqs: LandingSettings["faqs"] }) {
  return (
    <section id="faq" className="container-x max-w-4xl scroll-mt-20 py-14 sm:py-20">
      <Heading eyebrow="সাধারণ জিজ্ঞাসা" title="আপনার প্রশ্ন, আমাদের উত্তর" />
      <div className="space-y-3">
        {faqs.map((f, i) => (
          <details key={i} open={i === 0} className="reveal card group overflow-hidden open:ring-2 open:ring-gold-400">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 [&::-webkit-details-marker]:hidden">
              <span className="font-display text-base font-semibold text-brand-900 sm:text-lg">{f.q}</span>
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-gold-100 text-gold-700 transition group-open:rotate-180">
                <ChevronDown className="size-4" />
              </span>
            </summary>
            <p className="px-5 pb-5 leading-relaxed text-brand-900/65">{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
