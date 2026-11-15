import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, verifySession } from "./auth";
import { can, type Section } from "./permissions";
import { db } from "./db";

export async function getAdmin() {
  const jar = await cookies();
  const s = await verifySession(jar.get(SESSION_COOKIE)?.value);
  if (!s) return null;
  // re-check DB so deactivated users / role changes / "sign out everywhere" apply immediately
  const a = await db.admin
    .findUnique({ where: { id: s.id }, select: { id: true, name: true, email: true, role: true, permissions: true, active: true, sessionVersion: true, lastSeenAt: true } })
    .catch(() => null);
  if (!a || !a.active || a.sessionVersion !== (s.sv ?? 0)) return null;
  // "online now" — write at most once a minute
  if (!a.lastSeenAt || Date.now() - +a.lastSeenAt > 60_000) db.admin.update({ where: { id: a.id }, data: { lastSeenAt: new Date() } }).catch(() => {});
  const { sessionVersion: _sv, lastSeenAt: _ls, ...admin } = a;
  return admin;
}

export async function requireAdmin(section?: Section) {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  if (section && !can(admin, section)) redirect("/admin?denied=" + section);
  return admin;
}

export async function logActivity(admin: { id: string; name: string } | null, action: string, target?: string, meta?: object) {
  try {
    await db.activityLog.create({ data: { adminId: admin?.id, adminName: admin?.name || "System", action, target, meta: meta ?? undefined } });
  } catch {}
}
