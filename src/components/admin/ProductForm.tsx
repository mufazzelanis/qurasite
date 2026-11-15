"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { ArrowLeft, Boxes, ExternalLink, FileText, ImageIcon, Loader2, Save, Search, Settings2, Tag, Wallet } from "lucide-react";
import type { Product } from "@prisma/client";
import { saveProduct } from "@/app/admin/actions";
import { cn, taka } from "@/lib/utils";
import { buildTree, flatten, pathLabel } from "@/lib/category-tree";
import { Toggle } from "./fields";
import { GalleryEditor, ImageDrop } from "./MediaFields";
import { GooglePreview, LengthMeter, LIMITS, SeoScore, SITE_HOST, slugify, type SeoCheck } from "./SeoTools";

type Cat = { id: string; name: string; nameBn: string | null; slug: string; parentId: string | null; sortOrder: number };
const PLACEHOLDER = "/brand/logo-card-t.png";

export default function ProductForm({ product: p, categories, titleSuffix }: { product: Product | null; categories: Cat[]; titleSuffix: string }) {
  const [v, setV] = useState({
    name: p?.name ?? "",
    nameBn: p?.nameBn ?? "",
    slug: p?.slug ?? "",
    tagline: p?.tagline ?? "",
    description: p?.description ?? "",
    price: p?.price?.toString() ?? "",
    comparePrice: p?.comparePrice?.toString() ?? "",
    weight: p?.weight ?? "",
    stock: (p?.stock ?? 100).toString(),
    sortOrder: (p?.sortOrder ?? 0).toString(),
    categoryId: p?.categoryId ?? "",
    image: p?.image || PLACEHOLDER,
    imageAlt: p?.imageAlt ?? "",
    gallery: p?.gallery ?? [],
    active: p?.active ?? true,
    featured: p?.featured ?? false,
    isAddon: p?.isAddon ?? false,
    comboPrice: p?.comboPrice?.toString() ?? "",
    addonNote: p?.addonNote ?? "",
    seoTitle: p?.seoTitle ?? "",
    seoDesc: p?.seoDesc ?? "",
  });
  const [slugTouched, setSlugTouched] = useState(!!p);
  const [dirty, setDirty] = useState(false);
  const set = <K extends keyof typeof v>(k: K, val: (typeof v)[K]) => {
    setDirty(true);
    setV((o) => ({ ...o, [k]: val, ...(k === "name" && !slugTouched ? { slug: slugify(String(val)) } : {}) }));
  };

  // warn before leaving with unsaved edits
  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  const display = v.nameBn || v.name;
  const price = Number(v.price) || 0;
  const compare = Number(v.comparePrice) || 0;
  const off = compare > price && price > 0 ? Math.round((1 - price / compare) * 100) : 0;
  const stock = Number(v.stock) || 0;
  const seoTitle = v.seoTitle || `${display || "Product name"} | ${titleSuffix}`;
  const seoDesc = v.seoDesc || v.tagline;

  const checks: SeoCheck[] = useMemo(
    () => [
      { ok: seoTitle.length >= LIMITS.title[0] && seoTitle.length <= LIMITS.title[1], label: "SEO title is 30–60 characters", hint: `Now ${seoTitle.length}` },
      { ok: seoDesc.length >= LIMITS.desc[0] && seoDesc.length <= LIMITS.desc[1], label: "Meta description is 120–160 characters", hint: seoDesc ? `Now ${seoDesc.length}` : "Write one in the SEO section" },
      { ok: !!v.slug && v.slug.length <= 60 && v.slug.split("-").length <= 6, label: "Short, readable URL", hint: "Keep it to a few words" },
      { ok: !!v.image && v.image !== PLACEHOLDER, label: "Real product photo", hint: "Replace the logo placeholder" },
      { ok: v.imageAlt.trim().length >= 5, label: "Image has alt text", hint: "Describe the photo for Google Images" },
      { ok: v.description.trim().length >= 150, label: "Description has 150+ characters", hint: `Now ${v.description.trim().length}` },
      { ok: v.gallery.length >= 2, label: "At least 2 gallery photos", hint: "More photos = better conversions" },
      { ok: !!v.categoryId, label: "Product is in a category" },
    ],
    [seoTitle, seoDesc, v.slug, v.image, v.imageAlt, v.description, v.gallery, v.categoryId],
  );

  return (
    <form action={saveProduct} onSubmit={() => setDirty(false)} className="space-y-6">
      <input type="hidden" name="id" value={p?.id || ""} />
      {v.active && <input type="hidden" name="active" value="on" />}
      {v.featured && <input type="hidden" name="featured" value="on" />}
      {v.isAddon && <input type="hidden" name="isAddon" value="on" />}

      {/* ── Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/admin/products" className="grid size-10 shrink-0 place-items-center rounded-xl border border-zinc-200 bg-white text-zinc-600 shadow-sm transition hover:bg-zinc-50" aria-label="Back to products">
            <ArrowLeft className="size-4" />
          </Link>
          <div className="min-w-0">
            <p className="text-xs font-medium tracking-wide text-zinc-400 uppercase">{p ? "Edit product" : "New product"}</p>
            <h1 className="truncate text-2xl font-bold tracking-tight">{display || "Untitled product"}</h1>
          </div>
          <span className={cn("ml-1 hidden shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 sm:flex", v.active ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : "bg-zinc-100 text-zinc-500 ring-zinc-200")}>
            <span className={cn("size-1.5 rounded-full", v.active ? "bg-emerald-500" : "bg-zinc-400")} /> {v.active ? "Live" : "Hidden"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {dirty && <span className="hidden text-xs font-medium text-amber-600 sm:block">● Unsaved changes</span>}
          {p && (
            <Link href={`/p/${p.slug}`} target="_blank" className="a-btn-light !rounded-xl">
              <ExternalLink className="size-4" /> View
            </Link>
          )}
          <SubmitButton />
        </div>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* ── Main column ── */}
        <div className="space-y-6">
          <Section icon={FileText} title="Basic information" desc="Name and text customers read on the product page.">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Name (English)" required>
                <input name="name" required value={v.name} onChange={(e) => set("name", e.target.value)} placeholder="Qura Mix 250gm" className="a-input" />
              </Field>
              <Field label="Name (বাংলা)">
                <input name="nameBn" value={v.nameBn} onChange={(e) => set("nameBn", e.target.value)} placeholder="কুঁড়া মিক্স — ২৫০ গ্রাম" className="a-input" />
              </Field>
            </div>
            <Field label="Tagline" help="One short line under the title. Also used as the meta description if you leave SEO empty.">
              <input name="tagline" value={v.tagline} onChange={(e) => set("tagline", e.target.value)} className="a-input" />
            </Field>
            <Field label="Description" help={`${v.description.length} characters · new lines and • bullets are kept`}>
              <textarea name="description" rows={8} value={v.description} onChange={(e) => set("description", e.target.value)} className="a-input leading-relaxed" />
            </Field>
          </Section>

          <Section icon={ImageIcon} title="Media" desc="The first photo is the main image everywhere on the site.">
            <div className="grid gap-5 sm:grid-cols-[220px_1fr]">
              <ImageDrop name="image" value={v.image} onChange={(x) => set("image", x)} />
              <div className="space-y-4">
                <Field label="Image alt text" help="Describe the photo — helps Google Images and screen readers.">
                  <input name="imageAlt" value={v.imageAlt} onChange={(e) => set("imageAlt", e.target.value)} placeholder={`${display || "Product"} — প্যাকেট ও চামচে পাউডার`} className="a-input" />
                </Field>
                <div>
                  <p className="mb-2 text-sm font-medium text-zinc-700">Gallery</p>
                  <GalleryEditor name="gallery" value={v.gallery} onChange={(x) => set("gallery", x)} onMakeMain={(url) => setV((o) => ({ ...o, gallery: [o.image, ...o.gallery.filter((g) => g !== url)].filter((g) => g && g !== PLACEHOLDER), image: url }))} />
                </div>
              </div>
            </div>
          </Section>

          <Section icon={Wallet} title="Pricing" desc="Prices are always re-checked on the server at checkout.">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Price" required>
                <Money name="price" required value={v.price} onChange={(x) => set("price", x)} />
              </Field>
              <Field label="Compare-at price" help="The old price, shown crossed out.">
                <Money name="comparePrice" value={v.comparePrice} onChange={(x) => set("comparePrice", x)} />
              </Field>
            </div>
            {off > 0 && (
              <div className="flex items-center gap-3 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800 ring-1 ring-emerald-100">
                <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-xs font-bold text-white">-{off}%</span>
                Customer saves <b>{taka(compare - price)}</b> on this product.
              </div>
            )}
            {compare > 0 && compare <= price && <p className="text-xs text-amber-600">Compare-at price should be higher than the price, otherwise it is hidden.</p>}

            <div className={cn("rounded-2xl border-2 border-dashed p-4 transition", v.isAddon ? "border-gold-300 bg-gold-50/60" : "border-zinc-200")}>
              <Toggle label="🍯 Combo add-on (honey, gur…)" checked={v.isAddon} onChange={(x) => set("isAddon", x)} help="Shows in the “স্বাদ দ্বিগুণ করুন” order bump, the Perfect Pair section and the one-click offer after purchase." />
              {v.isAddon && (
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <Field label="Combo price" help={price && Number(v.comboPrice) ? `${taka(price - Number(v.comboPrice))} cheaper than the normal price` : "Price when bought with a main product"}>
                    <Money name="comboPrice" value={v.comboPrice} onChange={(x) => set("comboPrice", x)} />
                  </Field>
                  <Field label="Short selling line">
                    <input name="addonNote" value={v.addonNote} onChange={(e) => set("addonNote", e.target.value)} placeholder="চিনির বদলে প্রাকৃতিক মিষ্টতা" className="a-input" />
                  </Field>
                </div>
              )}
            </div>
          </Section>

          <Section icon={Boxes} title="Inventory & shipping">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Stock">
                <input name="stock" type="number" min={0} value={v.stock} onChange={(e) => set("stock", e.target.value)} className="a-input tabular-nums" />
              </Field>
              <Field label="Weight / size">
                <input name="weight" value={v.weight} onChange={(e) => set("weight", e.target.value)} placeholder="250gm" className="a-input" />
              </Field>
              <Field label="Sort order" help="Lower shows first">
                <input name="sortOrder" type="number" value={v.sortOrder} onChange={(e) => set("sortOrder", e.target.value)} className="a-input tabular-nums" />
              </Field>
            </div>
            <div className={cn("flex items-center gap-2 text-sm font-medium", stock <= 0 ? "text-rose-600" : stock < 10 ? "text-amber-600" : "text-emerald-700")}>
              <span className={cn("size-2 rounded-full", stock <= 0 ? "bg-rose-500" : stock < 10 ? "bg-amber-500" : "bg-emerald-500")} />
              {stock <= 0 ? "Out of stock — customers can't order it" : stock < 10 ? "Low stock" : "In stock"}
            </div>
          </Section>

          <Section icon={Search} title="Search engine & sharing" desc="How this product appears on Google, Facebook and WhatsApp.">
            <GooglePreview title={seoTitle} desc={seoDesc} path={`p/${v.slug || "product-url"}`} image={v.image} />
            <Field label="URL" help="Use English words joined by dashes. Changing it breaks old links.">
              <div className="flex overflow-hidden rounded-lg border border-zinc-300 focus-within:border-brand-600 focus-within:ring-2 focus-within:ring-brand-600/15">
                <span className="flex shrink-0 items-center border-r border-zinc-200 bg-zinc-50 px-3 text-sm text-zinc-500">{SITE_HOST}/p/</span>
                <input
                  name="slug"
                  value={v.slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    set("slug", e.target.value.toLowerCase().replace(/\s+/g, "-"));
                  }}
                  onBlur={() => set("slug", slugify(v.slug))}
                  placeholder="auto from name"
                  className="min-w-0 flex-1 px-3 py-2 text-sm outline-none"
                />
              </div>
            </Field>
            <Field label="SEO title" help={!v.seoTitle ? "Empty = product name + store name" : undefined}>
              <input name="seoTitle" value={v.seoTitle} onChange={(e) => set("seoTitle", e.target.value)} placeholder={`${display || "Product name"} | ${titleSuffix}`} className="a-input" />
              <LengthMeter len={seoTitle.length} limits={LIMITS.title} />
            </Field>
            <Field label="Meta description" help={!v.seoDesc ? "Empty = tagline is used" : undefined}>
              <textarea name="seoDesc" rows={3} value={v.seoDesc} onChange={(e) => set("seoDesc", e.target.value)} placeholder={v.tagline || "১০০% প্রাকৃতিক… সারা দেশে ক্যাশ অন ডেলিভারি।"} className="a-input" />
              <LengthMeter len={seoDesc.length} limits={LIMITS.desc} />
            </Field>
          </Section>
        </div>

        {/* ── Sidebar ── */}
        <aside className="space-y-6 lg:sticky lg:top-6">
          <Section icon={Settings2} title="Status">
            <Toggle label="Active" help="Visible on the site and landing pages" checked={v.active} onChange={(x) => set("active", x)} />
            <Toggle label="Featured" help="Hero product on the homepage" checked={v.featured} onChange={(x) => set("featured", x)} />
          </Section>

          <Section icon={Tag} title="Organization">
            <Field label="Category">
              <select name="categoryId" value={v.categoryId} onChange={(e) => set("categoryId", e.target.value)} className="a-input">
                <option value="">— none —</option>
                {flatten(buildTree(categories)).map((c) => (
                  <option key={c.id} value={c.id}>
                    {"   ".repeat(c.depth)}
                    {c.depth ? "└ " : ""}
                    {c.nameBn || c.name}
                  </option>
                ))}
              </select>
              {v.categoryId && <span className="mt-1.5 block text-xs text-zinc-400">{pathLabel(categories, v.categoryId)}</span>}
            </Field>
            <Link href="/admin/categories" className="text-xs font-medium text-brand-700 hover:underline">
              Manage categories →
            </Link>
          </Section>

          <Section icon={Search} title="SEO score">
            <SeoScore checks={checks} />
          </Section>

          {/* storefront preview */}
          <div className="overflow-hidden rounded-2xl border border-zinc-200/70 bg-white shadow-sm">
            <p className="border-b border-zinc-100 px-5 py-3 text-xs font-semibold tracking-wide text-zinc-500 uppercase">Shop card preview</p>
            <div className="p-4">
              <div className="overflow-hidden rounded-2xl bg-cream/60 ring-1 ring-zinc-200/60">
                <div className="relative aspect-square">
                  <Image src={v.image || PLACEHOLDER} alt="" fill sizes="300px" className="object-contain p-6" />
                  {off > 0 && <span className="absolute top-3 left-3 rounded-full bg-rose-600 px-2 py-0.5 text-xs font-bold text-white">-{off}%</span>}
                </div>
                <div className="space-y-1 bg-white p-3">
                  <p className="line-clamp-2 font-semibold leading-snug text-brand-900">{display || "Product name"}</p>
                  {v.tagline && <p className="line-clamp-1 text-xs text-zinc-500">{v.tagline}</p>}
                  <p className="flex items-baseline gap-2">
                    <span className="text-lg font-bold text-brand-800">{taka(price)}</span>
                    {off > 0 && <span className="text-sm text-zinc-400 line-through">{taka(compare)}</span>}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* mobile save bar */}
      <div className="sticky bottom-4 z-10 flex justify-end lg:hidden">
        <SubmitButton />
      </div>
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending} className="a-btn !rounded-xl px-5 shadow-lg shadow-brand-900/20">
      {pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} {pending ? "Saving…" : "Save product"}
    </button>
  );
}

function Section({ icon: Icon, title, desc, children }: { icon: typeof Save; title: string; desc?: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-zinc-200/70 bg-white shadow-sm">
      <header className="flex items-start gap-3 border-b border-zinc-100 px-5 py-4">
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-700 ring-1 ring-brand-100">
          <Icon className="size-4" />
        </span>
        <div>
          <h2 className="font-semibold leading-tight">{title}</h2>
          {desc && <p className="mt-0.5 text-xs text-zinc-500">{desc}</p>}
        </div>
      </header>
      <div className="space-y-4 p-5">{children}</div>
    </section>
  );
}

function Field({ label, help, required, children }: { label: string; help?: string; required?: boolean; children: ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1.5 block font-medium text-zinc-700">
        {label}
        {required && <span className="text-rose-500"> *</span>}
      </span>
      {children}
      {help && <span className="mt-1.5 block text-xs text-zinc-400">{help}</span>}
    </label>
  );
}

function Money({ name, value, onChange, required }: { name: string; value: string; onChange: (v: string) => void; required?: boolean }) {
  return (
    <div className="flex overflow-hidden rounded-lg border border-zinc-300 bg-white focus-within:border-brand-600 focus-within:ring-2 focus-within:ring-brand-600/15">
      <span className="flex items-center border-r border-zinc-200 bg-zinc-50 px-3 font-semibold text-zinc-500">৳</span>
      <input name={name} type="number" min={0} required={required} value={value} onChange={(e) => onChange(e.target.value)} className="min-w-0 flex-1 px-3 py-2 text-sm tabular-nums outline-none" />
    </div>
  );
}
