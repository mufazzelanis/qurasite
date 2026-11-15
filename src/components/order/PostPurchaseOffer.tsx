"use client";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Clock, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { taka } from "@/lib/utils";
import { track } from "@/lib/track-client";

type Addon = { id: string; name: string; nameBn: string | null; image: string; price: number; comboPrice: number | null; addonNote: string | null };

/** Thank-you page: add honey / jaggery to the SAME order in one tap (same delivery, no new form). */
export default function PostPurchaseOffer({ orderNo, token, addons, endsAt, title }: { orderNo: string; token: string; addons: Addon[]; endsAt: number; title: string }) {
  const router = useRouter();
  const [left, setLeft] = useState(endsAt - Date.now());
  const [busy, setBusy] = useState<string | null>(null);
  const [added, setAdded] = useState<string[]>([]);

  useEffect(() => {
    const t = setInterval(() => setLeft(endsAt - Date.now()), 1000);
    return () => clearInterval(t);
  }, [endsAt]);
  if (left <= 0 || !addons.length) return null;

  async function addOne(a: Addon) {
    setBusy(a.id);
    const r = await fetch(`/api/orders/${orderNo}/addon`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, productId: a.id, quantity: 1 }) });
    const j = await r.json();
    setBusy(null);
    if (!r.ok) return toast.error(j.error || "যোগ করা যায়নি");
    track("Purchase", { value: j.added, contentIds: [a.id], numItems: 1 }, { eventId: j.eventId, serverSent: true });
    setAdded((x) => [...x, a.id]);
    toast.success(`${a.nameBn || a.name} আপনার অর্ডারে যোগ হয়েছে 🎉`);
    router.refresh();
  }

  const mm = String(Math.floor(left / 60000)).padStart(2, "0");
  const ss = String(Math.floor((left / 1000) % 60)).padStart(2, "0");

  return (
    <div className="fade-up card mt-6 overflow-hidden border-2 border-gold-400">
      <div className="flex items-center justify-between gap-3 bg-gradient-to-r from-gold-500 to-gold-400 px-5 py-3 text-white">
        <p className="font-display font-bold">{title}</p>
        <span className="flex shrink-0 items-center gap-1 rounded-full bg-white/20 px-2.5 py-1 text-sm font-bold tabular-nums">
          <Clock className="size-4" /> {mm}:{ss}
        </span>
      </div>
      <div className="space-y-3 p-4">
        <p className="text-sm text-brand-900/60">একই ডেলিভারিতে আসবে — কোনো বাড়তি ডেলিভারি চার্জ নেই, নতুন ফর্মও লাগবে না।</p>
        {addons.map((a) => {
          const unit = a.comboPrice != null && a.comboPrice < a.price ? a.comboPrice : a.price;
          const done = added.includes(a.id);
          return (
            <div key={a.id} className="flex items-center gap-3 rounded-2xl bg-cream p-3">
              <Image src={a.image} alt="" width={56} height={56} className="size-14 object-contain" />
              <div className="min-w-0 flex-1">
                <p className="font-bold text-brand-900">{a.nameBn || a.name}</p>
                {a.addonNote && <p className="text-xs text-brand-900/55">{a.addonNote}</p>}
                <p className="text-sm">
                  <b className="font-display text-brand-800">{taka(unit)}</b> {unit < a.price && <s className="text-rose-500">{taka(a.price)}</s>}
                </p>
              </div>
              <button disabled={!!busy || done} onClick={() => addOne(a)} data-track="combo" data-amount={unit} data-label={`Post-purchase: ${a.name}`} className="btn-gold shrink-0 !px-4 !py-2.5 text-sm">
                {busy === a.id ? <Loader2 className="size-4 animate-spin" /> : done ? "✓ যোগ হয়েছে" : (<><Plus className="size-4" /> যোগ করুন</>)}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
