"use client";
import Image from "next/image";
import { useState, type DragEvent } from "react";
import { ChevronLeft, ChevronRight, ImagePlus, Link2, Loader2, Star, Trash2, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export async function uploadImage(file: File): Promise<string | null> {
  if (!file.type.startsWith("image/")) {
    toast.error(`${file.name} is not an image`);
    return null;
  }
  const fd = new FormData();
  fd.append("file", file);
  const r = await fetch("/api/admin/upload", { method: "POST", body: fd })
    .then((r) => r.json())
    .catch(() => ({}) as { url?: string; error?: string });
  if (r.url) return r.url as string;
  toast.error(r.error || "Upload failed");
  return null;
}

function useDrop(onFiles: (files: File[]) => void) {
  const [over, setOver] = useState(false);
  return {
    over,
    props: {
      onDragOver: (e: DragEvent) => {
        e.preventDefault();
        setOver(true);
      },
      onDragLeave: () => setOver(false),
      onDrop: (e: DragEvent) => {
        e.preventDefault();
        setOver(false);
        const files = Array.from(e.dataTransfer.files);
        if (files.length) onFiles(files);
      },
    },
  };
}

/** Large image box: drag & drop / click to upload, or paste a URL */
export function ImageDrop({ value, onChange, name, aspect = "aspect-square", hint = "PNG, JPG or WebP · square works best" }: { value: string; onChange: (v: string) => void; name?: string; aspect?: string; hint?: string }) {
  const [busy, setBusy] = useState(false);
  const [showUrl, setShowUrl] = useState(false);
  const put = async (files: File[]) => {
    setBusy(true);
    const url = await uploadImage(files[0]);
    setBusy(false);
    if (url) onChange(url);
  };
  const drop = useDrop(put);
  return (
    <div className="space-y-2">
      {name && <input type="hidden" name={name} value={value} />}
      <label
        {...drop.props}
        className={cn(
          "group relative flex cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed bg-gradient-to-br from-cream/60 via-white to-brand-50/60 transition",
          aspect,
          drop.over ? "border-brand-500 bg-brand-50 ring-4 ring-brand-500/10" : "border-zinc-200 hover:border-brand-300",
        )}
      >
        {value ? (
          <>
            <Image src={value} alt="" fill sizes="400px" className="object-contain p-5 transition group-hover:scale-[1.02]" />
            <span className="absolute inset-x-3 bottom-3 flex items-center justify-center gap-1.5 rounded-xl bg-zinc-900/70 py-2 text-xs font-medium text-white opacity-0 backdrop-blur transition group-hover:opacity-100">
              <UploadCloud className="size-3.5" /> Drop or click to replace
            </span>
          </>
        ) : (
          <span className="flex flex-col items-center gap-2 p-6 text-center">
            <span className="grid size-12 place-items-center rounded-2xl bg-white text-brand-600 shadow-sm ring-1 ring-zinc-200">
              <UploadCloud className="size-6" />
            </span>
            <span className="text-sm font-medium text-zinc-700">Drop image here or click to upload</span>
            <span className="text-xs text-zinc-400">{hint}</span>
          </span>
        )}
        {busy && (
          <span className="absolute inset-0 grid place-items-center bg-white/70 backdrop-blur-sm">
            <Loader2 className="size-7 animate-spin text-brand-600" />
          </span>
        )}
        <input type="file" accept="image/*" hidden onChange={(e) => e.target.files?.length && put(Array.from(e.target.files))} />
      </label>
      {showUrl ? (
        <input value={value} onChange={(e) => onChange(e.target.value)} className="a-input !text-xs" placeholder="/uploads/... or https://..." autoFocus />
      ) : (
        <button type="button" onClick={() => setShowUrl(true)} className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-brand-700">
          <Link2 className="size-3.5" /> Use an image URL instead
        </button>
      )}
    </div>
  );
}

/** Sortable thumbnail grid for extra product photos */
export function GalleryEditor({ value, onChange, name, onMakeMain }: { value: string[]; onChange: (v: string[]) => void; name: string; onMakeMain?: (url: string) => void }) {
  const [busy, setBusy] = useState(0);
  const [url, setUrl] = useState("");
  const add = async (files: File[]) => {
    setBusy(files.length);
    const urls: string[] = [];
    for (const f of files) {
      const u = await uploadImage(f);
      if (u) urls.push(u);
      setBusy((n) => n - 1);
    }
    if (urls.length) onChange([...value, ...urls]);
  };
  const drop = useDrop(add);
  const move = (i: number, d: -1 | 1) => {
    const n = [...value];
    [n[i], n[i + d]] = [n[i + d], n[i]];
    onChange(n);
  };
  return (
    <div className="space-y-3">
      <input type="hidden" name={name} value={value.join("\n")} />
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5">
        {value.map((src, i) => (
          <div key={src + i} className="group relative aspect-square overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50">
            <Image src={src} alt="" fill sizes="140px" className="object-contain p-2" />
            <div className="absolute inset-0 flex items-end justify-center gap-1 bg-gradient-to-t from-zinc-900/60 to-transparent p-1.5 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
              <IconBtn label="Move left" disabled={i === 0} onClick={() => move(i, -1)}>
                <ChevronLeft className="size-3.5" />
              </IconBtn>
              {onMakeMain && (
                <IconBtn label="Use as main image" onClick={() => onMakeMain(src)}>
                  <Star className="size-3.5" />
                </IconBtn>
              )}
              <IconBtn label="Remove" danger onClick={() => onChange(value.filter((_, j) => j !== i))}>
                <Trash2 className="size-3.5" />
              </IconBtn>
              <IconBtn label="Move right" disabled={i === value.length - 1} onClick={() => move(i, 1)}>
                <ChevronRight className="size-3.5" />
              </IconBtn>
            </div>
          </div>
        ))}
        {Array.from({ length: busy }).map((_, i) => (
          <div key={`b${i}`} className="grid aspect-square place-items-center rounded-xl border border-zinc-200 bg-zinc-50">
            <Loader2 className="size-5 animate-spin text-brand-600" />
          </div>
        ))}
        <label
          {...drop.props}
          className={cn(
            "flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed text-xs font-medium transition",
            drop.over ? "border-brand-500 bg-brand-50 text-brand-700" : "border-zinc-200 text-zinc-500 hover:border-brand-300 hover:text-brand-700",
          )}
        >
          <ImagePlus className="size-5" />
          Add photos
          <input type="file" accept="image/*" multiple hidden onChange={(e) => e.target.files?.length && add(Array.from(e.target.files))} />
        </label>
      </div>
      <div className="flex gap-2">
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="…or paste an image URL" className="a-input !py-1.5 !text-xs" />
        <button
          type="button"
          disabled={!url.trim()}
          onClick={() => {
            onChange([...value, url.trim()]);
            setUrl("");
          }}
          className="a-btn-light !py-1.5 !text-xs disabled:opacity-40"
        >
          Add
        </button>
      </div>
    </div>
  );
}

function IconBtn({ label, onClick, disabled, danger, children }: { label: string; onClick: () => void; disabled?: boolean; danger?: boolean; children: React.ReactNode }) {
  return (
    <button type="button" title={label} aria-label={label} disabled={disabled} onClick={onClick} className={cn("grid size-6 place-items-center rounded-md bg-white/95 shadow-sm transition disabled:opacity-30", danger ? "text-rose-600 hover:bg-rose-50" : "text-zinc-700 hover:bg-white")}>
      {children}
    </button>
  );
}
