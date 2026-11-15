"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect } from "react";
import { Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import { cn, taka } from "@/lib/utils";
import { useCart } from "./cart";

export default function CartDrawer() {
  const { lines, open, setOpen, setQty, remove, subtotal, count } = useCart();
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    addEventListener("keydown", esc);
    return () => removeEventListener("keydown", esc);
  }, [open, setOpen]);

  return (
    <div className={cn("fixed inset-0 z-[65] transition", open ? "visible" : "invisible")} aria-hidden={!open}>
      <div className={cn("absolute inset-0 bg-brand-950/40 backdrop-blur-sm transition-opacity", open ? "opacity-100" : "opacity-0")} onClick={() => setOpen(false)} />
      <aside className={cn("absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-cream shadow-2xl transition-transform duration-300", open ? "translate-x-0" : "translate-x-full")}>
        <div className="flex items-center justify-between border-b border-brand-900/10 p-5">
          <h3 className="flex items-center gap-2 font-display text-xl font-bold text-brand-900">
            <ShoppingBag className="size-5 text-gold-500" /> আপনার কার্ট ({count})
          </h3>
          <button onClick={() => setOpen(false)} className="grid size-10 place-items-center rounded-full bg-white" aria-label="Close">
            <X className="size-5" />
          </button>
        </div>
        <div className="flex-1 space-y-3 overflow-y-auto p-5">
          {!lines.length && (
            <div className="py-20 text-center text-brand-900/50">
              <ShoppingBag className="mx-auto mb-3 size-12 opacity-30" />
              কার্ট খালি
              <div className="mt-4">
                <Link href="/shop" onClick={() => setOpen(false)} className="btn-green">
                  শপিং করুন
                </Link>
              </div>
            </div>
          )}
          {lines.map((l) => (
            <div key={l.product.id} className="flex gap-3 rounded-2xl bg-white p-3 shadow-sm">
              <div className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-cream">
                <Image src={l.product.image} alt="" fill sizes="80px" className="object-contain p-1" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold leading-tight text-brand-900">{l.product.nameBn || l.product.name}</p>
                <p className="text-sm text-brand-900/50">{l.product.weight}</p>
                <div className="mt-2 flex items-center justify-between">
                  <div className="flex items-center rounded-full border border-brand-900/10">
                    <button onClick={() => setQty(l.product.id, l.quantity - 1)} className="grid size-8 place-items-center" aria-label="কমান">
                      <Minus className="size-3.5" />
                    </button>
                    <span className="w-6 text-center font-bold">{l.quantity}</span>
                    <button onClick={() => setQty(l.product.id, l.quantity + 1)} className="grid size-8 place-items-center" aria-label="বাড়ান">
                      <Plus className="size-3.5" />
                    </button>
                  </div>
                  <span className="font-display font-extrabold text-brand-800">{taka(l.product.price * l.quantity)}</span>
                </div>
              </div>
              <button onClick={() => remove(l.product.id)} className="self-start p-1 text-rose-500" aria-label="Remove">
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
        </div>
        {lines.length > 0 && (
          <div className="space-y-3 border-t border-brand-900/10 bg-white p-5">
            <div className="flex justify-between text-lg font-bold">
              <span>সাবটোটাল</span>
              <span className="font-display text-brand-800">{taka(subtotal)}</span>
            </div>
            <Link href="/checkout" onClick={() => setOpen(false)} data-track="order_button" data-amount={subtotal} className="btn-gold shine w-full py-4 text-lg">
              চেকআউট করুন
            </Link>
            <p className="text-center text-xs text-brand-900/50">ডেলিভারি চার্জ চেকআউটে যোগ হবে • ক্যাশ অন ডেলিভারি</p>
          </div>
        )}
      </aside>
    </div>
  );
}
