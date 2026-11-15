"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronDown, Menu, Phone, Search, ShoppingBag, X } from "lucide-react";
import { buildTree, flatten, type Node } from "@/lib/category-tree";
import SearchPalette from "./SearchPalette";
import { useCart } from "@/components/shop/cart";
import { cn } from "@/lib/utils";

type MenuCat = { id: string; name: string; nameBn: string | null; slug: string; parentId: string | null; sortOrder: number; image: string | null };

export default function Header({ phone, announcement, categories, pages = [] }: { phone: string; announcement: string; categories: MenuCat[]; pages?: { slug: string; title: string }[] }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState(false);
  const { count, setOpen: openCart, ready } = useCart();
  const path = usePathname();
  const tree = buildTree(categories);

  const NAV = [
    { href: "/", label: "হোম" },
    { href: "/shop", label: "সব পণ্য" },
    ...pages.map((p) => ({ href: `/${p.slug}`, label: p.title })),
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
            {tree.length > 0 && <CategoryMega tree={tree} active={path.startsWith("/category/")} />}
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
          <nav className="-mx-2 flex flex-col gap-1 overflow-y-auto px-2">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className="block rounded-xl px-4 py-3 text-lg font-medium hover:bg-white">
                {n.label}
              </Link>
            ))}
            {tree.length > 0 && (
              <div className="mt-3 border-t border-brand-900/10 pt-3">
                <p className="px-4 pb-1 text-xs font-bold tracking-wider text-brand-900/40 uppercase">ক্যাটাগরি</p>
                {tree.map((n) => (
                  <MobileCat key={n.id} n={n} />
                ))}
              </div>
            )}
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

/** Desktop: hover/focus dropdown with every top-level category and its subcategories */
function CategoryMega({ tree, active }: { tree: Node<MenuCat>[]; active: boolean }) {
  const label = (c: MenuCat) => c.nameBn || c.name;
  return (
    <div className="group/mega relative">
      <Link
        href="/shop"
        aria-haspopup="true"
        className={cn("flex items-center gap-1 rounded-full px-4 py-2 text-[15px] font-medium transition hover:text-brand-800", active ? "text-brand-800" : "text-brand-900/75")}
      >
        ক্যাটাগরি <ChevronDown className="size-4 transition group-hover/mega:rotate-180" />
      </Link>
      <div className="invisible absolute top-full left-1/2 z-50 w-max max-w-[min(90vw,760px)] -translate-x-1/2 translate-y-2 pt-3 opacity-0 transition duration-200 group-focus-within/mega:visible group-focus-within/mega:translate-y-0 group-focus-within/mega:opacity-100 group-hover/mega:visible group-hover/mega:translate-y-0 group-hover/mega:opacity-100">
        <div className={cn("grid gap-2 rounded-3xl border border-brand-900/10 bg-white p-4 shadow-2xl shadow-brand-900/15", tree.length > 2 ? "grid-cols-3" : tree.length === 2 ? "grid-cols-2" : "grid-cols-1")}>
          {tree.map((n) => (
            <div key={n.id} className="min-w-52 rounded-2xl p-2 transition hover:bg-cream/70">
              <Link href={`/category/${n.slug}`} className="flex items-center gap-3">
                <span className="relative size-11 shrink-0 overflow-hidden rounded-xl bg-cream ring-1 ring-brand-900/5">{n.image && <Image src={n.image} alt="" fill sizes="44px" className="object-contain p-1" />}</span>
                <span className="font-semibold text-brand-900 hover:text-brand-700">{label(n)}</span>
              </Link>
              {n.children.length > 0 && (
                <ul className="mt-2 space-y-0.5 border-l-2 border-gold-200 pl-3">
                  {flatten(n.children).map((c) => (
                    <li key={c.id} style={{ paddingLeft: (c.depth - 1) * 12 }}>
                      <Link href={`/category/${c.slug}`} className="block rounded-md px-1.5 py-1 text-sm text-brand-900/70 transition hover:bg-white hover:text-brand-800">
                        {label(c)}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Mobile: expandable category tree */
function MobileCat({ n }: { n: Node<MenuCat> }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ paddingLeft: n.depth * 14 }}>
      <div className="flex items-center">
        <Link href={`/category/${n.slug}`} className="flex-1 rounded-xl px-4 py-2.5 font-medium hover:bg-white">
          {n.nameBn || n.name}
        </Link>
        {n.children.length > 0 && (
          <button onClick={() => setOpen((o) => !o)} className="grid size-10 place-items-center rounded-xl hover:bg-white" aria-label={open ? "Collapse" : "Expand"} aria-expanded={open}>
            <ChevronDown className={cn("size-4 transition", open && "rotate-180")} />
          </button>
        )}
      </div>
      {open && n.children.map((c) => <MobileCat key={c.id} n={c} />)}
    </div>
  );
}
