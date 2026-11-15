"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, Phone, Search, ShoppingBag, X } from "lucide-react";
import SearchPalette from "./SearchPalette";
import { useCart } from "@/components/shop/cart";
import { cn } from "@/lib/utils";

export default function Header({ phone, announcement, categories }: { phone: string; announcement: string; categories: { name: string; nameBn: string | null; slug: string }[] }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState(false);
  const { count, setOpen: openCart, ready } = useCart();
  const path = usePathname();

  const NAV = [
    { href: "/", label: "হোম" },
    { href: "/shop", label: "সব পণ্য" },
    ...categories.slice(0, 3).map((c) => ({ href: `/category/${c.slug}`, label: c.nameBn || c.name })),
    { href: "/track", label: "অর্ডার ট্র্যাক" },
  ];

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 10);
    on();
    addEventListener("scroll", on, { passive: true });
    const key = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearch(true);
      }
    };
    addEventListener("keydown", key);
    return () => {
      removeEventListener("scroll", on);
      removeEventListener("keydown", key);
    };
  }, []);
  useEffect(() => setOpen(false), [path]);

  return (
    <>
      {announcement && (
        <div className="relative z-50 bg-brand-800 text-center text-xs text-white sm:text-sm">
          <div className="container-x flex flex-wrap items-center justify-center gap-x-2 py-2">
            <span className="inline-block size-1.5 animate-pulse rounded-full bg-gold-400" />
            <span className="line-clamp-1">{announcement}</span>
            <a href={`tel:${phone}`} data-track="call" className="hidden font-bold text-gold-300 hover:underline sm:inline">
              {phone}
            </a>
          </div>
        </div>
      )}

      <header className={cn("sticky top-0 z-40 transition-all duration-300", scrolled ? "glass shadow-[0_8px_30px_-12px_rgba(13,69,36,0.25)]" : "bg-cream")}>
        <div className="container-x flex h-16 items-center justify-between gap-3 sm:h-[72px]">
          <Link href="/" className="relative h-10 w-28 shrink-0 sm:h-12 sm:w-40">
            <Image src="/brand/logo-bn-t.png" alt="কুঁড়া ফুড" fill priority sizes="160px" className="object-contain object-left" />
          </Link>

          <nav className="hidden items-center gap-1 lg:flex">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className={cn(
                  "group relative rounded-full px-4 py-2 text-[15px] font-medium transition hover:text-brand-800",
                  path === n.href ? "text-brand-800" : "text-brand-900/75",
                )}
              >
                {n.label}
                <span className={cn("absolute inset-x-4 bottom-1 h-0.5 origin-left rounded-full bg-gold-500 transition-transform duration-300 group-hover:scale-x-100", path === n.href ? "scale-x-100" : "scale-x-0")} />
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSearch(true)}
              className="group flex h-11 items-center gap-2 rounded-full border border-brand-900/10 bg-white/80 px-3 text-sm text-brand-900/50 transition hover:border-gold-400 hover:shadow-md sm:w-52"
              aria-label="Search"
            >
              <Search className="size-4 text-brand-700" />
              <span className="hidden flex-1 text-left sm:inline">পণ্য খুঁজুন...</span>
              <kbd className="hidden rounded-md border border-brand-900/10 bg-cream px-1.5 py-0.5 text-[10px] font-semibold md:inline">Ctrl K</kbd>
            </button>
            <button onClick={() => openCart(true)} className="relative grid size-11 place-items-center rounded-full bg-gold-500 text-white shadow-lg shadow-gold-500/30 transition hover:scale-105" aria-label="Cart">
              <ShoppingBag className="size-5" />
              {ready && count > 0 && (
                <span key={count} className="absolute -right-1 -top-1 grid size-5 animate-[pop_.4s_ease-out] place-items-center rounded-full bg-brand-800 text-[11px] font-bold">
                  {count}
                </span>
              )}
            </button>
            <button onClick={() => setOpen(true)} className="grid size-11 place-items-center rounded-full bg-brand-800 text-white lg:hidden" aria-label="Menu">
              <Menu className="size-5" />
            </button>
          </div>
        </div>
      </header>

      {/* mobile menu */}
      <div className={cn("fixed inset-0 z-[60] lg:hidden", open ? "visible" : "invisible")}>
        <div className={cn("absolute inset-0 bg-brand-950/50 backdrop-blur-sm transition-opacity", open ? "opacity-100" : "opacity-0")} onClick={() => setOpen(false)} />
        <aside className={cn("absolute right-0 top-0 flex h-full w-80 max-w-[85%] flex-col bg-cream p-6 transition-transform duration-300", open ? "translate-x-0" : "translate-x-full")}>
          <div className="mb-8 flex items-center justify-between">
            <Image src="/brand/logo-bn-t.png" alt="" width={140} height={50} className="h-10 w-auto" />
            <button onClick={() => setOpen(false)} className="grid size-10 place-items-center rounded-full bg-white" aria-label="Close">
              <X className="size-5" />
            </button>
          </div>
          <nav className="flex flex-col gap-1">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className="block rounded-xl px-4 py-3 text-lg font-medium hover:bg-white">
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="mt-auto space-y-3">
            <button onClick={() => (setOpen(false), openCart(true))} className="btn-gold w-full">
              <ShoppingBag className="size-4" /> কার্ট দেখুন {count > 0 && `(${count})`}
            </button>
            <a href={`tel:${phone}`} data-track="call" className="btn-ghost w-full">
              <Phone className="size-4" /> {phone}
            </a>
          </div>
        </aside>
      </div>

      <SearchPalette open={search} onClose={() => setSearch(false)} />
    </>
  );
}
