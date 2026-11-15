import { Trash2 } from "lucide-react";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { deleteCategory, saveCategory } from "@/app/admin/actions";

export default async function CategoriesPage() {
  await requireAdmin("products");
  const cats = await db.category.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], include: { _count: { select: { products: true } } } });
  return (
    <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
      <form action={saveCategory} className="a-card h-fit space-y-3">
        <h2 className="font-semibold">Add category</h2>
        <input name="name" required placeholder="Name (English)" className="a-input" />
        <input name="nameBn" placeholder="নাম (বাংলা)" className="a-input" />
        <input name="slug" placeholder="url-slug (auto)" className="a-input" />
        <input name="image" placeholder="Image URL (optional)" className="a-input" />
        <input name="sortOrder" type="number" placeholder="Sort order" className="a-input" />
        <button className="a-btn">Add category</button>
      </form>
      <div className="space-y-3">
        <h1 className="text-2xl font-bold">Categories ({cats.length})</h1>
        {cats.map((c) => (
          <form key={c.id} action={saveCategory} className="a-card grid items-end gap-2 sm:grid-cols-[1fr_1fr_1fr_90px_90px_auto_auto]">
            <input type="hidden" name="id" value={c.id} />
            <label className="text-xs text-zinc-500">Name<input name="name" defaultValue={c.name} className="a-input mt-1" /></label>
            <label className="text-xs text-zinc-500">বাংলা<input name="nameBn" defaultValue={c.nameBn || ""} className="a-input mt-1" /></label>
            <label className="text-xs text-zinc-500">Slug<input name="slug" defaultValue={c.slug} className="a-input mt-1" /></label>
            <label className="text-xs text-zinc-500">Sort<input name="sortOrder" type="number" defaultValue={c.sortOrder} className="a-input mt-1" /></label>
            <label className="text-xs text-zinc-500">Visible
              <select name="active" defaultValue={c.active ? "on" : "off"} className="a-input mt-1"><option value="on">Yes</option><option value="off">No</option></select>
            </label>
            <input type="hidden" name="image" value={c.image || ""} />
            <button className="a-btn-light">Save</button>
            <button formAction={deleteCategory} className="a-btn-light !text-rose-600" title={`${c._count.products} products`}><Trash2 className="size-4" /></button>
          </form>
        ))}
        {!cats.length && <p className="a-card py-10 text-center text-zinc-400">No categories yet</p>}
      </div>
    </div>
  );
}
