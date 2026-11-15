import { notFound, permanentRedirect } from "next/navigation";
import { db } from "@/lib/db";

/** Old /guide/<slug> links (thank-you page, ads, Google) → the page's new address /<slug> */
export default async function OldGuideRedirect({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = await db.page.findFirst({ where: { slug, active: true }, select: { slug: true } }).catch(() => null);
  if (!page) notFound();
  permanentRedirect(`/${page.slug}`);
}
