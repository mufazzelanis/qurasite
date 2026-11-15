"use client";
import Link from "next/link";
import { useState } from "react";
import { Ban, Check, Globe, Plus, Target, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type LibPixel = { id: string; label: string; site: boolean };
export type PixelMode = "site" | "own" | "none";

/** Choose which Facebook pixels fire on one landing page / content page (browser + Conversions API) */
export default function PixelPicker({
  mode,
  ids,
  library,
  onChange,
  name,
}: {
  mode: PixelMode;
  ids: string[];
  library: LibPixel[];
  onChange: (mode: PixelMode, ids: string[]) => void;
  /** when set, renders hidden inputs `${name}Mode` and `${name}Ids` for plain <form> posts */
  name?: string;
}) {
  const [extra, setExtra] = useState("");
  const site = library.filter((p) => p.site);
  const custom = ids.filter((id) => !library.some((p) => p.id === id));
  const toggle = (id: string) => onChange("own", ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]);
  const addExtra = () => {
    const id = extra.trim();
    if (/^\d{5,20}$/.test(id) && !ids.includes(id)) onChange("own", [...ids, id]);
    setExtra("");
  };

  const OPTIONS = [
    { m: "site" as const, icon: Globe, title: "Same as main site", desc: site.length ? `${site.length} pixel${site.length > 1 ? "s" : ""}: ${site.map((p) => p.label || p.id).join(", ")}` : "No main-site pixel set" },
    { m: "own" as const, icon: Target, title: "Own pixels", desc: "Only the pixels you pick — keeps this page's data separate" },
    { m: "none" as const, icon: Ban, title: "No Facebook pixel", desc: "Nothing is sent to Facebook from this page" },
  ];

  return (
    <div className="space-y-3">
      {name && (
        <>
          <input type="hidden" name={`${name}Mode`} value={mode} />
          {mode === "own" && ids.map((id) => <input key={id} type="hidden" name={`${name}Ids`} value={id} />)}
        </>
      )}
      <div className="grid gap-2 sm:grid-cols-3">
        {OPTIONS.map(({ m, icon: Icon, title, desc }) => (
          <button
            key={m}
            type="button"
            onClick={() => onChange(m, m === "own" && !ids.length && library[0] ? [library[0].id] : ids)}
            className={cn("relative rounded-2xl border-2 p-3 text-left transition", mode === m ? "border-brand-700 bg-brand-50/70" : "border-zinc-200 bg-white hover:border-zinc-300")}
          >
            {mode === m && (
              <span className="absolute top-2.5 right-2.5 grid size-5 place-items-center rounded-full bg-brand-700 text-white">
                <Check className="size-3" strokeWidth={3} />
              </span>
            )}
            <Icon className={cn("size-5", mode === m ? "text-brand-700" : "text-zinc-400")} />
            <p className="mt-1.5 text-sm font-semibold">{title}</p>
            <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-zinc-500">{desc}</p>
          </button>
        ))}
      </div>

      {mode === "own" && (
        <div className="space-y-2 rounded-2xl bg-zinc-50 p-3 ring-1 ring-zinc-200">
          {library.length > 0 ? (
            <div className="grid gap-1.5 sm:grid-cols-2">
              {library.map((p) => {
                const on = ids.includes(p.id);
                return (
                  <button key={p.id} type="button" onClick={() => toggle(p.id)} className={cn("flex items-center gap-2.5 rounded-xl border bg-white px-3 py-2 text-left transition", on ? "border-brand-600 ring-1 ring-brand-600/20" : "border-zinc-200 hover:border-zinc-300")}>
                    <span className={cn("grid size-4 shrink-0 place-items-center rounded border", on ? "border-brand-700 bg-brand-700 text-white" : "border-zinc-300")}>{on && <Check className="size-3" strokeWidth={3} />}</span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{p.label || "Pixel"}</span>
                      <span className="block font-mono text-[11px] text-zinc-400">
                        {p.id}
                        {p.site && " · main site"}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-zinc-500">No pixels in the library yet.</p>
          )}
          {custom.map((id) => (
            <span key={id} className="mr-1.5 inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 font-mono text-xs ring-1 ring-zinc-200">
              {id}
              <button type="button" onClick={() => onChange("own", ids.filter((x) => x !== id))} aria-label={`Remove ${id}`} className="text-zinc-400 hover:text-rose-600">
                <X className="size-3" />
              </button>
            </span>
          ))}
          <div className="flex gap-2">
            <input
              value={extra}
              onChange={(e) => setExtra(e.target.value.replace(/\D/g, ""))}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addExtra())}
              inputMode="numeric"
              placeholder="Other pixel ID (numbers only)"
              className="a-input !py-1.5 font-mono !text-xs"
            />
            <button type="button" onClick={addExtra} disabled={!/^\d{5,20}$/.test(extra)} className="a-btn-light shrink-0 !py-1.5 !text-xs disabled:opacity-40">
              <Plus className="size-3.5" /> Add
            </button>
          </div>
          <p className="text-[11px] text-zinc-400">
            Pixels not in the <Link href="/admin/pixel" className="font-medium text-brand-700 hover:underline">library</Link> use the primary access token for the Conversions API. Add them to the library with their own token for best results.
          </p>
          {!ids.length && <p className="text-xs font-medium text-amber-600">⚠ Pick at least one pixel, or choose “No Facebook pixel”.</p>}
        </div>
      )}
    </div>
  );
}
