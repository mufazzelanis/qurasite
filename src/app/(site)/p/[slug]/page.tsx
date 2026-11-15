import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeCheck, ChevronRight, Leaf, ShieldCheck, Truck } from "lucide-react";
import ViewContent from "@/components/tracking/ViewContent";
import ProductCard from "@/components/shop/ProductCard";
import { BuyBox, Gallery } from "@/components/shop/ProductBuy";
import { getActiveProducts, getProductBySlug } from "@/lib/catalog";
import { taka } from "@/lib/utils";

export const revalidate = 3600;
type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await getProductBySlug((await params).slug);
  if (!p) return {};
  return { title: p.nameBn || p.name, description: p.tagline || undefined, openGraph: { images: [p.image] } };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const p = await getProductBySlug(slug);
  if (!p) notFound();
  const all = await getActiveProducts();
  const addons = all.filter((x) => x.isAddon && x.id !== p.id);
  const related = all.filter((x) => x.id !== p.id && (x.categoryId === p.categoryId || !p.categoryId)).slice(0, 4);
  const off = p.comparePrice ? p.comparePrice - p.price : 0;

  return (
    <>
      <ViewContent id={p.id} name={p.name} value={p.price} />
      <section className="container-x py-6 sm:py-10">
        <nav className="mb-5 flex items-center gap-1 text-sm text-brand-900/50">
          <Link href="/">হোম</Link>
          <ChevronRight className="size-3.5" />
          {p.category ? <Link href={`/category/${p.category.slug}`}>{p.category.nameBn || p.category.name}</Link> : <Link href="/shop">শপ</Link>}
          <ChevronRight className="size-3.5" />
          <span className="line-clamp-1 text-brand-900/80">{p.nameBn || p.name}</span>
        </nav>
        <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
          <Gallery images={[p.image, ...p.gallery]} alt={p.name} />
          <div>
            <span className="eyebrow">
              <Leaf className="size-4" /> ১০০% প্রাকৃতিক
            </span>
            <h1 className="mt-3 font-display text-3xl font-extrabold leading-tight text-brand-900 sm:text-5xl">{p.nameBn || p.name}</h1>
            {p.tagline && <p className="mt-2 text-lg text-brand-900/65">{p.tagline}</p>}
            <div className="mt-5 flex flex-wrap items-end gap-3">
              <span className="font-display text-4xl font-extrabold text-brand-800 sm:text-5xl">{taka(p.price)}</span>
              {p.comparePrice && <span className="mb-1.5 text-xl text-brand-900/40 line-through">{taka(p.comparePrice)}</span>}
              {off > 0 && <span className="mb-2 rounded-full bg-gold-500 px-3 py-1 text-sm font-bold text-white">সাশ্রয় {taka(off)}</span>}
            </div>
            <p className="mt-2 text-sm text-brand-900/60">
              {p.weight && <>নিট ওজন: {p.weight} • </>}
              {p.stock > 0 ? <span className="font-semibold text-brand-600">স্টকে আছে</span> : <span className="font-semibold text-rose-600">স্টক আউট</span>}
            </p>
            <div className="mt-6">
              <BuyBox p={p} stock={p.stock} addons={addons} />
            </div>
            <div className="mt-6 grid grid-cols-3 gap-2">
              {[
                [Truck, "ক্যাশ অন ডেলিভারি"],
                [ShieldCheck, "প্রিজারভেটিভ মুক্ত"],
                [BadgeCheck, "মান নিশ্চিত"],
              ].map(([Icon, t], i) => {
                const I = Icon as typeof Truck;
                return (
                  <div key={i} className="rounded-2xl bg-white p-3 text-center shadow-sm">
                    <I className="mx-auto mb-1 size-6 text-gold-500" />
                    <span className="text-xs font-semibold text-brand-900/75">{t as string}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        {p.description && (
          <div className="card mt-10 p-6 sm:p-10">
            <h2 className="mb-4 font-display text-2xl font-bold text-brand-900">পণ্যের বিবরণ</h2>
            <div className="whitespace-pre-line leading-relaxed text-brand-900/75">{p.description}</div>
          </div>
        )}
      </section>
      {related.length > 0 && (
        <section className="container-x pb-10">
          <h2 className="section-title mb-6 !text-2xl sm:!text-3xl">আরও দেখুন</h2>
          <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-4">
            {related.map((r) => (
              <ProductCard key={r.id} p={r} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
