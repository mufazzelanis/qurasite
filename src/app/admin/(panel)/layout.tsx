import AdminShell from "@/components/admin/AdminShell";
import { requireAdmin } from "@/lib/session";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin", robots: { index: false } };

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  const pending = await db.order.count({ where: { status: "PENDING" } }).catch(() => 0);
  return (
    <AdminShell admin={admin} pending={pending}>
      {children}
    </AdminShell>
  );
}
