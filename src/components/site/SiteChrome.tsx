import Header from "@/components/site/Header";
import Footer from "@/components/site/Footer";
import FloatingActions from "@/components/site/FloatingActions";
import TrackingScripts from "@/components/tracking/TrackingScripts";
import Tracker from "@/components/tracking/Tracker";
import { CartProvider } from "@/components/shop/cart";
import CartDrawer from "@/components/shop/CartDrawer";
import { getCategories } from "@/lib/catalog";
import { getMenuPages } from "@/lib/pages";
import { getPublicTracking, getSetting } from "@/lib/settings";

/**
 * Header, footer, cart and tracking of the main website.
 * `source` decides which pixels fire: "shop" (main site) or "page:<slug>" (a content page's own choice).
 */
export default async function SiteChrome({ source = "shop", children }: { source?: string; children: React.ReactNode }) {
  const [site, main, tracking, categories, menuPages] = await Promise.all([getSetting("site"), getSetting("mainSite"), getPublicTracking(source), getCategories(), getMenuPages()]);
  const slug = source === "shop" ? null : source;
  return (
    <CartProvider>
      <TrackingScripts {...tracking} slug={slug ?? undefined} />
      <Tracker slug={slug} />
      <Header phone={site.phone} announcement={main.announcement} categories={categories} pages={menuPages.filter((p) => p.menu === "header")} />
      <main>{children}</main>
      <Footer site={site} pages={menuPages.filter((p) => p.menu === "footer")} />
      <FloatingActions phone={site.phone} whatsapp={site.whatsapp} />
      <CartDrawer />
    </CartProvider>
  );
}
