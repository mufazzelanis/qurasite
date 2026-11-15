import type { Prisma, OrderStatus } from "@prisma/client";
import { getRange } from "./periods";

export type OrderFilters = {
  status?: string;
  q?: string;
  from?: string;
  to?: string;
  risk?: string; // "high"
  p?: string; // period key (links from the dashboard)
  source?: string; // "shop" | landing slug
  method?: string; // COD | BKASH | NAGAD | ROCKET
  pay?: string; // "advance" | "cod"
  camp?: string; // utm campaign / Facebook campaign id, "_none" = without campaign
  tod?: string; // time of day bucket
};

/** Time-of-day buckets (Bangladesh time) */
export const TIME_OF_DAY = [
  ["night", 0, 6, "00–06", "Late night"],
  ["morning", 6, 12, "06–12", "Morning"],
  ["afternoon", 12, 18, "12–18", "Afternoon"],
  ["evening", 18, 24, "18–24", "Evening"],
] as const;

export function orderWhere(f: OrderFilters, opts: { ignoreTod?: boolean } = {}): Prisma.OrderWhereInput {
  const and: Prisma.OrderWhereInput[] = [];
  if (f.status && f.status !== "ALL") and.push({ status: f.status as OrderStatus });
  const q = f.q?.trim();
  if (q) {
    const digits = q.replace(/\D/g, "");
    and.push({
      OR: [
        { orderNo: { contains: q.replace(/^#/, ""), mode: "insensitive" } },
        { customerName: { contains: q, mode: "insensitive" } },
        { address: { contains: q, mode: "insensitive" } },
        { paymentTrxId: { contains: q, mode: "insensitive" } },
        ...(digits.length >= 4 ? [{ phone: { contains: digits.replace(/^88/, "") } }] : []),
      ],
    });
  }
  if (f.p || f.from || f.to) {
    const r = getRange(f.from || f.to ? "custom" : f.p, f.from, f.to);
    if (r.key !== "all") and.push({ createdAt: { gte: r.from, lte: r.to } });
  }
  if (f.source) and.push({ source: f.source });
  if (f.method && ["COD", "BKASH", "NAGAD", "ROCKET"].includes(f.method)) and.push({ paymentMethod: f.method });
  if (f.pay === "advance") and.push({ advanceAmount: { gt: 0 } });
  if (f.pay === "cod") and.push({ advanceAmount: 0 });
  if (f.camp === "_none") and.push({ OR: [{ utmCampaign: null }, { utmCampaign: "" }] });
  else if (f.camp) and.push({ utmCampaign: f.camp });
  if (f.risk === "high") and.push({ fraudScore: { gte: 50 } });
  const tod = TIME_OF_DAY.find((t) => t[0] === f.tod);
  if (tod && !opts.ignoreTod) and.push({ hourBd: { gte: tod[1], lt: tod[2] } });
  return and.length ? { AND: and } : {};
}
