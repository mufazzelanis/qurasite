import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { getSetting } from "@/lib/settings";
import { pixelLibrary } from "@/lib/pixels";
import { parseBlocks } from "@/lib/page-blocks";
import PageEditor from "@/components/admin/PageEditor";

export default async function EditPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin("landing");
  const { id } = await params;
  const [p, pixels, seo] = await Promise.all([db.page.findUnique({ where: { id } }), pixelLibrary(), getSetting("seo")]);
  if (!p) notFound();
  return (
    <div className="mx-auto max-w-7xl">
      <PageEditor
        pixels={pixels}
        titleSuffix={seo.titleSuffix}
        page={{
          id: p.id,
          title: p.title,
          slug: p.slug,
          excerpt: p.excerpt ?? "",
          blocks: parseBlocks(p.blocks),
          coverImage: p.coverImage ?? "",
          layout: p.layout,
          menu: p.menu,
          sortOrder: p.sortOrder,
          active: p.active,
          seoTitle: p.seoTitle ?? "",
          seoDesc: p.seoDesc ?? "",
          ogImage: p.ogImage ?? "",
          noindex: p.noindex,
          pixelMode: p.pixelMode,
          pixelIds: p.pixelIds,
        }}
      />
    </div>
  );
}
