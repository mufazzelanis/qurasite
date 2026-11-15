"use client";
import { useEffect, useState } from "react";

export default function LiveCount() {
  const [d, setD] = useState<{ online: number; arrived5: number; left5: number } | null>(null);
  useEffect(() => {
    const load = () => fetch("/api/admin/live?scope=landing", { cache: "no-store" }).then((r) => r.json()).then(setD).catch(() => {});
    load();
    const t = setInterval(load, 3000);
    return () => clearInterval(t);
  }, []);
  return (
    <>
      <p className="mt-2 font-display text-5xl font-extrabold">{d?.online ?? "–"}</p>
      <p className="mt-1 text-xs text-white/70">
        +{d?.arrived5 ?? 0} / −{d?.left5 ?? 0} in 5 min
      </p>
    </>
  );
}
