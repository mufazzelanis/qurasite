import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import ShopGrid from "@/components/site/ShopGrid";
import { getActiveProducts, getCategories } from "@/lib/catalog";
import { ancestry, descendantIds } from "@/lib/category-tree";
import { JsonLd, abs, breadcrumbLd, excerpt } from "@/lib/seo";

export const revalidate = 3600;
type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const c = (await getCategories()).find((x) => x.slug === slug);
  if (!c) return {};
  const title = c.seoTitle || c.nameBn || c.name;
  const description = c.seoDesc || excerpt(c.description) || undefined;
  return {
    title: c.seoTitle ? { absolute: c.seoTitle } : title,
    description,
    alternates: { canonical: `/category/${c.slug}` },
    openGraph: { url: `/category/${c.slug}`, title, description, images: c.image ? [c.image] : undefined },
  };
}

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params;
  const [products, categories] = await Promise.all([getActiveProducts(), getCategories()]);
  const cat = categories.find((c) => c.slug === slug);
  if (!cat) notFound();

  const scope = descendantIds(categories, cat.id);
  const items = products.filter((p) => p.categoryId && scope.has(p.categoryId));
  const children = categories.filter((c) => c.parentId === cat.id).sort((a, b) => a.sortOrder - b.sortOrder);
  const path = ancestry(categories, cat.id);
  const name = cat.nameBn || cat.name;
  const label = (c: { name: string; nameBn: string | null }) => c.nameBn || c.name;
  const countIn = (id: string) => {
    const s = descendantIds(categories, id);
    return products.filter((p) => p.categoryId && s.has(p.categoryId)).length;
  };
  const thumb = (id: string) => {
    const s = descendantIds(categories, id);
    return products.find((p) => p.categoryId && s.has(p.categoryId))?.image;
  };

  return (
    <section className="container-x py-8 sm:py-12">
      <JsonLd
        data={[
          breadcrumbLd([["হোম", "/"], ["শপ", "/shop"], ...path.map((c) => [label(c), `/category/${c.slug}`] as [string, string])]),
          {
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name,
            description: cat.seoDesc || excerpt(cat.description) || undefined,
            url: abs(`/category/${cat.slug}`),
            mainEntity: {
              "@type": "ItemList",
              itemListElement: items.map((p, i) => ({ "@type": "ListItem", position: i + 1, url: abs(`/p/${p.slug}`), name: p.nameBn || p.name })),
            },
          },
        ]}
      />

      {/* breadcrumb */}
      <nav aria-label="Breadcrumb" className="mb-6 flex flex-wrap items-center gap-1 text-sm text-brand-900/50">
        <Link href="/" className="hover:text-brand-800">
          হোম
        </Link>
        <ChevronRight className="size-3.5" />
        <Link href="/shop" className="hover:text-brand-800">
          শপ
        </Link>
        {path.map((c, i) => (
          <span key={c.id} className="flex items-center gap-1">
            <ChevronRight className="size-3.5" />
            {i === path.length - 1 ? (
              <span aria-current="page" className="font-medium text-brand-900/80">
                {label(c)}
              </span>
            ) : (
              <Link href={`/category/${c.slug}`} className="hover:text-brand-800">
                {label(c)}
              </Link>
            )}
          </span>
        ))}
      </nav>

      <header className="mx-auto mb-8 max-w-2xl text-center">
        <h1 className="section-title">{name}</h1>
        {cat.description && <p className="mt-3 leading-relaxed whitespace-pre-line text-brand-900/70">{cat.description}</p>}
        <p className="mt-2 text-sm text-brand-900/50">{items.length} টি পণ্য</p>
      </header>

      {/* subcategories */}
      {children.length > 0 && (
        <div className="mb-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {children.map((c) => {
            const img = c.image || thumb(c.id);
            return (
              <Link key={c.id} href={`/category/${c.slug}`} className="group flex items-center gap-3 rounded-2xl border border-brand-900/10 bg-white p-3 transition hover:-translate-y-0.5 hover:border-gold-400 hover:shadow-lg">
                <span className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-cream">{img && <Image src={img} alt={label(c)} fill sizes="56px" className="object-contain p-1.5 transition group-hover:scale-110" />}</span>
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-brand-900">{label(c)}</span>
                  <span className="text-xs text-brand-900/50">{countIn(c.id)} টি পণ্য</span>
                </span>
              </Link>
            );
          })}
        </div>
      )}

      <ShopGrid products={items} categories={categories} chips={children} initialCategory={cat.id} />
    </section>
  );
}
