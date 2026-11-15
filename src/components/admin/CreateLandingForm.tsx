"use client";
import { useActionState, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { createLanding } from "@/app/admin/actions";

export default function CreateLandingForm({ host, products, pages }: { host: string; products: { id: string; name: string; nameBn: string | null; isAddon: boolean }[]; pages: { id: string; slug: string }[] }) {
  const [state, action, pending] = useActionState(createLanding, null);
  const [slug, setSlug] = useState("");
  return (
    <form action={action} className="a-card grid gap-3 lg:grid-cols-[1.4fr_1fr_1fr_1fr_auto] lg:items-end">
      <label className="text-sm">
        <span className="font-medium">New landing page URL</span>
        <div className="mt-1 flex items-center overflow-hidden rounded-lg border border-zinc-300 focus-within:border-brand-600">
          <span className="bg-zinc-50 px-3 py-2 text-sm text-zinc-500">{host}/</span>
          <input name="slug" required value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))} placeholder="qura" className="min-w-0 flex-1 px-2 py-2 text-sm outline-none" />
        </div>
      </label>
      <label className="text-sm"><span className="font-medium">Title</span><input name="title" placeholder="Qura Mix offer" className="a-input mt-1" /></label>
      <label className="text-sm">
        <span className="font-medium">Main product</span>
        <select name="productId" required className="a-input mt-1">
          {products.filter((p) => !p.isAddon).map((p) => <option key={p.id} value={p.id}>{p.nameBn || p.name}</option>)}
        </select>
      </label>
      <label className="text-sm">
        <span className="font-medium">Start from</span>
        <select name="copyFrom" className="a-input mt-1">
          <option value="">Default template</option>
          {pages.map((p) => <option key={p.id} value={p.id}>Copy of /{p.slug}</option>)}
        </select>
      </label>
      <button disabled={pending} className="a-btn justify-center">{pending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} Create</button>
      {state?.error && <p className="text-sm text-rose-600 lg:col-span-5">{state.error}</p>}
    </form>
  );
}
