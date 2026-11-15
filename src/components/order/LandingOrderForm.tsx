"use client";
import Image from "next/image";
import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { cn, taka } from "@/lib/utils";
import { priceCart } from "@/lib/pricing";
import { track } from "@/lib/track-client";
import type { DeliverySettings, PaymentSettings } from "@/lib/settings-defaults";
import CheckoutCore, { type OrderProduct } from "./CheckoutCore";
import ComboBump, { Qty } from "./ComboBump";

/** Perfect Pair section → add combo items:  window.dispatchEvent(new CustomEvent("qf:combo", { detail: { ids } })) */
export const COMBO_EVENT = "qf:combo";

export default function LandingOrderForm({
  products,
  addons,
  delivery,
  payments,
  combo,
  source,
  defaultProductId,
}: {
  products: OrderProduct[];
  addons: OrderProduct[];
  delivery: DeliverySettings;
  payments: PaymentSettings;
  combo: { enabled: boolean; bumpTitle: string; bumpText: string };
  source: string;
  defaultProductId?: string;
}) {
  const first = defaultProductId || products[0]?.id;
  const [cart, setCart] = useState<Record<string, number>>(first ? { [first]: 1 } : {});
  const [flash, setFlash] = useState(false);
  const all = [...products, ...addons];
  const items = all.filter((p) => cart[p.id]).map((p) => ({ product: p, quantity: cart[p.id] }));
  const priced = priceCart(items.map((i) => ({ product: { ...i.product, comboPrice: combo.enabled ? i.product.comboPrice : null }, quantity: i.quantity })));

  useEffect(() => {
    const on = (e: Event) => {
      const ids = (e as CustomEvent<{ ids: string[] }>).detail?.ids || [];
      setCart((c) => {
        const n = { ...c };
        if (!products.some((p) => n[p.id]) && first) n[first] = 1;
        for (const a of addons) {
          if (ids.includes(a.id)) n[a.id] = n[a.id] || 1;
          else delete n[a.id];
        }
        return n;
      });
      setFlash(true);
      setTimeout(() => setFlash(false), 1500);
    };
    addEventListener(COMBO_EVENT, on);
    return () => removeEventListener(COMBO_EVENT, on);
  }, [addons, products, first]);

  const toggle = (id: string) => {
    const p = all.find((x) => x.id === id)!;
    if (!cart[id]) track("AddToCart", { value: p.price, contentIds: [id], contentName: p.name });
    setCart((c) => {
      const n = { ...c };
      if (n[id]) delete n[id];
      else n[id] = 1;
      return n;
    });
  };
  const setQty = (id: string, d: number) => setCart((c) => ({ ...c, [id]: Math.max(1, Math.min(20, (c[id] || 1) + d)) }));

  return (
    <CheckoutCore items={items} source={source} delivery={delivery} payments={payments} comboEnabled={combo.enabled}>
      <div className="card space-y-4 p-4 sm:p-6">
        <h3 className="flex items-center gap-2 font-display text-lg font-bold text-brand-900">
          <span className="grid size-8 place-items-center rounded-full bg-gold-500 text-sm text-white">১</span> পণ্য সিলেক্ট করুন
        </h3>
        <div className="space-y-3">
          {products.map((p) => {
            const on = !!cart[p.id];
            const off = p.comparePrice ? Math.round(((p.comparePrice - p.price) / p.comparePrice) * 100) : 0;
            return (
              <div
                key={p.id}
                role="checkbox"
                aria-checked={on}
                tabIndex={0}
                onClick={() => toggle(p.id)}
                onKeyDown={(e) => (e.key === " " || e.key === "Enter") && (e.preventDefault(), toggle(p.id))}
                className={cn("flex cursor-pointer items-center gap-3 rounded-2xl border-2 p-3 transition", on ? "border-gold-500 bg-gold-50 shadow-md shadow-gold-500/10" : "border-brand-900/10")}
              >
                <span className={cn("grid size-6 shrink-0 place-items-center rounded-full border-2 transition", on ? "border-gold-500 bg-gold-500 text-white" : "border-brand-900/20")}>
                  {on && <Check className="size-3.5" strokeWidth={3} />}
                </span>
                <div className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-white sm:size-16">
                  <Image src={p.image} alt={p.name} fill sizes="64px" className="object-contain p-1" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold leading-tight text-brand-900">{p.nameBn || p.name}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-x-2">
                    <span className="font-display font-extrabold text-brand-800">{taka(p.price)}</span>
                    {p.comparePrice && <span className="text-sm text-brand-900/40 line-through">{taka(p.comparePrice)}</span>}
                    {off > 0 && <span className="rounded-full bg-brand-800 px-2 py-0.5 text-[10px] font-bold text-white">{off}% OFF</span>}
                  </div>
                </div>
                {on && <Qty value={cart[p.id]} onChange={(d) => setQty(p.id, d)} />}
              </div>
            );
          })}
        </div>
        {combo.enabled && (
          <ComboBump
            addons={addons}
            cart={cart}
            hasMain={priced.hasMain}
            comboSavings={priced.comboSavings}
            title={combo.bumpTitle}
            text={combo.bumpText}
            flash={flash}
            toggle={toggle}
            setQty={setQty}
          />
        )}
      </div>
    </CheckoutCore>
  );
}
