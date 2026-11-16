"use client";
import Image from "next/image";
import { useState } from "react";
import { Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { saveLanding } from "@/app/admin/actions";
import type { LandingContent } from "@/lib/settings-defaults";
import { cn, taka } from "@/lib/utils";
import { AreaF, ImageField, ListEditor, SaveBar, TextF, Toggle } from "./fields";
import PixelPicker, { type LibPixel, type PixelMode } from "./PixelPicker";
import DesignMock from "./DesignMock";
import { LANDING_DESIGNS } from "@/lib/landing-designs";

type P = { id: string; name: string; nameBn: string | null; price: number; image: string; isAddon: boolean; active: boolean };
type LP = { id: string; slug: string; title: string; active: boolean; productId: string; extraIds: string[]; addonIds: string[]; pixelMode: string; pixelIds: string[]; seoTitle: string | null; seoDesc: string | null; content: LandingContent };

const TABS = ["Basic", "Products", "Design & sections", "Texts", "Lists", "Combo"] as const;
const SECTIONS: [keyof LandingContent["sections"], string][] = [
  ["stats", "Stats counters"],
  ["ingredients", "Ingredients"],
  ["benefits", "Benefits"],
  ["howto", "How to use"],
  ["combo", "Perfect Pair combo (honey/gur)"],
  ["promise", "Our promise"],
  ["reviews", "Reviews"],
  ["faq", "FAQ"],
];

export default function LandingEditor({ lp, products, siteUrl, pixels }: { lp: LP; products: P[]; siteUrl: string; pixels: LibPixel[] }) {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Basic");
  const [v, setV] = useState(lp);
  const c = v.content;
  const setC = <K extends keyof LandingContent>(k: K, val: LandingContent[K]) => setV((p) => ({ ...p, content: { ...p.content, [k]: val } }));
  const setCopy = <K extends keyof LandingContent["copy"]>(k: K, val: LandingContent["copy"][K]) => setC("copy", { ...c.copy, [k]: val });
  const setCombo = <K extends keyof LandingContent["combo"]>(k: K, val: LandingContent["combo"][K]) => setC("combo", { ...c.combo, [k]: val });
  const url = `${siteUrl.replace(/\/$/, "")}/${v.slug}`;
  const mains = products.filter((p) => !p.isAddon);
  const addons = products.filter((p) => p.isAddon);
  const toggleIn = (arr: string[], id: string) => (arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]);

  return (
    <div className="space-y-4">
      <div className="a-card flex flex-wrap items-center gap-3">
        <span className="text-sm text-zinc-500">Live URL:</span>
        <a href={`/${lp.slug}`} target="_blank" className="font-mono text-sm font-semibold text-brand-700 hover:underline">{url}</a>
        <button type="button" onClick={() => navigator.clipboard.writeText(url).then(() => toast.success("Link copied"))} className="a-btn-light !py-1"><Copy className="size-3.5" /> Copy</button>
        <a href={`/${lp.slug}`} target="_blank" className="a-btn-light !py-1"><ExternalLink className="size-3.5" /> Open</a>
        <span className={cn("ml-auto rounded-full px-2.5 py-0.5 text-xs font-semibold", v.active ? "bg-emerald-100 text-emerald-700" : "bg-zinc-200 text-zinc-600")}>{v.active ? "Published" : "Hidden"}</span>
      </div>

      <div className="flex gap-1 overflow-x-auto rounded-xl bg-white p-1 shadow-sm">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={cn("shrink-0 rounded-lg px-4 py-2 text-sm font-medium", tab === t ? "bg-brand-700 text-white" : "text-zinc-600 hover:bg-zinc-100")}>{t}</button>
        ))}
      </div>

      {tab === "Basic" && (
        <div className="a-card grid gap-4 sm:grid-cols-2">
          <TextF label="Page title (internal + browser tab)" value={v.title} onChange={(x) => setV({ ...v, title: x })} />
          <label className="block text-sm">
            <span className="font-medium text-zinc-700">URL (slug)</span>
            <div className="mt-1 flex items-center overflow-hidden rounded-lg border border-zinc-300 focus-within:border-brand-600">
              <span className="bg-zinc-50 px-3 py-2 text-sm text-zinc-500">{siteUrl.replace(/^https?:\/\//, "").replace(/\/$/, "")}/</span>
              <input value={v.slug} onChange={(e) => setV({ ...v, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })} className="flex-1 px-2 py-2 text-sm outline-none" />
            </div>
          </label>
          <Toggle label="Published" checked={v.active} onChange={(x) => setV({ ...v, active: x })} help="Hidden pages show 404 to customers" />
          <TextF label="SEO title" value={v.seoTitle || ""} onChange={(x) => setV({ ...v, seoTitle: x })} />
          <TextF label="SEO / share description" value={v.seoDesc || ""} onChange={(x) => setV({ ...v, seoDesc: x })} />
          <div className="sm:col-span-2">
            <p className="mb-1 text-sm font-medium text-zinc-700">Facebook pixel for this landing page</p>
            <p className="mb-3 text-xs text-zinc-500">Browser pixel and Conversions API both follow this choice — PageView, ViewContent, checkout and Purchase from this page go only to these pixels.</p>
            <PixelPicker mode={v.pixelMode as PixelMode} ids={v.pixelIds} library={pixels} onChange={(m, ids) => setV({ ...v, pixelMode: m, pixelIds: ids })} />
          </div>
        </div>
      )}

      {tab === "Products" && (
        <div className="space-y-4">
          <div className="a-card">
            <h3 className="mb-3 font-semibold">Main product <span className="text-xs font-normal text-zinc-400">(hero price + selected by default)</span></h3>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {mains.map((p) => (
                <ProductPick key={p.id} p={p} on={v.productId === p.id} onClick={() => setV({ ...v, productId: p.id, extraIds: v.extraIds.filter((x) => x !== p.id) })} radio />
              ))}
            </div>
          </div>
          <div className="a-card">
            <h3 className="mb-3 font-semibold">Other products customers can choose on this page</h3>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {mains.filter((p) => p.id !== v.productId).map((p) => (
                <ProductPick key={p.id} p={p} on={v.extraIds.includes(p.id)} onClick={() => setV({ ...v, extraIds: toggleIn(v.extraIds, p.id) })} />
              ))}
            </div>
          </div>
          <div className="a-card">
            <h3 className="mb-3 font-semibold">Combo add-ons (honey, gur…) <span className="text-xs font-normal text-zinc-400">— mark a product as “Add-on” in Products to list it here</span></h3>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {addons.map((p) => (
                <ProductPick key={p.id} p={p} on={v.addonIds.includes(p.id)} onClick={() => setV({ ...v, addonIds: toggleIn(v.addonIds, p.id) })} />
              ))}
              {!addons.length && <p className="text-sm text-zinc-400">No add-on products yet.</p>}
            </div>
          </div>
        </div>
      )}

      {tab === "Design & sections" && (
        <div className="space-y-4">
          <div className="a-card space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="font-semibold">Design</h3>
                <p className="text-xs text-zinc-500">The whole page changes look — texts, products and settings stay the same.</p>
              </div>
              <a href={`/preview/${lp.slug}?design=${c.design}`} target="_blank" className="a-btn-light !rounded-xl !py-1.5">
                <ExternalLink className="size-4" /> Preview this design
              </a>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {LANDING_DESIGNS.map((d) => (
                <button
                  key={d.key}
                  type="button"
                  onClick={() => setV((p) => ({ ...p, content: { ...p.content, design: d.key, primary: d.primary, accent: d.accent } }))}
                  className={cn("overflow-hidden rounded-2xl border-2 text-left transition", c.design === d.key ? "border-brand-700 shadow-md" : "border-zinc-200 hover:border-zinc-300")}
                >
                  <DesignMock d={d} image={c.heroImage || undefined} />
                  <p className="px-2.5 pt-2 text-sm font-semibold">{d.name}</p>
                  <p className="px-2.5 pb-2 text-[11px] text-zinc-500">{d.tagline}</p>
                </button>
              ))}
            </div>
          </div>
          <div className="a-card grid gap-4 sm:grid-cols-2">
            <ImageField label="Hero image" value={c.heroImage} onChange={(x) => setC("heroImage", x)} />
            <TextF label="YouTube video (optional)" value={c.videoUrl} onChange={(x) => setC("videoUrl", x)} help="Loads only when tapped — keeps the page fast" />
            <label className="text-sm"><span className="font-medium text-zinc-700">Primary color</span><input type="color" value={c.primary} onChange={(e) => setC("primary", e.target.value)} className="mt-1 h-10 w-full rounded-lg border" /></label>
            <label className="text-sm"><span className="font-medium text-zinc-700">Accent / button color</span><input type="color" value={c.accent} onChange={(e) => setC("accent", e.target.value)} className="mt-1 h-10 w-full rounded-lg border" /></label>
          </div>
          <div className="a-card grid gap-4 sm:grid-cols-2">
            <h3 className="font-semibold sm:col-span-2">Sections on this page</h3>
            {SECTIONS.map(([k, l]) => (
              <Toggle key={k} label={l} checked={c.sections[k]} onChange={(x) => setC("sections", { ...c.sections, [k]: x })} />
            ))}
          </div>
        </div>
      )}

      {tab === "Texts" && (
        <div className="a-card grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2"><TextF label="Badge" value={c.copy.heroBadge} onChange={(x) => setCopy("heroBadge", x)} /></div>
          <TextF label="Hero title" value={c.copy.heroTitle} onChange={(x) => setCopy("heroTitle", x)} />
          <TextF label="Hero highlight (gold)" value={c.copy.heroHighlight} onChange={(x) => setCopy("heroHighlight", x)} />
          <div className="sm:col-span-2"><AreaF label="Hero subtitle" value={c.copy.heroSubtitle} onChange={(x) => setCopy("heroSubtitle", x)} /></div>
          <TextF label="Offer text (next to price)" value={c.copy.offerText} onChange={(x) => setCopy("offerText", x)} />
          <TextF label="Countdown ends at" type="datetime-local" value={c.copy.offerEndsAt} onChange={(x) => setCopy("offerEndsAt", x)} help="Empty = no countdown" />
          <TextF label="Order section label" value={c.orderTitle} onChange={(x) => setC("orderTitle", x)} />
          <TextF label="Order section subtitle" value={c.orderSubtitle} onChange={(x) => setC("orderSubtitle", x)} />
          <TextF label="Mobile sticky button text" value={c.stickyText} onChange={(x) => setC("stickyText", x)} />
        </div>
      )}

      {tab === "Lists" && (
        <div className="space-y-4">
          <ListEditor title="Stats counters" items={c.copy.stats} fields={[["value", "Number", "number"], ["suffix", "Suffix"], ["label", "Label"]]} onChange={(x) => setCopy("stats", x)} />
          <ListEditor title="Ingredients" items={c.copy.ingredients} fields={[["nameBn", "Name (Bangla)"], ["name", "Name (English)"], ["emoji", "Emoji"], ["benefit", "Benefit"]]} onChange={(x) => setCopy("ingredients", x)} />
          <ListEditor title="Benefits" items={c.copy.benefits} fields={[["title", "Title"], ["icon", "Icon: zap/dumbbell/heart/shield/droplet/leaf"], ["text", "Text", "area"]]} onChange={(x) => setCopy("benefits", x)} />
          <ListEditor title="How to use — steps" items={c.copy.steps} fields={[["title", "Title"], ["text", "Text"]]} onChange={(x) => setCopy("steps", x)} />
          <ListEditor title="FAQ" wide items={c.copy.faqs} fields={[["q", "Question"], ["a", "Answer", "area"]]} onChange={(x) => setCopy("faqs", x)} />
        </div>
      )}

      {tab === "Combo" && (
        <div className="space-y-4">
          <div className="a-card grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2"><Toggle label="Combo on this page" checked={c.combo.enabled} onChange={(x) => setCombo("enabled", x)} help="Combo price for add-ons + order bump + Perfect Pair section" /></div>
            <TextF label="Section badge" value={c.combo.pairBadge} onChange={(x) => setCombo("pairBadge", x)} />
            <TextF label="Section title" value={c.combo.pairTitle} onChange={(x) => setCombo("pairTitle", x)} />
            <TextF label="Section highlight (gold)" value={c.combo.pairHighlight} onChange={(x) => setCombo("pairHighlight", x)} />
            <div className="sm:col-span-2"><AreaF label="Section text" value={c.combo.pairText} onChange={(x) => setCombo("pairText", x)} /></div>
            <TextF label="Order-bump title" value={c.combo.bumpTitle} onChange={(x) => setCombo("bumpTitle", x)} />
            <TextF label="Order-bump text" value={c.combo.bumpText} onChange={(x) => setCombo("bumpText", x)} />
          </div>
          <ListEditor title="Serving tips" items={c.combo.tips} fields={[["emoji", "Emoji"], ["title", "Title"], ["text", "Text", "area"]]} onChange={(x) => setCombo("tips", x)} />
        </div>
      )}

      <SaveBar
        onSave={async () => {
          const r = await saveLanding(lp.id, { ...v, seoTitle: v.seoTitle || "", seoDesc: v.seoDesc || "" });
          if (r && "slug" in r && r.slug && r.slug !== lp.slug) location.reload();
          return r;
        }}
        label="Save & publish"
      />
    </div>
  );
}

function ProductPick({ p, on, onClick, radio }: { p: P; on: boolean; onClick: () => void; radio?: boolean }) {
  return (
    <button type="button" onClick={onClick} className={cn("flex items-center gap-3 rounded-xl border-2 p-2 text-left transition", on ? "border-brand-600 bg-brand-50" : "border-zinc-200 hover:border-zinc-300", !p.active && "opacity-50")}>
      <span className={cn("grid size-5 shrink-0 place-items-center border-2", radio ? "rounded-full" : "rounded", on ? "border-brand-600 bg-brand-600" : "border-zinc-300")}>{on && <span className="size-2 rounded-full bg-white" />}</span>
      <Image src={p.image} alt="" width={40} height={40} className="size-10 object-contain" />
      <span className="min-w-0 flex-1 truncate text-sm font-medium">{p.nameBn || p.name}</span>
      <span className="text-sm font-semibold">{taka(p.price)}</span>
    </button>
  );
}
