"use client";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Minus, Plus, ShoppingBag, Zap } from "lucide-react";
import { cn, taka } from "@/lib/utils";
import { useCart, type CartProduct } from "./cart";

export function Gallery({ images, alt }: { images: string[]; alt: string }) {
  const [i, setI] = useState(0);
  return (
    <div>
      <div className="card relative aspect-square overflow-hidden bg-gradient-to-br from-white to-gold-50">
        <div className="absolute inset-[10%] animate-spin-slow rounded-full border-2 border-dashed border-gold-300/60" />
        <Image key={images[i]} src={images[i]} alt={alt} fill priority sizes="(max-width:1024px) 100vw, 50vw" className="fade-up object-contain p-10" />
      </div>
      {images.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto">
          {images.map((src, k) => (
            <button key={src + k} onClick={() => setI(k)} className={cn("relative size-16 shrink-0 overflow-hidden rounded-xl border-2 bg-white", k === i ? "border-gold-500" : "border-transparent")}>
              <Image src={src} alt="" fill sizes="64px" className="object-contain p-1" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function BuyBox({ p, stock, addons }: { p: CartProduct; stock: number; addons: (CartProduct & { comboPrice: number | null; addonNote: string | null })[] }) {
  const { add } = useCart();
  const router = useRouter();
  const [q, setQ] = useState(1);
  const [extra, setExtra] = useState<string[]>([]);
  const out = stock <= 0;

  const go = (checkout: boolean) => {
    add(p, q, { silent: checkout });
    addons.filter((a) => extra.includes(a.id)).forEach((a) => add(a, 1, { silent: true }));
    if (checkout) router.push("/checkout");
  };

  return (
    <div className="space-y-5">
      {addons.length > 0 && !p.isAddon && (
        <div className="rounded-2xl border-2 border-dashed border-gold-400 bg-gold-50 p-4">
          <p className="mb-2 font-display font-bold text-brand-900">🍯 সাথে নিন — কম্বো দামে</p>
          <div className="space-y-2">
            {addons.map((a) => {
              const on = extra.includes(a.id);
              return (
                <label key={a.id} className={cn("flex cursor-pointer items-center gap-3 rounded-xl border-2 bg-white p-2", on ? "border-brand-700" : "border-transparent")}>
                  <input type="checkbox" checked={on} onChange={() => setExtra((e) => (on ? e.filter((x) => x !== a.id) : [...e, a.id]))} className="size-5 accent-[#0d4524]" />
                  <Image src={a.image} alt="" width={40} height={40} className="size-10 object-contain" />
                  <span className="flex-1 text-sm font-semibold">{a.nameBn || a.name}</span>
                  <span className="text-right">
                    <b className="font-display text-brand-800">{taka(a.comboPrice ?? a.price)}</b>
                    {a.comboPrice && a.comboPrice < a.price && <s className="block text-xs text-rose-500">{taka(a.price)}</s>}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <div className="flex items-center rounded-full border border-brand-900/15 bg-white">
          <button onClick={() => setQ((x) => Math.max(1, x - 1))} className="grid size-12 place-items-center" aria-label="কমান">
            <Minus className="size-4" />
          </button>
          <span className="w-8 text-center text-lg font-bold">{q}</span>
          <button onClick={() => setQ((x) => Math.min(20, x + 1))} className="grid size-12 place-items-center" aria-label="বাড়ান">
            <Plus className="size-4" />
          </button>
        </div>
        <button disabled={out} onClick={() => go(false)} className="btn-green flex-1 py-3.5">
          <ShoppingBag className="size-5" /> কার্টে যোগ করুন
        </button>
      </div>
      <button disabled={out} onClick={() => go(true)} data-track="buy_now" data-amount={p.price * q} className="btn-gold shine w-full py-4 text-lg">
        <Zap className="size-5" /> {out ? "স্টক আউট" : "এখনই কিনুন"}
      </button>
    </div>
  );
}
