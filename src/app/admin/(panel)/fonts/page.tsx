import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { requireAdmin } from "@/lib/session";
import { getSetting } from "@/lib/settings";
import FontSettings from "@/components/admin/FontSettings";

export default async function FontsPage() {
  await requireAdmin("mainsite");
  const typography = await getSetting("typography");
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Fonts</h1>
          <p className="mt-1 text-sm text-zinc-500">Choose one Bangla and one English font — used on the whole site, every landing page and page. Fonts are self-hosted for speed.</p>
        </div>
        <Link href="/" target="_blank" className="a-btn-light !rounded-xl">
          <ExternalLink className="size-4" /> View site
        </Link>
      </div>
      <FontSettings initial={typography} />
    </div>
  );
}
