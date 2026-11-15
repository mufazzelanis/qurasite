import type { Metadata } from "next";
import ShopGrid from "@/components/site/ShopGrid";
import { getActiveProducts, getCategories } from "@/lib/catalog";

export const metadata: Metadata = { title: "শপ — সব পণ্য" };
export const revalidate = 3600;

export default async function ShopPage() {
  const [products, categories] = await Promise.all([getActiveProducts(), getCategories()]);
  return (
    <section className="container-x py-10 sm:py-14">
      <div className="mb-8 text-center">
        <span className="eyebrow">কুঁড়া ফুড শপ</span>
        <h1 className="section-title mt-4">
          প্রকৃতির সেরা, <span className="text-gradient">আপনার জন্য</span>
        </h1>
      </div>
      <ShopGrid products={products} categories={categories} />
    </section>
  );
}
