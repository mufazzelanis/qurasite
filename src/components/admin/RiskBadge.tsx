import { cn } from "@/lib/utils";

export function RiskBadge({ score }: { score: number }) {
  const [label, cls] =
    score >= 70 ? ["High", "bg-rose-100 text-rose-700"] : score >= 40 ? ["Medium", "bg-amber-100 text-amber-800"] : ["Safe", "bg-emerald-100 text-emerald-700"];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold", cls)}>
      {label} · {score}
    </span>
  );
}
