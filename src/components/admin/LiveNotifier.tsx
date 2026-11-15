"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Radio } from "lucide-react";

/** Polls live stats; shows online visitors and pops a toast + sound on every new order. */
export default function LiveNotifier() {
  const [online, setOnline] = useState<number | null>(null);
  const lastOrder = useRef<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const r = await fetch("/api/admin/live", { cache: "no-store" }).then((r) => r.json());
        if (!alive) return;
        setOnline(r.online);
        const latest = r.recentOrders?.[0];
        if (latest) {
          if (lastOrder.current && lastOrder.current !== latest.id) {
            toast.success(`🛒 New order ${latest.orderNo} — ৳${latest.total}`, { description: latest.customerName });
            beep();
            router.refresh();
          }
          lastOrder.current = latest.id;
        }
      } catch {}
    };
    tick();
    const t = setInterval(tick, 8000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [router]);

  return (
    <div className="flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700">
      <span className="relative flex size-2">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
      </span>
      <Radio className="size-4" /> {online ?? "–"} live
    </div>
  );
}

function beep() {
  try {
    const ctx = new AudioContext();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g);
    g.connect(ctx.destination);
    o.frequency.value = 880;
    g.gain.setValueAtTime(0.15, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    o.start();
    o.stop(ctx.currentTime + 0.5);
  } catch {}
}
