"use client";
import { useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { cn, taka } from "@/lib/utils";

export default function RevenueChart({ data, title, total }: { data: { label: string; revenue: number; orders: number }[]; title: string; total: number }) {
  const [mode, setMode] = useState<"revenue" | "orders" | "table">("revenue");
  const key = mode === "orders" ? "orders" : "revenue";
  return (
    <div className="a-card">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-zinc-500">{title}</p>
          <p className="text-2xl font-extrabold">{taka(total)}</p>
        </div>
        <div className="flex rounded-lg border border-zinc-200 p-0.5 text-sm">
          {(["revenue", "orders", "table"] as const).map((m) => (
            <button key={m} onClick={() => setMode(m)} className={cn("rounded-md px-3 py-1 capitalize", mode === m ? "bg-zinc-100 font-semibold text-zinc-900" : "text-zinc-500")}>
              {m}
            </button>
          ))}
        </div>
      </div>
      {mode === "table" ? (
        <div className="max-h-72 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-white text-left text-zinc-500">
              <tr><th className="py-2">Date</th><th>Orders</th><th className="text-right">Revenue</th></tr>
            </thead>
            <tbody>
              {data.filter((d) => d.orders).map((d) => (
                <tr key={d.label} className="border-t border-zinc-100"><td className="py-1.5">{d.label}</td><td>{d.orders}</td><td className="text-right font-semibold">{taka(d.revenue)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ left: -10, right: 8, top: 8 }}>
              <defs>
                <linearGradient id="rc" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#1b5c37" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#1b5c37" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#71717a" }} axisLine={false} tickLine={false} minTickGap={20} />
              <YAxis tick={{ fontSize: 11, fill: "#71717a" }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e4e4e7" }} formatter={(v) => (key === "revenue" ? [`৳${Number(v).toLocaleString()}`, "Revenue"] : [v, "Orders"])} />
              <Area type="monotone" dataKey={key} stroke="#1b5c37" strokeWidth={2.5} fill="url(#rc)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
