"use client";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Copy, Loader2, MapPin, NotebookPen, Phone, ShieldCheck, ShoppingBag, Tag, Truck, User, X } from "lucide-react";
import { toast } from "sonner";
import { cn, normalizeBdPhone, taka } from "@/lib/utils";
import { deliveryFor, priceCart } from "@/lib/pricing";
import { track } from "@/lib/track-client";
import type { DeliverySettings, PaymentSettings } from "@/lib/settings-defaults";

export type OrderProduct = {
  id: string;
  name: string;
  nameBn: string | null;
  slug?: string;
  price: number;
  comparePrice: number | null;
  image: string;
  weight: string | null;
  stock: number;
  isAddon: boolean;
  comboPrice: number | null;
  addonNote: string | null;
};
export type Area = "INSIDE_DHAKA" | "SUB_DHAKA" | "OUTSIDE_DHAKA";
type Quote = { subtotal: number; comboSavings: number; couponOk: boolean; couponDiscount: number; couponError?: string; deliveryCharge: number; total: number; advance: number };

export default function CheckoutCore({
  items,
  source,
  delivery,
  payments,
  comboEnabled,
  children,
  onSuccess,
  submitLabel = "অর্ডার কনফার্ম করুন",
}: {
  items: { product: OrderProduct; quantity: number }[];
  source: string;
  delivery: DeliverySettings;
  payments: PaymentSettings;
  comboEnabled: boolean;
  children?: React.ReactNode;
  onSuccess?: () => void;
  submitLabel?: string;
}) {
  const router = useRouter();
  const [area, setArea] = useState<Area>("OUTSIDE_DHAKA");
  const [form, setForm] = useState({ name: "", phone: "", address: "", notes: "" });
  const [coupon, setCoupon] = useState("");
  const [couponOpen, setCouponOpen] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState("");
  const [method, setMethod] = useState<"COD" | "BKASH" | "NAGAD" | "ROCKET">("COD");
  const [trxId, setTrxId] = useState("");
  const [q, setQ] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(false);
  const [otp, setOtp] = useState<{ open: boolean; sent: boolean; code: string; busy: boolean }>({ open: false, sent: false, code: "", busy: false });
  const started = useRef(false);

  // instant local estimate…
  const local = priceCart(items.map((i) => ({ product: { ...i.product, comboPrice: comboEnabled ? i.product.comboPrice : null }, quantity: i.quantity })));
  const localShip = deliveryFor(area, local.subtotal, delivery);
  // …replaced by the exact server quote (coupon, advance) a moment later
  const key = JSON.stringify([items.map((i) => [i.product.id, i.quantity]), area, appliedCoupon]);
  useEffect(() => {
    if (!items.length) return setQ(null);
    const t = setTimeout(async () => {
      const r = await fetch("/api/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: items.map((i) => ({ productId: i.product.id, quantity: i.quantity })), area, coupon: appliedCoupon || undefined, source }),
      })
        .then((r) => r.json())
        .catch(() => null);
      if (r && typeof r.total === "number") {
        setQ(r);
        if (appliedCoupon && !r.couponOk) {
          toast.error(r.couponError || "কুপন সঠিক নয়");
          setAppliedCoupon("");
        }
      }
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const subtotal = q?.subtotal ?? local.subtotal;
  const comboSavings = q?.comboSavings ?? local.comboSavings;
  const couponDiscount = q?.couponDiscount ?? 0;
  const shipping = q?.deliveryCharge ?? localShip;
  const total = items.length ? (q?.total ?? local.subtotal + localShip) : 0;
  const advance = q?.advance ?? 0;
  const mrpSaved = items.reduce((a, i) => a + ((i.product.comparePrice || i.product.price) - i.product.price) * i.quantity, 0);
  const saved = mrpSaved + comboSavings + couponDiscount;
  const phoneOk = useMemo(() => !!normalizeBdPhone(form.phone), [form.phone]);

  const wallets = (
    [
      ["BKASH", "বিকাশ", payments.bkash, "#e2136e"],
      ["NAGAD", "নগদ", payments.nagad, "#f6921e"],
      ["ROCKET", "রকেট", payments.rocket, "#8c3494"],
    ] as const
  ).filter(([, , w]) => w.enabled && w.number);
  const needAdvance = advance > 0;
  useEffect(() => {
    if (needAdvance && method === "COD" && wallets[0]) setMethod(wallets[0][0]);
    if (!needAdvance) setMethod("COD");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needAdvance]);
  const wallet = wallets.find(([k]) => k === method);

  // abandoned checkout capture
  useEffect(() => {
    if (form.phone.replace(/\D/g, "").length < 11) return;
    const t = setTimeout(() => {
      fetch("/api/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, source, cart: items.map((i) => ({ id: i.product.id, name: i.product.nameBn || i.product.name, q: i.quantity })) }),
      }).catch(() => {});
    }, 1200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.name, form.phone, form.address, key]);

  const onStart = () => {
    if (started.current) return;
    started.current = true;
    track("InitiateCheckout", { value: subtotal, contentIds: items.map((i) => i.product.id), numItems: items.reduce((a, i) => a + i.quantity, 0) });
  };

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!items.length) return toast.error("অন্তত একটি পণ্য সিলেক্ট করুন");
    if (!phoneOk) return toast.error("সঠিক ১১ ডিজিটের মোবাইল নাম্বার দিন");
    if (needAdvance && trxId.trim().length < 6) return toast.error("Transaction ID লিখুন");
    setLoading(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          area,
          items: items.map((i) => ({ productId: i.product.id, quantity: i.quantity })),
          coupon: appliedCoupon || undefined,
          paymentMethod: needAdvance ? method : "COD",
          trxId: needAdvance ? trxId : undefined,
          source,
          visitId: (window as Window & { __qfVisit?: string }).__qfVisit,
          url: location.href,
        }),
      });
      // never show raw technical errors to the customer
      const j = await res.json().catch(() => ({ error: "সার্ভারে সমস্যা হয়েছে। একটু পর আবার চেষ্টা করুন অথবা আমাদের কল করুন।" }));
      if (res.status === 428 && j.needOtp) {
        setOtp((o) => ({ ...o, open: true }));
        setLoading(false);
        return;
      }
      if (!res.ok) throw new Error(j.error || "অর্ডার করা যায়নি");
      onSuccess?.();
      toast.success("অর্ডার সফল হয়েছে! 🎉");
      router.push(`/order/${j.orderNo}?e=${j.eventId}`);
    } catch (err) {
      const msg = (err as Error).message;
      toast.error(/fetch|network|json/i.test(msg) ? "ইন্টারনেট সংযোগ দেখে আবার চেষ্টা করুন" : msg);
      setLoading(false);
    }
  }

  async function otpSend() {
    setOtp((o) => ({ ...o, busy: true }));
    const r = await fetch("/api/otp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone: form.phone }) }).then((r) => r.json());
    setOtp((o) => ({ ...o, busy: false, sent: !!r.ok }));
    if (!r.ok) toast.error(r.error || "কোড পাঠানো যায়নি");
  }
  async function otpVerify() {
    setOtp((o) => ({ ...o, busy: true }));
    const r = await fetch("/api/otp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone: form.phone, code: otp.code }) }).then((r) => r.json());
    if (!r.ok) {
      setOtp((o) => ({ ...o, busy: false }));
      return toast.error(r.error || "কোড সঠিক নয়");
    }
    setOtp({ open: false, sent: false, code: "", busy: false });
    submit();
  }

  const field = (k: keyof typeof form) => ({
    value: form[k],
    onFocus: onStart,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [k]: e.target.value })),
  });

  return (
    <form onSubmit={submit} className="grid gap-5 lg:grid-cols-[1.1fr_1fr] lg:gap-6">
      <div className="space-y-5">
        {children}

        <div className="card space-y-4 p-4 sm:p-6">
          <h3 className="flex items-center gap-2 font-display text-lg font-bold text-brand-900">
            <span className="grid size-8 place-items-center rounded-full bg-gold-500 text-sm text-white">২</span> আপনার তথ্য দিন
          </h3>
          <Field icon={User} label="আপনার নাম *">
            <input required autoComplete="name" className="input pl-11" placeholder="আপনার সম্পূর্ণ নাম" {...field("name")} />
          </Field>
          <Field icon={Phone} label="মোবাইল নাম্বার *" ok={phoneOk}>
            <input required inputMode="tel" autoComplete="tel" className="input pl-11 pr-10" placeholder="01XXXXXXXXX" {...field("phone")} />
          </Field>
          <Field icon={MapPin} label="সম্পূর্ণ ঠিকানা *" top>
            <textarea required rows={2} autoComplete="street-address" className="input resize-none pl-11" placeholder="বাসা নং, রোড, এলাকা, থানা, জেলা" {...field("address")} />
          </Field>
          <Field icon={NotebookPen} label="অর্ডার নোট (ঐচ্ছিক)" top>
            <textarea rows={2} className="input resize-none pl-11" placeholder="বিশেষ কিছু বলতে চাইলে লিখুন" {...field("notes")} />
          </Field>
        </div>
      </div>

      <div className="space-y-5 lg:sticky lg:top-24 lg:self-start">
        <div className="card p-4 sm:p-6">
          <h3 className="mb-4 flex items-center gap-2 font-display text-lg font-bold text-brand-900">
            <span className="grid size-8 place-items-center rounded-full bg-gold-500 text-sm text-white">৩</span> ডেলিভারি এলাকা
          </h3>
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                ["INSIDE_DHAKA", "ঢাকার ভেতরে", delivery.insideDhaka],
                ["SUB_DHAKA", "সাব-ঢাকা", delivery.subDhaka],
                ["OUTSIDE_DHAKA", "ঢাকার বাইরে", delivery.outsideDhaka],
              ] as const
            ).map(([k, l, c]) => (
              <button
                type="button"
                key={k}
                onClick={() => setArea(k)}
                className={cn("relative rounded-2xl border-2 px-1 py-3 text-center transition", area === k ? "border-brand-700 bg-brand-50" : "border-brand-900/10 active:border-brand-300")}
              >
                {area === k && (
                  <span className="absolute -right-1.5 -top-1.5 grid size-5 place-items-center rounded-full bg-brand-700 text-white">
                    <Check className="size-3" strokeWidth={3} />
                  </span>
                )}
                <span className="block text-xs font-medium text-brand-900/70 sm:text-sm">{l}</span>
                <span className="font-display font-bold text-brand-800">{taka(c)}</span>
              </button>
            ))}
          </div>
        </div>

        {needAdvance && wallets.length > 0 && (
          <div className="card space-y-3 p-4 sm:p-6">
            <h3 className="font-display text-lg font-bold text-brand-900">অগ্রিম পেমেন্ট — {taka(advance)}</h3>
            <div className="grid grid-cols-3 gap-2">
              {wallets.map(([k, l, , color]) => (
                <button
                  type="button"
                  key={k}
                  onClick={() => setMethod(k)}
                  className={cn("rounded-xl border-2 py-2.5 font-bold transition", method === k ? "text-white" : "border-brand-900/10 bg-white")}
                  style={method === k ? { background: color, borderColor: color } : { color }}
                >
                  {l}
                </button>
              ))}
            </div>
            {wallet && (
              <div className="rounded-xl bg-cream p-3 text-sm">
                <p>
                  {wallet[1]} {wallet[2].type} নাম্বার:{" "}
                  <button
                    type="button"
                    onClick={() => navigator.clipboard?.writeText(wallet[2].number).then(() => toast.success("কপি হয়েছে"))}
                    className="inline-flex items-center gap-1 font-display text-base font-extrabold text-brand-800"
                  >
                    {wallet[2].number} <Copy className="size-3.5" />
                  </button>
                </p>
                <p className="mt-1 text-brand-900/65">{payments.instructions}</p>
              </div>
            )}
            <input value={trxId} onChange={(e) => setTrxId(e.target.value)} className="input" placeholder="Transaction ID (যেমন: 8N7A6D5E4F)" />
          </div>
        )}

        <div className="card overflow-hidden">
          <div className="flex items-center justify-between bg-brand-800 px-5 py-3.5 text-white">
            <h3 className="flex items-center gap-2 font-display text-lg font-bold">
              <ShoppingBag className="size-5 text-gold-300" /> অর্ডার সামারি
            </h3>
            {comboSavings > 0 && <span className="rounded-full bg-gold-500 px-3 py-1 text-xs font-bold">🍯 কম্বো</span>}
          </div>
          <div className="space-y-3 p-5">
            {local.items.map((l) => (
              <div key={l.product.id} className="flex justify-between gap-3 text-sm">
                <span className="text-brand-900/75">
                  {l.product.nameBn || l.product.name} <span className="text-brand-900/40">× {l.quantity}</span>
                  {l.combo && <span className="ml-1 rounded bg-gold-100 px-1.5 text-[10px] font-bold text-gold-700">কম্বো</span>}
                </span>
                <span className="shrink-0 font-semibold">{taka(l.unit * l.quantity)}</span>
              </div>
            ))}

            {!appliedCoupon ? (
              couponOpen ? (
                <div className="flex gap-2">
                  <input value={coupon} onChange={(e) => setCoupon(e.target.value.toUpperCase())} className="input !py-2" placeholder="কুপন কোড" />
                  <button type="button" onClick={() => coupon.trim() && setAppliedCoupon(coupon.trim())} className="btn-green !rounded-xl !px-4 !py-2 text-sm">
                    প্রয়োগ
                  </button>
                </div>
              ) : (
                <button type="button" onClick={() => setCouponOpen(true)} className="flex items-center gap-1.5 text-sm font-semibold text-gold-700">
                  <Tag className="size-4" /> কুপন কোড আছে?
                </button>
              )
            ) : (
              <div className="flex items-center justify-between rounded-xl bg-brand-50 px-3 py-2 text-sm">
                <span className="font-semibold text-brand-700">✓ {appliedCoupon} প্রয়োগ হয়েছে</span>
                <button type="button" onClick={() => { setAppliedCoupon(""); setCoupon(""); }} aria-label="Remove coupon">
                  <X className="size-4" />
                </button>
              </div>
            )}

            <div className="space-y-2 border-t border-dashed border-brand-900/15 pt-3 text-sm">
              <Row label="সাবটোটাল" value={taka(subtotal)} />
              {couponDiscount > 0 && <Row label="কুপন ছাড়" value={`- ${taka(couponDiscount)}`} accent />}
              <Row label="ডেলিভারি চার্জ" value={shipping === 0 ? "ফ্রি" : taka(shipping)} />
              {saved > 0 && <Row label="আপনি সাশ্রয় করছেন" value={taka(saved)} accent />}
              {needAdvance && <Row label="এখন পাঠাবেন (অগ্রিম)" value={taka(advance)} />}
              {needAdvance && advance < total && <Row label="ডেলিভারিতে দেবেন" value={taka(total - advance)} />}
            </div>
            <div className="flex items-center justify-between border-t border-brand-900/10 pt-4">
              <span className="font-bold">সর্বমোট</span>
              <span key={total} className="animate-[pop_.4s_ease-out] font-display text-2xl font-extrabold text-brand-800">
                {taka(total)}
              </span>
            </div>

            <button disabled={loading} data-track="confirm_order" data-amount={total} className="btn-gold shine mt-1 w-full py-4 text-lg">
              {loading ? <Loader2 className="size-5 animate-spin" /> : <ShoppingBag className="size-5" />}
              {submitLabel} {taka(total)}
            </button>
            <div className="flex items-center justify-center gap-4 pt-1 text-xs text-brand-900/55">
              <span className="flex items-center gap-1">
                <Truck className="size-3.5" /> {needAdvance ? "বাকি টাকা ডেলিভারিতে" : "ক্যাশ অন ডেলিভারি"}
              </span>
              <span className="flex items-center gap-1">
                <ShieldCheck className="size-3.5" /> নিরাপদ অর্ডার
              </span>
            </div>
          </div>
        </div>
      </div>

      {otp.open && (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-brand-950/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl">
            <ShieldCheck className="mx-auto mb-2 size-10 text-brand-700" />
            <h4 className="font-display text-xl font-bold">মোবাইল নাম্বার ভেরিফাই করুন</h4>
            <p className="mt-1 text-sm text-brand-900/60">{form.phone} নাম্বারে একটি ৪ ডিজিটের কোড পাঠানো হবে</p>
            {!otp.sent ? (
              <button type="button" onClick={otpSend} disabled={otp.busy} className="btn-gold mt-5 w-full">
                {otp.busy && <Loader2 className="size-4 animate-spin" />} কোড পাঠান
              </button>
            ) : (
              <div className="mt-5 space-y-3">
                <input value={otp.code} onChange={(e) => setOtp((o) => ({ ...o, code: e.target.value.replace(/\D/g, "").slice(0, 6) }))} inputMode="numeric" autoComplete="one-time-code" className="input text-center text-2xl tracking-[0.5em]" placeholder="••••" />
                <button type="button" onClick={otpVerify} disabled={otp.busy || otp.code.length < 4} className="btn-gold w-full">
                  {otp.busy && <Loader2 className="size-4 animate-spin" />} ভেরিফাই ও অর্ডার করুন
                </button>
              </div>
            )}
            <button type="button" onClick={() => setOtp({ open: false, sent: false, code: "", busy: false })} className="mt-3 text-sm text-brand-900/50">
              বাতিল
            </button>
          </div>
        </div>
      )}
    </form>
  );
}

function Field({ icon: Icon, label, ok, top, children }: { icon: typeof User; label: string; ok?: boolean; top?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="label">{label}</label>
      <div className="relative">
        <Icon className={cn("absolute left-4 size-4 text-brand-900/35", top ? "top-4" : "top-1/2 -translate-y-1/2")} />
        {children}
        {ok && <Check className="absolute right-4 top-1/2 size-4 -translate-y-1/2 text-brand-600" strokeWidth={3} />}
      </div>
    </div>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={cn("flex justify-between", accent ? "font-semibold text-brand-600" : "text-brand-900/70")}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
