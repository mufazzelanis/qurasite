import Image from "next/image";
import { MessageCircle, Phone } from "lucide-react";
import type { getLanding } from "@/lib/landing";
import { getActiveReviews } from "@/lib/catalog";
import { getPublicTracking, getSetting } from "@/lib/settings";
import LpHero from "@/components/lp/LpHero";
import { Benefits, Faq, HowTo, Ingredients, PromiseSection, Reviews, Stats, TrustMarquee } from "@/components/lp/LpSections";
import PerfectPair from "@/components/lp/PerfectPair";
import StickyBar from "@/components/lp/StickyBar";
import LiteVideo from "@/components/lp/LiteVideo";
import LandingOrderForm from "@/components/order/LandingOrderForm";
import Tracker from "@/components/tracking/Tracker";
import TrackingScripts from "@/components/tracking/TrackingScripts";
import ViewContent from "@/components/tracking/ViewContent";
import { designByKey, designStyle } from "@/lib/landing-designs";
import { cn } from "@/lib/utils";

type Landing = NonNullable<Awaited<ReturnType<typeof getLanding>>> & { main: NonNullable<NonNullable<Awaited<ReturnType<typeof getLanding>>>["main"]> };

/**
 * A landing page. With `preview`, it renders in another design for the admin preview —
 * no pixels, no visitor tracking, no ViewContent (so previews never pollute ad data).
 */
export default async function LandingView({ lp, slug, preview }: { lp: Landing; slug: string; preview?: { design: string } }) {
  const [site, delivery, payments, tracking, reviews] = await Promise.all([
    getSetting("site"),
    getSetting("delivery"),
    getSetting("payments"),
    preview ? Promise.resolve(null) : getPublicTracking(lp.slug),
    lp.content.sections.reviews ? getActiveReviews() : Promise.resolve([]),
  ]);
  const c = lp.content;
  const s = c.sections;
  const comboOn = c.combo.enabled && s.combo && lp.addons.length > 0;
  const designKey = preview?.design ?? c.design;
  const design = designByKey(designKey);
  // previewing another design → that design's own colors; same design → the page's colors
  const ownColors = !preview || preview.design === c.design;
  const theme = designStyle(designKey, ownColors ? c.primary : design.primary, ownColors ? c.accent : design.accent) as React.CSSProperties;

  return (
    <div style={theme} data-design={design.key} className={cn("min-h-screen bg-cream pb-20 text-brand-900 sm:pb-0", design.dark && "[color-scheme:dark]")}>
      {tracking && (
        <>
          <TrackingScripts {...tracking} slug={lp.slug} />
          <Tracker slug={slug} />
          <ViewContent id={lp.main.id} name={lp.main.name} value={lp.main.price} />
        </>
      )}

      {/* minimal header — fast, no menu JS */}
      <header className="sticky top-0 z-40 border-b border-brand-900/5 bg-cream/90 backdrop-blur">
        <div className="container-x flex h-14 items-center justify-between sm:h-16">
          <Image src="/brand/logo-bn-t.png" alt={site.nameBn} width={140} height={50} priority className="h-9 w-auto sm:h-11" />
          <div className="flex items-center gap-2">
            <a href={`tel:${site.phone}`} data-track="call" className="hidden items-center gap-1.5 text-sm font-semibold text-brand-800 sm:flex">
              <Phone className="size-4" /> {site.phone}
            </a>
            <a href="#order" data-track="order_button" className="btn-gold !px-4 !py-2 text-sm">
              অর্ডার করুন
            </a>
          </div>
        </div>
      </header>

      <LpHero layout={design.hero} copy={c.copy} image={c.heroImage || lp.main.image} price={lp.main.price} comparePrice={lp.main.comparePrice} />
      <TrustMarquee />
      {c.videoUrl && (
        <section className="container-x max-w-4xl pt-12">
          <LiteVideo url={c.videoUrl} />
        </section>
      )}
      {s.stats && <Stats stats={c.copy.stats} />}
      {s.ingredients && <Ingredients items={c.copy.ingredients} />}
      {s.benefits && <Benefits items={c.copy.benefits} />}
      {s.howto && <HowTo steps={c.copy.steps} />}
      {comboOn && <PerfectPair main={lp.main} addons={lp.addons} cfg={c.combo} />}
      {s.promise && <PromiseSection />}
      {s.reviews && <Reviews reviews={reviews} />}
      {s.faq && <Faq faqs={c.copy.faqs} />}

      {/* preview: the form is visible but can't be used — no test orders from design previews */}
      <section id="order" inert={!!preview} className="relative scroll-mt-16 py-14 sm:py-20">
        <div className="absolute inset-0 bg-gradient-to-b from-gold-50 to-cream" />
        <div className="container-x relative">
          <div className="mx-auto mb-8 max-w-2xl text-center">
            <span className="eyebrow">👇 {c.orderTitle}</span>
            <h2 className="section-title mt-4">
              আজই শুরু করুন <span className="text-gradient">সুস্থ অভ্যাস</span>
            </h2>
            <p className="mt-2 text-brand-900/60">{c.orderSubtitle}</p>
          </div>
          <LandingOrderForm
            products={lp.mains}
            addons={comboOn ? lp.addons : []}
            delivery={delivery}
            payments={payments}
            combo={{ enabled: comboOn, bumpTitle: c.combo.bumpTitle, bumpText: c.combo.bumpText }}
            source={slug}
            defaultProductId={lp.main.id}
          />
        </div>
      </section>

      <footer className="bg-brand-900 py-8 text-center text-sm text-white/60">
        <p>
          {site.nameBn} • {site.address}
        </p>
        <p className="mt-1">
          হেল্পলাইন:{" "}
          <a href={`tel:${site.phone}`} data-track="call" className="font-semibold text-gold-300">
            {site.phone}
          </a>
        </p>
        <p className="mt-3 text-white/40">© {new Date().getFullYear()} {site.name}</p>
      </footer>

      <a
        href={`https://wa.me/${site.whatsapp}`}
        target="_blank"
        rel="noreferrer"
        data-track="whatsapp"
        className="fixed bottom-24 right-3 z-40 grid size-13 place-items-center rounded-full bg-[#25D366] text-white shadow-xl sm:bottom-6 sm:right-6 sm:size-14"
        aria-label="WhatsApp"
      >
        <MessageCircle className="size-6" />
      </a>
      <StickyBar text={c.stickyText} price={lp.main.price} phone={site.phone} />
    </div>
  );
}
