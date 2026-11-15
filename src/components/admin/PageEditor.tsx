"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition, type ReactNode } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Copy,
  ExternalLink,
  FileText,
  Heading,
  HelpCircle,
  Image as ImageIcon,
  List,
  Loader2,
  Megaphone,
  Minus,
  MousePointerClick,
  Plus,
  Save,
  Search,
  Settings2,
  Target,
  Trash2,
  Type,
  Video,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { savePage, type PageInput } from "@/app/admin/actions";
import { BLOCK_DEFAULTS, blocksText, newId, youtubeId, type BlockType, type PageBlock } from "@/lib/page-blocks";
import { cn } from "@/lib/utils";
import { Toggle } from "./fields";
import { ImageDrop } from "./MediaFields";
import PixelPicker, { type LibPixel, type PixelMode } from "./PixelPicker";
import { GooglePreview, LengthMeter, LIMITS, SITE_HOST, SeoScore, slugify } from "./SeoTools";

const BLOCKS: { type: BlockType; label: string; icon: typeof Type; hint: string }[] = [
  { type: "heading", label: "Heading", icon: Heading, hint: "Section title" },
  { type: "text", label: "Paragraph", icon: Type, hint: "**bold**, [link](url)" },
  { type: "list", label: "List", icon: List, hint: "Bullets or steps" },
  { type: "image", label: "Image", icon: ImageIcon, hint: "Photo + caption" },
  { type: "button", label: "Button", icon: MousePointerClick, hint: "Call to action" },
  { type: "callout", label: "Notice", icon: Megaphone, hint: "Highlighted box" },
  { type: "faq", label: "FAQ", icon: HelpCircle, hint: "Shows in Google" },
  { type: "video", label: "YouTube", icon: Video, hint: "Loads on tap" },
  { type: "divider", label: "Divider", icon: Minus, hint: "Line" },
];
const meta = (t: BlockType) => BLOCKS.find((b) => b.type === t)!;

type PageRow = Omit<PageInput, "blocks"> & { id: string | null; blocks: PageBlock[] };

export default function PageEditor({ page, pixels, titleSuffix }: { page: PageRow; pixels: LibPixel[]; titleSuffix: string }) {
  const router = useRouter();
  const [v, setV] = useState(page);
  const [saved, setSaved] = useState(JSON.stringify(page));
  const [slugTouched, setSlugTouched] = useState(!!page.id);
  const [inserter, setInserter] = useState<number | null>(null);
  const [pending, start] = useTransition();
  const dirty = JSON.stringify(v) !== saved;
  const set = <K extends keyof PageRow>(k: K, val: PageRow[K]) => setV((o) => ({ ...o, [k]: val, ...(k === "title" && !slugTouched ? { slug: slugify(String(val)) } : {}) }));

  // blocks
  const setBlocks = (fn: (b: PageBlock[]) => PageBlock[]) => setV((o) => ({ ...o, blocks: fn(o.blocks) }));
  const update = (id: string, patch: Partial<PageBlock>) => setBlocks((bs) => bs.map((b) => (b.id === id ? ({ ...b, ...patch } as PageBlock) : b)));
  const insert = (at: number, type: BlockType) => {
    setBlocks((bs) => [...bs.slice(0, at), BLOCK_DEFAULTS[type](), ...bs.slice(at)]);
    setInserter(null);
  };
  const move = (i: number, d: -1 | 1) =>
    setBlocks((bs) => {
      const n = [...bs];
      [n[i], n[i + d]] = [n[i + d], n[i]];
      return n;
    });

  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  // Ctrl+S saves
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        save();
      }
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  });

  const save = () =>
    start(async () => {
      const { id, ...data } = v;
      const r = await savePage(id, data);
      if (r.error) return void toast.error(r.error);
      toast.success(r.ok);
      const next = { ...v, id: r.id!, slug: r.slug! };
      setV(next);
      setSaved(JSON.stringify(next));
      if (!id) router.replace(`/admin/pages/${r.id}`);
      else router.refresh();
    });

  const text = useMemo(() => blocksText(v.blocks), [v.blocks]);
  const seoTitle = v.seoTitle || `${v.title || "Page"} | ${titleSuffix}`;
  const seoDesc = v.seoDesc || v.excerpt || text.slice(0, 160);
  const words = text ? text.split(" ").length : 0;
  const checks = [
    { ok: seoTitle.length >= LIMITS.title[0] && seoTitle.length <= LIMITS.title[1], label: "Title is 30–60 characters", hint: `Now ${seoTitle.length}` },
    { ok: seoDesc.length >= LIMITS.desc[0] && seoDesc.length <= LIMITS.desc[1], label: "Description is 120–160 characters", hint: `Now ${seoDesc.length}` },
    { ok: words >= 150, label: "150+ words of content", hint: `Now ${words}` },
    { ok: v.blocks.some((b) => b.type === "heading"), label: "Uses headings", hint: "Add section headings" },
    { ok: v.blocks.filter((b) => b.type === "image").every((b) => b.type === "image" && (!b.src || b.alt.trim())), label: "All images have alt text" },
    { ok: !v.noindex, label: "Visible to Google" },
  ];

  return (
    <div className="space-y-6 pb-16">
      {/* header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/admin/pages" className="grid size-10 shrink-0 place-items-center rounded-xl border border-zinc-200 bg-white text-zinc-600 shadow-sm hover:bg-zinc-50" aria-label="Back to pages">
            <ArrowLeft className="size-4" />
          </Link>
          <div className="min-w-0">
            <p className="text-xs font-medium tracking-wide text-zinc-400 uppercase">{page.id ? "Edit page" : "New page"}</p>
            <h1 className="truncate text-2xl font-bold tracking-tight">{v.title || "Untitled page"}</h1>
          </div>
          <span className={cn("hidden shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 sm:inline", v.active ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : "bg-zinc-100 text-zinc-500 ring-zinc-200")}>{v.active ? "Published" : "Draft"}</span>
        </div>
        <div className="flex items-center gap-2">
          {dirty && <span className="hidden text-xs font-medium text-amber-600 sm:block">● Unsaved · Ctrl+S</span>}
          {page.id && (
            <a href={`/${page.slug}`} target="_blank" className="a-btn-light !rounded-xl">
              <ExternalLink className="size-4" /> View
            </a>
          )}
          <button onClick={save} disabled={pending} className="a-btn !rounded-xl px-5 shadow-lg shadow-brand-900/20">
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Save
          </button>
        </div>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* ── content ── */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-zinc-200/70 bg-white p-5 shadow-sm">
            <input value={v.title} onChange={(e) => set("title", e.target.value)} placeholder="Page title" className="w-full border-0 bg-transparent font-display text-3xl font-bold outline-none placeholder:text-zinc-300" />
            <div className="mt-2 flex items-center text-sm text-zinc-500">
              <span className="shrink-0">{SITE_HOST}/</span>
              <input
                value={v.slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  set("slug", e.target.value.toLowerCase().replace(/\s+/g, "-"));
                }}
                onBlur={() => set("slug", slugify(v.slug))}
                placeholder="your-url"
                className="min-w-0 flex-1 rounded-md bg-zinc-50 px-1.5 py-0.5 font-mono text-sm text-brand-700 outline-none focus:ring-2 focus:ring-brand-600/15"
              />
            </div>
            <textarea value={v.excerpt} onChange={(e) => set("excerpt", e.target.value)} rows={2} placeholder="Short intro under the title (optional)" className="mt-4 w-full resize-none rounded-xl bg-zinc-50 p-3 text-zinc-600 outline-none focus:bg-white focus:ring-2 focus:ring-brand-600/15" />
          </div>

          {/* blocks */}
          <Inserter open={inserter === 0} onOpen={() => setInserter(inserter === 0 ? null : 0)} onPick={(t) => insert(0, t)} first={!v.blocks.length} />
          {v.blocks.map((b, i) => (
            <div key={b.id}>
              <BlockCard
                b={b}
                index={i}
                count={v.blocks.length}
                onChange={(patch) => update(b.id, patch)}
                onMove={(d) => move(i, d)}
                onDuplicate={() => setBlocks((bs) => [...bs.slice(0, i + 1), { ...structuredClone(b), id: newId() }, ...bs.slice(i + 1)])}
                onDelete={() => setBlocks((bs) => bs.filter((x) => x.id !== b.id))}
              />
              <Inserter open={inserter === i + 1} onOpen={() => setInserter(inserter === i + 1 ? null : i + 1)} onPick={(t) => insert(i + 1, t)} />
            </div>
          ))}
        </div>

        {/* ── sidebar ── */}
        <aside className="space-y-4 lg:sticky lg:top-6">
          <Panel icon={Settings2} title="Publish">
            <Toggle label="Published" help={v.active ? "Live at the URL" : "Draft — shows 404 to visitors"} checked={v.active} onChange={(x) => set("active", x)} />
            <L label="Show a link in">
              <Seg value={v.menu} onChange={(x) => set("menu", x)} options={[["none", "Nowhere"], ["header", "Header"], ["footer", "Footer"]]} />
            </L>
            <div className="grid grid-cols-2 gap-3">
              <L label="Layout">
                <Seg value={v.layout} onChange={(x) => set("layout", x)} options={[["default", "Reading"], ["wide", "Wide"]]} />
              </L>
              <L label="Menu order">
                <input type="number" value={v.sortOrder} onChange={(e) => set("sortOrder", Number(e.target.value) || 0)} className="a-input tabular-nums" />
              </L>
            </div>
            <L label="Cover image (optional)">
              <ImageDrop value={v.coverImage} onChange={(x) => set("coverImage", x)} aspect="aspect-[21/9]" hint="Wide photo" />
            </L>
          </Panel>

          <Panel icon={Target} title="Facebook pixel">
            <PixelPicker mode={v.pixelMode as PixelMode} ids={v.pixelIds} library={pixels} onChange={(m, ids) => setV((o) => ({ ...o, pixelMode: m, pixelIds: ids }))} />
          </Panel>

          <Panel icon={Search} title="SEO">
            <GooglePreview title={seoTitle} desc={seoDesc} path={v.slug} image={v.ogImage || v.coverImage || undefined} />
            <L label="SEO title">
              <input value={v.seoTitle} onChange={(e) => set("seoTitle", e.target.value)} placeholder={`${v.title || "Page"} | ${titleSuffix}`} className="a-input" />
              <LengthMeter len={seoTitle.length} limits={LIMITS.title} />
            </L>
            <L label="Meta description">
              <textarea rows={3} value={v.seoDesc} onChange={(e) => set("seoDesc", e.target.value)} placeholder={v.excerpt || "Empty = intro / first text is used"} className="a-input" />
              <LengthMeter len={seoDesc.length} limits={LIMITS.desc} />
            </L>
            <L label="Share image (Facebook / WhatsApp)">
              <ImageDrop value={v.ogImage} onChange={(x) => set("ogImage", x)} aspect="aspect-[1.91/1]" hint="1200×630 · empty = cover image" />
            </L>
            <Toggle label="Hide from Google (noindex)" help="For thank-you or private pages" checked={v.noindex} onChange={(x) => set("noindex", x)} />
            <div className="border-t border-zinc-100 pt-4">
              <SeoScore checks={checks} />
            </div>
          </Panel>
        </aside>
      </div>
    </div>
  );
}

// ───────────────────────────────────────────── blocks

function Inserter({ open, onOpen, onPick, first }: { open: boolean; onOpen: () => void; onPick: (t: BlockType) => void; first?: boolean }) {
  return (
    <div className={cn("relative", first ? "py-1" : "group/ins -my-1 py-1")}>
      {first && !open ? (
        <button type="button" onClick={onOpen} className="flex w-full flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-zinc-200 py-10 text-sm font-medium text-zinc-500 transition hover:border-brand-300 hover:text-brand-700">
          <Plus className="size-6" /> Add your first block
        </button>
      ) : (
        <div className={cn("flex items-center gap-2 transition", open ? "opacity-100" : "opacity-0 group-hover/ins:opacity-100 focus-within:opacity-100")}>
          <span className="h-px flex-1 bg-brand-200" />
          <button type="button" onClick={onOpen} className="flex items-center gap-1 rounded-full bg-brand-700 px-2.5 py-0.5 text-xs font-semibold text-white shadow-sm" aria-expanded={open}>
            {open ? <X className="size-3" /> : <Plus className="size-3" />} {open ? "Close" : "Add block"}
          </button>
          <span className="h-px flex-1 bg-brand-200" />
        </div>
      )}
      {open && (
        <div className="relative z-10 mt-2 grid grid-cols-3 gap-2 rounded-2xl border border-zinc-200 bg-white p-2 shadow-xl sm:grid-cols-5 xl:grid-cols-9">
          {BLOCKS.map(({ type, label, icon: Icon, hint }) => (
            <button key={type} type="button" onClick={() => onPick(type)} title={hint} className="flex flex-col items-center gap-1 rounded-xl p-2.5 text-xs font-medium text-zinc-600 transition hover:bg-brand-50 hover:text-brand-800">
              <Icon className="size-5" />
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function BlockCard({ b, index, count, onChange, onMove, onDuplicate, onDelete }: { b: PageBlock; index: number; count: number; onChange: (p: Partial<PageBlock>) => void; onMove: (d: -1 | 1) => void; onDuplicate: () => void; onDelete: () => void }) {
  const m = meta(b.type);
  return (
    <section className="group rounded-2xl border border-zinc-200/70 bg-white shadow-sm transition focus-within:border-brand-300 focus-within:ring-4 focus-within:ring-brand-500/5 hover:border-zinc-300">
      <header className="flex items-center gap-2 border-b border-zinc-100 px-3 py-1.5">
        <m.icon className="size-4 text-brand-600" />
        <span className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">{m.label}</span>
        <div className="ml-auto flex gap-0.5 opacity-50 transition group-hover:opacity-100 group-focus-within:opacity-100">
          <Ic label="Move up" disabled={index === 0} onClick={() => onMove(-1)}>
            <ArrowUp className="size-3.5" />
          </Ic>
          <Ic label="Move down" disabled={index === count - 1} onClick={() => onMove(1)}>
            <ArrowDown className="size-3.5" />
          </Ic>
          <Ic label="Duplicate" onClick={onDuplicate}>
            <Copy className="size-3.5" />
          </Ic>
          <Ic label="Delete block" danger onClick={onDelete}>
            <Trash2 className="size-3.5" />
          </Ic>
        </div>
      </header>
      <div className="p-4">
        <BlockFields b={b} onChange={onChange} />
      </div>
    </section>
  );
}

const area = "w-full resize-y rounded-lg border border-zinc-200 bg-white p-2.5 text-sm leading-relaxed outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-600/15";

function BlockFields({ b, onChange }: { b: PageBlock; onChange: (p: Partial<PageBlock>) => void }) {
  switch (b.type) {
    case "heading":
      return (
        <div className="flex gap-2">
          <Seg value={String(b.level)} onChange={(x) => onChange({ level: Number(x) as 2 | 3 })} options={[["2", "H2"], ["3", "H3"]]} />
          <input value={b.text} onChange={(e) => onChange({ text: e.target.value })} placeholder="Section heading" className={cn("min-w-0 flex-1 border-0 bg-transparent font-display font-bold outline-none placeholder:text-zinc-300", b.level === 2 ? "text-xl" : "text-lg")} />
        </div>
      );
    case "text":
      return (
        <>
          <textarea value={b.text} onChange={(e) => onChange({ text: e.target.value })} rows={Math.min(12, Math.max(3, b.text.split("\n").length + 1))} placeholder="Write a paragraph…" className={area} />
          <p className="mt-1 text-[11px] text-zinc-400">
            <b>**bold**</b> · [link text](https://… or /shop or tel:01…)
          </p>
        </>
      );
    case "list":
      return (
        <div className="space-y-2">
          <Seg value={b.ordered ? "1" : "0"} onChange={(x) => onChange({ ordered: x === "1" })} options={[["0", "• Bullets"], ["1", "1. Steps"]]} />
          {b.items.map((it, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-5 text-center text-sm text-zinc-400">{b.ordered ? `${i + 1}.` : "•"}</span>
              <input
                value={it}
                onChange={(e) => onChange({ items: b.items.map((x, j) => (j === i ? e.target.value : x)) })}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    onChange({ items: [...b.items.slice(0, i + 1), "", ...b.items.slice(i + 1)] });
                    setTimeout(() => (e.currentTarget.parentElement?.nextElementSibling?.querySelector("input") as HTMLInputElement | null)?.focus());
                  }
                  if (e.key === "Backspace" && !it && b.items.length > 1) {
                    e.preventDefault();
                    onChange({ items: b.items.filter((_, j) => j !== i) });
                  }
                }}
                placeholder="List item — Enter adds another"
                className="a-input !py-1.5"
              />
              <button type="button" onClick={() => onChange({ items: b.items.filter((_, j) => j !== i) })} disabled={b.items.length === 1} className="text-zinc-300 hover:text-rose-500 disabled:opacity-0" aria-label="Remove item">
                <X className="size-4" />
              </button>
            </div>
          ))}
          <button type="button" onClick={() => onChange({ items: [...b.items, ""] })} className="text-xs font-medium text-brand-700 hover:underline">
            + Add item
          </button>
        </div>
      );
    case "image":
      return (
        <div className="grid gap-4 sm:grid-cols-[220px_1fr]">
          <ImageDrop value={b.src} onChange={(x) => onChange({ src: x })} aspect="aspect-[4/3]" />
          <div className="space-y-3">
            <L label="Alt text (describe the photo)">
              <input value={b.alt} onChange={(e) => onChange({ alt: e.target.value })} className="a-input" />
            </L>
            <L label="Caption (optional)">
              <input value={b.caption} onChange={(e) => onChange({ caption: e.target.value })} className="a-input" />
            </L>
          </div>
        </div>
      );
    case "button":
      return (
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <L label="Button text">
            <input value={b.label} onChange={(e) => onChange({ label: e.target.value })} className="a-input" />
          </L>
          <L label="Link">
            <input value={b.href} onChange={(e) => onChange({ href: e.target.value })} placeholder="/shop or https://…" className="a-input font-mono !text-xs" />
          </L>
          <L label="Style">
            <Seg value={b.style} onChange={(x) => onChange({ style: x as "primary" | "outline" })} options={[["primary", "Solid"], ["outline", "Outline"]]} />
          </L>
        </div>
      );
    case "callout":
      return (
        <div className="space-y-2">
          <div className="flex gap-2">
            <input value={b.emoji} onChange={(e) => onChange({ emoji: e.target.value })} aria-label="Emoji" className="size-10 rounded-lg border border-zinc-200 text-center text-xl outline-none focus:border-brand-500" />
            <Seg value={b.tone} onChange={(x) => onChange({ tone: x as "info" | "success" | "warning" })} options={[["info", "Info"], ["success", "Success"], ["warning", "Warning"]]} />
          </div>
          <textarea value={b.text} onChange={(e) => onChange({ text: e.target.value })} rows={2} placeholder="Important note…" className={cn(area, b.tone === "info" ? "bg-sky-50/50" : b.tone === "success" ? "bg-emerald-50/50" : "bg-amber-50/50")} />
        </div>
      );
    case "faq":
      return (
        <div className="space-y-3">
          {b.items.map((it, i) => (
            <div key={i} className="relative space-y-2 rounded-xl bg-zinc-50 p-3 pr-9">
              <input value={it.q} onChange={(e) => onChange({ items: b.items.map((x, j) => (j === i ? { ...x, q: e.target.value } : x)) })} placeholder="Question" className="a-input font-semibold" />
              <textarea value={it.a} onChange={(e) => onChange({ items: b.items.map((x, j) => (j === i ? { ...x, a: e.target.value } : x)) })} rows={2} placeholder="Answer" className={area} />
              <button type="button" onClick={() => onChange({ items: b.items.filter((_, j) => j !== i) })} className="absolute top-3 right-2 text-zinc-300 hover:text-rose-500" aria-label="Remove question">
                <X className="size-4" />
              </button>
            </div>
          ))}
          <button type="button" onClick={() => onChange({ items: [...b.items, { q: "", a: "" }] })} className="text-xs font-medium text-brand-700 hover:underline">
            + Add question
          </button>
          <p className="text-[11px] text-zinc-400">Questions are added as FAQ structured data — Google can show them in search results.</p>
        </div>
      );
    case "video":
      return (
        <L label="YouTube link">
          <input value={b.url} onChange={(e) => onChange({ url: e.target.value })} placeholder="https://youtu.be/…" className="a-input font-mono !text-xs" />
          {b.url && !youtubeId(b.url) && <span className="mt-1 block text-xs text-rose-600">Not a YouTube link</span>}
          {youtubeId(b.url) && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`https://i.ytimg.com/vi/${youtubeId(b.url)}/mqdefault.jpg`} alt="" className="mt-2 w-48 rounded-lg" />
          )}
        </L>
      );
    case "divider":
      return <hr className="border-dashed border-zinc-300" />;
  }
}

// ───────────────────────────────────────────── small pieces

function Panel({ icon: Icon, title, children }: { icon: typeof FileText; title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-zinc-200/70 bg-white shadow-sm">
      <header className="flex items-center gap-2.5 border-b border-zinc-100 px-4 py-3">
        <Icon className="size-4 text-brand-600" />
        <h2 className="text-sm font-semibold">{title}</h2>
      </header>
      <div className="space-y-4 p-4">{children}</div>
    </section>
  );
}

function L({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1.5 block text-xs font-medium text-zinc-600">{label}</span>
      {children}
    </label>
  );
}

function Seg({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <div className="inline-flex rounded-lg bg-zinc-100 p-0.5">
      {options.map(([k, l]) => (
        <button key={k} type="button" onClick={() => onChange(k)} className={cn("rounded-md px-2.5 py-1 text-xs font-semibold transition", value === k ? "bg-white text-brand-800 shadow-sm" : "text-zinc-500 hover:text-zinc-800")}>
          {l}
        </button>
      ))}
    </div>
  );
}

function Ic({ label, onClick, disabled, danger, children }: { label: string; onClick: () => void; disabled?: boolean; danger?: boolean; children: ReactNode }) {
  return (
    <button type="button" title={label} aria-label={label} disabled={disabled} onClick={onClick} className={cn("grid size-7 place-items-center rounded-lg transition disabled:opacity-25", danger ? "text-zinc-400 hover:bg-rose-50 hover:text-rose-600" : "text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700")}>
      {children}
    </button>
  );
}
