import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, verifySession } from "./auth";
import { ALL_PERMISSIONS, can, type Action, type Section } from "./permissions";
import { db } from "./db";

export async function getAdmin() {
  const jar = await cookies();
  const s = await verifySession(jar.get(SESSION_COOKIE)?.value);
  if (!s) return null;
  // re-check DB so deactivated users / role changes / "sign out everywhere" apply immediately
  const base = { id: true, name: true, email: true, role: true, permissions: true, active: true, sessionVersion: true, lastSeenAt: true } as const;
  type Row = { id: string; name: string; email: string; role: string; permissions: string[]; active: boolean; sessionVersion: number; lastSeenAt: Date | null; adminRole?: { name: string; color: string; permissions: string[] } | null };
  let a: Row | null = null;
  try {
    a = await db.admin.findUnique({ where: { id: s.id }, select: { ...base, adminRole: { select: { name: true, color: true, permissions: true } } } });
  } catch (err) {
    // A dev server started before `prisma generate` doesn't know newer fields (e.g. adminRole).
    // Fall back to the basic fields so admins can still sign in; restart `npm run dev` to load roles.
    console.warn("[session] role lookup failed — is the Prisma client outdated? Restart `npm run dev`.", (err as Error).message.split("\n")[0]);
    a = await db.admin.findUnique({ where: { id: s.id }, select: base }).catch(() => null);
  }
  if (!a || !a.active || a.sessionVersion !== (s.sv ?? 0)) return null;
  // "online now" — write at most once a minute
  if (!a.lastSeenAt || Date.now() - +a.lastSeenAt > 60_000) db.admin.update({ where: { id: a.id }, data: { lastSeenAt: new Date() } }).catch(() => {});
  const { sessionVersion: _sv, lastSeenAt: _ls, adminRole, ...admin } = a;
  const superAdmin = a.role === "ADMIN";
  return {
    ...admin,
    // effective permissions: Super Admin → all, otherwise the custom role's list (no role = dashboard only)
    permissions: superAdmin ? ALL_PERMISSIONS : (adminRole?.permissions ?? []),
    roleName: superAdmin ? "Super Admin" : (adminRole?.name ?? "No role"),
    roleColor: superAdmin ? "brand" : (adminRole?.color ?? "zinc"),
  };
}

/**
 * For /api/admin/* route handlers: returns the admin, or a 401/403 JSON Response.
 * `need` = one permission, or a list where any one is enough.
 */
export async function apiAdmin(need: [Section, Action] | [Section, Action][]) {
  const admin = await getAdmin();
  if (!admin) return { error: Response.json({ error: "Unauthorized" }, { status: 401 }) };
  const list = (Array.isArray(need[0]) ? need : [need]) as [Section, Action][];
  if (!list.some(([s, a]) => can(admin, s, a))) return { error: Response.json({ error: "No permission" }, { status: 403 }) };
  return { admin };
}

/** Signed-in admin with permission for `section.action`, otherwise redirect with a clear message */
export async function requireAdmin(section?: Section, action: Action = "view") {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  if (section && !can(admin, section, action)) redirect(`/admin?denied=${section}.${action}`);
  return admin;
}

export async function logActivity(admin: { id: string; name: string } | null, action: string, target?: string, meta?: object) {
  try {
    await db.activityLog.create({ data: { adminId: admin?.id, adminName: admin?.name || "System", action, target, meta: meta ?? undefined } });
  } catch {}
}
