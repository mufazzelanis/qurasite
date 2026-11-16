import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLanding } from "@/lib/landing";
import { designByKey } from "@/lib/landing-designs";
import LandingView from "@/components/lp/LandingView";

/**
 * Design preview of a landing page: /preview/<slug>?design=<key>
 * Same content, another design. Never indexed, no pixels, no tracking, order form disabled.
 */
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Preview", robots: { index: false, follow: false } };

export default async function Preview({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ design?: string }> }) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const lp = await getLanding(slug).catch(() => null);
  if (!lp?.main) notFound();
  const design = designByKey(sp.design ?? lp.content.design);
  return (
    <>
      <div className="fixed top-3 left-1/2 z-[60] -translate-x-1/2 rounded-full bg-zinc-900/85 px-4 py-1.5 text-xs font-semibold text-white shadow-lg backdrop-blur">
        Preview · {design.name} · orders disabled
      </div>
      <LandingView lp={lp as Parameters<typeof LandingView>[0]["lp"]} slug={slug} preview={{ design: design.key }} />
    </>
  );
}
