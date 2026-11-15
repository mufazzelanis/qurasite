import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { getSetting } from "@/lib/settings";
import ProductForm from "@/components/admin/ProductForm";

export default async function EditProduct({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin("products");
  const { id } = await params;
  const [product, categories, seo] = await Promise.all([
    id === "new" ? null : db.product.findUnique({ where: { id } }),
    db.category.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true, nameBn: true, slug: true, parentId: true, sortOrder: true } }),
    getSetting("seo"),
  ]);
  if (id !== "new" && !product) notFound();
  return (
    <div className="mx-auto max-w-6xl">
      <ProductForm product={product} categories={categories} titleSuffix={seo.titleSuffix} />
    </div>
  );
}
