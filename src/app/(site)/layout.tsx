import Header from "@/components/site/Header";
import Footer from "@/components/site/Footer";
import FloatingActions from "@/components/site/FloatingActions";
import TrackingScripts from "@/components/tracking/TrackingScripts";
import Tracker from "@/components/tracking/Tracker";
import { CartProvider } from "@/components/shop/cart";
import CartDrawer from "@/components/shop/CartDrawer";
import { getCategories } from "@/lib/catalog";
import { getPublicTracking, getSetting } from "@/lib/settings";

/** Main website (qurafood.com) — cached; no per-request work so pages stay fast. */
export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [site, main, tracking, categories] = await Promise.all([getSetting("site"), getSetting("mainSite"), getPublicTracking(), getCategories()]);
  return (
    <CartProvider>
      <TrackingScripts {...tracking} />
      <Tracker />
      <Header phone={site.phone} announcement={main.announcement} categories={categories} />
      <main>{children}</main>
      <Footer site={site} />
      <FloatingActions phone={site.phone} whatsapp={site.whatsapp} />
      <CartDrawer />
    </CartProvider>
  );
}
