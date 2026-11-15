"use client";
import { useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { RiskBadge } from "./RiskBadge";

type R = {
  phone: string;
  score: number;
  flags: string[];
  blocked: boolean;
  history: { total: number; delivered: number; cancelled: number; returned: number };
  courier?: { total: number; success: number; cancel: number; ratio: number } | null;
  error?: string;
};

export default function FraudLookup() {
  const [phone, setPhone] = useState("");
  const [r, setR] = useState<R | null>(null);
  const [loading, setLoading] = useState(false);

  async function check(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setR(await fetch(`/api/admin/fraud-check?phone=${encodeURIComponent(phone)}`).then((x) => x.json()));
    setLoading(false);
  }

  return (
    <div className="a-card">
      <form onSubmit={check} className="flex gap-2">
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Check a phone number: 01XXXXXXXXX" className="a-input flex-1" />
        <button className="a-btn">{loading ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />} Check</button>
      </form>
      {r?.error && <p className="mt-3 text-sm text-rose-600">{r.error}</p>}
      {r && !r.error && (
        <div className="mt-4 grid gap-3 sm:grid-cols-5">
          <div className="rounded-xl bg-zinc-50 p-3"><p className="text-xs text-zinc-500">Risk</p><div className="mt-1"><RiskBadge score={r.score} /></div></div>
          <div className="rounded-xl bg-zinc-50 p-3"><p className="text-xs text-zinc-500">Our orders</p><p className="text-xl font-bold">{r.history.total}</p></div>
          <div className="rounded-xl bg-emerald-50 p-3"><p className="text-xs text-zinc-500">Delivered</p><p className="text-xl font-bold text-emerald-700">{r.history.delivered}</p></div>
          <div className="rounded-xl bg-rose-50 p-3"><p className="text-xs text-zinc-500">Cancel / Return</p><p className="text-xl font-bold text-rose-700">{r.history.cancelled + r.history.returned}</p></div>
          <div className="rounded-xl bg-sky-50 p-3"><p className="text-xs text-zinc-500">Courier success</p><p className="text-xl font-bold text-sky-700">{r.courier ? `${r.courier.ratio}% (${r.courier.success}/${r.courier.total})` : "—"}</p></div>
          {r.flags.length > 0 && <ul className="list-inside list-disc text-sm text-zinc-600 sm:col-span-5">{r.flags.map((f) => <li key={f}>{f}</li>)}</ul>}
          {r.blocked && <p className="text-sm font-semibold text-rose-600 sm:col-span-5">⚠ This number would be blocked at checkout.</p>}
        </div>
      )}
    </div>
  );
}
