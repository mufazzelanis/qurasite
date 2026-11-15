"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Slide = { image: string; title: string; subtitle: string; cta: string; link: string };

/** CSS scroll-snap slider with autoplay — swipeable on phones, no library. */
export default function HeroSlider({ slides }: { slides: Slide[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [i, setI] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el || slides.length < 2) return;
    const onScroll = () => setI(Math.round(el.scrollLeft / el.clientWidth));
    el.addEventListener("scroll", onScroll, { passive: true });
    const t = setInterval(() => {
      const next = (Math.round(el.scrollLeft / el.clientWidth) + 1) % slides.length;
      el.scrollTo({ left: next * el.clientWidth, behavior: "smooth" });
    }, 5500);
    return () => {
      clearInterval(t);
      el.removeEventListener("scroll", onScroll);
    };
  }, [slides.length]);

  if (!slides.length) return null;
  return (
    <div className="relative overflow-hidden rounded-3xl shadow-2xl">
      <div ref={ref} className="flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {slides.map((s, k) => (
          <div key={k} className="relative aspect-[4/3] w-full shrink-0 snap-center sm:aspect-[21/8]">
            <Image src={s.image} alt={s.title} fill priority={k === 0} sizes="(max-width:1280px) 100vw, 1280px" className="object-cover" />
            <div className="absolute inset-0 bg-gradient-to-r from-brand-950/85 via-brand-900/55 to-transparent" />
            <div className="absolute inset-0 flex items-center">
              <div className="max-w-xl px-6 sm:px-12">
                <h2 className={cn("font-display text-3xl font-extrabold leading-tight text-white sm:text-5xl", k === i && "fade-up")}>{s.title}</h2>
                <p className={cn("mt-3 text-base text-white/80 sm:text-xl", k === i && "fade-up [animation-delay:.1s]")}>{s.subtitle}</p>
                {s.cta && (
                  <Link href={s.link || "/shop"} className={cn("btn-gold shine mt-6 px-7 py-3.5", k === i && "fade-up [animation-delay:.2s]")}>
                    {s.cta} <ArrowRight className="size-4" />
                  </Link>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      {slides.length > 1 && (
        <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
          {slides.map((_, k) => (
            <button
              key={k}
              aria-label={`Slide ${k + 1}`}
              onClick={() => ref.current?.scrollTo({ left: k * (ref.current?.clientWidth || 0), behavior: "smooth" })}
              className={cn("h-2 rounded-full bg-white/60 transition-all", k === i ? "w-8 bg-gold-400" : "w-2")}
            />
          ))}
        </div>
      )}
    </div>
  );
}
