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
  // re-check DB so deactivated users / role changes apply immediately
  const a = await db.admin.findUnique({ where: { id: s.id }, select: { id: true, name: true, email: true, role: true, permissions: true, active: true } }).catch(() => null);
  if (!a || !a.active) return null;
  return a;
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
