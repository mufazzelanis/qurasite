"use client";
import Image from "next/image";
import { useEffect, useState, useTransition, type ReactNode } from "react";
import { ArrowDown, ArrowUp, BadgeCheck, Gift, GripVertical, Home, Images, Loader2, Megaphone, Plus, Save, Search, Share2, ShieldCheck, Trash2, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { saveSettingsAction } from "@/app/admin/actions";
import type { AllSettings } from "@/lib/settings-defaults";
import { cn } from "@/lib/utils";
import { Toggle } from "./fields";
import { ImageDrop } from "./MediaFields";
import { GooglePreview, LengthMeter, LIMITS, SeoScore, SocialPreview } from "./SeoTools";

type Keys = "mainSite" | "seo" | "thankYou";
type State = Pick<AllSettings, Keys>;

const NAV = [
  ["homepage", "Homepage", Home],
  ["hero", "Hero slider", Images],
  ["badges", "Trust badges", BadgeCheck],
  ["seo", "SEO & sharing", Search],
  ["thanks", "Thank-you page", Gift],
] as const;

const GUIDE_ICONS = ["book", "spoon", "leaf", "heart", "truck", "shield", "phone", "star", "gift"];

export default function MainSiteEditor({ initial }: { initial: State }) {
  const [saved, setSaved] = useState(initial);
  const [v, setV] = useState(initial);
  const [pending, start] = useTransition();
  const [activeNav, setActiveNav] = useState<string>("homepage");

  const dirtyKeys = (Object.keys(v) as Keys[]).filter((k) => JSON.stringify(v[k]) !== JSON.stringify(saved[k]));
  const dirty = dirtyKeys.length > 0;

  const ms = <F extends keyof State["mainSite"]>(f: F, val: State["mainSite"][F]) => setV((o) => ({ ...o, mainSite: { ...o.mainSite, [f]: val } }));
  const seo = <F extends keyof State["seo"]>(f: F, val: State["seo"][F]) => setV((o) => ({ ...o, seo: { ...o.seo, [f]: val } }));
  const ty = <F extends keyof State["thankYou"]>(f: F, val: State["thankYou"][F]) => setV((o) => ({ ...o, thankYou: { ...o.thankYou, [f]: val } }));

  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  // highlight the section in view
  useEffect(() => {
    const els = NAV.map(([id]) => document.getElementById(id)).filter(Boolean) as HTMLElement[];
    const io = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && setActiveNav(e.target.id)), { rootMargin: "-20% 0px -70% 0px" });
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  const save = () =>
    start(async () => {
      try {
        for (const k of dirtyKeys) {
          const r = await saveSettingsAction(k, v[k] as never);
          if (r && "error" in r && r.error) throw new Error(String(r.error));
        }
        setSaved(v);
        toast.success("Saved — live on the website");
      } catch (e) {
        toast.error((e as Error).message || "Could not save");
      }
    });

  const m = v.mainSite;
  const s = v.seo;
  const slides = m.slides;
  const setSlide = (i: number, patch: Partial<(typeof slides)[number]>) => ms("slides", slides.map((o, j) => (j === i ? { ...o, ...patch } : o)));
  const moveSlide = (i: number, d: -1 | 1) => {
    const n = [...slides];
    [n[i], n[i + d]] = [n[i + d], n[i]];
    ms("slides", n);
  };

  const seoChecks = [
    { ok: s.title.length >= LIMITS.title[0] && s.title.length <= LIMITS.title[1], label: "Homepage title is 30–60 characters", hint: `Now ${s.title.length}` },
    { ok: s.description.length >= LIMITS.desc[0] && s.description.length <= LIMITS.desc[1], label: "Description is 120–160 characters", hint: `Now ${s.description.length}` },
    { ok: !!s.ogImage, label: "Share image is set" },
    { ok: !!s.googleVerification, label: "Google Search Console verified", hint: "Paste the verification code below" },
    { ok: s.indexable, label: "Search engines may index the site" },
  ];

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[210px_minmax(0,1fr)]">
      {/* ── section nav ── */}
      <nav className="sticky top-4 z-10 -mx-1 flex gap-1 overflow-x-auto rounded-2xl border border-zinc-200/70 bg-white/90 p-1.5 shadow-sm backdrop-blur lg:top-6 lg:mx-0 lg:flex-col">
        {NAV.map(([id, label, Icon]) => (
          <a
            key={id}
            href={`#${id}`}
            className={cn("flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition", activeNav === id ? "bg-brand-800 text-white shadow-sm" : "text-zinc-600 hover:bg-zinc-100")}
          >
            <Icon className="size-4" /> {label}
          </a>
        ))}
      </nav>

      <div className="min-w-0 space-y-6">
        {/* ── Homepage ── */}
        <Section id="homepage" icon={Megaphone} title="Homepage" desc="The thin bar at the very top and the product section title.">
          <F label="Announcement bar">
            <input value={m.announcement} onChange={(e) => ms("announcement", e.target.value)} className="a-input" />
          </F>
          {m.announcement && (
            <div className="overflow-hidden rounded-xl">
              <p className="truncate bg-brand-900 px-4 py-2 text-center text-xs font-medium text-white">{m.announcement}</p>
            </div>
          )}
          <div className="grid items-end gap-4 sm:grid-cols-2">
            <F label="Featured products title">
              <input value={m.featuredTitle} onChange={(e) => ms("featuredTitle", e.target.value)} className="a-input" />
            </F>
            <div className="pb-2">
              <Toggle label="Show customer reviews" help="Reviews section on the homepage" checked={m.showReviews} onChange={(x) => ms("showReviews", x)} />
            </div>
          </div>
        </Section>

        {/* ── Hero slider ── */}
        <Section
          id="hero"
          icon={Images}
          title="Hero slider"
          desc="Big banners at the top of the homepage. Use wide photos (about 1600×800)."
          action={
            <button type="button" className="a-btn-light !rounded-xl !py-1.5" onClick={() => ms("slides", [...slides, { image: "/brand/spoon.jpg", title: "", subtitle: "", cta: "এখনই কিনুন", link: "/shop" }])}>
              <Plus className="size-4" /> Add slide
            </button>
          }
        >
          {slides.map((sl, i) => (
            <div key={i} className="overflow-hidden rounded-2xl border border-zinc-200">
              <div className="flex items-center gap-2 border-b border-zinc-100 bg-zinc-50/70 px-4 py-2">
                <GripVertical className="size-4 text-zinc-300" />
                <span className="text-sm font-semibold">Slide {i + 1}</span>
                <div className="ml-auto flex gap-1">
                  <Mini label="Move up" disabled={i === 0} onClick={() => moveSlide(i, -1)}>
                    <ArrowUp className="size-3.5" />
                  </Mini>
                  <Mini label="Move down" disabled={i === slides.length - 1} onClick={() => moveSlide(i, 1)}>
                    <ArrowDown className="size-3.5" />
                  </Mini>
                  <Mini label="Remove slide" danger onClick={() => ms("slides", slides.filter((_, j) => j !== i))}>
                    <Trash2 className="size-3.5" />
                  </Mini>
                </div>
              </div>
              <div className="grid gap-5 p-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
                <div className="space-y-3">
                  {/* live banner preview */}
                  <div className="relative aspect-[2/1] overflow-hidden rounded-xl bg-brand-900">
                    {sl.image && <Image src={sl.image} alt="" fill sizes="500px" className="object-cover opacity-90" />}
                    <div className="absolute inset-0 bg-gradient-to-r from-brand-950/85 via-brand-950/40 to-transparent" />
                    <div className="absolute inset-y-0 left-0 flex w-3/4 flex-col justify-center gap-1.5 p-4">
                      <p className="line-clamp-2 text-base leading-tight font-bold text-white">{sl.title || "Slide title"}</p>
                      {sl.subtitle && <p className="line-clamp-2 text-[11px] text-white/80">{sl.subtitle}</p>}
                      {sl.cta && <span className="mt-1 w-fit rounded-full bg-gold-400 px-3 py-1 text-[11px] font-bold text-brand-950">{sl.cta}</span>}
                    </div>
                  </div>
                  <ImageDrop value={sl.image} onChange={(x) => setSlide(i, { image: x })} aspect="aspect-[3/1]" hint="Wide photo · 1600×800" />
                </div>
                <div className="space-y-3">
                  <F label="Title">
                    <input value={sl.title} onChange={(e) => setSlide(i, { title: e.target.value })} className="a-input" />
                  </F>
                  <F label="Subtitle">
                    <textarea rows={2} value={sl.subtitle} onChange={(e) => setSlide(i, { subtitle: e.target.value })} className="a-input" />
                  </F>
                  <div className="grid grid-cols-2 gap-3">
                    <F label="Button text">
                      <input value={sl.cta} onChange={(e) => setSlide(i, { cta: e.target.value })} className="a-input" />
                    </F>
                    <F label="Button link">
                      <input value={sl.link} onChange={(e) => setSlide(i, { link: e.target.value })} placeholder="/shop" className="a-input" />
                    </F>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {!slides.length && <Empty>No slides — the homepage shows the featured product instead.</Empty>}
        </Section>

        {/* ── Trust badges ── */}
        <Section
          id="badges"
          icon={ShieldCheck}
          title="Trust badges"
          desc="Short promises shown in a row under the slider."
          action={
            <button type="button" className="a-btn-light !rounded-xl !py-1.5" onClick={() => ms("trustBadges", [...m.trustBadges, { emoji: "✨", title: "", text: "" }])}>
              <Plus className="size-4" /> Add
            </button>
          }
        >
          <div className="grid gap-3 sm:grid-cols-2">
            {m.trustBadges.map((b, i) => (
              <div key={i} className="group relative flex gap-3 rounded-2xl border border-zinc-200 bg-gradient-to-br from-white to-zinc-50/80 p-3">
                <input
                  value={b.emoji}
                  onChange={(e) => ms("trustBadges", m.trustBadges.map((o, j) => (j === i ? { ...o, emoji: e.target.value } : o)))}
                  aria-label="Emoji"
                  className="size-12 shrink-0 rounded-xl border border-zinc-200 bg-white text-center text-2xl outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/15"
                />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <input value={b.title} onChange={(e) => ms("trustBadges", m.trustBadges.map((o, j) => (j === i ? { ...o, title: e.target.value } : o)))} placeholder="Title" className="a-input !py-1.5 font-semibold" />
                  <input value={b.text} onChange={(e) => ms("trustBadges", m.trustBadges.map((o, j) => (j === i ? { ...o, text: e.target.value } : o)))} placeholder="Short text" className="a-input !py-1.5 !text-xs" />
                </div>
                <div className="flex flex-col gap-1 opacity-60 transition group-hover:opacity-100">
                  <Mini label="Move up" disabled={i === 0} onClick={() => { const n = [...m.trustBadges]; [n[i - 1], n[i]] = [n[i], n[i - 1]]; ms("trustBadges", n); }}>
                    <ArrowUp className="size-3.5" />
                  </Mini>
                  <Mini label="Remove" danger onClick={() => ms("trustBadges", m.trustBadges.filter((_, j) => j !== i))}>
                    <Trash2 className="size-3.5" />
                  </Mini>
                </div>
              </div>
            ))}
          </div>
          {!m.trustBadges.length && <Empty>No badges.</Empty>}
        </Section>

        {/* ── SEO ── */}
        <Section id="seo" icon={Share2} title="SEO & social sharing" desc="How the homepage looks on Google and when the link is shared on Facebook / WhatsApp.">
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_260px]">
            <div className="space-y-4">
              <GooglePreview title={s.title} desc={s.description} path="" image={s.ogImage} />
              <F label="Homepage title">
                <input value={s.title} onChange={(e) => seo("title", e.target.value)} className="a-input" />
                <LengthMeter len={s.title.length} limits={LIMITS.title} />
              </F>
              <F label="Homepage description">
                <textarea rows={3} value={s.description} onChange={(e) => seo("description", e.target.value)} className="a-input" />
                <LengthMeter len={s.description.length} limits={LIMITS.desc} />
              </F>
              <div className="grid gap-4 sm:grid-cols-2">
                <F label="Title suffix" help={`Other pages: "Product name | ${s.titleSuffix || "…"}"`}>
                  <input value={s.titleSuffix} onChange={(e) => seo("titleSuffix", e.target.value)} className="a-input" />
                </F>
                <F label="Keywords" help="Comma separated — mainly for Bing">
                  <input value={s.keywords} onChange={(e) => seo("keywords", e.target.value)} className="a-input" />
                </F>
              </div>
            </div>
            <div className="rounded-2xl border border-zinc-200 p-4">
              <SeoScore checks={seoChecks} />
            </div>
          </div>

          <div className="grid gap-5 border-t border-zinc-100 pt-5 md:grid-cols-2">
            <div className="space-y-2">
              <p className="text-sm font-medium text-zinc-700">Share image</p>
              <ImageDrop value={s.ogImage} onChange={(x) => seo("ogImage", x)} aspect="aspect-[1.91/1]" hint="1200×630 px" />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-zinc-700">Facebook / WhatsApp preview</p>
              <SocialPreview title={s.title} desc={s.description} image={s.ogImage} />
            </div>
          </div>

          <div className="grid gap-4 border-t border-zinc-100 pt-5 sm:grid-cols-2">
            <F label="Google Search Console code" help={'Only the content="…" value of the meta tag'}>
              <input value={s.googleVerification} onChange={(e) => seo("googleVerification", e.target.value.replace(/.*content="([^"]+)".*/, "$1"))} className="a-input font-mono !text-xs" />
            </F>
            <F label="Bing Webmaster code">
              <input value={s.bingVerification} onChange={(e) => seo("bingVerification", e.target.value.replace(/.*content="([^"]+)".*/, "$1"))} className="a-input font-mono !text-xs" />
            </F>
          </div>
          <div className={cn("rounded-xl p-4", s.indexable ? "bg-emerald-50/60 ring-1 ring-emerald-100" : "bg-rose-50 ring-1 ring-rose-200")}>
            <Toggle label="Allow search engines to index the site" help={s.indexable ? "sitemap.xml and robots.txt are live for Google." : "⚠ Hidden from Google — turn on before going live!"} checked={s.indexable} onChange={(x) => seo("indexable", x)} />
          </div>
        </Section>

        {/* ── Thank-you ── */}
        <Section id="thanks" icon={Gift} title="Thank-you page" desc="Shown right after every order (main site + landing pages).">
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
            <div className="space-y-4">
              <F label="Heading">
                <input value={v.thankYou.heading} onChange={(e) => ty("heading", e.target.value)} className="a-input" />
              </F>
              <F label="Sub-heading">
                <input value={v.thankYou.subheading} onChange={(e) => ty("subheading", e.target.value)} className="a-input" />
              </F>
              <F label="Cash-on-delivery note">
                <input value={v.thankYou.codNote} onChange={(e) => ty("codNote", e.target.value)} className="a-input" />
              </F>
              <F label="Guide links title" help="Leave the list empty to hide this box">
                <input value={v.thankYou.guidesTitle} onChange={(e) => ty("guidesTitle", e.target.value)} className="a-input" />
              </F>
            </div>
            {/* preview */}
            <div className="rounded-2xl bg-gradient-to-b from-emerald-50 to-white p-4 text-center ring-1 ring-emerald-100">
              <span className="mx-auto grid size-11 place-items-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/30">
                <BadgeCheck className="size-6" />
              </span>
              <p className="mt-3 text-sm font-bold text-brand-900">{v.thankYou.heading}</p>
              <p className="mt-1 text-xs text-zinc-500">{v.thankYou.subheading}</p>
              <p className="mt-3 rounded-lg bg-white px-2 py-1.5 text-[11px] text-zinc-600 ring-1 ring-zinc-200">{v.thankYou.codNote}</p>
            </div>
          </div>

          <div className="space-y-3 border-t border-zinc-100 pt-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Guide links</p>
              <button type="button" className="a-btn-light !rounded-xl !py-1.5" onClick={() => ty("guides", [...v.thankYou.guides, { icon: "book", title: "", subtitle: "", href: "/" }])}>
                <Plus className="size-4" /> Add link
              </button>
            </div>
            {v.thankYou.guides.map((g, i) => {
              const setG = (patch: Partial<typeof g>) => ty("guides", v.thankYou.guides.map((o, j) => (j === i ? { ...o, ...patch } : o)));
              return (
                <div key={i} className="grid gap-2 rounded-2xl border border-zinc-200 p-3 sm:grid-cols-[130px_1fr_1fr_auto]">
                  <select value={g.icon} onChange={(e) => setG({ icon: e.target.value })} className="a-input" aria-label="Icon">
                    {GUIDE_ICONS.map((ic) => (
                      <option key={ic}>{ic}</option>
                    ))}
                  </select>
                  <div className="space-y-2">
                    <input value={g.title} onChange={(e) => setG({ title: e.target.value })} placeholder="Title" className="a-input font-medium" />
                    <input value={g.subtitle} onChange={(e) => setG({ subtitle: e.target.value })} placeholder="Short description" className="a-input !text-xs" />
                  </div>
                  <input value={g.href} onChange={(e) => setG({ href: e.target.value })} placeholder="/how-to-use" className="a-input h-fit font-mono !text-xs" />
                  <div className="flex gap-1 sm:flex-col">
                    <Mini label="Move up" disabled={i === 0} onClick={() => { const n = [...v.thankYou.guides]; [n[i - 1], n[i]] = [n[i], n[i - 1]]; ty("guides", n); }}>
                      <ArrowUp className="size-3.5" />
                    </Mini>
                    <Mini label="Remove" danger onClick={() => ty("guides", v.thankYou.guides.filter((_, j) => j !== i))}>
                      <Trash2 className="size-3.5" />
                    </Mini>
                  </div>
                </div>
              );
            })}
            {!v.thankYou.guides.length && <Empty>No guide links — the box is hidden.</Empty>}
          </div>
        </Section>

        {/* ── save bar ── */}
        <div className={cn("sticky bottom-4 z-20 transition", dirty ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-2 opacity-0")}>
          <div className="ml-auto flex w-fit items-center gap-3 rounded-2xl border border-zinc-200 bg-white/95 p-2 pl-4 shadow-2xl shadow-zinc-900/15 backdrop-blur">
            <span className="text-sm font-medium text-amber-600">● Unsaved changes</span>
            <button type="button" onClick={() => setV(saved)} disabled={pending} className="a-btn-light !rounded-xl !py-1.5">
              <Undo2 className="size-4" /> Discard
            </button>
            <button type="button" onClick={save} disabled={pending} className="a-btn !rounded-xl !py-1.5">
              {pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Save changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ id, icon: Icon, title, desc, action, children }: { id: string; icon: typeof Home; title: string; desc?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-6 rounded-2xl border border-zinc-200/70 bg-white shadow-sm">
      <header className="flex flex-wrap items-center gap-3 border-b border-zinc-100 px-5 py-4">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700 ring-1 ring-brand-100">
          <Icon className="size-4.5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold leading-tight">{title}</h2>
          {desc && <p className="mt-0.5 text-xs text-zinc-500">{desc}</p>}
        </div>
        {action}
      </header>
      <div className="space-y-4 p-5">{children}</div>
    </section>
  );
}

function F({ label, help, children }: { label: string; help?: string; children: ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1.5 block font-medium text-zinc-700">{label}</span>
      {children}
      {help && <span className="mt-1.5 block text-xs text-zinc-400">{help}</span>}
    </label>
  );
}

function Mini({ label, onClick, disabled, danger, children }: { label: string; onClick: () => void; disabled?: boolean; danger?: boolean; children: ReactNode }) {
  return (
    <button type="button" title={label} aria-label={label} disabled={disabled} onClick={onClick} className={cn("grid size-7 place-items-center rounded-lg transition disabled:opacity-30", danger ? "text-rose-500 hover:bg-rose-50" : "text-zinc-500 hover:bg-zinc-100")}>
      {children}
    </button>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-xl border border-dashed border-zinc-200 py-6 text-center text-sm text-zinc-400">{children}</p>;
}
