"use client";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const GREEN = "#1b5c37";
const GOLD = "#da9128";
const PALETTE = ["#1b5c37", "#da9128", "#4a9468", "#ecb663", "#0d4524", "#9a571b", "#7bb892"];

export function SalesChart({ data }: { data: { label: string; revenue: number; orders: number }[] }) {
  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ left: -10, right: 8, top: 8 }}>
          <defs>
            <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={GREEN} stopOpacity={0.35} />
              <stop offset="100%" stopColor={GREEN} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#eee" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#71717a" }} axisLine={false} tickLine={false} />
          <YAxis yAxisId="r" tick={{ fontSize: 11, fill: "#71717a" }} axisLine={false} tickLine={false} />
          <YAxis yAxisId="o" orientation="right" hide />
          <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e4e4e7" }} formatter={(v, n) => (n === "revenue" ? [`৳${Number(v).toLocaleString()}`, "Revenue"] : [v, "Orders"])} />
          <Area yAxisId="r" type="monotone" dataKey="revenue" stroke={GREEN} strokeWidth={2.5} fill="url(#rev)" />
          <Area yAxisId="o" type="monotone" dataKey="orders" stroke={GOLD} strokeWidth={2} fill="transparent" strokeDasharray="4 3" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function BarList({ data, valueKey, nameKey, money }: { data: Record<string, unknown>[]; valueKey: string; nameKey: string; money?: boolean }) {
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 10, right: 20 }}>
          <XAxis type="number" hide />
          <YAxis type="category" dataKey={nameKey} width={120} tick={{ fontSize: 12, fill: "#3f3f46" }} axisLine={false} tickLine={false} />
          <Tooltip formatter={(v) => (money ? `৳${Number(v).toLocaleString()}` : v)} contentStyle={{ borderRadius: 12 }} />
          <Bar dataKey={valueKey} radius={[0, 8, 8, 0]}>
            {data.map((_, i) => (
              <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function Donut({ data }: { data: { name: string; value: number }[] }) {
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={3}>
            {data.map((_, i) => (
              <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
            ))}
          </Pie>
          <Tooltip contentStyle={{ borderRadius: 12 }} />
        </PieChart>
      </ResponsiveContainer>
      <div className="-mt-4 flex flex-wrap justify-center gap-3 text-xs">
        {data.map((d, i) => (
          <span key={d.name} className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full" style={{ background: PALETTE[i % PALETTE.length] }} /> {d.name} ({d.value})
          </span>
        ))}
      </div>
    </div>
  );
}
