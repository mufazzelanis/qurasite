import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import HeroSlider from "@/components/shop/HeroSlider";
import ProductCard from "@/components/shop/ProductCard";
import { Benefits, Reviews, TrustMarquee } from "@/components/lp/LpSections";
import { getActiveProducts, getActiveReviews, getCategories } from "@/lib/catalog";
import { getLandingSlugs } from "@/lib/landing";
import { getSetting } from "@/lib/settings";
import { taka } from "@/lib/utils";
import { JsonLd, abs } from "@/lib/seo";
import { descendantIds } from "@/lib/category-tree";

export const revalidate = 3600;

export default async function Home() {
  const [main, landing, products, categories, reviews, slugs, site, seo] = await Promise.all([
    getSetting("mainSite"),
    getSetting("landing"),
    getActiveProducts(),
    getCategories(),
    getActiveReviews(),
    getLandingSlugs().catch(() => [] as string[]),
    getSetting("site"),
    getSetting("seo"),
  ]);
  const mains = products.filter((p) => !p.isAddon);
  const addons = products.filter((p) => p.isAddon);
  const hero = mains.find((p) => p.featured) || mains[0];
  const comboLink = slugs[0] ? `/${slugs[0]}#combo` : "/shop";
  // homepage tiles: categories marked "featured", otherwise the top level
  const featuredCats = categories.filter((c) => c.featured);
  const homeCats = (featuredCats.length ? featuredCats : categories.filter((c) => !c.parentId)).sort((a, b) => a.sortOrder - b.sortOrder);
  const sameAs =[site.facebook, site.instagram, site.youtube, site.tiktok].filter(Boolean);

  return (
    <>
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "Organization",
            name: site.name,
            alternateName: site.nameBn,
            url: abs("/"),
            logo: abs("/icon.png"),
            image: abs(seo.ogImage || "/icon.png"),
            description: seo.description,
            email: site.email || undefined,
            telephone: site.phone || undefined,
            address: site.address ? { "@type": "PostalAddress", streetAddress: site.address, addressCountry: "BD" } : undefined,
            sameAs: sameAs.length ? sameAs : undefined,
            contactPoint: site.phone ? { "@type": "ContactPoint", telephone: site.phone, contactType: "customer service", areaServed: "BD", availableLanguage: ["Bengali", "English"] } : undefined,
          },
          { "@context": "https://schema.org", "@type": "WebSite", name: site.name, alternateName: site.nameBn, url: abs("/"), inLanguage: "bn-BD" },
        ]}
      />
      <h1 className="sr-only">{seo.title}</h1>
      <section className="container-x pt-4 sm:pt-6">
        <HeroSlider slides={main.slides} />
      </section>

      <section className="container-x grid grid-cols-2 gap-3 py-8 sm:py-10 lg:grid-cols-4">
        {main.trustBadges.map((b, i) => (
          <div key={i} className="card flex items-center gap-3 p-4">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-gold-100 text-2xl">{b.emoji}</span>
            <div>
              <p className="font-display font-bold leading-tight text-brand-900">{b.title}</p>
              <p className="text-xs text-brand-900/55">{b.text}</p>
            </div>
          </div>
        ))}
      </section>

      {homeCats.length > 0 && (
        <section className="container-x pb-6">
          <div className="flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none]">
            {homeCats.map((c) => {
              const scope = descendantIds(categories, c.id);
              const inCat = products.filter((p) => p.categoryId && scope.has(p.categoryId));
              const img = c.image || inCat[0]?.image;
              return (
                <Link key={c.id} href={`/category/${c.slug}`} className="group flex w-36 shrink-0 flex-col items-center gap-2 rounded-3xl border border-brand-900/10 bg-white p-3 text-center transition hover:-translate-y-1 hover:border-gold-400 hover:shadow-xl hover:shadow-brand-900/10 sm:w-44">
                  <span className="relative aspect-square w-full overflow-hidden rounded-2xl bg-gradient-to-br from-cream to-gold-50">{img && <Image src={img} alt={c.nameBn || c.name} fill sizes="176px" className="object-contain p-3 transition duration-500 group-hover:scale-110" />}</span>
                  <span className="line-clamp-1 font-semibold text-brand-900">{c.nameBn || c.name}</span>
                  <span className="-mt-1.5 text-xs text-brand-900/50">{inCat.length} টি পণ্য</span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      <section className="container-x py-6">
        <div className="mb-6 flex items-end justify-between">
          <h2 className="section-title !text-2xl sm:!text-4xl">{main.featuredTitle}</h2>
          <Link href="/shop" className="flex items-center gap-1 font-semibold text-brand-700 hover:underline">
            সব দেখুন <ArrowRight className="size-4" />
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
          {mains.slice(0, 8).map((p, i) => (
            <ProductCard key={p.id} p={p} priority={i < 2} />
          ))}
        </div>
      </section>

      {hero && addons.length > 0 && (
        <section className="container-x py-10">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-800 to-brand-950 p-6 text-white sm:p-12">
            <div className="absolute -right-20 -top-20 size-80 rounded-full bg-gold-500/20 blur-3xl" />
            <div className="relative grid items-center gap-8 md:grid-cols-[1.2fr_1fr]">
              <div>
                <span className="eyebrow bg-white/10 text-gold-300">
                  <Sparkles className="size-4" /> পারফেক্ট কম্বো
                </span>
                <h2 className="mt-4 font-display text-3xl font-extrabold leading-tight sm:text-5xl">
                  কুঁড়া + মধু + গুড় = <span className="text-gold-400">স্বাদ দ্বিগুণ</span>
                </h2>
                <p className="mt-3 max-w-lg text-white/75">চিনির বদলে প্রাকৃতিক মিষ্টতা। কুঁড়ার সাথে নিলেই মধু ও গুড়ে বিশেষ কম্বো দাম।</p>
                <Link href={comboLink} className="btn-gold shine mt-6 px-8 py-4 text-lg">
                  কম্বো বানান <ArrowRight className="size-5" />
                </Link>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[hero, ...addons.slice(0, 2)].map((p) => (
                  <div key={p.id} className="rounded-2xl bg-white/10 p-3 text-center backdrop-blur">
                    <div className="relative mx-auto aspect-square w-full">
                      <Image src={p.image} alt={p.name} fill sizes="150px" className="object-contain" />
                    </div>
                    <p className="mt-2 line-clamp-1 text-xs font-semibold sm:text-sm">{(p.nameBn || p.name).split(/[—-]/)[0]}</p>
                    <p className="font-display font-bold text-gold-300">{taka(p.isAddon && p.comboPrice ? p.comboPrice : p.price)}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {addons.length > 0 && (
        <section className="container-x py-6">
          <h2 className="section-title mb-6 !text-2xl sm:!text-4xl">মধু ও গুড়</h2>
          <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
            {addons.map((p) => (
              <ProductCard key={p.id} p={p} />
            ))}
          </div>
        </section>
      )}

      <div className="py-10">
        <TrustMarquee />
      </div>
      <Benefits items={landing.benefits} />
      {main.showReviews && <Reviews reviews={reviews} />}
    </>
  );
}
