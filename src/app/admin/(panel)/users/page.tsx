import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import UsersManager, { type UserRow, type LoginRow, type RoleRow } from "@/components/admin/UsersManager";

export default async function UsersPage() {
  const me = await requireAdmin("users");
  const since = new Date(Date.now() - 86400_000);
  const [users, roles, logins, failed24h, activity] = await Promise.all([
    db.admin.findMany({
      orderBy: [{ active: "desc" }, { createdAt: "asc" }],
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        note: true,
        role: true,
        roleId: true,
        active: true,
        lastLoginAt: true,
        lastLoginIp: true,
        lastSeenAt: true,
        lockedUntil: true,
        failedLogins: true,
        passwordChangedAt: true,
        createdAt: true,
      },
    }),
    db.adminRole.findMany({ orderBy: { createdAt: "asc" }, include: { _count: { select: { admins: true } } } }),
    db.loginEvent.findMany({ orderBy: { createdAt: "desc" }, take: 25, select: { id: true, email: true, ok: true, reason: true, ip: true, userAgent: true, createdAt: true, admin: { select: { name: true } } } }),
    db.loginEvent.count({ where: { ok: false, createdAt: { gte: since } } }),
    db.activityLog.groupBy({ by: ["adminId"], where: { createdAt: { gte: new Date(Date.now() - 30 * 86400_000) } }, _count: { _all: true } }),
  ]);
  const actions = new Map(activity.map((a) => [a.adminId, a._count._all]));
  const iso = (d: Date | null) => d?.toISOString() ?? null;

  const rows: UserRow[] = users.map((u) => ({
    ...u,
    lastLoginAt: iso(u.lastLoginAt),
    lastSeenAt: iso(u.lastSeenAt),
    lockedUntil: u.lockedUntil && u.lockedUntil > new Date() ? u.lockedUntil.toISOString() : null,
    passwordChangedAt: iso(u.passwordChangedAt),
    createdAt: u.createdAt.toISOString(),
    actions30d: actions.get(u.id) ?? 0,
  }));
  const roleRows: RoleRow[] = roles.map((r) => ({ id: r.id, name: r.name, description: r.description, color: r.color, permissions: r.permissions, users: r._count.admins }));
  const loginRows: LoginRow[] = logins.map((l) => ({ ...l, name: l.admin?.name ?? null, createdAt: l.createdAt.toISOString() }));

  return <UsersManager users={rows} roles={roleRows} logins={loginRows} failed24h={failed24h} me={{ id: me.id, superAdmin: me.role === "ADMIN", permissions: me.permissions }} />;
}
