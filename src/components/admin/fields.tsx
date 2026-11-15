"use client";
import Image from "next/image";
import { useState, useTransition } from "react";
import { Loader2, Plus, Save, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function TextF({ label, value, onChange, help, type = "text", placeholder, secret }: { label: string; value: string | number; onChange: (v: string) => void; help?: string; type?: string; placeholder?: string; secret?: boolean }) {
  return (
    <label className="block text-sm">
      <span className="font-medium text-zinc-700">{label}</span>
      <input type={secret ? "password" : type} value={value ?? ""} placeholder={placeholder} autoComplete="off" onChange={(e) => onChange(e.target.value)} className="a-input mt-1" />
      {help && <span className="mt-1 block text-xs text-zinc-400">{help}</span>}
    </label>
  );
}

export function NumF({ label, value, onChange, help }: { label: string; value: number; onChange: (v: number) => void; help?: string }) {
  return <TextF label={label} type="number" value={value} onChange={(v) => onChange(Number(v) || 0)} help={help} />;
}

export function AreaF({ label, value, onChange, rows = 3, help }: { label: string; value: string; onChange: (v: string) => void; rows?: number; help?: string }) {
  return (
    <label className="block text-sm">
      <span className="font-medium text-zinc-700">{label}</span>
      <textarea rows={rows} value={value ?? ""} onChange={(e) => onChange(e.target.value)} className="a-input mt-1" />
      {help && <span className="mt-1 block text-xs text-zinc-400">{help}</span>}
    </label>
  );
}

export function Toggle({ label, checked, onChange, help }: { label: string; checked: boolean; onChange: (v: boolean) => void; help?: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 text-sm">
      <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className={cn("relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition", checked ? "bg-brand-600" : "bg-zinc-300")}>
        <span className={cn("absolute top-0.5 size-5 rounded-full bg-white shadow transition-all", checked ? "left-[22px]" : "left-0.5")} />
      </button>
      <span>
        <span className="font-medium text-zinc-700">{label}</span>
        {help && <span className="block text-xs text-zinc-400">{help}</span>}
      </span>
    </label>
  );
}

export function ImageField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const [busy, setBusy] = useState(false);
  async function upload(file: File) {
    setBusy(true);
    const fd = new FormData();
    fd.append("file", file);
    const r = await fetch("/api/admin/upload", { method: "POST", body: fd }).then((r) => r.json()).catch(() => ({}));
    setBusy(false);
    if (r.url) onChange(r.url);
    else toast.error(r.error || "Upload failed");
  }
  return (
    <div className="text-sm">
      <span className="font-medium text-zinc-700">{label}</span>
      <div className="mt-1 flex items-center gap-3">
        <div className="relative size-20 shrink-0 overflow-hidden rounded-xl border bg-zinc-50">{value && <Image src={value} alt="" fill sizes="80px" className="object-contain p-1" />}</div>
        <div className="flex-1 space-y-2">
          <input value={value} onChange={(e) => onChange(e.target.value)} className="a-input" placeholder="/uploads/... or https://..." />
          <label className="a-btn-light cursor-pointer">
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />} Upload
            <input type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
          </label>
        </div>
      </div>
    </div>
  );
}

export function ListEditor<T extends Record<string, string | number>>({
  title,
  items,
  fields,
  onChange,
  wide,
}: {
  title: string;
  items: T[];
  fields: [keyof T & string, string, ("text" | "number" | "area")?][];
  onChange: (v: T[]) => void;
  wide?: boolean;
}) {
  return (
    <div className="a-card space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{title}</h3>
        <button type="button" className="a-btn-light !py-1" onClick={() => onChange([...items, Object.fromEntries(fields.map(([f, , t]) => [f, t === "number" ? 0 : ""])) as T])}>
          <Plus className="size-4" /> Add
        </button>
      </div>
      {items.map((it, i) => (
        <div key={i} className="flex gap-2 rounded-xl bg-zinc-50 p-3">
          <span className="mt-2 w-5 text-xs text-zinc-400">{i + 1}</span>
          <div className={cn("grid flex-1 gap-2", !wide && fields.length > 2 && "sm:grid-cols-2")}>
            {fields.map(([f, l, t]) =>
              t === "area" ? (
                <textarea key={f} placeholder={l} rows={2} value={String(it[f] ?? "")} onChange={(e) => onChange(items.map((x, j) => (j === i ? { ...x, [f]: e.target.value } : x)))} className="a-input sm:col-span-2" />
              ) : (
                <input
                  key={f}
                  type={t === "number" ? "number" : "text"}
                  placeholder={l}
                  title={l}
                  value={String(it[f] ?? "")}
                  onChange={(e) => onChange(items.map((x, j) => (j === i ? { ...x, [f]: t === "number" ? Number(e.target.value) || 0 : e.target.value } : x)))}
                  className="a-input"
                />
              ),
            )}
          </div>
          <div className="flex flex-col gap-1">
            <button type="button" disabled={i === 0} onClick={() => { const n = [...items]; [n[i - 1], n[i]] = [n[i], n[i - 1]]; onChange(n); }} className="px-1 text-xs text-zinc-400 disabled:opacity-30">▲</button>
            <button type="button" onClick={() => onChange(items.filter((_, j) => j !== i))} className="p-1 text-rose-600" aria-label="Remove"><Trash2 className="size-4" /></button>
          </div>
        </div>
      ))}
      {!items.length && <p className="text-sm text-zinc-400">Empty — click Add.</p>}
    </div>
  );
}

/** Sticky save bar used by every settings page */
export function SaveBar({ onSave, label = "Save changes" }: { onSave: () => Promise<unknown>; label?: string }) {
  const [pending, start] = useTransition();
  return (
    <div className="sticky bottom-4 z-10 flex justify-end">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            try {
              const r = (await onSave()) as { error?: string } | undefined;
              if (r && r.error) toast.error(r.error);
              else toast.success("Saved — live on the website");
            } catch {
              toast.error("Could not save");
            }
          })
        }
        className="a-btn shadow-xl"
      >
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} {label}
      </button>
    </div>
  );
}

/** Generic settings editor: give it a key + initial value, render fields with set() */
export function useSettingsState<T>(initial: T) {
  const [v, setV] = useState(initial);
  const set = <K extends keyof T>(k: K, val: T[K]) => setV((p) => ({ ...p, [k]: val }));
  return [v, set, setV] as const;
}
