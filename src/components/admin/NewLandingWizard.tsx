"use client";
import Image from "next/image";
import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { ArrowLeft, ArrowRight, Check, ExternalLink, Loader2, Monitor, Plus, Rocket, Smartphone, Sparkles, X } from "lucide-react";
import { createLanding } from "@/app/admin/actions";
import { LANDING_DESIGNS, designByKey } from "@/lib/landing-designs";
import { cn, taka } from "@/lib/utils";
import DesignMock from "./DesignMock";
import { Toggle } from "./fields";

type P = { id: string; name: string; nameBn: string | null; image: string; price: number; isAddon: boolean };

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-/, "");

export default function NewLandingWizard({ host, products, pages, previewSlug, taken }: { host: string; products: P[]; pages: { id: string; slug: string; title: string }[]; previewSlug: string | null; taken: string[] }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [design, setDesign] = useState("classic");
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [slug, setSlug] = useState("");
  const [title, setTitle] = useState("");
  const mains = products.filter((p) => !p.isAddon);
  const [productId, setProductId] = useState(mains[0]?.id ?? "");
  const [copyFrom, setCopyFrom] = useState("");
  const [publish, setPublish] = useState(true);
  const [state, action] = useActionState(createLanding, null);
  const d = designByKey(design);
  const product = mains.find((p) => p.id === productId);
  const clash = !!slug && taken.includes(slug);

  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", k);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", k);
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      <button
        onClick={() => {
          setOpen(true);
          setStep(1);
        }}
        className="a-btn !rounded-xl shadow-lg shadow-brand-900/20"
      >
        <Plus className="size-4" /> New landing page
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-stretch justify-center bg-zinc-950/60 p-0 backdrop-blur-sm sm:p-4" role="dialog" aria-modal="true" aria-label="New landing page">
          <div className="flex h-full w-full max-w-7xl flex-col overflow-hidden bg-zinc-50 shadow-2xl sm:rounded-3xl">
            {/* top bar */}
            <header className="flex items-center gap-4 border-b border-zinc-200 bg-white px-5 py-3.5">
              <span className="grid size-10 place-items-center rounded-xl bg-brand-800 text-gold-300">
                <Rocket className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="font-bold">New landing page</h2>
                <p className="text-xs text-zinc-500">{step === 1 ? "Step 1 of 2 · Choose a design — you can change it any time" : "Step 2 of 2 · URL, product and content"}</p>
              </div>
              <ol className="hidden items-center gap-2 text-xs font-semibold sm:flex">
                {["Design", "Details"].map((s, i) => (
                  <li key={s} className={cn("flex items-center gap-1.5 rounded-full px-3 py-1", step === i + 1 ? "bg-brand-800 text-white" : step > i + 1 ? "bg-brand-50 text-brand-700" : "bg-zinc-100 text-zinc-400")}>
                    {step > i + 1 ? <Check className="size-3.5" /> : <span>{i + 1}</span>} {s}
                  </li>
                ))}
              </ol>
              <button onClick={() => setOpen(false)} className="grid size-9 place-items-center rounded-xl text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700" aria-label="Close">
                <X className="size-5" />
              </button>
            </header>

            {step === 1 ? (
              <div className="grid min-h-0 flex-1 lg:grid-cols-[400px_minmax(0,1fr)]">
                {/* design list */}
                <div className="space-y-3 overflow-y-auto border-r border-zinc-200 p-4">
                  {LANDING_DESIGNS.map((x) => (
                    <button key={x.key} onClick={() => setDesign(x.key)} className={cn("group w-full overflow-hidden rounded-2xl border-2 bg-white text-left transition", design === x.key ? "border-brand-700 shadow-lg shadow-brand-900/10" : "border-transparent shadow-sm hover:border-zinc-300")}>
                      <DesignMock d={x} image={product?.image} />
                      <div className="flex items-start gap-3 p-3">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold">{x.name}</p>
                          <p className="text-xs text-zinc-500">{x.tagline}</p>
                        </div>
                        <span className="flex shrink-0 gap-1">
                          {[x.primary, x.accent, x.preview.bg].map((c) => (
                            <span key={c} className="size-4 rounded-full ring-1 ring-black/10" style={{ background: c }} />
                          ))}
                        </span>
                        {design === x.key && (
                          <span className="grid size-5 shrink-0 place-items-center rounded-full bg-brand-700 text-white">
                            <Check className="size-3" strokeWidth={3} />
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>

                {/* live preview */}
                <div className="flex min-h-0 flex-col">
                  <div className="flex flex-wrap items-center gap-3 border-b border-zinc-200 bg-white px-5 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{d.name}</p>
                      <p className="truncate text-xs text-zinc-500">
                        {d.desc} <span className="font-semibold text-brand-700">Best for: {d.bestFor}</span>
                      </p>
                    </div>
                    <div className="inline-flex rounded-xl bg-zinc-100 p-1">
                      {(
                        [
                          ["desktop", Monitor],
                          ["mobile", Smartphone],
                        ] as const
                      ).map(([k, Icon]) => (
                        <button key={k} onClick={() => setDevice(k)} className={cn("grid size-8 place-items-center rounded-lg transition", device === k ? "bg-white text-brand-800 shadow-sm" : "text-zinc-500")} aria-label={k}>
                          <Icon className="size-4" />
                        </button>
                      ))}
                    </div>
                    {previewSlug && (
                      <a href={`/preview/${previewSlug}?design=${design}`} target="_blank" className="a-btn-light !rounded-xl !py-1.5">
                        <ExternalLink className="size-4" /> Full screen
                      </a>
                    )}
                  </div>
                  <div className="flex min-h-0 flex-1 items-start justify-center overflow-hidden bg-[radial-gradient(circle_at_center,#e4e4e7_1px,transparent_1px)] [background-size:16px_16px] p-4 sm:p-6">
                    {previewSlug ? (
                      <div className={cn("h-full overflow-hidden rounded-2xl border border-zinc-300 bg-white shadow-2xl transition-all duration-300", device === "mobile" ? "w-[390px] max-w-full" : "w-full")}>
                        <iframe key={design + device} src={`/preview/${previewSlug}?design=${design}`} title="Design preview" className="size-full" />
                      </div>
                    ) : (
                      <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl">
                        <DesignMock d={d} image={product?.image} />
                        <p className="p-4 text-center text-sm text-zinc-500">A live full-page preview appears here once you have your first landing page.</p>
                      </div>
                    )}
                  </div>
                  <footer className="flex items-center justify-end gap-2 border-t border-zinc-200 bg-white px-5 py-3">
                    <button onClick={() => setStep(2)} className="a-btn !rounded-xl px-5">
                      Use {d.name} <ArrowRight className="size-4" />
                    </button>
                  </footer>
                </div>
              </div>
            ) : (
              <form action={action} className="flex min-h-0 flex-1 flex-col">
                <input type="hidden" name="design" value={design} />
                <input type="hidden" name="productId" value={productId} />
                <input type="hidden" name="copyFrom" value={copyFrom} />
                {publish && <input type="hidden" name="publish" value="on" />}
                <div className="grid min-h-0 flex-1 gap-6 overflow-y-auto p-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:p-8">
                  <div className="space-y-6">
                    <Field n={1} title="Page address" hint="Short English words — this is the link you put in your ads.">
                      <div className={cn("flex overflow-hidden rounded-xl border-2 bg-white focus-within:ring-4", clash ? "border-rose-400 focus-within:ring-rose-500/10" : "border-zinc-200 focus-within:border-brand-600 focus-within:ring-brand-600/10")}>
                        <span className="flex items-center border-r border-zinc-200 bg-zinc-50 px-3 font-mono text-sm text-zinc-500">{host}/</span>
                        <input name="slug" required value={slug} onChange={(e) => setSlug(slugify(e.target.value))} placeholder="qura-offer" autoFocus className="min-w-0 flex-1 px-3 py-3 font-mono text-lg outline-none" />
                      </div>
                      {clash && <p className="mt-1.5 text-sm text-rose-600">This address is already used — try another.</p>}
                    </Field>

                    <Field n={2} title="Internal name" hint="Only you see this — e.g. “Eid offer — Facebook”">
                      <input name="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Qura Mix — Eid offer" className="a-input !rounded-xl !py-3" />
                    </Field>

                    <Field n={3} title="Main product" hint="Shown in the hero and selected by default in the order form">
                      <div className="grid gap-2 sm:grid-cols-2">
                        {mains.map((p) => (
                          <button key={p.id} type="button" onClick={() => setProductId(p.id)} className={cn("flex items-center gap-3 rounded-xl border-2 bg-white p-2.5 text-left transition", productId === p.id ? "border-brand-700 shadow-sm" : "border-zinc-200 hover:border-zinc-300")}>
                            <span className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-zinc-50">
                              <Image src={p.image} alt="" fill sizes="48px" className="object-contain p-1" />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-semibold">{p.nameBn || p.name}</span>
                              <span className="text-xs text-zinc-500">{taka(p.price)}</span>
                            </span>
                            {productId === p.id && <Check className="size-4 shrink-0 text-brand-700" strokeWidth={3} />}
                          </button>
                        ))}
                      </div>
                    </Field>

                    <Field n={4} title="Start the texts from" hint="All texts, sections and combo settings can be edited after creating">
                      <div className="grid gap-2 sm:grid-cols-2">
                        {[{ id: "", slug: "", title: "Default template" }, ...pages].map((p) => (
                          <button key={p.id || "default"} type="button" onClick={() => setCopyFrom(p.id)} className={cn("rounded-xl border-2 bg-white p-3 text-left text-sm transition", copyFrom === p.id ? "border-brand-700" : "border-zinc-200 hover:border-zinc-300")}>
                            <span className="font-semibold">{p.id ? `Copy of ${p.title}` : "✨ Default template"}</span>
                            <span className="block text-xs text-zinc-500">{p.id ? `/${p.slug} — same texts, add-ons and FAQ` : "Ready-made Bangla sales copy"}</span>
                          </button>
                        ))}
                      </div>
                    </Field>

                    <div className="rounded-2xl bg-white p-4 ring-1 ring-zinc-200">
                      <Toggle label="Publish immediately" help={publish ? "Live as soon as it's created" : "Created as a draft — publish it from the editor"} checked={publish} onChange={setPublish} />
                    </div>
                    {state?.error && <p className="rounded-xl bg-rose-50 p-3 text-sm font-medium text-rose-700">{state.error}</p>}
                  </div>

                  {/* summary */}
                  <aside className="space-y-4 lg:sticky lg:top-0">
                    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
                      <DesignMock d={d} image={product?.image} />
                      <div className="space-y-2 p-4 text-sm">
                        <Row k="Design" v={d.name} />
                        <Row k="Address" v={slug ? `${host}/${slug}` : "—"} mono />
                        <Row k="Product" v={product ? `${product.nameBn || product.name} · ${taka(product.price)}` : "—"} />
                        <Row k="Texts" v={copyFrom ? `Copy of /${pages.find((p) => p.id === copyFrom)?.slug}` : "Default template"} />
                        <Row k="Status" v={publish ? "Live" : "Draft"} />
                      </div>
                    </div>
                    <p className="flex gap-2 rounded-xl bg-brand-50 p-3 text-xs text-brand-800">
                      <Sparkles className="size-4 shrink-0" /> After creating, you land in the editor: texts, sections, combo offer, colors, pixel and SEO.
                    </p>
                  </aside>
                </div>
                <footer className="flex items-center justify-between gap-2 border-t border-zinc-200 bg-white px-5 py-3">
                  <button type="button" onClick={() => setStep(1)} className="a-btn-light !rounded-xl">
                    <ArrowLeft className="size-4" /> Design
                  </button>
                  <Submit disabled={!slug || clash || !productId} />
                </footer>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function Submit({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button disabled={disabled || pending} className="a-btn !rounded-xl px-6 disabled:opacity-40">
      {pending ? <Loader2 className="size-4 animate-spin" /> : <Rocket className="size-4" />} Create landing page
    </button>
  );
}

function Field({ n, title, hint, children }: { n: number; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-2.5 flex items-start gap-3">
        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-brand-800 text-xs font-bold text-white">{n}</span>
        <div>
          <p className="font-semibold">{title}</p>
          {hint && <p className="text-xs text-zinc-500">{hint}</p>}
        </div>
      </div>
      <div className="pl-10">{children}</div>
    </section>
  );
}

function Row({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-zinc-500">{k}</span>
      <span className={cn("truncate text-right font-medium", mono && "font-mono text-xs")}>{v}</span>
    </div>
  );
}
