"use client";
import Image from "next/image";
import { useState } from "react";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import type { Product } from "@prisma/client";
import { saveProduct } from "@/app/admin/actions";

export default function ProductForm({ product: p, categories }: { product: Product | null; categories: { id: string; name: string; nameBn: string | null }[] }) {
  const [addon, setAddon] = useState(p?.isAddon ?? false);
  const [image, setImage] = useState(p?.image || "/brand/logo-card-t.png");
  const [uploading, setUploading] = useState(false);

  async function upload(file: File) {
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const r = await fetch("/api/admin/upload", { method: "POST", body: fd }).then((r) => r.json());
    setUploading(false);
    if (r.url) setImage(r.url);
    else toast.error(r.error || "Upload failed");
  }

  return (
    <form action={saveProduct} className="a-card space-y-4">
      <input type="hidden" name="id" value={p?.id || ""} />
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm">Name (English) *<input name="name" required defaultValue={p?.name} className="a-input mt-1" /></label>
        <label className="text-sm">Name (Bangla)<input name="nameBn" defaultValue={p?.nameBn || ""} className="a-input mt-1" /></label>
        <label className="text-sm">URL slug<input name="slug" defaultValue={p?.slug} placeholder="auto from name" className="a-input mt-1" /></label>
        <label className="text-sm">Weight / size<input name="weight" defaultValue={p?.weight || ""} placeholder="250gm" className="a-input mt-1" /></label>
        <label className="text-sm">Price (৳) *<input name="price" type="number" required defaultValue={p?.price} className="a-input mt-1" /></label>
        <label className="text-sm">Compare-at price (৳)<input name="comparePrice" type="number" defaultValue={p?.comparePrice ?? ""} className="a-input mt-1" /></label>
        <label className="text-sm">Stock<input name="stock" type="number" defaultValue={p?.stock ?? 100} className="a-input mt-1" /></label>
        <label className="text-sm">Sort order<input name="sortOrder" type="number" defaultValue={p?.sortOrder ?? 0} className="a-input mt-1" /></label>
      </div>
      <label className="block text-sm">Category
        <select name="categoryId" defaultValue={p?.categoryId || ""} className="a-input mt-1">
          <option value="">— none —</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.nameBn || c.name}</option>)}
        </select>
      </label>
      <div className="space-y-3 rounded-xl border-2 border-dashed border-gold-300 bg-gold-50/50 p-4">
        <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" name="isAddon" checked={addon} onChange={(e) => setAddon(e.target.checked)} /> 🍯 Combo add-on (honey, gur…)</label>
        <p className="text-xs text-zinc-500">Add-ons appear in the “স্বাদ দ্বিগুণ করুন” order bump, the Perfect Pair section and the one-click offer after purchase.</p>
        {addon && (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">Combo price (৳) — when bought with a main product<input name="comboPrice" type="number" defaultValue={p?.comboPrice ?? ""} className="a-input mt-1" /></label>
            <label className="text-sm">Short selling line<input name="addonNote" defaultValue={p?.addonNote || ""} placeholder="চিনির বদলে প্রাকৃতিক মিষ্টতা" className="a-input mt-1" /></label>
          </div>
        )}
      </div>
      <label className="block text-sm">Tagline<input name="tagline" defaultValue={p?.tagline || ""} className="a-input mt-1" /></label>
      <label className="block text-sm">Description<textarea name="description" rows={5} defaultValue={p?.description || ""} className="a-input mt-1" /></label>

      <div>
        <p className="mb-1 text-sm">Main image</p>
        <div className="flex items-center gap-4">
          <div className="relative size-24 overflow-hidden rounded-xl border bg-zinc-50">
            <Image src={image} alt="" fill sizes="96px" className="object-contain p-1" />
          </div>
          <div className="flex-1 space-y-2">
            <input name="image" value={image} onChange={(e) => setImage(e.target.value)} className="a-input" placeholder="/uploads/... or https://..." />
            <label className="a-btn-light cursor-pointer">
              {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />} Upload image
              <input type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
            </label>
          </div>
        </div>
      </div>
      <label className="block text-sm">Gallery image URLs (one per line)<textarea name="gallery" rows={3} defaultValue={p?.gallery.join("\n")} className="a-input mt-1" /></label>

      <div className="flex gap-6">
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={p?.active ?? true} /> Active (visible)</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="featured" defaultChecked={p?.featured ?? false} /> Featured (main landing product)</label>
      </div>
      <button className="a-btn">Save product</button>
    </form>
  );
}
