"use client";
import { useActionState, useState } from "react";
import { Loader2 } from "lucide-react";
import { saveUser } from "@/app/admin/actions";
import { SECTIONS } from "@/lib/permissions";

type U = { id: string; name: string; email: string; role: string; permissions: string[]; active: boolean };

export default function UserForm({ user }: { user?: U }) {
  const [state, action, pending] = useActionState(saveUser, null);
  const [role, setRole] = useState(user?.role || "STAFF");
  const [open, setOpen] = useState(!user);
  if (!open)
    return (
      <button onClick={() => setOpen(true)} className="a-btn-light">
        Edit
      </button>
    );
  return (
    <form action={action} className={user ? "space-y-3" : "a-card space-y-3"}>
      {!user && <h2 className="font-semibold">Add user</h2>}
      <input type="hidden" name="id" value={user?.id || ""} />
      <div className="grid gap-2 sm:grid-cols-2">
        <input name="name" required defaultValue={user?.name} placeholder="Name" className="a-input" />
        <input name="email" type="email" required defaultValue={user?.email} placeholder="Email" className="a-input" />
        <input name="password" type="password" placeholder={user ? "New password (leave empty to keep)" : "Password (min 8)"} className="a-input" />
        <select name="role" value={role} onChange={(e) => setRole(e.target.value)} className="a-input">
          <option value="ADMIN">Admin</option>
          <option value="MANAGER">Manager</option>
          <option value="STAFF">Staff</option>
        </select>
      </div>
      {role === "STAFF" && (
        <div className="grid grid-cols-2 gap-1.5 rounded-xl bg-zinc-50 p-3 text-sm">
          {Object.entries(SECTIONS)
            .filter(([k]) => k !== "dashboard" && k !== "system")
            .map(([k, l]) => (
              <label key={k} className="flex items-center gap-2">
                <input type="checkbox" name="permissions" value={k} defaultChecked={user?.permissions.includes(k) ?? ["orders", "customers"].includes(k)} /> {l}
              </label>
            ))}
        </div>
      )}
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="active" defaultChecked={user?.active ?? true} /> Active (can log in)
      </label>
      {state?.error && <p className="text-sm text-rose-600">{state.error}</p>}
      {state?.ok && <p className="text-sm text-emerald-600">{state.ok}</p>}
      <button disabled={pending} className="a-btn">
        {pending && <Loader2 className="size-4 animate-spin" />} {user ? "Save user" : "Create user"}
      </button>
    </form>
  );
}
