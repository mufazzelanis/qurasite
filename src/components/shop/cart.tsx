"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { track } from "@/lib/track-client";

export type CartProduct = { id: string; name: string; nameBn: string | null; slug: string; price: number; image: string; weight: string | null; isAddon?: boolean; comboPrice?: number | null };
type Line = { product: CartProduct; quantity: number };
type Ctx = {
  lines: Line[];
  count: number;
  subtotal: number;
  open: boolean;
  setOpen: (v: boolean) => void;
  add: (p: CartProduct, q?: number, opts?: { silent?: boolean }) => void;
  setQty: (id: string, q: number) => void;
  remove: (id: string) => void;
  clear: () => void;
  ready: boolean;
};

const CartCtx = createContext<Ctx | null>(null);
const KEY = "qf_cart_v1";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<Line[]>([]);
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setLines(JSON.parse(raw));
    } catch {}
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(lines));
    } catch {}
  }, [lines, ready]);

  const add = useCallback((p: CartProduct, q = 1, opts?: { silent?: boolean }) => {
    setLines((ls) => {
      const ex = ls.find((l) => l.product.id === p.id);
      if (ex) return ls.map((l) => (l.product.id === p.id ? { ...l, product: p, quantity: Math.min(20, l.quantity + q) } : l));
      return [...ls, { product: p, quantity: q }];
    });
    track("AddToCart", { value: p.price * q, contentIds: [p.id], contentName: p.name });
    if (!opts?.silent) {
      toast.success(`${p.nameBn || p.name} কার্টে যোগ হয়েছে`, { action: { label: "চেকআউট", onClick: () => (location.href = "/checkout") } });
      setOpen(true);
    }
  }, []);
  const setQty = useCallback((id: string, q: number) => setLines((ls) => ls.map((l) => (l.product.id === id ? { ...l, quantity: Math.max(1, Math.min(20, q)) } : l))), []);
  const remove = useCallback((id: string) => setLines((ls) => ls.filter((l) => l.product.id !== id)), []);
  const clear = useCallback(() => setLines([]), []);

  const value = useMemo(
    () => ({
      lines,
      count: lines.reduce((a, l) => a + l.quantity, 0),
      subtotal: lines.reduce((a, l) => a + l.product.price * l.quantity, 0),
      open,
      setOpen,
      add,
      setQty,
      remove,
      clear,
      ready,
    }),
    [lines, open, add, setQty, remove, clear, ready],
  );
  return <CartCtx.Provider value={value}>{children}</CartCtx.Provider>;
}

export function useCart() {
  const c = useContext(CartCtx);
  if (!c) throw new Error("useCart outside CartProvider");
  return c;
}
