"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, Plus, RotateCcw, Send, ShieldCheck, Trash2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { retryFailedCapiAction, savePixelSettings, sendTestPurchaseAction, verifyPixelsAction, type PixelInput, type PixelSettingsInput } from "@/app/admin/actions";
import { FB_EVENTS, type TrackingSettings } from "@/lib/settings-defaults";
import { cn } from "@/lib/utils";
import { SaveBar, TextF, Toggle } from "./fields";

export type PixelPublic = { id: string; label: string; tokenTail: string; site: boolean };
type Initial = Omit<TrackingSettings, "pixels"> & { pixels: PixelPublic[] };

const Section = ({ title, desc, right, children }: { title: string; desc?: React.ReactNode; right?: React.ReactNode; children: React.ReactNode }) => (
  <div className="a-card space-y-4">
    <div className="flex items-start justify-between gap-3">
      <div>
        <h2 className="font-semibold">{title}</h2>
        {desc && <p className="text-sm text-zinc-500">{desc}</p>}
      </div>
      {right}
    </div>
    {children}
  </div>
);

function Check({ checked, onChange, title, desc, disabled }: { checked: boolean; onChange: (v: boolean) => void; title: string; desc?: string; disabled?: boolean }) {
  return (
    <label className={cn("flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm transition", checked ? "border-emerald-300 bg-emerald-50/70" : "border-zinc-200 hover:bg-zinc-50", disabled && "opacity-50")}>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 size-4 accent-emerald-600" />
      <span>
        <span className="block font-medium text-zinc-800">{title}</span>
        {desc && <span className="block text-xs text-zinc-500">{desc}</span>}
      </span>
    </label>
  );
}

function Radio({ checked, onClick, title, desc }: { checked: boolean; onClick: () => void; title: string; desc: string }) {
  return (
    <button type="button" onClick={onClick} className={cn("flex w-full items-start gap-3 rounded-xl border p-3 text-left text-sm transition", checked ? "border-emerald-300 bg-emerald-50/70" : "border-zinc-200 hover:bg-zinc-50")}>
      <span className={cn("mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border-2", checked ? "border-emerald-600" : "border-zinc-300")}>{checked && <span className="size-2 rounded-full bg-emerald-600" />}</span>
      <span>
        <span className="block font-medium text-zinc-800">{title}</span>
        <span className="block text-xs text-zinc-500">{desc}</span>
      </span>
    </button>
  );
}

/** Pixels + channels + events + purchase rules + other analytics */
export function PixelSettingsForm({ initial }: { initial: Initial }) {
  const router = useRouter();
  const [v, setV] = useState<Omit<Initial, "pixels">>(() => {
    const { pixels: _p, ...rest } = initial;
    return rest;
  });
  const set = <K extends keyof typeof v>(k: K, val: (typeof v)[K]) => setV((p) => ({ ...p, [k]: val }));
  const [pixels, setPixels] = useState<(PixelInput & { tokenTail: string })[]>(() =>
    (initial.pixels.length ? initial.pixels : [{ id: "", label: "", tokenTail: "", site: true }]).map((p) => ({ id: p.id, label: p.label, tokenTail: p.tokenTail, prevId: p.id, token: "", removeToken: false, site: p.site })),
  );
  const upd = (i: number, patch: Partial<PixelInput>) => setPixels((ps) => ps.map((p, j) => (j === i ? { ...p, ...patch } : p)));

  return (
    <div className="space-y-5">
      <Section title="Pixels" desc="Events Manager → Data sources → your dataset. Add backup pixels from other ad accounts too — every event goes to all of them." right={<span className="rounded-md bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500">{pixels.length}/5</span>}>
        {pixels.map((p, i) => (
          <div key={i} className="space-y-3 rounded-xl border border-zinc-200 p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Pixel {i + 1} {i === 0 && <span className="ml-1 rounded bg-emerald-100 px-1.5 py-0.5 text-emerald-700">Primary</span>}
              </p>
              {pixels.length > 1 && (
                <button type="button" onClick={() => setPixels((ps) => ps.filter((_, j) => j !== i))} className="text-zinc-400 hover:text-rose-600" aria-label="Remove pixel">
                  <Trash2 className="size-4" />
                </button>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <TextF label="Pixel / Dataset ID" value={p.id} onChange={(x) => upd(i, { id: x })} placeholder="1234567890123456" />
              <TextF label="Label (optional)" value={p.label} onChange={(x) => upd(i, { label: x })} placeholder="e.g. Main ad account" />
            </div>
            <label className="block text-sm">
              <span className="font-medium text-zinc-700">
                Conversions API access token{" "}
                {p.tokenTail && !p.removeToken && <span className="text-xs font-normal text-emerald-600">— saved (••••{p.tokenTail}), leave empty to keep</span>}
              </span>
              <input type="password" autoComplete="off" value={p.token} onChange={(e) => upd(i, { token: e.target.value })} placeholder={p.tokenTail ? "•••••••• (unchanged)" : "Events Manager → Settings → Generate access token"} className="a-input mt-1" />
            </label>
            {p.tokenTail && (
              <label className="flex items-center gap-2 text-xs text-zinc-500">
                <input type="checkbox" checked={p.removeToken} onChange={(e) => upd(i, { removeToken: e.target.checked })} className="accent-rose-600" /> Remove the saved token (browser pixel only)
              </label>
            )}
            <div className={cn("rounded-xl p-3", p.site ? "bg-emerald-50/70 ring-1 ring-emerald-100" : "bg-zinc-50 ring-1 ring-zinc-200")}>
              <Toggle
                label="Use on the main site"
                checked={p.site}
                onChange={(x) => upd(i, { site: x })}
                help={p.site ? "Fires on home, shop, products, checkout — and on every landing page / page set to “Same as main site”." : "Library only — fires only on landing pages / pages that pick it."}
              />
            </div>
          </div>
        ))}
        {pixels.length < 10 && (
          <button type="button" onClick={() => setPixels((ps) => [...ps, { id: "", label: "", token: "", prevId: "", removeToken: false, tokenTail: "", site: false }])} className="a-btn-light">
            <Plus className="size-4" /> Add another pixel
          </button>
        )}
        <p className="text-xs text-zinc-400">Each landing page and page chooses its own pixels (Same as main site / Own pixels / None) in its editor. See “Where each pixel fires” below.</p>
      </Section>

      <Section title="Tracking channels">
        <div className="space-y-2">
          <Check checked={v.browserEnabled} onChange={(x) => set("browserEnabled", x)} title="Browser pixel" desc="Loads fbevents.js on public pages (never on the admin panel)." />
          <Check checked={v.capiEnabled} onChange={(x) => set("capiEnabled", x)} title="Conversions API (server-side)" desc="Sends every event from the server too — recovers events lost to ad blockers and iOS. Improves match quality." />
          <Check checked={v.serverPageView} onChange={(x) => set("serverPageView", x)} disabled={!v.capiEnabled} title="Also send PageView from the server" desc="More complete data. Turn off to save server requests on high traffic." />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <TextF label="Test Event Code (optional)" value={v.fbTestEventCode} onChange={(x) => set("fbTestEventCode", x)} placeholder="TEST12345" help="Only while testing — remove it before running ads." />
          <TextF label="Graph API version" value={v.graphVersion} onChange={(x) => set("graphVersion", x)} placeholder="v23.0" />
        </div>
      </Section>

      <Section title="Events" desc="Turn individual events on or off for both the browser and the server.">
        <div className="grid gap-2 sm:grid-cols-2">
          {FB_EVENTS.map(([k, desc]) => (
            <Check key={k} checked={v.events[k]} onChange={(x) => set("events", { ...v.events, [k]: x })} title={k} desc={desc} />
          ))}
        </div>
      </Section>

      <Section title="Purchase" desc="Cash-on-delivery stores often get fake orders — reporting later keeps your ad optimisation clean.">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Report a purchase…</p>
        <div className="space-y-2">
          <Radio checked={v.purchaseTrigger === "placed"} onClick={() => set("purchaseTrigger", "placed")} title="When the order is placed" desc="Counts every order right away. Browser + server Purchase, deduplicated. Fastest learning." />
          <Radio checked={v.purchaseTrigger === "confirmed"} onClick={() => set("purchaseTrigger", "confirmed")} title="When you confirm the order" desc="Fake/unreachable orders are never reported. Sent from the server when the status becomes Confirmed (or later)." />
          <Radio checked={v.purchaseTrigger === "delivered"} onClick={() => set("purchaseTrigger", "delivered")} title="When the order is delivered" desc="Only real, paid sales optimise your ads. Slower feedback to Meta (must be within 7 days of the click)." />
        </div>
        <p className="pt-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">Purchase value</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <Radio checked={v.purchaseValue === "total"} onClick={() => set("purchaseValue", "total")} title="Order total" desc="Products + delivery charge − discount" />
          <Radio checked={v.purchaseValue === "products"} onClick={() => set("purchaseValue", "products")} title="Products only" desc="Excludes the delivery charge — truer ROAS" />
        </div>
      </Section>

      <Section title="Other analytics">
        <div className="grid gap-3 sm:grid-cols-3">
          <TextF label="Google Analytics 4 ID" value={v.ga4Id} onChange={(x) => set("ga4Id", x)} placeholder="G-XXXXXXXXXX" />
          <TextF label="Google Tag Manager ID" value={v.gtmId} onChange={(x) => set("gtmId", x)} placeholder="GTM-XXXXXXX" />
          <TextF label="TikTok Pixel ID" value={v.tiktokPixelId} onChange={(x) => set("tiktokPixelId", x)} />
        </div>
      </Section>

      <SaveBar
        label="Save pixel settings"
        onSave={async () => {
          const r = await savePixelSettings({ ...v, pixels: pixels.map(({ tokenTail: _t, ...p }) => p) } as PixelSettingsInput);
          router.refresh();
          return r;
        }}
      />
    </div>
  );
}

/** "Verify connection" — asks Facebook whether each pixel + token works */
export function ConnectionCheck() {
  const [pending, start] = useTransition();
  const [res, setRes] = useState<{ id: string; label: string; ok: boolean; message: string }[] | null>(null);
  return (
    <div className="a-card space-y-3">
      <div>
        <h3 className="font-semibold">Connection check</h3>
        <p className="text-xs text-zinc-500">Asks Facebook whether each pixel and token work, and when the pixel last received an event.</p>
      </div>
      <button type="button" disabled={pending} onClick={() => start(async () => setRes(await verifyPixelsAction()))} className="a-btn-light w-full justify-center">
        {pending ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />} Verify connection
      </button>
      {res?.map((r) => (
        <div key={r.id} className={cn("flex gap-2 rounded-lg p-2 text-xs", r.ok ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-700")}>
          {r.ok ? <CheckCircle2 className="size-4 shrink-0" /> : <XCircle className="size-4 shrink-0" />}
          <span>
            <b>{r.label || r.id}</b> — {r.message}
          </span>
        </div>
      ))}
    </div>
  );
}

/** Send a test Purchase with a Test Event Code (Events Manager → Test events) */
export function TestEvent({ defaultCode }: { defaultCode: string }) {
  const router = useRouter();
  const [code, setCode] = useState(defaultCode);
  const [pending, start] = useTransition();
  return (
    <div className="a-card space-y-3">
      <div>
        <h3 className="font-semibold">Send a test event</h3>
        <p className="text-xs text-zinc-500">Events Manager → your dataset → <b>Test events</b> → copy the code, then send a test Purchase from the server.</p>
      </div>
      <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="TEST12345" className="a-input" />
      <button
        type="button"
        disabled={pending || !code.trim()}
        onClick={() =>
          start(async () => {
            const r = await sendTestPurchaseAction(code);
            if ("error" in r && r.error) toast.error(r.error);
            else if (r.ok) toast.success("Test Purchase received by Facebook ✓ — check Test events");
            else toast.error(`Facebook rejected it: ${"results" in r ? r.results?.find((x) => !x.ok)?.response : ""}`);
            router.refresh();
          })
        }
        className="a-btn w-full justify-center"
      >
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />} Send test Purchase
      </button>
    </div>
  );
}

export function RetryFailed({ count }: { count: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  if (!count) return null;
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await retryFailedCapiAction();
          toast.success(`Retried ${r.tried} · delivered ${r.fixed}`);
          router.refresh();
        })
      }
      className="a-btn-light text-xs"
    >
      {pending ? <Loader2 className="size-3.5 animate-spin" /> : <RotateCcw className="size-3.5" />} Retry failed
    </button>
  );
}
