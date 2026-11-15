"use client";
import Image from "next/image";
import { Check, Gift, Minus, Plus, Sparkles } from "lucide-react";
import { cn, taka } from "@/lib/utils";
import type { OrderProduct } from "./CheckoutCore";

export function Qty({ value, onChange }: { value: number; onChange: (d: number) => void }) {
  return (
    <div className="flex shrink-0 items-center rounded-full border border-brand-900/10 bg-white" onClick={(e) => e.stopPropagation()}>
      <button type="button" onClick={() => onChange(-1)} className="grid size-8 place-items-center" aria-label="কমান">
        <Minus className="size-3.5" />
      </button>
      <span className="w-6 text-center font-bold">{value}</span>
      <button type="button" onClick={() => onChange(1)} className="grid size-8 place-items-center" aria-label="বাড়ান">
        <Plus className="size-3.5" />
      </button>
    </div>
  );
}

/** "Yes, add honey!" order bump — combo price only when a main product is in the cart */
export default function ComboBump({
  addons,
  cart,
  hasMain,
  comboSavings,
  title,
  text,
  flash,
  toggle,
  setQty,
}: {
  addons: OrderProduct[];
  cart: Record<string, number>;
  hasMain: boolean;
  comboSavings: number;
  title: string;
  text: string;
  flash?: boolean;
  toggle: (id: string) => void;
  setQty: (id: string, d: number) => void;
}) {
  if (!addons.length) return null;
  return (
    <div
      id="combo-bump"
      className={cn(
        "relative overflow-hidden rounded-2xl border-2 border-dashed border-gold-500 bg-gradient-to-br from-gold-50 via-white to-gold-100 p-4 transition-shadow duration-500",
        flash && "shadow-[0_0_0_8px_rgba(218,145,40,0.35)]",
      )}
    >
      <div className="pointer-events-none absolute -right-6 -top-6 text-7xl opacity-10">🍯</div>
      <div className="mb-3 flex items-start gap-2">
        <span className="grid size-9 shrink-0 animate-[wiggle_2.5s_ease-in-out_infinite] place-items-center rounded-full bg-gold-500 text-white">
          <Gift className="size-5" />
        </span>
        <div>
          <p className="font-display text-lg font-extrabold text-brand-900">{title}</p>
          <p className="text-sm text-brand-900/65">{text}</p>
        </div>
      </div>
      <div className="space-y-2.5">
        {addons.map((a) => {
          const on = !!cart[a.id];
          const hasCombo = a.comboPrice != null && a.comboPrice < a.price;
          const unit = hasCombo && hasMain ? a.comboPrice! : a.price;
          return (
            <div
              key={a.id}
              role="checkbox"
              aria-checked={on}
              tabIndex={0}
              onClick={() => toggle(a.id)}
              onKeyDown={(e) => (e.key === " " || e.key === "Enter") && (e.preventDefault(), toggle(a.id))}
              data-track={on ? undefined : "combo"}
              data-amount={unit}
              data-label={`Combo: ${a.name}`}
              className={cn("flex cursor-pointer items-center gap-3 rounded-xl border-2 bg-white p-2.5 transition", on ? "border-brand-700 shadow-md" : "border-transparent")}
            >
              <span className={cn("grid size-6 shrink-0 place-items-center rounded-md border-2 transition", on ? "border-brand-700 bg-brand-700 text-white" : "border-gold-500 bg-white")}>
                {on && <Check className="size-4" strokeWidth={3} />}
              </span>
              <div className="relative size-12 shrink-0">
                <Image src={a.image} alt={a.name} fill sizes="48px" className="object-contain" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold leading-tight text-brand-900">
                  {on ? "✓ যোগ হয়েছে: " : "হ্যাঁ, যোগ করুন: "}
                  {a.nameBn || a.name}
                </p>
                {a.addonNote && <p className="text-xs text-brand-900/55">{a.addonNote}</p>}
              </div>
              <div className="text-right">
                <p className="font-display font-extrabold text-brand-800">{taka(unit)}</p>
                {unit < a.price && <p className="text-xs text-rose-500 line-through">{taka(a.price)}</p>}
              </div>
              {on && <Qty value={cart[a.id]} onChange={(d) => setQty(a.id, d)} />}
            </div>
          );
        })}
      </div>
      {!hasMain && <p className="mt-2 text-xs font-medium text-rose-600">* কম্বো দাম পেতে কুঁড়া মিক্স সিলেক্ট করুন</p>}
      {comboSavings > 0 && (
        <p className="mt-3 flex items-center gap-1.5 text-sm font-semibold text-brand-700">
          <Sparkles className="size-4 text-gold-500" /> দারুণ! কম্বোতে আপনি {taka(comboSavings)} সাশ্রয় করছেন
        </p>
      )}
    </div>
  );
}
