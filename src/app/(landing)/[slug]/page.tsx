import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLanding, getLandingSlugs } from "@/lib/landing";
import { RESERVED_SLUGS } from "@/lib/settings-defaults";
import SiteChrome from "@/components/site/SiteChrome";
import PageView from "@/components/site/PageView";
import LandingView from "@/components/lp/LandingView";
import { getPageBySlug, getPageSlugs } from "@/lib/pages";
import { pageSource } from "@/lib/pixels";
import { blocksText } from "@/lib/page-blocks";
import { excerpt } from "@/lib/seo";

// Static + cached (ISR). Admin saves call revalidatePath(`/${slug}`) so changes are instant.
export const revalidate = 3600;
export const dynamicParams = true;

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  try {
    const [landings, pages] = await Promise.all([getLandingSlugs(), getPageSlugs()]);
    return [...new Set([...landings, ...pages])].map((slug) => ({ slug }));
  } catch {
    return [];
  }
}

/** /<slug> that is not a landing page → a content page (About, Privacy…) */
async function pageMetadata(slug: string): Promise<Metadata> {
  const p = await getPageBySlug(slug);
  if (!p) return {};
  const title = p.seoTitle || p.title;
  const description = p.seoDesc || p.excerpt || excerpt(blocksText(p.blocks)) || undefined;
  return {
    title: p.seoTitle ? { absolute: p.seoTitle } : p.title,
    description,
    alternates: { canonical: `/${slug}` },
    robots: p.noindex ? { index: false, follow: true } : undefined,
    openGraph: { type: "article", url: `/${slug}`, title, description, images: p.ogImage || p.coverImage ? [p.ogImage || p.coverImage!] : undefined },
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  if (RESERVED_SLUGS.has(slug)) return {};
  const lp = await getLanding(slug).catch(() => null);
  if (!lp) return pageMetadata(slug);
  const title = lp.seoTitle || lp.title;
  const description = lp.seoDesc || lp.content.copy.heroSubtitle;
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: `/${slug}` },
    openGraph: { title, description, images: [lp.content.heroImage || lp.main?.image || "/brand/logo-card-t.png"] },
  };
}

export default async function LandingRoute({ params }: Props) {
  const { slug } = await params;
  if (RESERVED_SLUGS.has(slug)) notFound();
  const lp = await getLanding(slug).catch(() => null);
  if (!lp) {
    const page = await getPageBySlug(slug);
    if (!page) notFound();
    // content page: main-site header/footer, but the page's own pixel choice
    return (
      <SiteChrome source={pageSource(slug)}>
        <PageView page={page} />
      </SiteChrome>
    );
  }
  if (!lp.main) notFound();

  return <LandingView lp={lp as Parameters<typeof LandingView>[0]["lp"]} slug={slug} />;
}
