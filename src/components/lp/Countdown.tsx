"use client";
import { useEffect, useState } from "react";

export default function Countdown({ endsAt }: { endsAt: string }) {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    const end = new Date(endsAt).getTime();
    const tick = () => setLeft(Math.max(0, end - Date.now()));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [endsAt]);
  if (left === null || left <= 0) return null;
  const parts = [
    [Math.floor(left / 86400000), "দিন"],
    [Math.floor((left / 3600000) % 24), "ঘণ্টা"],
    [Math.floor((left / 60000) % 60), "মিনিট"],
    [Math.floor((left / 1000) % 60), "সেকেন্ড"],
  ] as const;
  return (
    <div className="flex gap-2">
      {parts.map(([n, l]) => (
        <div key={l} className="min-w-14 rounded-xl bg-brand-800 px-2 py-1.5 text-center text-white">
          <div className="font-display text-xl font-extrabold tabular-nums">{String(n).padStart(2, "0")}</div>
          <div className="text-[10px] text-white/70">{l}</div>
        </div>
      ))}
    </div>
  );
}
