"use client";
import { useEffect, useMemo, useState, useTransition } from "react";
import {
  Ban,
  CheckCircle2,
  Clock,
  Crown,
  KeyRound,
  Lock,
  LogOut,
  Monitor,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  ShieldX,
  Smartphone,
  Trash2,
  Unlock,
  UserCheck,
  UserCog,
  Users,
  Wifi,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { deleteUser, resetUserPassword, revokeUserSessions, toggleUserActive, unlockUser } from "@/app/admin/actions";
import { ROLE_INFO, SECTIONS, type Section } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import Dropdown from "./Dropdown";
import UserEditor from "./UserEditor";
import { CredentialsCard } from "./UserEditor";

export type UserRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  note: string | null;
  role: "ADMIN" | "MANAGER" | "STAFF";
  permissions: string[];
  active: boolean;
  lastLoginAt: string | null;
  lastLoginIp: string | null;
  lastSeenAt: string | null;
  lockedUntil: string | null;
  failedLogins: number;
  passwordChangedAt: string | null;
  createdAt: string;
  actions30d: number;
};
export type LoginRow = { id: string; email: string; ok: boolean; reason: string | null; ip: string | null; userAgent: string | null; createdAt: string; name: string | null };

const ONLINE_MS = 5 * 60_000;
const ROLE_STYLE = {
  ADMIN: "bg-violet-50 text-violet-700 ring-violet-200",
  MANAGER: "bg-sky-50 text-sky-700 ring-sky-200",
  STAFF: "bg-amber-50 text-amber-700 ring-amber-200",
} as const;
const AVATAR = ["from-emerald-400 to-teal-600", "from-violet-400 to-purple-600", "from-amber-400 to-orange-600", "from-sky-400 to-blue-600", "from-rose-400 to-pink-600", "from-lime-400 to-green-600"];

export const avatarGradient = (s: string) => AVATAR[[...s].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR.length];
export const initials = (n: string) =>
  n
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("") || "?";

export function timeAgo(iso: string | null, now: number) {
  if (!iso) return "never";
  const s = Math.max(0, Math.round((now - +new Date(iso)) / 1000));
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  return d < 30 ? `${d} day${d > 1 ? "s" : ""} ago` : new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

const device = (ua: string | null) => {
  if (!ua) return { mobile: false, label: "Unknown" };
  const mobile = /Mobile|Android|iPhone|iPad/i.test(ua);
  const browser = /Edg\//.test(ua) ? "Edge" : /OPR\//.test(ua) ? "Opera" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "Browser";
  const os = /Windows/.test(ua) ? "Windows" : /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iOS" : /Mac OS/.test(ua) ? "macOS" : /Linux/.test(ua) ? "Linux" : "";
  return { mobile, label: [browser, os].filter(Boolean).join(" · ") };
};

const FILTERS = [
  ["all", "All"],
  ["ADMIN", "Admins"],
  ["MANAGER", "Managers"],
  ["STAFF", "Staff"],
  ["online", "Online"],
  ["disabled", "Disabled"],
] as const;

export default function UsersManager({ users, logins, failed24h, meId }: { users: UserRow[]; logins: LoginRow[]; failed24h: number; meId: string }) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number][0]>("all");
  const [editing, setEditing] = useState<UserRow | "new" | null>(null);
  const [creds, setCreds] = useState<{ name: string; email: string; password: string; title: string } | null>(null);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  const online = (u: UserRow) => u.active && !!u.lastSeenAt && now - +new Date(u.lastSeenAt) < ONLINE_MS;
  const match: Record<string, (u: UserRow) => boolean> = {
    all: () => true,
    ADMIN: (u) => u.role === "ADMIN",
    MANAGER: (u) => u.role === "MANAGER",
    STAFF: (u) => u.role === "STAFF",
    online,
    disabled: (u) => !u.active,
  };
  const searched = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? users.filter((u) => [u.name, u.email, u.phone].some((v) => v?.toLowerCase().includes(s))) : users;
  }, [q, users]);
  const list = searched.filter(match[filter]);

  const stats = {
    total: users.length,
    active: users.filter((u) => u.active).length,
    online: users.filter(online).length,
    admins: users.filter((u) => u.role === "ADMIN" && u.active).length,
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Users & Roles</h1>
          <p className="mt-1 text-sm text-zinc-500">Who can open the admin panel, what they can do, and when they signed in.</p>
        </div>
        <button onClick={() => setEditing("new")} className="a-btn !rounded-xl shadow-lg shadow-brand-900/20">
          <Plus className="size-4" /> Add user
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi icon={Users} label="Team members" value={stats.total} sub={`${stats.active} active · ${stats.total - stats.active} disabled`} />
        <Kpi icon={Wifi} label="Online now" value={stats.online} sub="active in the last 5 min" tone="emerald" pulse={stats.online > 0} />
        <Kpi icon={Crown} label="Admins" value={stats.admins} sub={stats.admins > 3 ? "Consider fewer admins" : "Full-access accounts"} tone="violet" />
        <Kpi icon={ShieldX} label="Failed sign-ins" value={failed24h} sub="in the last 24 hours" tone={failed24h >= 5 ? "rose" : "zinc"} />
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        {/* ── user list ── */}
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-zinc-200/70 bg-white p-2 shadow-sm">
            <label className="relative min-w-52 flex-1">
              <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email or phone…" className="w-full rounded-xl bg-zinc-50 py-2 pr-3 pl-9 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-brand-600/15" />
            </label>
            <div className="flex gap-1 overflow-x-auto">
              {FILTERS.map(([k, l]) => {
                const n = searched.filter(match[k]).length;
                return (
                  <button key={k} onClick={() => setFilter(k)} className={cn("flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition", filter === k ? "bg-brand-800 text-white" : "text-zinc-600 hover:bg-zinc-100")}>
                    {l}
                    <span className={cn("rounded-full px-1.5 text-xs tabular-nums", filter === k ? "bg-white/20" : "bg-zinc-100 text-zinc-500")}>{n}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-3">
            {list.map((u) => (
              <UserCard key={u.id} u={u} me={u.id === meId} online={online(u)} now={now} onEdit={() => setEditing(u)} onCreds={setCreds} />
            ))}
            {!list.length && (
              <div className="grid place-items-center rounded-2xl border border-dashed border-zinc-300 bg-white py-14 text-center">
                <Users className="size-8 text-zinc-300" />
                <p className="mt-2 font-semibold">No users match</p>
                <p className="text-sm text-zinc-500">Try another search or filter.</p>
              </div>
            )}
          </div>
        </div>

        {/* ── side panels ── */}
        <aside className="space-y-6 xl:sticky xl:top-6">
          <Panel icon={ShieldCheck} title="What each role can open">
            <div className="-mx-1 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[11px] tracking-wide text-zinc-400 uppercase">
                    <th className="px-1 pb-2 text-left font-semibold">Section</th>
                    {(["ADMIN", "MANAGER", "STAFF"] as const).map((r) => (
                      <th key={r} className="px-1 pb-2 text-center font-semibold">
                        {ROLE_INFO[r].label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {(Object.keys(SECTIONS) as Section[]).map((s) => (
                    <tr key={s}>
                      <td className="px-1 py-1.5 text-zinc-600">{SECTIONS[s].replace(/ \(.*\)/, "")}</td>
                      <td className="px-1 text-center">
                        <Yes />
                      </td>
                      <td className="px-1 text-center">{s === "system" ? <No /> : <Yes />}</td>
                      <td className="px-1 text-center">{s === "dashboard" ? <Yes /> : s === "system" ? <No /> : <span className="text-[11px] font-medium text-amber-600">choose</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

          <Panel icon={Clock} title="Recent sign-ins">
            <ul className="-mx-1 max-h-[420px] space-y-0.5 overflow-y-auto pr-1">
              {logins.map((l) => {
                const d = device(l.userAgent);
                return (
                  <li key={l.id} className="flex items-start gap-2.5 rounded-xl px-1 py-2">
                    <span className={cn("mt-0.5 grid size-7 shrink-0 place-items-center rounded-full", l.ok ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600")}>
                      {l.ok ? <CheckCircle2 className="size-4" /> : <XCircle className="size-4" />}
                    </span>
                    <div className="min-w-0 flex-1 text-sm">
                      <p className="truncate font-medium">{l.name ?? l.email}</p>
                      <p className={cn("truncate text-xs", l.ok ? "text-zinc-400" : "text-rose-500")}>{l.ok ? "Signed in" : l.reason || "Failed"}</p>
                      <p className="flex items-center gap-1 truncate text-[11px] text-zinc-400">
                        {d.mobile ? <Smartphone className="size-3" /> : <Monitor className="size-3" />} {d.label} · {l.ip}
                      </p>
                    </div>
                    <span className="shrink-0 text-[11px] text-zinc-400">{timeAgo(l.createdAt, now)}</span>
                  </li>
                );
              })}
              {!logins.length && <li className="py-6 text-center text-sm text-zinc-400">No sign-ins recorded yet</li>}
            </ul>
          </Panel>
        </aside>
      </div>

      {editing && (
        <UserEditor
          user={editing === "new" ? null : editing}
          isMe={editing !== "new" && editing.id === meId}
          onClose={() => setEditing(null)}
          onCreated={(c) => setCreds({ ...c, title: "User created" })}
        />
      )}
      {creds && <CredentialsCard {...creds} onClose={() => setCreds(null)} />}
    </div>
  );
}

// ───────────────────────────────────────────── user card

function UserCard({ u, me, online, now, onEdit, onCreds }: { u: UserRow; me: boolean; online: boolean; now: number; onEdit: () => void; onCreds: (c: { name: string; email: string; password: string; title: string }) => void }) {
  const [pending, start] = useTransition();
  const run = (fn: (fd: FormData) => Promise<{ ok?: string; error?: string; password?: string }>, confirmText?: string) => {
    if (confirmText && !window.confirm(confirmText)) return;
    const fd = new FormData();
    fd.set("id", u.id);
    start(async () => {
      const r = await fn(fd);
      if (r.error) toast.error(r.error);
      else {
        toast.success(r.ok);
        if (r.password) onCreds({ name: u.name, email: u.email, password: r.password, title: "New password" });
      }
    });
  };
  const access = u.role === "ADMIN" ? "Full access" : u.role === "MANAGER" ? "Everything except system" : null;
  const item = "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-100";

  return (
    <article className={cn("group rounded-2xl border bg-white p-4 shadow-sm transition hover:shadow-md", u.active ? "border-zinc-200/70" : "border-dashed border-zinc-300 bg-zinc-50/50", pending && "opacity-60")}>
      <div className="flex flex-wrap items-start gap-4">
        {/* avatar */}
        <div className="relative">
          <span className={cn("grid size-12 place-items-center rounded-2xl bg-gradient-to-br text-base font-bold text-white shadow-md", avatarGradient(u.email), !u.active && "grayscale")}>{initials(u.name)}</span>
          {online && (
            <span className="absolute -right-0.5 -bottom-0.5 flex size-3.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex size-3.5 rounded-full border-2 border-white bg-emerald-500" />
            </span>
          )}
        </div>

        {/* identity */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-semibold">{u.name}</p>
            {me && <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-700 ring-1 ring-brand-100">You</span>}
            <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-bold ring-1", ROLE_STYLE[u.role])}>{ROLE_INFO[u.role].label}</span>
            {!u.active && <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-[11px] font-semibold text-zinc-600">Disabled</span>}
            {u.lockedUntil && (
              <span className="flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-600 ring-1 ring-rose-200">
                <Lock className="size-3" /> Locked
              </span>
            )}
          </div>
          <p className="truncate text-sm text-zinc-500">
            {u.email}
            {u.phone && <span className="text-zinc-400"> · {u.phone}</span>}
          </p>
          {u.note && <p className="mt-1 line-clamp-1 text-xs text-zinc-400 italic">“{u.note}”</p>}
        </div>

        {/* actions */}
        <div className="flex items-center gap-1.5">
          <button onClick={onEdit} className="a-btn-light !rounded-xl !py-1.5">
            <Pencil className="size-3.5" /> Edit
          </button>
          <Dropdown className="relative [&[open]>summary]:bg-zinc-100" summaryClassName="a-btn-light cursor-pointer list-none !rounded-xl !px-2 !py-1.5 [&::-webkit-details-marker]:hidden" summary={<MoreHorizontal className="size-4" aria-label="More actions" />}>
            <div className="absolute right-0 z-20 mt-2 w-60 rounded-xl border border-zinc-200 bg-white p-1.5 shadow-xl shadow-zinc-900/10">
              <button className={item} onClick={() => run(resetUserPassword, `Reset ${u.name}'s password? A new one is generated and they are signed out everywhere.`)}>
                <KeyRound className="size-4 text-zinc-400" /> Reset password
              </button>
              <button className={item} onClick={() => run(revokeUserSessions, me ? "Sign yourself out of every device (including this one)?" : `Sign ${u.name} out of every device?`)}>
                <LogOut className="size-4 text-zinc-400" /> Sign out everywhere
              </button>
              {u.lockedUntil && (
                <button className={item} onClick={() => run(unlockUser)}>
                  <Unlock className="size-4 text-zinc-400" /> Unlock account
                </button>
              )}
              {!me && (
                <>
                  <button className={item} onClick={() => run(toggleUserActive, u.active ? `Disable ${u.name}? They are signed out and can't log in.` : undefined)}>
                    {u.active ? <Ban className="size-4 text-zinc-400" /> : <UserCheck className="size-4 text-zinc-400" />} {u.active ? "Disable account" : "Enable account"}
                  </button>
                  <div className="my-1 border-t border-zinc-100" />
                  <button className={cn(item, "!text-rose-600 hover:!bg-rose-50")} onClick={() => run(deleteUser, `Delete ${u.name} permanently? Their activity log stays.`)}>
                    <Trash2 className="size-4" /> Delete user
                  </button>
                </>
              )}
            </div>
          </Dropdown>
        </div>
      </div>

      {/* access + activity */}
      <div className="mt-4 grid gap-3 border-t border-zinc-100 pt-3 sm:grid-cols-[minmax(0,1fr)_auto]">
        <div className="flex flex-wrap items-center gap-1.5">
          {access ? (
            <span className="flex items-center gap-1.5 text-xs font-medium text-zinc-600">
              <UserCog className="size-3.5 text-zinc-400" /> {access}
            </span>
          ) : (
            u.permissions.map((p) => (
              <span key={p} className="rounded-md bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-600">
                {SECTIONS[p as Section]?.replace(/ \(.*\)/, "") ?? p}
              </span>
            ))
          )}
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-500">
          <span className="flex items-center gap-1" title={u.lastSeenAt ? new Date(u.lastSeenAt).toLocaleString() : ""}>
            <span className={cn("size-1.5 rounded-full", online ? "bg-emerald-500" : "bg-zinc-300")} />
            {online ? "Online now" : `Active ${timeAgo(u.lastSeenAt, now)}`}
          </span>
          <span title={u.lastLoginIp ?? ""}>Login {timeAgo(u.lastLoginAt, now)}</span>
          <span>{u.actions30d} actions / 30d</span>
        </div>
      </div>
    </article>
  );
}

// ───────────────────────────────────────────── small pieces

const TONE = {
  brand: "bg-brand-50 text-brand-700 ring-brand-100",
  emerald: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  violet: "bg-violet-50 text-violet-700 ring-violet-100",
  rose: "bg-rose-50 text-rose-700 ring-rose-100",
  zinc: "bg-zinc-50 text-zinc-600 ring-zinc-200",
} as const;

function Kpi({ icon: Icon, label, value, sub, tone = "brand", pulse }: { icon: typeof Users; label: string; value: number; sub: string; tone?: keyof typeof TONE; pulse?: boolean }) {
  return (
    <div className="rounded-2xl border border-zinc-200/70 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <span className={cn("relative grid size-10 shrink-0 place-items-center rounded-xl ring-1", TONE[tone])}>
          <Icon className="size-5" />
          {pulse && <span className="absolute -top-0.5 -right-0.5 size-2.5 animate-pulse rounded-full bg-emerald-500 ring-2 ring-white" />}
        </span>
        <div>
          <p className="text-xs font-medium tracking-wide text-zinc-500 uppercase">{label}</p>
          <p className="text-2xl font-bold tabular-nums">{value}</p>
        </div>
      </div>
      <p className="mt-2 truncate text-xs text-zinc-500">{sub}</p>
    </div>
  );
}

function Panel({ icon: Icon, title, children }: { icon: typeof Users; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-zinc-200/70 bg-white shadow-sm">
      <header className="flex items-center gap-2.5 border-b border-zinc-100 px-4 py-3">
        <Icon className="size-4 text-brand-600" />
        <h2 className="text-sm font-semibold">{title}</h2>
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}

const Yes = () => <CheckCircle2 className="mx-auto size-4 text-emerald-500" />;
const No = () => <XCircle className="mx-auto size-4 text-zinc-300" />;
