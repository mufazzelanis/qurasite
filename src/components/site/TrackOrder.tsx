"use client";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Check, Loader2, Package, Search, XCircle } from "lucide-react";
import { ORDER_FLOW, STATUS_META, cn, taka } from "@/lib/utils";

type O = {
  orderNo: string;
  customerName: string;
  status: string;
  total: number;
  courier: string | null;
  trackingCode: string | null;
  createdAt: string;
  items: { name: string; quantity: number }[];
  history: { status: string; note: string | null; createdAt: string }[];
};

export default function TrackOrder() {
  const sp = useSearchParams();
  const [q, setQ] = useState(sp.get("q") || "");
  const [orders, setOrders] = useState<O[] | null>(null);
  const [loading, setLoading] = useState(false);

  const search = useCallback(async (value: string) => {
    if (!value.trim()) return;
    setLoading(true);
    const r = await fetch(`/api/track?q=${encodeURIComponent(value)}`).then((r) => r.json()).catch(() => ({ orders: [] }));
    setOrders(r.orders || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    const init = sp.get("q");
    if (init) search(init);
  }, [sp, search]);

  // live refresh every 30s while a result is shown
  useEffect(() => {
    if (!orders?.length) return;
    const t = setInterval(() => search(q), 30000);
    return () => clearInterval(t);
  }, [orders, q, search]);

  return (
    <div>
      <form onSubmit={(e) => { e.preventDefault(); search(q); }} className="relative mb-10">
        <Search className="absolute left-5 top-1/2 size-5 -translate-y-1/2 text-brand-700" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="01XXXXXXXXX অথবা QF..." className="input h-16 rounded-full pl-14 pr-36 text-lg shadow-xl shadow-brand-900/5" />
        <button className="btn-gold absolute right-2 top-2 h-12">{loading ? <Loader2 className="size-5 animate-spin" /> : "খুঁজুন"}</button>
      </form>

      {orders && !orders.length && <p className="card p-10 text-center text-brand-900/60">কোনো অর্ডার পাওয়া যায়নি</p>}

      <div className="space-y-6">
        {orders?.map((o, idx) => {
          const failed = o.status === "CANCELLED" || o.status === "RETURNED";
          const step = ORDER_FLOW.indexOf(o.status as (typeof ORDER_FLOW)[number]);
          return (
            <motion.div key={o.orderNo} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }} className="card p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-brand-900/50">অর্ডার নম্বর</p>
                  <p className="font-display text-xl font-extrabold text-brand-800">{o.orderNo}</p>
                </div>
                <span className={cn("rounded-full px-4 py-1.5 text-sm font-semibold", STATUS_META[o.status]?.color)}>{STATUS_META[o.status]?.bn}</span>
              </div>

              {failed ? (
                <div className="mt-6 flex items-center gap-3 rounded-2xl bg-rose-50 p-4 text-rose-700">
                  <XCircle className="size-6" /> এই অর্ডারটি {STATUS_META[o.status].bn} হয়েছে
                </div>
              ) : (
                <div className="mt-8 grid grid-cols-5">
                  {ORDER_FLOW.map((s, i) => {
                    const done = i <= step;
                    return (
                      <div key={s} className="relative flex flex-col items-center text-center">
                        {i > 0 && (
                          <div className="absolute right-1/2 top-4 h-1 w-full bg-brand-900/10">
                            <motion.div className="h-full bg-gold-500" initial={{ width: 0 }} animate={{ width: done ? "100%" : 0 }} transition={{ delay: i * 0.25, duration: 0.4 }} />
                          </div>
                        )}
                        <motion.span
                          initial={{ scale: 0.6 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: i * 0.25 }}
                          className={cn("relative z-10 grid size-9 place-items-center rounded-full border-2", done ? "border-gold-500 bg-gold-500 text-white" : "border-brand-900/15 bg-white text-brand-900/30")}
                        >
                          {i === step && <span className="absolute inset-0 animate-pulse-ring rounded-full bg-gold-400" />}
                          {done ? <Check className="relative size-4" strokeWidth={3} /> : <Package className="size-4" />}
                        </motion.span>
                        <span className={cn("mt-2 text-[11px] font-medium sm:text-xs", done ? "text-brand-900" : "text-brand-900/40")}>{STATUS_META[s].bn}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="mt-6 grid gap-2 rounded-2xl bg-cream p-4 text-sm">
                <p>পণ্য: {o.items.map((i) => `${i.name} × ${i.quantity}`).join(", ")}</p>
                <p>মোট: <b>{taka(o.total)}</b></p>
                {o.courier && <p>কুরিয়ার: <b>{o.courier}</b> {o.trackingCode && `• ট্র্যাকিং কোড: ${o.trackingCode}`}</p>}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
