import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ShopGrid from "@/components/site/ShopGrid";
import { getActiveProducts, getCategories } from "@/lib/catalog";

export const revalidate = 3600;
type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const c = (await getCategories()).find((x) => x.slug === slug);
  return c ? { title: c.nameBn || c.name } : {};
}

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params;
  const [products, categories] = await Promise.all([getActiveProducts(), getCategories()]);
  const cat = categories.find((c) => c.slug === slug);
  if (!cat) notFound();
  return (
    <section className="container-x py-10 sm:py-14">
      <h1 className="section-title mb-8 text-center">{cat.nameBn || cat.name}</h1>
      <ShopGrid products={products} categories={categories} initialCategory={cat.id} />
    </section>
  );
}
