"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Loader2, Search, Sparkles } from "lucide-react";
import { taka } from "@/lib/utils";
import { track } from "@/lib/track-client";

type P = { id: string; name: string; nameBn: string | null; slug: string; price: number; comparePrice: number | null; image: string; weight: string | null };

const SUGGEST = ["কুঁড়া মিক্স", "এনার্জি", "Qura", "250gm"];

export default function SearchPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<P[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setTimeout(() => inputRef.current?.focus(), 50);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    const t = setTimeout(async () => {
      const r = await fetch(`/api/products?q=${encodeURIComponent(q)}`).then((r) => r.json()).catch(() => ({ products: [] }));
      setItems(r.products);
      setLoading(false);
      if (q.length > 2) track("Search", { contentName: q });
    }, 250);
    return () => clearTimeout(t);
  }, [q, open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[70] flex items-start justify-center p-4 pt-[10vh]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-brand-950/40 backdrop-blur-md" onClick={onClose} />
          <motion.div
            initial={{ y: -20, scale: 0.96, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: -10, scale: 0.98, opacity: 0 }}
            transition={{ type: "spring", damping: 24, stiffness: 300 }}
            className="relative w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl"
          >
            <div className="flex items-center gap-3 border-b border-brand-900/5 px-5">
              {loading ? <Loader2 className="size-5 animate-spin text-gold-500" /> : <Search className="size-5 text-brand-700" />}
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="কী খুঁজছেন? যেমন: কুঁড়া মিক্স, এনার্জি..."
                className="h-16 flex-1 bg-transparent text-lg placeholder:text-brand-900/30"
              />
              <kbd className="rounded-md border border-brand-900/10 px-2 py-1 text-xs text-brand-900/40">ESC</kbd>
            </div>

            {!q && (
              <div className="flex flex-wrap items-center gap-2 px-5 pt-4">
                <Sparkles className="size-4 text-gold-500" />
                {SUGGEST.map((s) => (
                  <button key={s} onClick={() => setQ(s)} className="rounded-full bg-cream px-3 py-1 text-sm text-brand-800 transition hover:bg-gold-100">
                    {s}
                  </button>
                ))}
              </div>
            )}

            <div className="max-h-[55vh] overflow-y-auto p-3">
              {items.length === 0 && !loading && <p className="py-10 text-center text-brand-900/50">কোনো পণ্য পাওয়া যায়নি</p>}
              {items.map((p, i) => (
                <motion.div key={p.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                  <Link href={`/p/${p.slug}`} onClick={onClose} className="group flex items-center gap-4 rounded-2xl p-3 transition hover:bg-cream">
                    <div className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-cream">
                      <Image src={p.image} alt={p.name} fill sizes="64px" className="object-contain p-1" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-brand-900">{p.nameBn || p.name}</p>
                      <p className="text-sm text-brand-900/50">{p.weight}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-display font-extrabold text-brand-800">{taka(p.price)}</p>
                      {p.comparePrice && <p className="text-xs text-brand-900/40 line-through">{taka(p.comparePrice)}</p>}
                    </div>
                    <ArrowRight className="size-4 -translate-x-2 text-gold-500 opacity-0 transition group-hover:translate-x-0 group-hover:opacity-100" />
                  </Link>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
