"use client";
import { useEffect, useState } from "react";
import { Phone, ShoppingBag } from "lucide-react";
import { taka } from "@/lib/utils";

/** Mobile bottom bar: appears after the hero, hides while the order form is on screen. */
export default function StickyBar({ text, price, phone }: { text: string; price?: number; phone: string }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    let formOn = false;
    const form = document.getElementById("order");
    const io = form ? new IntersectionObserver(([e]) => ((formOn = e.isIntersecting), update()), { threshold: 0.05 }) : null;
    if (form && io) io.observe(form);
    const update = () => setShow(scrollY > 450 && !formOn);
    addEventListener("scroll", update, { passive: true });
    return () => {
      removeEventListener("scroll", update);
      io?.disconnect();
    };
  }, []);

  return (
    <div className={`fixed inset-x-0 bottom-0 z-40 flex gap-2 border-t border-brand-900/10 bg-white/95 p-2.5 backdrop-blur transition-transform duration-300 sm:hidden ${show ? "translate-y-0" : "translate-y-full"}`}>
      <a href={`tel:${phone}`} data-track="call" className="grid size-[52px] shrink-0 place-items-center rounded-full bg-brand-800 text-white" aria-label="Call">
        <Phone className="size-5" />
      </a>
      <a href="#order" data-track="sticky_bar" data-amount={price} className="btn-gold shine flex-1 py-3.5 text-base">
        <ShoppingBag className="size-5" /> {text} {price ? taka(price) : ""}
      </a>
    </div>
  );
}
