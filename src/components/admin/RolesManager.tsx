"use client";
import { useMemo, useState, useTransition } from "react";
import { Check, Crown, Info, Loader2, Lock, Minus, Plus, Save, ShieldCheck, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { deleteRole, saveRole } from "@/app/admin/actions";
import { ACTIONS, ACTION_LABEL, MODULES, ROLE_COLORS, SECTION_KEYS, type Action, type Section } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { permissionSummary, roleStyle } from "./roleStyle";

export type RoleRow = { id: string; name: string; description: string | null; color: string; permissions: string[]; users: number };
type Me = { superAdmin: boolean; permissions: string[]; canCreate: boolean; canEdit: boolean; canDelete: boolean };

const GROUPS = [...new Set(SECTION_KEYS.map((s) => MODULES[s].group))];
const key = (s: Section, a: Action) => `${s}.${a}`;

export default function RolesManager({ roles, me }: { roles: RoleRow[]; me: Me }) {
  const [selected, setSelected] = useState<string | "new" | "super">(roles[0]?.id ?? "super");
  const current = roles.find((r) => r.id === selected);

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
      {/* ── role list ── */}
      <aside className="space-y-2 xl:sticky xl:top-6">
        <button onClick={() => setSelected("super")} className={cn("flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition", selected === "super" ? "border-brand-700 bg-brand-50/60 shadow-sm" : "border-zinc-200 bg-white hover:border-zinc-300")}>
          <span className="grid size-10 place-items-center rounded-xl bg-brand-800 text-gold-300">
            <Crown className="size-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-semibold">Super Admin</span>
            <span className="block text-xs text-zinc-500">Everything · can’t be changed</span>
          </span>
          <Lock className="size-4 text-zinc-300" />
        </button>
        {roles.map((r) => {
          const st = roleStyle(r.color);
          return (
            <button key={r.id} onClick={() => setSelected(r.id)} className={cn("flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition", selected === r.id ? "border-brand-700 bg-brand-50/60 shadow-sm" : "border-zinc-200 bg-white hover:border-zinc-300")}>
              <span className={cn("grid size-10 place-items-center rounded-xl text-sm font-bold ring-1", st.badge)}>{r.name.slice(0, 2).toUpperCase()}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{r.name}</span>
                <span className="block text-xs text-zinc-500">
                  {r.permissions.length} permissions · {r.users} user{r.users === 1 ? "" : "s"}
                </span>
              </span>
            </button>
          );
        })}
        {me.canCreate && (
          <button onClick={() => setSelected("new")} className={cn("flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-3 text-sm font-semibold transition", selected === "new" ? "border-brand-600 bg-brand-50 text-brand-800" : "border-zinc-300 text-zinc-500 hover:border-brand-300 hover:text-brand-700")}>
            <Plus className="size-4" /> New role
          </button>
        )}
      </aside>

      {/* ── editor ── */}
      {selected === "super" ? (
        <SuperAdminCard />
      ) : (
        <RoleEditor key={selected} role={selected === "new" ? null : (current ?? null)} me={me} onSaved={(id) => setSelected(id)} onDeleted={() => setSelected(roles.find((r) => r.id !== selected)?.id ?? "super")} />
      )}
    </div>
  );
}

function SuperAdminCard() {
  return (
    <section className="rounded-2xl border border-zinc-200/70 bg-white p-6 shadow-sm">
      <div className="flex items-start gap-4">
        <span className="grid size-14 place-items-center rounded-2xl bg-brand-800 text-gold-300 shadow-lg shadow-brand-900/20">
          <Crown className="size-7" />
        </span>
        <div>
          <h2 className="text-xl font-bold">Super Admin</h2>
          <p className="mt-1 text-sm text-zinc-500">Owner-level access to every section and action, including users, roles and system settings. Keep this to 1–2 trusted people.</p>
        </div>
      </div>
      <ul className="mt-5 grid gap-2 text-sm sm:grid-cols-2">
        {["All sections — view, create, edit, delete, export", "Create and edit roles", "Make other users Super Admin", "Can’t be locked out: the last Super Admin can’t be removed"].map((t) => (
          <li key={t} className="flex gap-2 rounded-xl bg-zinc-50 p-3">
            <ShieldCheck className="size-4 shrink-0 text-emerald-600" /> {t}
          </li>
        ))}
      </ul>
    </section>
  );
}

function RoleEditor({ role, me, onSaved, onDeleted }: { role: RoleRow | null; me: Me; onSaved: (id: string) => void; onDeleted: () => void }) {
  const [name, setName] = useState(role?.name ?? "");
  const [description, setDescription] = useState(role?.description ?? "");
  const [color, setColor] = useState(role?.color ?? "emerald");
  const [perms, setPerms] = useState<Set<string>>(new Set(role?.permissions ?? ["orders.view"]));
  const [pending, start] = useTransition();
  const editable = role ? me.canEdit : me.canCreate;
  // a non-super admin can only grant what they have
  const grantable = (p: string) => me.superAdmin || me.permissions.includes(p);
  const initial = JSON.stringify({ n: role?.name ?? "", d: role?.description ?? "", c: role?.color ?? "emerald", p: [...(role?.permissions ?? ["orders.view"])].sort() });
  const dirty = JSON.stringify({ n: name, d: description, c: color, p: [...perms].sort() }) !== initial;

  const toggle = (p: string, on?: boolean) =>
    setPerms((old) => {
      const n = new Set(old);
      const [s, a] = p.split(".");
      const want = on ?? !n.has(p);
      if (want) {
        n.add(p);
        if (a !== "view") n.add(`${s}.view`); // any action needs view
      } else {
        n.delete(p);
        if (a === "view") (MODULES[s as Section].actions as readonly Action[]).forEach((x) => n.delete(`${s}.${x}`)); // no view → nothing
      }
      return n;
    });
  const rowAll = (s: Section) => (MODULES[s].actions as readonly Action[]).every((a) => perms.has(key(s, a)));
  const setRow = (s: Section, on: boolean) => (MODULES[s].actions as readonly Action[]).forEach((a) => grantable(key(s, a)) && toggle(key(s, a), on));
  const colAll = (a: Action) => SECTION_KEYS.filter((s) => (MODULES[s].actions as readonly Action[]).includes(a)).every((s) => perms.has(key(s, a)));
  const setCol = (a: Action, on: boolean) => SECTION_KEYS.filter((s) => (MODULES[s].actions as readonly Action[]).includes(a)).forEach((s) => grantable(key(s, a)) && toggle(key(s, a), on));

  const summary = useMemo(() => permissionSummary([...perms]), [perms]);

  const save = () =>
    start(async () => {
      const r = await saveRole(role?.id ?? null, { name, description, color, permissions: [...perms] });
      if (r.error) return void toast.error(r.error);
      toast.success(r.ok);
      onSaved(r.id!);
    });
  const remove = () => {
    if (!role || !window.confirm(`Delete the role “${role.name}”?`)) return;
    start(async () => {
      const r = await deleteRole(role.id);
      if (r.error) return void toast.error(r.error);
      toast.success(r.ok);
      onDeleted();
    });
  };

  return (
    <section className="rounded-2xl border border-zinc-200/70 bg-white shadow-sm">
      {/* header */}
      <div className="space-y-4 border-b border-zinc-100 p-5">
        <div className="flex flex-wrap items-start gap-3">
          <span className={cn("grid size-12 shrink-0 place-items-center rounded-2xl text-base font-bold ring-1", roleStyle(color).badge)}>{(name || "R").slice(0, 2).toUpperCase()}</span>
          <div className="min-w-0 flex-1 space-y-2">
            <input value={name} onChange={(e) => setName(e.target.value)} disabled={!editable} placeholder="Role name, e.g. Call Center" className="w-full border-0 bg-transparent text-xl font-bold outline-none placeholder:text-zinc-300 disabled:text-zinc-700" />
            <input value={description} onChange={(e) => setDescription(e.target.value)} disabled={!editable} placeholder="What this role is for (optional)" className="w-full rounded-lg bg-zinc-50 px-3 py-1.5 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-brand-600/15" />
          </div>
          {role && (
            <span className="flex items-center gap-1.5 rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-600">
              <Users className="size-3.5" /> {role.users} user{role.users === 1 ? "" : "s"}
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-zinc-500">Color</span>
          {ROLE_COLORS.map((c) => (
            <button key={c} type="button" disabled={!editable} onClick={() => setColor(c)} aria-label={c} className={cn("size-6 rounded-full ring-2 ring-offset-2 transition", roleStyle(c).dot, color === c ? "ring-zinc-800" : "ring-transparent hover:ring-zinc-300")} />
          ))}
        </div>
      </div>

      {/* matrix */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="sticky top-0 bg-zinc-50/90 backdrop-blur">
            <tr>
              <th className="px-5 py-3 text-left text-xs font-semibold tracking-wide text-zinc-500 uppercase">Section</th>
              {ACTIONS.map((a) => (
                <th key={a} className="px-2 py-3 text-center">
                  <button type="button" disabled={!editable} onClick={() => setCol(a, !colAll(a))} className="rounded-md px-1.5 py-0.5 text-xs font-semibold tracking-wide text-zinc-500 uppercase hover:bg-zinc-200/70 disabled:hover:bg-transparent" title={`Toggle ${ACTION_LABEL[a]} for every section`}>
                    {ACTION_LABEL[a]}
                  </button>
                </th>
              ))}
              <th className="px-3 py-3 text-center text-xs font-semibold tracking-wide text-zinc-500 uppercase">All</th>
            </tr>
          </thead>
          <tbody>
            {GROUPS.map((g) => (
              <Group key={g} title={g}>
                {SECTION_KEYS.filter((s) => MODULES[s].group === g).map((s) => {
                  const m = MODULES[s] as { label: string; desc: string; actions: readonly Action[]; hints?: Partial<Record<Action, string>> };
                  const always = s === "dashboard";
                  return (
                    <tr key={s} className="border-t border-zinc-100 hover:bg-zinc-50/50">
                      <td className="px-5 py-2.5">
                        <p className="font-medium text-zinc-800">{m.label}</p>
                        <p className="text-xs text-zinc-400">{m.desc}</p>
                      </td>
                      {ACTIONS.map((a) => {
                        if (!m.actions.includes(a)) return <td key={a} className="text-center text-zinc-200">—</td>;
                        const p = key(s, a);
                        const on = always || perms.has(p);
                        const lockedOut = !grantable(p) && !on;
                        return (
                          <td key={a} className="px-2 text-center">
                            <button
                              type="button"
                              disabled={!editable || always || lockedOut}
                              onClick={() => toggle(p)}
                              title={always ? "Everyone can see the dashboard" : lockedOut ? "You don't have this permission yourself" : m.hints?.[a] ?? `${ACTION_LABEL[a]} ${m.label}`}
                              aria-pressed={on}
                              className={cn(
                                "mx-auto grid size-7 place-items-center rounded-lg border-2 transition",
                                on ? (a === "delete" ? "border-rose-500 bg-rose-500 text-white" : "border-brand-700 bg-brand-700 text-white") : "border-zinc-200 bg-white hover:border-zinc-400",
                                (always || lockedOut) && "cursor-not-allowed opacity-50",
                              )}
                            >
                              {on && <Check className="size-4" strokeWidth={3} />}
                            </button>
                          </td>
                        );
                      })}
                      <td className="px-3 text-center">
                        {!always && (
                          <button type="button" disabled={!editable} onClick={() => setRow(s, !rowAll(s))} className={cn("mx-auto grid size-7 place-items-center rounded-lg transition", rowAll(s) ? "bg-brand-100 text-brand-800" : perms.has(key(s, "view")) ? "bg-amber-50 text-amber-600" : "bg-zinc-100 text-zinc-400")} title="Toggle the whole row">
                            {rowAll(s) ? <Check className="size-4" strokeWidth={3} /> : perms.has(key(s, "view")) ? <Minus className="size-4" strokeWidth={3} /> : <Plus className="size-4" />}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </Group>
            ))}
          </tbody>
        </table>
      </div>

      {/* summary + footer */}
      <div className="border-t border-zinc-100 p-5">
        <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-zinc-400 uppercase">
          <Info className="size-3.5" /> Users with this role can
        </p>
        <div className="flex flex-wrap gap-1.5">
          <span className="rounded-lg bg-zinc-100 px-2 py-1 text-xs text-zinc-600">Dashboard: View</span>
          {summary
            .filter((x) => x.section !== "dashboard")
            .map((x) => (
              <span key={x.section} className={cn("rounded-lg px-2 py-1 text-xs", x.full ? "bg-brand-50 text-brand-800" : "bg-zinc-100 text-zinc-600")}>
                <b className="font-semibold">{x.label}:</b> {x.full ? "Full access" : x.text}
              </span>
            ))}
        </div>
      </div>
      <footer className="flex flex-wrap items-center gap-2 border-t border-zinc-100 bg-zinc-50/60 px-5 py-3">
        {editable ? (
          <button onClick={save} disabled={pending || !dirty || !name.trim()} className="a-btn !rounded-xl">
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} {role ? "Save role" : "Create role"}
          </button>
        ) : (
          <span className="flex items-center gap-1.5 text-xs text-zinc-500">
            <Lock className="size-3.5" /> View only — you can’t edit roles
          </span>
        )}
        {dirty && <span className="text-xs font-medium text-amber-600">● Unsaved</span>}
        {role && me.canDelete && (
          <button onClick={remove} disabled={pending} className="a-btn-light ml-auto !rounded-xl !text-rose-600 hover:!bg-rose-50" title={role.users ? "Move its users to another role first" : "Delete role"}>
            <Trash2 className="size-4" /> Delete
          </button>
        )}
      </footer>
    </section>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <>
      <tr>
        <td colSpan={ACTIONS.length + 2} className="bg-zinc-50/60 px-5 pt-4 pb-1.5 text-[11px] font-bold tracking-wider text-zinc-400 uppercase">
          {title}
        </td>
      </tr>
      {children}
    </>
  );
}
