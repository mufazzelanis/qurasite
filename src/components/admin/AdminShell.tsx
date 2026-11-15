"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity, BarChart3, Bell, ChevronDown, ChevronsLeft, CreditCard, ExternalLink, FileText, Gauge, LayoutDashboard, LogOut, Menu, MessageSquareQuote,
  MonitorSmartphone, Package, PanelsTopLeft, Printer, Receipt, Search, Settings, ShieldAlert, ShoppingCart, Store, Tags, TicketPercent, UserCog, UserX, Users, X,
} from "lucide-react";
import { logoutAction } from "@/app/admin/actions";
import { can, type Section } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import LiveNotifier from "./LiveNotifier";

type Item = { href: string; label: string; icon: typeof Gauge; section: Section; badge?: number };
type Group = { title: string; items: Item[] };

export default function AdminShell({ admin, pending, children }: { admin: { name: string; email: string; role: string; permissions: string[] }; pending: number; children: React.ReactNode }) {
  const path = usePathname();
  const [mobile, setMobile] = useState(false);
  const [mini, setMini] = useState(false);
  const [q, setQ] = useState("");
  const [closed, setClosed] = useState<string[]>([]);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      setMini(localStorage.getItem("qf_admin_mini") === "1");
      setClosed(JSON.parse(localStorage.getItem("qf_admin_closed") || "[]"));
    } catch {}
    const k = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setMini(false);
        setTimeout(() => searchRef.current?.focus(), 50);
      }
    };
    addEventListener("keydown", k);
    return () => removeEventListener("keydown", k);
  }, []);
  useEffect(() => setMobile(false), [path]);

  const groups: Group[] = useMemo(
    () => [
      { title: "", items: [{ href: "/admin", label: "Dashboard", icon: LayoutDashboard, section: "dashboard" }] },
      {
        title: "Sales",
        items: [
          { href: "/admin/orders", label: "Orders", icon: ShoppingCart, section: "orders", badge: pending },
          { href: "/admin/incomplete", label: "Incomplete Orders", icon: UserX, section: "orders" },
          { href: "/admin/customers", label: "Customers", icon: Users, section: "customers" },
        ],
      },
      {
        title: "Main Site",
        items: [
          { href: "/admin/products", label: "Products", icon: Package, section: "products" },
          { href: "/admin/categories", label: "Categories", icon: Tags, section: "products" },
          { href: "/admin/main-site", label: "Main Site Settings", icon: Store, section: "mainsite" },
          { href: "/admin/payments", label: "Payments & Delivery", icon: CreditCard, section: "payments" },
        ],
      },
      {
        title: "Landing Pages",
        items: [
          { href: "/admin/visitors", label: "Live Visitors", icon: Activity, section: "visitors" },
          { href: "/admin/landing", label: "Landing Pages", icon: PanelsTopLeft, section: "landing" },
          { href: "/admin/pages", label: "Pages", icon: FileText, section: "landing" },
          { href: "/admin/landing-settings", label: "Landing Settings", icon: MonitorSmartphone, section: "landing" },
        ],
      },
      {
        title: "Marketing & Reports",
        items: [
          { href: "/admin/reports", label: "Sales Reports", icon: BarChart3, section: "reports" },
          { href: "/admin/coupons", label: "Coupons", icon: TicketPercent, section: "marketing" },
          { href: "/admin/reviews", label: "Reviews", icon: MessageSquareQuote, section: "marketing" },
          { href: "/admin/fraud", label: "Fraud Checker", icon: ShieldAlert, section: "reports" },
        ],
      },
      {
        title: "System",
        items: [
          { href: "/admin/sms", label: "Email, SMS & OTP", icon: Bell, section: "system" },
          { href: "/admin/invoice", label: "Invoice Settings", icon: Printer, section: "system" },
          { href: "/admin/pixel", label: "Facebook Pixel", icon: Gauge, section: "system" },
          { href: "/admin/users", label: "Users & Roles", icon: UserCog, section: "system" },
          { href: "/admin/activity", label: "Activity Log", icon: Receipt, section: "system" },
          { href: "/admin/settings", label: "General Settings", icon: Settings, section: "system" },
        ],
      },
    ],
    [pending],
  );

  const visible = groups
    .map((g) => ({ ...g, items: g.items.filter((i) => can(admin, i.section) && (!q || i.label.toLowerCase().includes(q.toLowerCase()))) }))
    .filter((g) => g.items.length);
  const isActive = (href: string) => (href === "/admin" ? path === "/admin" : path === href || path.startsWith(href + "/"));
  const current = groups.flatMap((g) => g.items).find((i) => isActive(i.href));

  const toggleGroup = (t: string) => {
    const n = closed.includes(t) ? closed.filter((x) => x !== t) : [...closed, t];
    setClosed(n);
    try {
      localStorage.setItem("qf_admin_closed", JSON.stringify(n));
    } catch {}
  };
  const toggleMini = () => {
    setMini((m) => {
      try {
        localStorage.setItem("qf_admin_mini", m ? "0" : "1");
      } catch {}
      return !m;
    });
  };

  const sidebar = (compact: boolean) => (
    <div className="flex h-full flex-col">
      <div className="flex h-16 shrink-0 items-center justify-between px-4">
        <Link href="/admin" className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-xl bg-white">
            <Image src="/brand/logo-icon-t.png" alt="" width={28} height={28} />
          </span>
          {!compact && (
            <span>
              <span className="block font-display font-extrabold leading-none text-white">Qura Food</span>
              <span className="text-[11px] text-white/50">Admin Console</span>
            </span>
          )}
        </Link>
        {!compact && (
          <button onClick={toggleMini} className="hidden text-white/50 hover:text-white lg:block" aria-label="Collapse sidebar">
            <ChevronsLeft className="size-4" />
          </button>
        )}
      </div>
      {!compact && (
        <div className="px-3 pb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/40" />
            <input ref={searchRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search menu..." className="w-full rounded-lg border border-white/10 bg-white/5 py-2 pl-9 pr-12 text-sm text-white placeholder:text-white/40 focus:border-gold-400" />
            <kbd className="absolute right-2 top-1/2 -translate-y-1/2 rounded border border-white/15 px-1.5 text-[10px] text-white/50">Ctrl K</kbd>
          </div>
        </div>
      )}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2 [scrollbar-width:thin]">
        {visible.map((g) => {
          const isClosed = !q && g.title && closed.includes(g.title);
          return (
            <div key={g.title || "root"} className="pb-1">
              {g.title && !compact && (
                <button onClick={() => toggleGroup(g.title)} className="flex w-full items-center justify-between px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-white/40 hover:text-white/70">
                  {g.title}
                  <ChevronDown className={cn("size-3.5 transition", isClosed && "-rotate-90")} />
                </button>
              )}
              {!isClosed &&
                g.items.map((n) => {
                  const active = isActive(n.href);
                  return (
                    <Link
                      key={n.href}
                      href={n.href}
                      title={compact ? n.label : undefined}
                      className={cn(
                        "relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                        compact && "justify-center",
                        active ? "bg-white/12 text-white before:absolute before:-left-3 before:top-2 before:h-[calc(100%-16px)] before:w-1 before:rounded-r before:bg-gold-400" : "text-white/70 hover:bg-white/5 hover:text-white",
                      )}
                    >
                      <n.icon className="size-[18px] shrink-0" />
                      {!compact && <span className="flex-1">{n.label}</span>}
                      {!!n.badge && <span className={cn("grid min-w-5 place-items-center rounded-full bg-rose-500 px-1.5 text-[11px] font-bold text-white", compact && "absolute right-1 top-1 min-w-4 px-1 text-[9px]")}>{n.badge}</span>}
                    </Link>
                  );
                })}
            </div>
          );
        })}
      </nav>
      <div className="space-y-1 border-t border-white/10 p-3">
        <Link href="/" target="_blank" className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white/70 hover:bg-white/5", compact && "justify-center")}>
          <ExternalLink className="size-[18px]" /> {!compact && "View store"}
        </Link>
        <form action={logoutAction}>
          <button className={cn("flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white/70 hover:bg-white/5", compact && "justify-center")}>
            <LogOut className="size-[18px]" /> {!compact && "Sign out"}
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-zinc-50 font-sans text-zinc-900">
      <aside className={cn("fixed inset-y-0 left-0 z-30 hidden bg-gradient-to-b from-brand-800 to-brand-950 transition-[width] duration-300 lg:block print:!hidden", mini ? "w-[76px]" : "w-64")}>{sidebar(mini)}</aside>
      <div className={cn("fixed inset-0 z-50 lg:hidden", mobile ? "visible" : "invisible")}>
        <div className={cn("absolute inset-0 bg-black/40 transition-opacity", mobile ? "opacity-100" : "opacity-0")} onClick={() => setMobile(false)} />
        <aside className={cn("absolute inset-y-0 left-0 w-72 bg-gradient-to-b from-brand-800 to-brand-950 transition-transform", mobile ? "translate-x-0" : "-translate-x-full")}>{sidebar(false)}</aside>
      </div>
      <div className={cn("transition-[padding] duration-300 print:!pl-0", mini ? "lg:pl-[76px]" : "lg:pl-64")}>
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-zinc-200 bg-white/85 px-4 backdrop-blur sm:px-6 print:!hidden">
          <div className="flex items-center gap-3">
            <button className="grid size-9 place-items-center rounded-lg border border-zinc-200 lg:hidden" onClick={() => setMobile(true)} aria-label="Menu">
              {mobile ? <X className="size-4" /> : <Menu className="size-4" />}
            </button>
            <button className="hidden size-9 place-items-center rounded-lg border border-zinc-200 lg:grid" onClick={toggleMini} aria-label="Toggle sidebar">
              <PanelsTopLeft className="size-4" />
            </button>
            <span className="text-sm text-zinc-500">{current ? current.label : "Welcome back 👋"}</span>
          </div>
          <div className="flex items-center gap-3">
            <LiveNotifier />
            <div className="text-right text-sm">
              <p className="font-semibold leading-tight">{admin.name}</p>
              <p className="text-xs text-zinc-500">{admin.role === "ADMIN" ? "Super Admin" : admin.role === "MANAGER" ? "Manager" : "Staff"}</p>
            </div>
            <span className="grid size-9 place-items-center rounded-full bg-brand-700 text-sm font-bold text-white">{admin.name[0]}</span>
          </div>
        </header>
        <main className="p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
