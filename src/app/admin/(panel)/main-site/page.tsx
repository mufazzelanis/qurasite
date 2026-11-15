import { requireAdmin } from "@/lib/session";
import { getAllSettings } from "@/lib/settings";
import { MainSiteForm, ThankYouForm } from "@/components/admin/SettingsForms";

export default async function Page() {
  await requireAdmin("mainsite");
  const s = await getAllSettings();
  return (
    <div className="max-w-4xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Main Site Settings</h1>
        <p className="text-sm text-zinc-500">Changes go live on the website instantly.</p>
      </div>
      <MainSiteForm initial={s.mainSite} />
      <div className="pt-4">
        <h2 className="text-xl font-bold">Thank-you page</h2>
        <p className="text-sm text-zinc-500">What customers see right after ordering. Guide pages are created in Landing Pages → Guide Pages.</p>
      </div>
      <ThankYouForm initial={s.thankYou} />
    </div>
  );
}
