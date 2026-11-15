"use client";
import { useActionState } from "react";
import { Loader2, Lock, Mail } from "lucide-react";
import { loginAction } from "../actions";

export default function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, null);
  return (
    <form action={action} className="space-y-4">
      <div className="relative">
        <Mail className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
        <input name="email" type="email" required placeholder="Email" className="input pl-11" />
      </div>
      <div className="relative">
        <Lock className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
        <input name="password" type="password" required placeholder="Password" className="input pl-11" />
      </div>
      {state?.error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{state.error}</p>}
      <button disabled={pending} className="btn-green w-full py-3.5">
        {pending && <Loader2 className="size-4 animate-spin" />} Sign in
      </button>
    </form>
  );
}
