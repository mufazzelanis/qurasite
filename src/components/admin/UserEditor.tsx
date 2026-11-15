"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Check, Copy, Crown, Eye, EyeOff, KeyRound, Loader2, Shield, UserRound, Wand2, X } from "lucide-react";
import { toast } from "sonner";
import { saveUser } from "@/app/admin/actions";
import { ROLE_INFO, SECTION_INFO, SECTIONS, STAFF_TEMPLATES, type Section } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { Toggle } from "./fields";

type Role = "ADMIN" | "MANAGER" | "STAFF";
type EditUser = { id: string; name: string; email: string; phone: string | null; note: string | null; role: Role; permissions: string[]; active: boolean; passwordChangedAt: string | null };

const STAFF_SECTIONS = (Object.keys(SECTIONS) as Section[]).filter((s) => s !== "dashboard" && s !== "system");
const ROLE_ICON = { ADMIN: Crown, MANAGER: Shield, STAFF: UserRound } as const;

export function generatePassword(len = 14) {
  const sets = ["ABCDEFGHJKLMNPQRSTUVWXYZ", "abcdefghijkmnpqrstuvwxyz", "23456789", "@#$%&*!?"];
  const all = sets.join("");
  const r = crypto.getRandomValues(new Uint32Array(len));
  // one of each kind, then fill
  const chars = sets.map((s, i) => s[r[i] % s.length]);
  for (let i = sets.length; i < len; i++) chars.push(all[r[i] % all.length]);
  return chars.sort(() => (crypto.getRandomValues(new Uint8Array(1))[0] > 127 ? 1 : -1)).join("");
}

function strength(pw: string) {
  if (!pw) return { score: 0, label: "", color: "bg-zinc-200" };
  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 12) s++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  if (pw.length < 8) return { score: 1, label: "Too short", color: "bg-rose-500" };
  return s <= 2 ? { score: 2, label: "Weak", color: "bg-amber-500" } : s <= 3 ? { score: 3, label: "Good", color: "bg-lime-500" } : { score: 4, label: "Strong", color: "bg-emerald-500" };
}

/** Slide-over panel to create or edit a user */
export default function UserEditor({ user, isMe, onClose, onCreated }: { user: EditUser | null; isMe: boolean; onClose: () => void; onCreated: (c: { name: string; email: string; password: string }) => void }) {
  const [state, action] = useActionState(saveUser, null);
  const [role, setRole] = useState<Role>(user?.role ?? "STAFF");
  const [perms, setPerms] = useState<Set<string>>(new Set(user?.permissions.length ? user.permissions : ["orders", "customers"]));
  const [active, setActive] = useState(user?.active ?? true);
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(!user);
  const [changePw, setChangePw] = useState(!user);
  const submitted = useRef({ name: "", email: "", password: "" });
  const st = strength(password);

  // result of the server action
  useEffect(() => {
    if (!state) return;
    if (state.error) toast.error(state.error);
    else if (state.ok) {
      toast.success(state.ok);
      if (!user && submitted.current.password) onCreated(submitted.current);
      onClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  // Esc closes, page behind doesn't scroll
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", k);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const togglePerm = (s: string) => setPerms((p) => {
    const n = new Set(p);
    if (n.has(s)) n.delete(s);
    else n.add(s);
    return n;
  });
  const templateOn = (t: (typeof STAFF_TEMPLATES)[number]) => t.sections.length === perms.size && t.sections.every((s) => perms.has(s));

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label={user ? "Edit user" : "Add user"}>
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 animate-[fadeIn_.2s] bg-zinc-950/40 backdrop-blur-[2px]" />
      <form
        action={action}
        autoComplete="off"
        onSubmit={(e) => {
          const fd = new FormData(e.currentTarget);
          submitted.current = { name: String(fd.get("name")), email: String(fd.get("email")), password };
        }}
        className="relative flex h-full w-full max-w-xl animate-[slideIn_.25s_ease-out] flex-col bg-zinc-50 shadow-2xl"
      >
        <style>{`@keyframes slideIn{from{transform:translateX(100%)}to{transform:none}}@keyframes fadeIn{from{opacity:0}to{opacity:1}}`}</style>
        <input type="hidden" name="id" value={user?.id ?? ""} />
        <input type="hidden" name="role" value={role} />
        {active && <input type="hidden" name="active" value="on" />}
        {role === "STAFF" && [...perms].map((p) => <input key={p} type="hidden" name="permissions" value={p} />)}

        {/* header */}
        <header className="flex items-center gap-3 border-b border-zinc-200 bg-white px-6 py-4">
          <span className="grid size-10 place-items-center rounded-xl bg-brand-50 text-brand-700 ring-1 ring-brand-100">
            <UserRound className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold leading-tight">{user ? `Edit ${user.name}` : "Add a team member"}</h2>
            <p className="text-xs text-zinc-500">{user ? user.email : "They sign in at /admin with the email and password you set."}</p>
          </div>
          <button type="button" onClick={onClose} className="grid size-9 place-items-center rounded-xl text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700" aria-label="Close">
            <X className="size-5" />
          </button>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto p-6">
          {/* profile */}
          <Block title="Profile">
            <div className="grid gap-4 sm:grid-cols-2">
              <F label="Full name" required>
                <input name="name" required defaultValue={user?.name} autoComplete="off" className="a-input" placeholder="Rahim Uddin" />
              </F>
              <F label="Phone">
                <input name="phone" defaultValue={user?.phone ?? ""} autoComplete="off" inputMode="tel" className="a-input" placeholder="01XXXXXXXXX" />
              </F>
            </div>
            <F label="Email (used to sign in)" required>
              {/* name≠"email"-ish autocomplete hints stop Chrome filling the admin's own login here */}
              <input name="email" type="email" required defaultValue={user?.email} autoComplete="off" data-lpignore="true" className="a-input" placeholder="rahim@qurafood.com" />
            </F>
            <F label="Private note" hint="Only admins see this — shift, branch, etc.">
              <input name="note" defaultValue={user?.note ?? ""} autoComplete="off" className="a-input" placeholder="Morning shift · call center" />
            </F>
          </Block>

          {/* role */}
          <Block title="Role">
            <div className="grid gap-2 sm:grid-cols-3">
              {(Object.keys(ROLE_INFO) as Role[]).map((r) => {
                const Icon = ROLE_ICON[r];
                const on = role === r;
                const locked = isMe && r !== "ADMIN";
                return (
                  <button
                    key={r}
                    type="button"
                    disabled={locked}
                    onClick={() => setRole(r)}
                    title={locked ? "You cannot remove your own admin role" : undefined}
                    className={cn(
                      "relative rounded-2xl border-2 p-3 text-left transition disabled:cursor-not-allowed disabled:opacity-40",
                      on ? "border-brand-700 bg-brand-50/70 shadow-sm" : "border-zinc-200 bg-white hover:border-zinc-300",
                    )}
                  >
                    {on && (
                      <span className="absolute top-2.5 right-2.5 grid size-5 place-items-center rounded-full bg-brand-700 text-white">
                        <Check className="size-3" strokeWidth={3} />
                      </span>
                    )}
                    <Icon className={cn("size-5", on ? "text-brand-700" : "text-zinc-400")} />
                    <p className="mt-2 text-sm font-semibold">{ROLE_INFO[r].label}</p>
                    <p className="mt-0.5 text-xs leading-snug text-zinc-500">{ROLE_INFO[r].desc}</p>
                  </button>
                );
              })}
            </div>

            {role === "STAFF" && (
              <div className="space-y-3 rounded-2xl bg-white p-4 ring-1 ring-zinc-200">
                <div>
                  <p className="mb-2 text-xs font-semibold tracking-wide text-zinc-400 uppercase">Quick templates</p>
                  <div className="flex flex-wrap gap-2">
                    {STAFF_TEMPLATES.map((t) => (
                      <button
                        key={t.name}
                        type="button"
                        onClick={() => setPerms(new Set(t.sections))}
                        className={cn("rounded-full px-3 py-1.5 text-xs font-semibold ring-1 transition", templateOn(t) ? "bg-brand-800 text-white ring-brand-800" : "bg-white text-zinc-600 ring-zinc-200 hover:bg-zinc-50")}
                      >
                        {t.emoji} {t.name}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {STAFF_SECTIONS.map((s) => {
                    const on = perms.has(s);
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => togglePerm(s)}
                        aria-pressed={on}
                        className={cn("flex items-start gap-2.5 rounded-xl border p-2.5 text-left transition", on ? "border-brand-600 bg-brand-50/60" : "border-zinc-200 hover:bg-zinc-50")}
                      >
                        <span className={cn("mt-0.5 grid size-4 shrink-0 place-items-center rounded border", on ? "border-brand-700 bg-brand-700 text-white" : "border-zinc-300 bg-white")}>{on && <Check className="size-3" strokeWidth={3} />}</span>
                        <span className="min-w-0">
                          <span className="block text-sm font-medium leading-tight">{SECTIONS[s]}</span>
                          <span className="block text-[11px] leading-snug text-zinc-500">{SECTION_INFO[s]}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-zinc-400">Dashboard is always included. System settings are only for admins.</p>
              </div>
            )}
          </Block>

          {/* password */}
          <Block title={user ? "Password" : "Password"} hint={user?.passwordChangedAt ? `Last changed ${new Date(user.passwordChangedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}` : undefined}>
            {!changePw ? (
              <button type="button" onClick={() => setChangePw(true)} className="a-btn-light !rounded-xl">
                <KeyRound className="size-4" /> Set a new password
              </button>
            ) : (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      name="password"
                      type={showPw ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required={!user}
                      minLength={8}
                      autoComplete="new-password"
                      placeholder={user ? "New password" : "At least 8 characters"}
                      className="a-input !pr-20 font-mono"
                    />
                    <div className="absolute top-1/2 right-1.5 flex -translate-y-1/2 gap-0.5">
                      <IconBtn label={showPw ? "Hide" : "Show"} onClick={() => setShowPw((s) => !s)}>
                        {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </IconBtn>
                      {password && <CopyIcon text={password} />}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setPassword(generatePassword());
                      setShowPw(true);
                    }}
                    className="a-btn-light shrink-0 !rounded-xl"
                  >
                    <Wand2 className="size-4" /> Generate
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <div className="grid flex-1 grid-cols-4 gap-1">
                    {[1, 2, 3, 4].map((i) => (
                      <span key={i} className={cn("h-1.5 rounded-full transition", i <= st.score ? st.color : "bg-zinc-200")} />
                    ))}
                  </div>
                  <span className="w-16 text-right text-xs font-medium text-zinc-500">{st.label}</span>
                </div>
                {user && <p className="text-xs text-zinc-400">Leave empty to keep the current password.</p>}
              </div>
            )}
          </Block>

          {/* status */}
          <Block title="Access">
            {isMe ? (
              <p className="text-sm text-zinc-500">This is your own account — it always stays active.</p>
            ) : (
              <Toggle label="Can sign in" help={active ? "Account is active" : "Disabled — the user is signed out and blocked"} checked={active} onChange={setActive} />
            )}
          </Block>
        </div>

        {/* footer */}
        <footer className="flex items-center justify-between gap-3 border-t border-zinc-200 bg-white px-6 py-4">
          <p className="truncate text-xs text-zinc-500">
            {role === "STAFF" ? `${perms.size} section${perms.size === 1 ? "" : "s"} + dashboard` : ROLE_INFO[role].desc}
          </p>
          <div className="flex shrink-0 gap-2">
            <button type="button" onClick={onClose} className="a-btn-light !rounded-xl">
              Cancel
            </button>
            <Submit label={user ? "Save changes" : "Create user"} />
          </div>
        </footer>
      </form>
    </div>
  );
}

/** Shown once after creating a user or resetting a password */
export function CredentialsCard({ title, name, email, password, onClose }: { title: string; name: string; email: string; password: string; onClose: () => void }) {
  const url = typeof window !== "undefined" ? `${window.location.origin}/admin/login` : "/admin/login";
  const text = `Qura Food admin\nLogin: ${url}\nEmail: ${email}\nPassword: ${password}`;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4" role="dialog" aria-modal="true">
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 bg-zinc-950/50 backdrop-blur-sm" />
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="bg-gradient-to-br from-brand-800 to-brand-600 px-6 py-5 text-white">
          <KeyRound className="size-7 text-gold-300" />
          <h3 className="mt-2 text-lg font-bold">{title}</h3>
          <p className="text-sm text-white/75">Send these to {name}. The password is shown only once.</p>
        </div>
        <div className="space-y-2 p-6">
          <Cred label="Login page" value={url} />
          <Cred label="Email" value={email} />
          <Cred label="Password" value={password} mono />
          <div className="flex gap-2 pt-3">
            <CopyAll text={text} />
            <button type="button" onClick={onClose} className="a-btn-light !rounded-xl">
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ───────────────────────────────────────────── small pieces

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending} className="a-btn !rounded-xl px-5">
      {pending && <Loader2 className="size-4 animate-spin" />} {label}
    </button>
  );
}

function Block({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h3 className="text-xs font-bold tracking-wider text-zinc-500 uppercase">{title}</h3>
        {hint && <span className="text-xs text-zinc-400">{hint}</span>}
      </div>
      {children}
    </section>
  );
}

function F({ label, hint, required, children }: { label: string; hint?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1.5 block font-medium text-zinc-700">
        {label}
        {required && <span className="text-rose-500"> *</span>}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs text-zinc-400">{hint}</span>}
    </label>
  );
}

function IconBtn({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" title={label} aria-label={label} onClick={onClick} className="grid size-7 place-items-center rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700">
      {children}
    </button>
  );
}

function useCopy() {
  const [done, setDone] = useState(false);
  const copy = async (t: string) => {
    try {
      await navigator.clipboard.writeText(t);
      setDone(true);
      setTimeout(() => setDone(false), 1500);
    } catch {
      toast.error("Copy failed — select the text manually");
    }
  };
  return [done, copy] as const;
}

function CopyIcon({ text }: { text: string }) {
  const [done, copy] = useCopy();
  return (
    <IconBtn label="Copy" onClick={() => copy(text)}>
      {done ? <Check className="size-4 text-emerald-500" /> : <Copy className="size-4" />}
    </IconBtn>
  );
}

function Cred({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center gap-2 rounded-xl bg-zinc-50 px-3 py-2">
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold tracking-wide text-zinc-400 uppercase">{label}</p>
        <p className={cn("truncate text-sm font-semibold select-all", mono && "font-mono tracking-wide")}>{value}</p>
      </div>
      <CopyIcon text={value} />
    </div>
  );
}

function CopyAll({ text }: { text: string }) {
  const [done, copy] = useCopy();
  return (
    <button type="button" onClick={() => copy(text)} className="a-btn flex-1 justify-center !rounded-xl">
      {done ? <Check className="size-4" /> : <Copy className="size-4" />} {done ? "Copied!" : "Copy all details"}
    </button>
  );
}
