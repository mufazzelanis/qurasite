import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { requireAdmin } from "@/lib/session";
import { getAllSettings } from "@/lib/settings";
import MainSiteEditor from "@/components/admin/MainSiteEditor";

export default async function Page() {
  await requireAdmin("mainsite");
  const s = await getAllSettings();
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Main Site Settings</h1>
          <p className="mt-1 text-sm text-zinc-500">Homepage content, search engine listing and the thank-you page. Changes go live instantly.</p>
        </div>
        <Link href="/" target="_blank" className="a-btn-light !rounded-xl">
          <ExternalLink className="size-4" /> View homepage
        </Link>
      </div>
      <MainSiteEditor initial={{ mainSite: s.mainSite, seo: s.seo, thankYou: s.thankYou }} />
    </div>
  );
}
