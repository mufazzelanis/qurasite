"use client";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShoppingBag, Zap } from "lucide-react";
import { taka } from "@/lib/utils";
import { useCart, type CartProduct } from "./cart";

export type CardProduct = CartProduct & { comparePrice: number | null; tagline?: string | null; stock: number };

export default function ProductCard({ p, priority }: { p: CardProduct; priority?: boolean }) {
  const { add } = useCart();
  const router = useRouter();
  const off = p.comparePrice ? Math.round(((p.comparePrice - p.price) / p.comparePrice) * 100) : 0;
  const out = p.stock <= 0;
  return (
    <div className="card group flex h-full flex-col overflow-hidden transition duration-500 hover:-translate-y-1 hover:shadow-2xl">
      <Link href={`/p/${p.slug}`} className="relative block aspect-square overflow-hidden bg-gradient-to-br from-cream to-gold-50">
        {off > 0 && <span className="absolute left-3 top-3 z-10 rounded-full bg-gold-500 px-2.5 py-1 text-xs font-bold text-white">-{off}%</span>}
        {p.isAddon && p.comboPrice && <span className="absolute right-3 top-3 z-10 rounded-full bg-brand-800 px-2.5 py-1 text-[10px] font-bold text-white">কম্বো ৳{p.comboPrice}</span>}
        <Image src={p.image} alt={p.name} fill priority={priority} sizes="(max-width:768px) 50vw, 25vw" className="object-contain p-5 transition duration-700 group-hover:scale-110" />
        {out && <span className="absolute inset-0 grid place-items-center bg-white/70 font-bold text-rose-600">স্টক আউট</span>}
      </Link>
      <div className="flex flex-1 flex-col p-3 sm:p-4">
        <Link href={`/p/${p.slug}`} className="line-clamp-2 font-semibold leading-snug text-brand-900 hover:text-brand-700">
          {p.nameBn || p.name}
        </Link>
        {p.weight && <p className="text-xs text-brand-900/50">{p.weight}</p>}
        <div className="mt-auto pt-2">
          <div className="flex items-baseline gap-2">
            <span className="font-display text-lg font-extrabold text-brand-800">{taka(p.price)}</span>
            {p.comparePrice && <span className="text-xs text-brand-900/40 line-through">{taka(p.comparePrice)}</span>}
          </div>
          <div className="mt-2 grid grid-cols-[1fr_auto] gap-2">
            <button
              disabled={out}
              onClick={() => {
                add(p, 1, { silent: true });
                router.push("/checkout");
              }}
              data-track="buy_now"
              data-amount={p.price}
              className="btn-gold !rounded-xl !px-2 !py-2 text-sm"
            >
              <Zap className="size-4" /> কিনুন
            </button>
            <button disabled={out} onClick={() => add(p)} className="grid size-10 place-items-center rounded-xl bg-brand-800 text-white transition hover:bg-gold-500 disabled:opacity-50" aria-label="কার্টে যোগ করুন">
              <ShoppingBag className="size-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
