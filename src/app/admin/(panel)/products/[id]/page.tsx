import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import ProductForm from "@/components/admin/ProductForm";

export default async function EditProduct({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin("products");
  const { id } = await params;
  const [product, categories] = await Promise.all([id === "new" ? null : db.product.findUnique({ where: { id } }), db.category.findMany({ orderBy: { sortOrder: "asc" } })]);
  if (id !== "new" && !product) notFound();
  return (
    <div className="max-w-3xl space-y-5">
      <h1 className="text-2xl font-bold">{product ? "Edit product" : "New product"}</h1>
      <ProductForm product={product} categories={categories} />
    </div>
  );
}
