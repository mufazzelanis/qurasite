import Image from "next/image";
import Link from "next/link";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { deleteProduct } from "@/app/admin/actions";
import { cn, taka } from "@/lib/utils";

export default async function ProductsPage() {
  await requireAdmin("products");
  const products = await db.product.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], include: { _count: { select: { items: true } }, category: { select: { name: true } } } });
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Products</h1>
        <Link href="/admin/products/new" className="a-btn"><Plus className="size-4" /> Add product</Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {products.map((p) => (
          <div key={p.id} className="a-card flex gap-4">
            <div className="relative size-24 shrink-0 overflow-hidden rounded-xl bg-zinc-50">
              <Image src={p.image} alt="" fill sizes="96px" className="object-contain p-1" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold leading-tight">{p.nameBn || p.name}</p>
                <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-xs", p.active ? "bg-emerald-100 text-emerald-700" : "bg-zinc-100 text-zinc-500")}>{p.active ? "Active" : "Hidden"}</span>
              </div>
              <p className="text-xs text-zinc-400">/{p.slug}{p.category && ` · ${p.category.name}`} {p.isAddon && <span className="ml-1 rounded bg-gold-100 px-1.5 font-semibold text-gold-700">🍯 add-on · combo {p.comboPrice ? taka(p.comboPrice) : "—"}</span>}</p>
              <p className="mt-1 font-bold text-brand-800">{taka(p.price)} {p.comparePrice && <span className="text-xs font-normal text-zinc-400 line-through">{taka(p.comparePrice)}</span>}</p>
              <p className={cn("text-xs", p.stock < 10 ? "font-semibold text-rose-600" : "text-zinc-500")}>Stock: {p.stock} · Sold in {p._count.items} orders</p>
              <div className="mt-2 flex gap-2">
                <Link href={`/admin/products/${p.id}`} className="a-btn-light !py-1"><Pencil className="size-3.5" /> Edit</Link>
                <Link href={`/p/${p.slug}`} target="_blank" className="a-btn-light !py-1">Landing</Link>
                <form action={deleteProduct}>
                  <input type="hidden" name="id" value={p.id} />
                  <button className="a-btn-light !py-1 !text-rose-600" title={p._count.items ? "Has orders — will be hidden" : "Delete"}><Trash2 className="size-3.5" /></button>
                </form>
              </div>
            </div>
          </div>
        ))}
      </div>
      {!products.length && <p className="a-card py-16 text-center text-zinc-400">No products yet</p>}
    </div>
  );
}
