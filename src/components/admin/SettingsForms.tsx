"use client";
import { useActionState, useState } from "react";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { changePassword, saveSettingsAction, testSms } from "@/app/admin/actions";
import type { AllSettings } from "@/lib/settings-defaults";
import { AreaF, ImageField, ListEditor, NumF, SaveBar, TextF, Toggle } from "./fields";

const Card = ({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) => (
  <div className="a-card space-y-4">
    <div>
      <h2 className="font-semibold">{title}</h2>
      {desc && <p className="text-sm text-zinc-500">{desc}</p>}
    </div>
    <div className="grid gap-4 sm:grid-cols-2">{children}</div>
  </div>
);
const Full = ({ children }: { children: React.ReactNode }) => <div className="sm:col-span-2">{children}</div>;

function useS<K extends keyof AllSettings>(initial: AllSettings[K]) {
  const [v, setV] = useState(initial);
  const set = <F extends keyof AllSettings[K]>(f: F, val: AllSettings[K][F]) => setV((p) => ({ ...p, [f]: val }));
  return [v, set] as const;
}

// ── Payments, delivery, courier ───────────────────────
export function PaymentsForm({ payments, delivery, courier }: { payments: AllSettings["payments"]; delivery: AllSettings["delivery"]; courier: AllSettings["courier"] }) {
  const [p, setP] = useS<"payments">(payments);
  const [d, setD] = useS<"delivery">(delivery);
  const [c, setC] = useS<"courier">(courier);
  const wallet = (k: "bkash" | "nagad" | "rocket", label: string) => (
    <div className="space-y-2 rounded-xl bg-zinc-50 p-3">
      <Toggle label={label} checked={p[k].enabled} onChange={(x) => setP(k, { ...p[k], enabled: x })} />
      <TextF label="Number" value={p[k].number} onChange={(x) => setP(k, { ...p[k], number: x })} />
      <TextF label="Type (Personal / Merchant / Agent)" value={p[k].type} onChange={(x) => setP(k, { ...p[k], type: x })} />
    </div>
  );
  return (
    <div className="space-y-4">
      <Card title="Delivery charges">
        <NumF label="Inside Dhaka (৳)" value={d.insideDhaka} onChange={(x) => setD("insideDhaka", x)} />
        <NumF label="Sub-Dhaka (৳)" value={d.subDhaka} onChange={(x) => setD("subDhaka", x)} />
        <NumF label="Outside Dhaka (৳)" value={d.outsideDhaka} onChange={(x) => setD("outsideDhaka", x)} />
        <NumF label="Free delivery over (৳)" value={d.freeDeliveryOver} onChange={(x) => setD("freeDeliveryOver", x)} help="0 = off" />
      </Card>
      <Card title="Payment" desc="Advance payment cuts fake orders a lot — e.g. ask only the delivery charge for outside-Dhaka orders.">
        <Toggle label="Cash on delivery" checked={p.codEnabled} onChange={(x) => setP("codEnabled", x)} help="Off = full payment always required" />
        <label className="text-sm">
          <span className="font-medium text-zinc-700">Advance payment</span>
          <select value={p.advanceMode} onChange={(e) => setP("advanceMode", e.target.value as typeof p.advanceMode)} className="a-input mt-1">
            <option value="none">No advance (pure COD)</option>
            <option value="delivery">Delivery charge in advance</option>
            <option value="full">Full payment in advance</option>
          </select>
        </label>
        <Toggle label="Advance only for outside Dhaka" checked={p.advanceOutsideDhakaOnly} onChange={(x) => setP("advanceOutsideDhakaOnly", x)} />
        <div />
        {wallet("bkash", "bKash")}
        {wallet("nagad", "Nagad")}
        {wallet("rocket", "Rocket")}
        <AreaF label="Instructions shown to customer" value={p.instructions} onChange={(x) => setP("instructions", x)} />
      </Card>
      <Card title="Steadfast courier" desc="Send orders to Steadfast in one click (single or bulk) and sync delivery status.">
        <TextF label="API key" value={c.steadfastApiKey} onChange={(x) => setC("steadfastApiKey", x)} secret />
        <TextF label="Secret key" value={c.steadfastSecretKey} onChange={(x) => setC("steadfastSecretKey", x)} secret />
        <Full><TextF label="API base URL" value={c.steadfastBaseUrl} onChange={(x) => setC("steadfastBaseUrl", x)} /></Full>
      </Card>
      <SaveBar
        onSave={async () => {
          await saveSettingsAction("delivery", d);
          await saveSettingsAction("courier", c);
          return saveSettingsAction("payments", p);
        }}
      />
    </div>
  );
}

// ── SMS, OTP, email ───────────────────────────────────
export function SmsForm({ sms, email }: { sms: AllSettings["sms"]; email: AllSettings["email"] }) {
  const [s, setS] = useS<"sms">(sms);
  const [e, setE] = useS<"email">(email);
  const [testTo, setTestTo] = useState("");
  const [testing, setTesting] = useState(false);
  const tpl = (k: keyof typeof s.templates, l: string) => <AreaF key={k} label={l} rows={2} value={s.templates[k]} onChange={(x) => setS("templates", { ...s.templates, [k]: x })} />;
  return (
    <div className="space-y-4">
      <Card title="SMS gateway" desc="Works with most Bangladeshi SMS providers (BulkSMSBD, SMS.net.bd, Alpha SMS…). Put {phone} {message} {apiKey} {senderId} in the URL.">
        <Toggle label="SMS enabled" checked={s.enabled} onChange={(x) => setS("enabled", x)} />
        <label className="text-sm">
          <span className="font-medium text-zinc-700">Method</span>
          <select value={s.method} onChange={(x) => setS("method", x.target.value as "GET" | "POST")} className="a-input mt-1"><option>GET</option><option>POST</option></select>
        </label>
        <Full><TextF label="API URL" value={s.apiUrl} onChange={(x) => setS("apiUrl", x)} placeholder="https://bulksmsbd.net/api/smsapi?api_key={apiKey}&type=text&number={phone}&senderid={senderId}&message={message}" /></Full>
        <TextF label="API key" value={s.apiKey} onChange={(x) => setS("apiKey", x)} secret />
        <TextF label="Sender ID" value={s.senderId} onChange={(x) => setS("senderId", x)} />
        <TextF label="Admin phone (new-order alert)" value={s.adminPhone} onChange={(x) => setS("adminPhone", x)} />
        <div className="flex items-end gap-2">
          <TextF label="Send a test SMS to" value={testTo} onChange={setTestTo} />
          <button
            type="button"
            disabled={testing}
            onClick={async () => {
              setTesting(true);
              const r = await testSms(testTo);
              setTesting(false);
              if ("skipped" in r) toast.error("Save settings with SMS enabled first");
              else if (r.ok) toast.success("Test SMS sent");
              else toast.error(`Failed (${"status" in r ? r.status : "error"})`);
            }}
            className="a-btn-light"
          >
            {testing ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />} Test
          </button>
        </div>
      </Card>
      <Card title="OTP verification at checkout" desc="Customer must enter a code sent by SMS before the order is placed. Cuts fake orders.">
        <Toggle label="OTP enabled" checked={s.otpEnabled} onChange={(x) => setS("otpEnabled", x)} help="Needs SMS enabled" />
        <NumF label="Ask OTP only when fraud score ≥" value={s.otpMinRisk} onChange={(x) => setS("otpMinRisk", x)} help="0 = every customer, 30 = only suspicious ones" />
      </Card>
      <Card title="SMS templates" desc="Variables: {name} {orderNo} {total} {tracking} {phone} {code}">
        {tpl("placed", "Order placed")}
        {tpl("confirmed", "Confirmed")}
        {tpl("shipped", "Shipped")}
        {tpl("delivered", "Delivered")}
        {tpl("cancelled", "Cancelled")}
        {tpl("otp", "OTP code")}
        {tpl("adminNewOrder", "Admin new-order alert")}
      </Card>
      <Card title="Email alert for new orders (SMTP)" desc="Gmail: smtp.gmail.com, port 587, use an App Password.">
        <Toggle label="Email enabled" checked={e.enabled} onChange={(x) => setE("enabled", x)} />
        <TextF label="Send alerts to" value={e.notifyTo} onChange={(x) => setE("notifyTo", x)} />
        <TextF label="SMTP host" value={e.host} onChange={(x) => setE("host", x)} />
        <NumF label="Port" value={e.port} onChange={(x) => setE("port", x)} />
        <TextF label="Username" value={e.user} onChange={(x) => setE("user", x)} />
        <TextF label="Password / app password" value={e.pass} onChange={(x) => setE("pass", x)} secret />
        <TextF label="From address" value={e.from} onChange={(x) => setE("from", x)} />
      </Card>
      <SaveBar
        onSave={async () => {
          await saveSettingsAction("email", e);
          return saveSettingsAction("sms", s);
        }}
      />
    </div>
  );
}

// ── Invoice ───────────────────────────────────────────
export function InvoiceForm({ initial }: { initial: AllSettings["invoice"] }) {
  const [v, set] = useS<"invoice">(initial);
  return (
    <div className="space-y-4">
      <Card title="Invoice">
        <TextF label="Title" value={v.title} onChange={(x) => set("title", x)} />
        <TextF label="Company line" value={v.companyLine} onChange={(x) => set("companyLine", x)} />
        <Full><AreaF label="Footer note" value={v.footerNote} onChange={(x) => set("footerNote", x)} /></Full>
        <Toggle label="Show fraud score (internal copies)" checked={v.showFraudScore} onChange={(x) => set("showFraudScore", x)} />
        <Toggle label="Show order source (landing page)" checked={v.showSource} onChange={(x) => set("showSource", x)} />
      </Card>
      <SaveBar onSave={() => saveSettingsAction("invoice", v)} />
    </div>
  );
}

// ── General: store info + fraud + password ────────────
export function GeneralForm({ site, fraud }: { site: AllSettings["site"]; fraud: AllSettings["fraud"] }) {
  const [s, setS] = useS<"site">(site);
  const [f, setF] = useS<"fraud">(fraud);
  return (
    <div className="space-y-4">
      <Card title="Store info">
        <TextF label="Store name (English)" value={s.name} onChange={(x) => setS("name", x)} />
        <TextF label="Store name (Bangla)" value={s.nameBn} onChange={(x) => setS("nameBn", x)} />
        <TextF label="Tagline" value={s.tagline} onChange={(x) => setS("tagline", x)} />
        <TextF label="Hotline" value={s.phone} onChange={(x) => setS("phone", x)} />
        <TextF label="WhatsApp (8801XXXXXXXXX)" value={s.whatsapp} onChange={(x) => setS("whatsapp", x)} />
        <TextF label="Email" value={s.email} onChange={(x) => setS("email", x)} />
        <Full><TextF label="Address" value={s.address} onChange={(x) => setS("address", x)} /></Full>
        <TextF label="Facebook" value={s.facebook} onChange={(x) => setS("facebook", x)} />
        <TextF label="Instagram" value={s.instagram} onChange={(x) => setS("instagram", x)} />
        <TextF label="YouTube" value={s.youtube} onChange={(x) => setS("youtube", x)} />
        <TextF label="TikTok" value={s.tiktok} onChange={(x) => setS("tiktok", x)} />
      </Card>
      <Card title="Fraud protection">
        <NumF label="Max orders per phone / 24h" value={f.maxOrdersPerPhonePerDay} onChange={(x) => setF("maxOrdersPerPhonePerDay", x)} />
        <NumF label="Max orders per IP / 24h" value={f.maxOrdersPerIpPerDay} onChange={(x) => setF("maxOrdersPerIpPerDay", x)} />
        <NumF label="Auto-reject at risk score ≥" value={f.blockScore} onChange={(x) => setF("blockScore", x)} help="101 = never auto-reject, only flag" />
        <div />
        <TextF label="Courier fraud-check API URL (optional)" value={f.courierApiUrl} onChange={(x) => setF("courierApiUrl", x)} help="Use {phone}" />
        <TextF label="Courier fraud-check API key" value={f.courierApiKey} onChange={(x) => setF("courierApiKey", x)} secret />
      </Card>
      <SaveBar
        onSave={async () => {
          await saveSettingsAction("fraud", f);
          return saveSettingsAction("site", s);
        }}
      />
      <PasswordForm />
    </div>
  );
}

function PasswordForm() {
  const [state, action, pending] = useActionState(changePassword, null);
  return (
    <form action={action} className="a-card max-w-md space-y-3">
      <h2 className="font-semibold">Change my password</h2>
      <input name="current" type="password" placeholder="Current password" required className="a-input" />
      <input name="next" type="password" placeholder="New password (min 8)" required className="a-input" />
      {state?.error && <p className="text-sm text-rose-600">{state.error}</p>}
      {state?.ok && <p className="text-sm text-emerald-600">{state.ok}</p>}
      <button disabled={pending} className="a-btn">Update password</button>
    </form>
  );
}

// ── Landing defaults + combo/upsell ───────────────────
export function LandingSettingsForm({ landing, upsell }: { landing: AllSettings["landing"]; upsell: AllSettings["upsell"] }) {
  const [l, setL] = useS<"landing">(landing);
  const [u, setU] = useS<"upsell">(upsell);
  return (
    <div className="space-y-4">
      <Card title="Combo & upsell (main site + defaults)" desc="Honey / gur combo price, checkout order bump and the one-click add after purchase.">
        <Toggle label="Combo enabled on main site" checked={u.enabled} onChange={(x) => setU("enabled", x)} />
        <div />
        <TextF label="Order-bump title" value={u.bumpTitle} onChange={(x) => setU("bumpTitle", x)} />
        <TextF label="Order-bump text" value={u.bumpText} onChange={(x) => setU("bumpText", x)} />
        <Toggle label="One-click add on thank-you page" checked={u.postPurchaseEnabled} onChange={(x) => setU("postPurchaseEnabled", x)} help="Customer adds honey/gur to the same order with one tap" />
        <NumF label="Offer valid for (minutes)" value={u.postPurchaseMinutes} onChange={(x) => setU("postPurchaseMinutes", x)} />
        <Full><TextF label="Thank-you offer title" value={u.postPurchaseTitle} onChange={(x) => setU("postPurchaseTitle", x)} /></Full>
      </Card>
      <Card title="Default template for NEW landing pages" desc="Existing pages keep their own texts — edit them in Landing Pages.">
        <TextF label="Badge" value={l.heroBadge} onChange={(x) => setL("heroBadge", x)} />
        <TextF label="Offer text" value={l.offerText} onChange={(x) => setL("offerText", x)} />
        <TextF label="Hero title" value={l.heroTitle} onChange={(x) => setL("heroTitle", x)} />
        <TextF label="Hero highlight" value={l.heroHighlight} onChange={(x) => setL("heroHighlight", x)} />
        <Full><AreaF label="Hero subtitle" value={l.heroSubtitle} onChange={(x) => setL("heroSubtitle", x)} /></Full>
      </Card>
      <ListEditor title="Default benefits (also shown on the main site)" items={l.benefits} fields={[["title", "Title"], ["icon", "Icon"], ["text", "Text", "area"]]} onChange={(x) => setL("benefits", x)} />
      <ListEditor title="Default FAQ" wide items={l.faqs} fields={[["q", "Question"], ["a", "Answer", "area"]]} onChange={(x) => setL("faqs", x)} />
      <SaveBar
        onSave={async () => {
          await saveSettingsAction("upsell", u);
          return saveSettingsAction("landing", l);
        }}
      />
    </div>
  );
}
