import { requireAdmin } from "@/lib/session";
import { getAllSettings } from "@/lib/settings";
import { PaymentsForm } from "@/components/admin/SettingsForms";

export default async function Page() {
  await requireAdmin("payments");
  const s = await getAllSettings();
  return (
    <div className="max-w-4xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Payments & Delivery</h1>
        <p className="text-sm text-zinc-500">Changes go live on the website instantly.</p>
      </div>
      <PaymentsForm payments={s.payments} delivery={s.delivery} courier={s.courier} />
    </div>
  );
}
