import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { mergeLandingContent } from "@/lib/settings-defaults";
import LandingEditor from "@/components/admin/LandingEditor";
import { pixelLibrary } from "@/lib/pixels";

export default async function EditLanding({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin("landing");
  const { id } = await params;
  const [lp, products, pixels] = await Promise.all([
    db.landingPage.findUnique({ where: { id } }),
    db.product.findMany({ select: { id: true, name: true, nameBn: true, price: true, image: true, isAddon: true, active: true }, orderBy: [{ isAddon: "asc" }, { sortOrder: "asc" }] }),
    pixelLibrary(),
  ]);
  if (!lp) notFound();
  return (
    <div className="max-w-5xl space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/admin/landing" className="a-btn-light !px-2.5"><ArrowLeft className="size-4" /></Link>
        <h1 className="text-2xl font-bold">{lp.title}</h1>
      </div>
      <LandingEditor lp={{ ...lp, content: mergeLandingContent(lp.content) }} products={products} siteUrl={process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"} pixels={pixels} />
    </div>
  );
}
