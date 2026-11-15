import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import UserForm from "@/components/admin/UserForm";
import { cn } from "@/lib/utils";

export default async function UsersPage() {
  const me = await requireAdmin("system");
  const users = await db.admin.findMany({ orderBy: { createdAt: "asc" }, select: { id: true, name: true, email: true, role: true, permissions: true, active: true, lastLoginAt: true } });
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Users & Roles</h1>
        <p className="text-sm text-zinc-500">
          <b>Admin</b> = everything · <b>Manager</b> = everything except system settings & users · <b>Staff</b> = only the sections you tick (e.g. Orders + Customers for call-center staff).
        </p>
      </div>
      <UserForm />
      <div className="grid gap-4 lg:grid-cols-2">
        {users.map((u) => (
          <div key={u.id} className="a-card space-y-3">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-full bg-brand-700 font-bold text-white">{u.name[0]}</span>
              <div className="flex-1">
                <p className="font-semibold">{u.name} {u.id === me.id && <span className="text-xs text-zinc-400">(you)</span>}</p>
                <p className="text-xs text-zinc-500">{u.email} · last login {u.lastLoginAt ? u.lastLoginAt.toLocaleString("en-GB", { timeZone: "Asia/Dhaka", dateStyle: "medium", timeStyle: "short" }) : "never"}</p>
              </div>
              <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", u.active ? "bg-emerald-100 text-emerald-700" : "bg-zinc-200 text-zinc-600")}>{u.active ? u.role : "Disabled"}</span>
            </div>
            <UserForm user={u} />
          </div>
        ))}
      </div>
    </div>
  );
}
