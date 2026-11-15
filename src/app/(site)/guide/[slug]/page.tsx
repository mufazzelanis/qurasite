import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";

export const revalidate = 3600;
type Props = { params: Promise<{ slug: string }> };

const getGuide = unstable_cache(async (slug: string) => db.guidePage.findFirst({ where: { slug, active: true } }).catch(() => null), ["guide"], { tags: ["guide"], revalidate: 3600 });

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const g = await getGuide((await params).slug);
  return g ? { title: g.title } : {};
}

/** Very small formatter: "## " headings, "- " bullets, blank line = paragraph */
function render(md: string) {
  return md.split(/\n{2,}/).map((block, i) => {
    if (block.startsWith("## ")) return <h2 key={i} className="mt-8 font-display text-2xl font-bold text-brand-900">{block.slice(3)}</h2>;
    if (block.split("\n").every((l) => l.startsWith("- ")))
      return (
        <ul key={i} className="list-inside list-disc space-y-1">
          {block.split("\n").map((l, k) => <li key={k}>{l.slice(2)}</li>)}
        </ul>
      );
    return <p key={i} className="whitespace-pre-line">{block}</p>;
  });
}

export default async function GuidePage({ params }: Props) {
  const g = await getGuide((await params).slug);
  if (!g) notFound();
  return (
    <article className="container-x max-w-3xl py-12">
      <h1 className="section-title mb-6">{g.title}</h1>
      <div className="card space-y-4 p-6 leading-relaxed text-brand-900/80 sm:p-10">{render(g.content)}</div>
    </article>
  );
}
