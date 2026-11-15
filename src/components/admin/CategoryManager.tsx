"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState, useTransition, type DragEvent } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ChevronDown,
  ChevronRight,
  ChevronsDownUp,
  ChevronsUpDown,
  ExternalLink,
  FolderPlus,
  FolderTree,
  GripVertical,
  Loader2,
  Package,
  Plus,
  Save,
  Search,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { arrangeCategories, deleteCategory, saveCategory } from "@/app/admin/actions";
import { buildTree, descendantIds, flatten, pathLabel, type Node } from "@/lib/category-tree";
import { cn } from "@/lib/utils";
import { Toggle } from "./fields";
import { ImageDrop } from "./MediaFields";
import { GooglePreview, LengthMeter, LIMITS, slugify } from "./SeoTools";

export type Cat = {
  id: string;
  name: string;
  nameBn: string | null;
  slug: string;
  image: string | null;
  description: string | null;
  seoTitle: string | null;
  seoDesc: string | null;
  sortOrder: number;
  active: boolean;
  featured: boolean;
  parentId: string | null;
  products: number;
  thumbs: string[];
};
type Drop = { id: string; where: "before" | "inside" | "after" } | null;

export default function CategoryManager({ initial, titleSuffix }: { initial: Cat[]; titleSuffix: string }) {
  const [cats, setCats] = useState(initial);
  const [selected, setSelected] = useState<string | "new" | null>(initial[0]?.id ?? "new");
  const [newParent, setNewParent] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [q, setQ] = useState("");
  const [drag, setDrag] = useState<string | null>(null);
  const [drop, setDrop] = useState<Drop>(null);
  const [saving, start] = useTransition();

  // fresh server data after every save
  useEffect(() => setCats(initial), [initial]);

  const tree = useMemo(() => buildTree(cats), [cats]);
  const flat = useMemo(() => flatten(tree), [tree]);
  const total = useMemo(() => {
    // products in a category + all its subcategories
    const m = new Map<string, number>();
    for (const c of cats) m.set(c.id, [...descendantIds(cats, c.id)].reduce((a, id) => a + (cats.find((x) => x.id === id)?.products ?? 0), 0));
    return m;
  }, [cats]);

  const search = q.trim().toLowerCase();
  const matches = (c: Cat) => [c.name, c.nameBn, c.slug].some((v) => v?.toLowerCase().includes(search));
  // while searching, show matches plus their ancestors
  const visibleIds = useMemo(() => {
    if (!search) return null;
    const s = new Set<string>();
    for (const c of cats) if (matches(c)) pathOf(c.id).forEach((p) => s.add(p.id));
    return s;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, cats]);
  function pathOf(id: string) {
    const out: Cat[] = [];
    for (let c = cats.find((x) => x.id === id); c && !out.includes(c); c = cats.find((x) => x.id === c!.parentId)) out.unshift(c);
    return out;
  }

  // ── tree changes ─────────────────────────────────
  /** Put `id` under `parentId` at position `index` and renumber both levels */
  function move(id: string, parentId: string | null, index: number) {
    if (parentId && descendantIds(cats, id).has(parentId)) return toast.error("Can't move a category inside itself");
    const me = cats.find((c) => c.id === id)!;
    const siblings = (p: string | null) => cats.filter((c) => c.parentId === p && c.id !== id).sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
    const target = siblings(parentId);
    target.splice(Math.max(0, Math.min(index, target.length)), 0, { ...me, parentId });
    const changes = new Map<string, { parentId: string | null; sortOrder: number }>();
    target.forEach((c, i) => changes.set(c.id, { parentId, sortOrder: i + 1 }));
    if (me.parentId !== parentId) siblings(me.parentId).forEach((c, i) => changes.set(c.id, { parentId: me.parentId, sortOrder: i + 1 }));
    const rows = [...changes].filter(([cid, v]) => {
      const c = cats.find((x) => x.id === cid)!;
      return c.parentId !== v.parentId || c.sortOrder !== v.sortOrder;
    });
    if (!rows.length) return;
    const before = cats;
    setCats(cats.map((c) => (changes.has(c.id) ? { ...c, ...changes.get(c.id)! } : c)));
    if (parentId) setCollapsed((s) => (s.delete(parentId), new Set(s)));
    start(async () => {
      const r = await arrangeCategories(rows.map(([cid, v]) => ({ id: cid, ...v })));
      if (r.error) {
        setCats(before);
        toast.error(r.error);
      }
    });
  }
  const siblingsOf = (c: Cat) => flat.filter((x) => x.parentId === c.parentId);
  const moveBy = (c: Cat, d: -1 | 1) => {
    const sib = siblingsOf(c);
    const i = sib.findIndex((x) => x.id === c.id);
    if (sib[i + d]) move(c.id, c.parentId, i + d);
  };
  /** → becomes the last child of the category above it */
  const indent = (c: Cat) => {
    const sib = siblingsOf(c);
    const prev = sib[sib.findIndex((x) => x.id === c.id) - 1];
    if (prev) move(c.id, prev.id, 999);
  };
  /** ← moves out of its parent, right after it */
  const outdent = (c: Cat) => {
    const parent = cats.find((x) => x.id === c.parentId);
    if (!parent) return;
    const sib = flat.filter((x) => x.parentId === parent.parentId);
    move(c.id, parent.parentId, sib.findIndex((x) => x.id === parent.id) + 1);
  };

  // ── drag & drop ──────────────────────────────────
  const onOver = (e: DragEvent, c: Cat) => {
    if (!drag || drag === c.id || descendantIds(cats, drag).has(c.id)) return setDrop(null);
    e.preventDefault();
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const y = (e.clientY - r.top) / r.height;
    const where = y < 0.28 ? "before" : y > 0.72 ? "after" : "inside";
    if (drop?.id !== c.id || drop.where !== where) setDrop({ id: c.id, where });
  };
  const onDrop = (c: Cat) => {
    if (!drag || !drop) return;
    if (drop.where === "inside") move(drag, c.id, 999);
    else {
      const sib = flat.filter((x) => x.parentId === c.parentId && x.id !== drag);
      const i = sib.findIndex((x) => x.id === c.id);
      move(drag, c.parentId, drop.where === "before" ? i : i + 1);
    }
    setDrag(null);
    setDrop(null);
  };

  const toggle = (id: string) => setCollapsed((s) => (s.has(id) ? s.delete(id) : s.add(id), new Set(s)));
  const addChild = (parentId: string | null) => {
    setNewParent(parentId);
    setSelected("new");
  };
  const current = selected && selected !== "new" ? cats.find((c) => c.id === selected) : null;

  const renderNode = (n: Node<Cat>) => {
    if (visibleIds && !visibleIds.has(n.id)) return null;
    const open = !!search || !collapsed.has(n.id);
    const sib = siblingsOf(n);
    const i = sib.findIndex((x) => x.id === n.id);
    const isDrop = drop?.id === n.id;
    return (
      <li key={n.id}>
        <div
          draggable={!search}
          onDragStart={(e) => {
            setDrag(n.id);
            e.dataTransfer.effectAllowed = "move";
          }}
          onDragEnd={() => {
            setDrag(null);
            setDrop(null);
          }}
          onDragOver={(e) => onOver(e, n)}
          onDragLeave={() => isDrop && setDrop(null)}
          onDrop={(e) => {
            e.preventDefault();
            onDrop(n);
          }}
          onClick={() => setSelected(n.id)}
          style={{ paddingLeft: 8 + n.depth * 22 }}
          className={cn(
            "group relative flex cursor-pointer items-center gap-2 rounded-xl py-2 pr-2 transition",
            selected === n.id ? "bg-brand-50 ring-1 ring-brand-200" : "hover:bg-zinc-50",
            drag === n.id && "opacity-40",
            isDrop && drop.where === "inside" && "bg-brand-100 ring-2 ring-brand-500",
            !n.active && "opacity-60",
          )}
        >
          {isDrop && drop.where !== "inside" && <span className={cn("pointer-events-none absolute right-2 h-0.5 rounded-full bg-brand-600", drop.where === "before" ? "-top-px" : "-bottom-px")} style={{ left: 8 + n.depth * 22 }} />}
          {n.depth > 0 && <span className="pointer-events-none absolute top-0 bottom-0 w-px bg-zinc-200" style={{ left: n.depth * 22 - 4 }} />}

          <GripVertical className={cn("size-4 shrink-0 text-zinc-300", !search && "cursor-grab group-hover:text-zinc-500")} />
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggle(n.id);
            }}
            className={cn("grid size-5 shrink-0 place-items-center rounded text-zinc-400 hover:bg-zinc-200", !n.children.length && "invisible")}
            aria-label={open ? "Collapse" : "Expand"}
          >
            {open ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
          </button>
          <span className="relative size-9 shrink-0 overflow-hidden rounded-lg bg-gradient-to-br from-cream to-brand-50 ring-1 ring-zinc-200/70">
            {(n.image || n.thumbs[0]) && <Image src={n.image || n.thumbs[0]} alt="" fill sizes="36px" className="object-contain p-1" />}
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1.5">
              <span className="truncate text-sm font-semibold">{n.nameBn || n.name}</span>
              {n.featured && <Star className="size-3 shrink-0 fill-gold-400 text-gold-400" />}
              {!n.active && <span className="rounded bg-zinc-200 px-1 text-[10px] font-semibold text-zinc-600">hidden</span>}
            </span>
            <span className="block truncate text-[11px] text-zinc-400">
              {n.nameBn ? `${n.name} · ` : ""}
              {total.get(n.id)} products{n.children.length > 0 && ` · ${n.children.length} sub`}
            </span>
          </span>

          {/* row actions */}
          <span className="flex shrink-0 items-center gap-0.5 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100" onClick={(e) => e.stopPropagation()}>
            <Act label="Move up" disabled={i <= 0 || saving} onClick={() => moveBy(n, -1)}>
              <ArrowUp className="size-3.5" />
            </Act>
            <Act label="Move down" disabled={i >= sib.length - 1 || saving} onClick={() => moveBy(n, 1)}>
              <ArrowDown className="size-3.5" />
            </Act>
            <Act label="Move out of parent" disabled={!n.parentId || saving} onClick={() => outdent(n)}>
              <ArrowLeft className="size-3.5" />
            </Act>
            <Act label="Make subcategory of the one above" disabled={i <= 0 || saving} onClick={() => indent(n)}>
              <ArrowRight className="size-3.5" />
            </Act>
            <Act label="Add subcategory" onClick={() => addChild(n.id)}>
              <Plus className="size-3.5" />
            </Act>
          </span>
        </div>
        {open && n.children.length > 0 && <ul>{n.children.map(renderNode)}</ul>}
      </li>
    );
  };

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_460px]">
      {/* ── tree ── */}
      <section className="rounded-2xl border border-zinc-200/70 bg-white shadow-sm">
        <header className="flex flex-wrap items-center gap-2 border-b border-zinc-100 p-3">
          <label className="relative min-w-44 flex-1">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search categories…" className="w-full rounded-xl bg-zinc-50 py-2 pr-3 pl-9 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-brand-600/15" />
          </label>
          <button type="button" onClick={() => setCollapsed(new Set())} className="a-btn-light !rounded-xl !px-2.5 !py-2" title="Expand all">
            <ChevronsUpDown className="size-4" />
          </button>
          <button type="button" onClick={() => setCollapsed(new Set(cats.filter((c) => cats.some((x) => x.parentId === c.id)).map((c) => c.id)))} className="a-btn-light !rounded-xl !px-2.5 !py-2" title="Collapse all">
            <ChevronsDownUp className="size-4" />
          </button>
          <button type="button" onClick={() => addChild(null)} className="a-btn !rounded-xl !py-2">
            <FolderPlus className="size-4" /> New category
          </button>
        </header>

        <div className="p-2">
          {cats.length ? (
            <ul
              onDragOver={(e) => drag && e.preventDefault()}
              onDrop={(e) => {
                // dropped on empty space → top level, last
                if (drag && !drop) {
                  e.preventDefault();
                  move(drag, null, 999);
                  setDrag(null);
                }
              }}
              className="min-h-24 pb-6"
            >
              {tree.map(renderNode)}
            </ul>
          ) : (
            <div className="grid place-items-center py-16 text-center">
              <FolderTree className="size-9 text-zinc-300" />
              <p className="mt-2 font-semibold">No categories yet</p>
              <button onClick={() => addChild(null)} className="a-btn mt-4 !rounded-xl">
                <Plus className="size-4" /> Create the first one
              </button>
            </div>
          )}
        </div>
        <footer className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-zinc-100 px-4 py-2.5 text-[11px] text-zinc-400">
          <span className="flex items-center gap-1">
            <GripVertical className="size-3" /> Drag: top/bottom edge = before/after · middle = inside
          </span>
          <span>↑↓ order · → make subcategory · ← move out</span>
          {saving && (
            <span className="ml-auto flex items-center gap-1 text-brand-600">
              <Loader2 className="size-3 animate-spin" /> saving…
            </span>
          )}
        </footer>
      </section>

      {/* ── editor ── */}
      <div className="xl:sticky xl:top-6">
        {selected === "new" ? (
          <Editor key={`new-${newParent}`} c={null} cats={cats} defaultParent={newParent} titleSuffix={titleSuffix} onDone={(id) => setSelected(id ?? null)} onClose={() => setSelected(cats[0]?.id ?? null)} />
        ) : current ? (
          <Editor key={current.id} c={current} cats={cats} total={total.get(current.id) ?? 0} titleSuffix={titleSuffix} onDone={() => {}} onAddChild={() => addChild(current.id)} onDeleted={() => setSelected(null)} />
        ) : (
          <div className="grid place-items-center rounded-2xl border border-dashed border-zinc-300 bg-white py-16 text-center text-sm text-zinc-500">
            <FolderTree className="mb-2 size-7 text-zinc-300" />
            Select a category to edit
          </div>
        )}
      </div>
    </div>
  );
}

// ───────────────────────────────────────────── editor

function Editor({
  c,
  cats,
  total,
  defaultParent = null,
  titleSuffix,
  onDone,
  onClose,
  onAddChild,
  onDeleted,
}: {
  c: Cat | null;
  cats: Cat[];
  total?: number;
  defaultParent?: string | null;
  titleSuffix: string;
  onDone: (id?: string) => void;
  onClose?: () => void;
  onAddChild?: () => void;
  onDeleted?: () => void;
}) {
  const [v, setV] = useState({
    name: c?.name ?? "",
    nameBn: c?.nameBn ?? "",
    slug: c?.slug ?? "",
    image: c?.image ?? "",
    description: c?.description ?? "",
    seoTitle: c?.seoTitle ?? "",
    seoDesc: c?.seoDesc ?? "",
    parentId: c ? c.parentId ?? "" : defaultParent ?? "",
    active: c?.active ?? true,
    featured: c?.featured ?? false,
  });
  const [slugTouched, setSlugTouched] = useState(!!c);
  const [seoOpen, setSeoOpen] = useState(false);
  const [pending, start] = useTransition();
  const set = <K extends keyof typeof v>(k: K, val: (typeof v)[K]) => setV((o) => ({ ...o, [k]: val, ...(k === "name" && !slugTouched ? { slug: slugify(String(val)) } : {}) }));

  const blocked = c ? descendantIds(cats, c.id) : new Set<string>();
  const options = flatten(buildTree(cats)).filter((x) => !blocked.has(x.id));
  const display = v.nameBn || v.name;
  const title = v.seoTitle || `${display || "Category"} | ${titleSuffix}`;
  const desc = v.seoDesc || v.description;
  const parentPath = pathLabel(cats, v.parentId || null);

  const submit = (fd: FormData) =>
    start(async () => {
      const r = await saveCategory(fd);
      if (r.error) return void toast.error(r.error);
      toast.success(r.ok);
      onDone(r.id);
    });
  const remove = () => {
    if (!c) return;
    const kids = cats.filter((x) => x.parentId === c.id).length;
    const msg = [`Delete "${c.nameBn || c.name}"?`, c.products ? `${c.products} products become uncategorised.` : "", kids ? `${kids} subcategories move up one level.` : ""].filter(Boolean).join("\n");
    if (!window.confirm(msg)) return;
    const fd = new FormData();
    fd.set("id", c.id);
    start(async () => {
      const r = await deleteCategory(fd);
      if (r.error) toast.error(r.error);
      else {
        toast.success(r.ok);
        onDeleted?.();
      }
    });
  };

  return (
    <form action={submit} className="overflow-hidden rounded-2xl border border-zinc-200/70 bg-white shadow-sm">
      {c && <input type="hidden" name="id" value={c.id} />}
      <input type="hidden" name="active" value={v.active ? "on" : "off"} />
      {v.featured && <input type="hidden" name="featured" value="on" />}

      <header className="flex items-start gap-3 border-b border-zinc-100 px-5 py-4">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700 ring-1 ring-brand-100">{c ? <FolderTree className="size-4" /> : <FolderPlus className="size-4" />}</span>
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-semibold">{c ? display || "Untitled" : v.parentId ? "New subcategory" : "New category"}</h2>
          <p className="truncate text-xs text-zinc-500">{parentPath ? `Inside: ${parentPath}` : "Top level"}</p>
        </div>
        {c && (
          <Link href={`/category/${c.slug}`} target="_blank" className="grid size-8 place-items-center rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700" title="View on site">
            <ExternalLink className="size-4" />
          </Link>
        )}
        {onClose && (
          <button type="button" onClick={onClose} className="grid size-8 place-items-center rounded-lg text-zinc-400 hover:bg-zinc-100" aria-label="Cancel">
            <X className="size-4" />
          </button>
        )}
      </header>

      {c && (
        <div className="grid grid-cols-3 divide-x divide-zinc-100 border-b border-zinc-100 text-center">
          <Mini label="Products here" value={c.products} />
          <Mini label="Incl. subcats" value={total ?? 0} />
          <Mini label="Subcategories" value={cats.filter((x) => x.parentId === c.id).length} />
        </div>
      )}

      <div className="space-y-4 p-5">
        <div className="grid gap-4 sm:grid-cols-[130px_1fr]">
          <ImageDrop name="image" value={v.image} onChange={(x) => set("image", x)} hint="Square" />
          <div className="space-y-3">
            <L label="Name (English)" required>
              <input name="name" required value={v.name} onChange={(e) => set("name", e.target.value)} className="a-input" placeholder="Honey & Jaggery" />
            </L>
            <L label="Name (বাংলা)">
              <input name="nameBn" value={v.nameBn} onChange={(e) => set("nameBn", e.target.value)} className="a-input" placeholder="মধু ও গুড়" />
            </L>
          </div>
        </div>

        <L label="Parent category">
          <select name="parentId" value={v.parentId} onChange={(e) => set("parentId", e.target.value)} className="a-input">
            <option value="">— Top level —</option>
            {options.map((o) => (
              <option key={o.id} value={o.id}>
                {"   ".repeat(o.depth)}
                {o.depth ? "└ " : ""}
                {o.nameBn || o.name}
              </option>
            ))}
          </select>
        </L>

        <L label="URL">
          <div className="flex overflow-hidden rounded-lg border border-zinc-300 focus-within:border-brand-600 focus-within:ring-2 focus-within:ring-brand-600/15">
            <span className="flex items-center border-r border-zinc-200 bg-zinc-50 px-2.5 text-xs text-zinc-500">/category/</span>
            <input
              name="slug"
              value={v.slug}
              onChange={(e) => {
                setSlugTouched(true);
                set("slug", e.target.value.toLowerCase().replace(/\s+/g, "-"));
              }}
              onBlur={() => set("slug", slugify(v.slug))}
              placeholder="auto"
              className="min-w-0 flex-1 px-3 py-2 text-sm outline-none"
            />
          </div>
        </L>

        <L label="Intro text" help="Shown under the title on the category page — 2–3 sentences help SEO.">
          <textarea name="description" rows={3} value={v.description} onChange={(e) => set("description", e.target.value)} className="a-input" />
        </L>

        <div className="grid gap-3 rounded-xl bg-zinc-50 p-3 sm:grid-cols-2">
          <Toggle label="Visible" help="Shown in menus and shop" checked={v.active} onChange={(x) => set("active", x)} />
          <Toggle label="Featured" help="Tile on the homepage" checked={v.featured} onChange={(x) => set("featured", x)} />
        </div>

        {/* SEO */}
        <div className="rounded-xl border border-zinc-200">
          <button type="button" onClick={() => setSeoOpen((o) => !o)} className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium">
            <Search className="size-4 text-brand-600" /> Search engine listing
            <span className="ml-auto max-w-[50%] truncate text-xs font-normal text-zinc-400">{title}</span>
            <ChevronDown className={cn("size-4 shrink-0 text-zinc-400 transition", seoOpen && "rotate-180")} />
          </button>
          <div className={cn("space-y-4 border-t border-zinc-100 p-4", !seoOpen && "hidden")}>
            <GooglePreview title={title} desc={desc} path={`category/${v.slug || "url"}`} image={v.image || c?.thumbs[0]} />
            <L label="SEO title">
              <input name="seoTitle" value={v.seoTitle} onChange={(e) => set("seoTitle", e.target.value)} placeholder={`${display || "Category"} | ${titleSuffix}`} className="a-input" />
              <LengthMeter len={title.length} limits={LIMITS.title} />
            </L>
            <L label="Meta description" help={!v.seoDesc ? "Empty = intro text is used" : undefined}>
              <textarea name="seoDesc" rows={2} value={v.seoDesc} onChange={(e) => set("seoDesc", e.target.value)} className="a-input" />
              <LengthMeter len={desc.length} limits={LIMITS.desc} />
            </L>
          </div>
        </div>
      </div>

      <footer className="flex flex-wrap items-center gap-2 border-t border-zinc-100 bg-zinc-50/60 px-5 py-3">
        <button disabled={pending} className="a-btn !rounded-xl">
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} {c ? "Save" : "Create"}
        </button>
        {c && onAddChild && (
          <button type="button" onClick={onAddChild} className="a-btn-light !rounded-xl">
            <Plus className="size-4" /> Subcategory
          </button>
        )}
        {c && (
          <>
            <Link href={`/admin/products?cat=${c.id}`} className="a-btn-light !rounded-xl" title="Products in this category">
              <Package className="size-4" />
            </Link>
            <button type="button" onClick={remove} disabled={pending} className="a-btn-light ml-auto !rounded-xl !text-rose-600 hover:!bg-rose-50" title="Delete">
              <Trash2 className="size-4" />
            </button>
          </>
        )}
      </footer>
    </form>
  );
}

function Act({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button type="button" title={label} aria-label={label} disabled={disabled} onClick={onClick} className="grid size-7 place-items-center rounded-lg text-zinc-500 transition hover:bg-white hover:text-brand-700 hover:shadow-sm disabled:pointer-events-none disabled:opacity-25">
      {children}
    </button>
  );
}

function Mini({ label, value }: { label: string; value: number }) {
  return (
    <div className="py-2.5">
      <p className="text-lg font-bold tabular-nums">{value}</p>
      <p className="text-[10px] font-medium tracking-wide text-zinc-400 uppercase">{label}</p>
    </div>
  );
}

function L({ label, help, required, children }: { label: string; help?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1.5 block font-medium text-zinc-700">
        {label}
        {required && <span className="text-rose-500"> *</span>}
      </span>
      {children}
      {help && <span className="mt-1.5 block text-xs text-zinc-400">{help}</span>}
    </label>
  );
}
