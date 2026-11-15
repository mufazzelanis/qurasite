"use client";
import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import CheckoutCore, { type OrderProduct } from "@/components/order/CheckoutCore";
import ComboBump from "@/components/order/ComboBump";
import { priceCart } from "@/lib/pricing";
import { taka } from "@/lib/utils";
import type { DeliverySettings, PaymentSettings } from "@/lib/settings-defaults";
import { useCart } from "./cart";

export default function CheckoutForm({
  products,
  delivery,
  payments,
  combo,
}: {
  products: OrderProduct[];
  delivery: DeliverySettings;
  payments: PaymentSettings;
  combo: { enabled: boolean; bumpTitle: string; bumpText: string };
}) {
  const { lines, setQty, remove, add, clear, ready } = useCart();
  // always use fresh product data from the server (price, stock, combo)
  const byId = new Map(products.map((p) => [p.id, p]));
  const items = lines.map((l) => ({ product: byId.get(l.product.id)!, quantity: l.quantity })).filter((i) => i.product);
  const cartMap = Object.fromEntries(items.map((i) => [i.product.id, i.quantity]));
  const priced = priceCart(items.map((i) => ({ product: { ...i.product, comboPrice: combo.enabled ? i.product.comboPrice : null }, quantity: i.quantity })));
  const addons = products.filter((p) => p.isAddon);

  if (!ready) return <div className="card h-96 animate-pulse" />;
  if (!items.length)
    return (
      <div className="card mx-auto max-w-lg p-12 text-center">
        <ShoppingBag className="mx-auto mb-3 size-14 text-gold-400" />
        <p className="text-lg text-brand-900/60">আপনার কার্ট খালি</p>
        <Link href="/shop" className="btn-gold mt-6">
          শপিং করুন
        </Link>
      </div>
    );

  return (
    <CheckoutCore items={items} source="shop" delivery={delivery} payments={payments} comboEnabled={combo.enabled} onSuccess={clear}>
      <div className="card space-y-4 p-4 sm:p-6">
        <h3 className="flex items-center gap-2 font-display text-lg font-bold text-brand-900">
          <span className="grid size-8 place-items-center rounded-full bg-gold-500 text-sm text-white">১</span> আপনার পণ্য
        </h3>
        {priced.items.map((l) => (
          <div key={l.product.id} className="flex items-center gap-3 rounded-2xl bg-cream/60 p-3">
            <div className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-white">
              <Image src={l.product.image} alt="" fill sizes="64px" className="object-contain p-1" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold leading-tight text-brand-900">{l.product.nameBn || l.product.name}</p>
              <p className="text-sm">
                <b className="font-display text-brand-800">{taka(l.unit)}</b>
                {l.combo && <span className="ml-1.5 rounded bg-gold-100 px-1.5 text-[10px] font-bold text-gold-700">কম্বো দাম</span>}
              </p>
            </div>
            <div className="flex items-center rounded-full border border-brand-900/10 bg-white">
              <button type="button" onClick={() => setQty(l.product.id, l.quantity - 1)} className="grid size-8 place-items-center" aria-label="কমান">
                <Minus className="size-3.5" />
              </button>
              <span className="w-6 text-center font-bold">{l.quantity}</span>
              <button type="button" onClick={() => setQty(l.product.id, l.quantity + 1)} className="grid size-8 place-items-center" aria-label="বাড়ান">
                <Plus className="size-3.5" />
              </button>
            </div>
            <button type="button" onClick={() => remove(l.product.id)} className="p-1 text-rose-500" aria-label="Remove">
              <Trash2 className="size-4" />
            </button>
          </div>
        ))}
        {combo.enabled && priced.hasMain && (
          <ComboBump
            addons={addons}
            cart={cartMap}
            hasMain={priced.hasMain}
            comboSavings={priced.comboSavings}
            title={combo.bumpTitle}
            text={combo.bumpText}
            toggle={(id) => (cartMap[id] ? remove(id) : add(byId.get(id)! as never, 1, { silent: true }))}
            setQty={(id, d) => setQty(id, (cartMap[id] || 1) + d)}
          />
        )}
      </div>
    </CheckoutCore>
  );
}
