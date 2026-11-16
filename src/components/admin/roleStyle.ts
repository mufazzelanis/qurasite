import { ACTION_LABEL, MODULES, SECTION_KEYS, type Action, type Section } from "@/lib/permissions";

/** Badge / dot colors per role color (full class names so Tailwind keeps them) */
export const ROLE_STYLE: Record<string, { badge: string; dot: string; soft: string }> = {
  brand: { badge: "bg-brand-800 text-white ring-brand-800", dot: "bg-brand-700", soft: "bg-brand-50" },
  emerald: { badge: "bg-emerald-50 text-emerald-700 ring-emerald-200", dot: "bg-emerald-500", soft: "bg-emerald-50" },
  sky: { badge: "bg-sky-50 text-sky-700 ring-sky-200", dot: "bg-sky-500", soft: "bg-sky-50" },
  violet: { badge: "bg-violet-50 text-violet-700 ring-violet-200", dot: "bg-violet-500", soft: "bg-violet-50" },
  amber: { badge: "bg-amber-50 text-amber-700 ring-amber-200", dot: "bg-amber-500", soft: "bg-amber-50" },
  rose: { badge: "bg-rose-50 text-rose-700 ring-rose-200", dot: "bg-rose-500", soft: "bg-rose-50" },
  teal: { badge: "bg-teal-50 text-teal-700 ring-teal-200", dot: "bg-teal-500", soft: "bg-teal-50" },
  indigo: { badge: "bg-indigo-50 text-indigo-700 ring-indigo-200", dot: "bg-indigo-500", soft: "bg-indigo-50" },
  orange: { badge: "bg-orange-50 text-orange-700 ring-orange-200", dot: "bg-orange-500", soft: "bg-orange-50" },
  zinc: { badge: "bg-zinc-100 text-zinc-600 ring-zinc-200", dot: "bg-zinc-400", soft: "bg-zinc-50" },
};
export const roleStyle = (c?: string | null) => ROLE_STYLE[c ?? "zinc"] ?? ROLE_STYLE.zinc;

/** "Orders: View, Edit" lines for a permission list (modules with no access are skipped) */
export function permissionSummary(perms: string[]) {
  return SECTION_KEYS.map((s) => {
    const acts = (MODULES[s].actions as readonly Action[]).filter((a) => perms.includes(`${s}.${a}`));
    return acts.length ? { section: s as Section, label: MODULES[s].label, actions: acts, full: acts.length === MODULES[s].actions.length, text: acts.map((a) => ACTION_LABEL[a]).join(", ") } : null;
  }).filter((x): x is NonNullable<typeof x> => !!x);
}
