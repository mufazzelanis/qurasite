import clsx, { type ClassValue } from "clsx";

export const cn = (...c: ClassValue[]) => clsx(c);

const bnDigits = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
export const toBn = (n: number | string) => String(n).replace(/\d/g, (d) => bnDigits[+d]);

export const taka = (n: number) => `৳${n.toLocaleString("en-IN")}`;

/** Normalise Bangladeshi mobile numbers to 01XXXXXXXXX. Returns null if invalid. */
export function normalizeBdPhone(input: string): string | null {
  const en = input.replace(/[০-৯]/g, (d) => String("০১২৩৪৫৬৭৮৯".indexOf(d)));
  let p = en.replace(/[^\d]/g, "");
  if (p.startsWith("880")) p = p.slice(2);
  else if (p.startsWith("88")) p = p.slice(2);
  if (!p.startsWith("0")) p = "0" + p;
  return /^01[3-9]\d{8}$/.test(p) ? p : null;
}

export const DELIVERY_LABELS = {
  INSIDE_DHAKA: "ঢাকা সিটির ভেতরে",
  SUB_DHAKA: "ঢাকার পাশে (সাব-ঢাকা)",
  OUTSIDE_DHAKA: "ঢাকা সিটির বাইরে",
} as const;

export const STATUS_META: Record<string, { label: string; bn: string; color: string }> = {
  PENDING: { label: "Pending", bn: "অপেক্ষমাণ", color: "bg-amber-100 text-amber-800" },
  CONFIRMED: { label: "Confirmed", bn: "কনফার্মড", color: "bg-sky-100 text-sky-800" },
  PROCESSING: { label: "Processing", bn: "প্রস্তুত হচ্ছে", color: "bg-indigo-100 text-indigo-800" },
  SHIPPED: { label: "Shipped", bn: "কুরিয়ারে পাঠানো হয়েছে", color: "bg-violet-100 text-violet-800" },
  DELIVERED: { label: "Delivered", bn: "ডেলিভারি সম্পন্ন", color: "bg-emerald-100 text-emerald-800" },
  CANCELLED: { label: "Cancelled", bn: "বাতিল", color: "bg-rose-100 text-rose-800" },
  RETURNED: { label: "Returned", bn: "ফেরত", color: "bg-zinc-200 text-zinc-800" },
};

export const ORDER_FLOW = ["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED"] as const;
