import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CalendarDays, ChevronDown, ChevronRight, ListTree } from "lucide-react";
import type { ReactNode } from "react";
import { blocksText, youtubeId, type PageBlock } from "@/lib/page-blocks";
import { JsonLd, abs, breadcrumbLd } from "@/lib/seo";
import { cn } from "@/lib/utils";
import LiteVideo from "@/components/lp/LiteVideo";

/** updatedAt may arrive as a string: unstable_cache stores data as JSON */
type PageData = { slug: string; title: string; excerpt: string | null; coverImage: string | null; layout: string; blocks: PageBlock[]; updatedAt: Date | string };

/** Safe inline formatting: **bold** and [text](url) — no raw HTML is ever rendered */
function inline(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /\*\*(.+?)\*\*|\[([^\]]+)\]\(([^)\s]+)\)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[1]) out.push(<strong key={m.index} className="font-semibold text-brand-900">{m[1]}</strong>);
    else {
      const href = m[3];
      const safe = /^(https?:\/\/|\/|#|tel:|mailto:)/i.test(href) ? href : "#";
      const ext = /^https?:\/\//i.test(safe);
      out.push(
        <a key={m.index} href={safe} {...(ext ? { target: "_blank", rel: "noopener noreferrer" } : {})} className="font-medium text-brand-700 underline decoration-gold-400 decoration-2 underline-offset-4 hover:text-brand-900">
          {m[2]}
        </a>,
      );
    }
    last = re.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

const anchor = (b: { id: string }) => `s-${b.id}`;

function Block({ b }: { b: PageBlock }) {
  switch (b.type) {
    case "heading":
      return b.level === 2 ? (
        <h2 id={anchor(b)} className="scroll-mt-28 pt-4 font-display text-2xl font-bold text-brand-900 sm:text-3xl">
          {b.text}
        </h2>
      ) : (
        <h3 id={anchor(b)} className="scroll-mt-28 pt-2 font-display text-xl font-bold text-brand-900">
          {b.text}
        </h3>
      );
    case "text":
      return <p className="leading-relaxed whitespace-pre-line">{inline(b.text)}</p>;
    case "list": {
      const items = b.items.filter((i) => i.trim());
      return b.ordered ? (
        <ol className="space-y-2">
          {items.map((it, i) => (
            <li key={i} className="flex gap-3">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-brand-800 text-sm font-bold text-white">{i + 1}</span>
              <span className="pt-0.5">{inline(it)}</span>
            </li>
          ))}
        </ol>
      ) : (
        <ul className="space-y-2">
          {items.map((it, i) => (
            <li key={i} className="flex gap-3">
              <span className="mt-2.5 size-2 shrink-0 rounded-full bg-gold-500" />
              <span>{inline(it)}</span>
            </li>
          ))}
        </ul>
      );
    }
    case "image":
      return b.src ? (
        <figure>
          <div className="relative overflow-hidden rounded-3xl bg-cream shadow-lg shadow-brand-900/5">
            <Image src={b.src} alt={b.alt || b.caption || ""} width={1200} height={800} sizes="(max-width: 768px) 100vw, 768px" className="h-auto w-full" />
          </div>
          {b.caption && <figcaption className="mt-2 text-center text-sm text-brand-900/50">{b.caption}</figcaption>}
        </figure>
      ) : null;
    case "button":
      return b.label && b.href ? (
        <div className="py-2">
          <Link href={b.href} className={cn(b.style === "primary" ? "btn-gold" : "btn-ghost", "inline-flex")}>
            {b.label} <ArrowRight className="size-4" />
          </Link>
        </div>
      ) : null;
    case "callout": {
      const tone = { info: "bg-sky-50 border-sky-200 text-sky-950", success: "bg-emerald-50 border-emerald-200 text-emerald-950", warning: "bg-amber-50 border-amber-200 text-amber-950" }[b.tone];
      return (
        <div className={cn("flex gap-4 rounded-2xl border-l-4 p-5", tone)}>
          {b.emoji && <span className="text-2xl leading-none">{b.emoji}</span>}
          <p className="leading-relaxed whitespace-pre-line">{inline(b.text)}</p>
        </div>
      );
    }
    case "faq":
      return (
        <div className="space-y-3">
          {b.items
            .filter((i) => i.q.trim())
            .map((it, i) => (
              <details key={i} className="group rounded-2xl border border-brand-900/10 bg-white transition open:shadow-lg open:shadow-brand-900/5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 font-semibold text-brand-900 [&::-webkit-details-marker]:hidden">
                  {it.q}
                  <ChevronDown className="size-5 shrink-0 text-gold-500 transition group-open:rotate-180" />
                </summary>
                <p className="px-5 pb-5 leading-relaxed whitespace-pre-line text-brand-900/70">{inline(it.a)}</p>
              </details>
            ))}
        </div>
      );
    case "video": {
      const id = youtubeId(b.url);
      return id ? (
        <div className="overflow-hidden rounded-3xl shadow-lg">
          <LiteVideo url={b.url} />
        </div>
      ) : null;
    }
    case "divider":
      return <hr className="my-4 border-0 border-t-2 border-dashed border-brand-900/10" />;
  }
}

export default function PageView({ page }: { page: PageData }) {
  const headings = page.blocks.filter((b): b is Extract<PageBlock, { type: "heading" }> => b.type === "heading" && b.level === 2 && !!b.text.trim());
  const faqs = page.blocks.flatMap((b) => (b.type === "faq" ? b.items.filter((i) => i.q.trim() && i.a.trim()) : []));
  const wide = page.layout === "wide";
  const toc = headings.length >= 3;
  const words = blocksText(page.blocks).split(" ").length;
  const updated = new Date(page.updatedAt);

  return (
    <article className="pb-10">
      <JsonLd
        data={[
          breadcrumbLd([
            ["হোম", "/"],
            [page.title, `/${page.slug}`],
          ]),
          { "@context": "https://schema.org", "@type": "WebPage", name: page.title, description: page.excerpt || undefined, url: abs(`/${page.slug}`), dateModified: updated.toISOString(), inLanguage: "bn-BD" },
          ...(faqs.length ? [{ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) }] : []),
        ]}
      />

      {/* hero */}
      <header className="relative overflow-hidden bg-gradient-to-b from-cream to-white">
        <div className="pointer-events-none absolute -top-32 -right-32 size-96 rounded-full bg-gold-300/20 blur-3xl" />
        <div className={cn("container-x relative py-10 sm:py-14", wide ? "" : "max-w-4xl")}>
          <nav aria-label="Breadcrumb" className="mb-5 flex items-center gap-1 text-sm text-brand-900/50">
            <Link href="/" className="hover:text-brand-800">
              হোম
            </Link>
            <ChevronRight className="size-3.5" />
            <span aria-current="page" className="text-brand-900/80">
              {page.title}
            </span>
          </nav>
          <h1 className="section-title">{page.title}</h1>
          {page.excerpt && <p className="mt-4 max-w-2xl text-lg leading-relaxed text-brand-900/70">{page.excerpt}</p>}
          <p className="mt-4 flex items-center gap-2 text-xs text-brand-900/40">
            <CalendarDays className="size-3.5" />
            আপডেট: {updated.toLocaleDateString("bn-BD", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Dhaka" })}
            {words > 150 && <> · {Math.max(1, Math.round(words / 200))} মিনিট পড়ার সময়</>}
          </p>
        </div>
      </header>

      {page.coverImage && (
        <div className={cn("container-x -mt-2 mb-6", wide ? "" : "max-w-4xl")}>
          <div className="relative aspect-[21/9] overflow-hidden rounded-3xl bg-cream shadow-xl shadow-brand-900/10">
            <Image src={page.coverImage} alt={page.title} fill priority sizes="(max-width: 1024px) 100vw, 1024px" className="object-cover" />
          </div>
        </div>
      )}

      <div className={cn("container-x grid gap-10", toc && !wide ? "max-w-6xl lg:grid-cols-[minmax(0,1fr)_240px]" : wide ? "" : "max-w-4xl")}>
        <div className="min-w-0 space-y-5 text-[17px] text-brand-900/80">
          {page.blocks.map((b) => (
            <Block key={b.id} b={b} />
          ))}
          {!page.blocks.length && <p className="text-brand-900/40">এই পেজে এখনো কোনো কনটেন্ট নেই।</p>}
        </div>

        {toc && !wide && (
          <aside className="hidden lg:block">
            <nav className="sticky top-28 rounded-2xl border border-brand-900/10 bg-white p-5" aria-label="Table of contents">
              <p className="mb-3 flex items-center gap-2 text-sm font-bold text-brand-900">
                <ListTree className="size-4 text-gold-500" /> এই পেজে
              </p>
              <ol className="space-y-1.5 border-l-2 border-brand-900/10 text-sm">
                {headings.map((h) => (
                  <li key={h.id}>
                    <a href={`#${anchor(h)}`} className="-ml-0.5 block border-l-2 border-transparent py-0.5 pl-3 text-brand-900/60 transition hover:border-gold-500 hover:text-brand-900">
                      {h.text}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          </aside>
        )}
      </div>
    </article>
  );
}
