import type { Metadata } from "next";
import CheckoutForm from "@/components/shop/CheckoutForm";
import { getActiveProducts } from "@/lib/catalog";
import { getSetting } from "@/lib/settings";

export const metadata: Metadata = { title: "চেকআউট", robots: { index: false } };
export const revalidate = 300;

export default async function CheckoutPage() {
  const [products, delivery, payments, upsell] = await Promise.all([getActiveProducts(), getSetting("delivery"), getSetting("payments"), getSetting("upsell")]);
  return (
    <section id="order" className="container-x py-8 sm:py-12">
      <h1 className="section-title mb-8 text-center !text-3xl sm:!text-4xl">চেকআউট</h1>
      <CheckoutForm products={products} delivery={delivery} payments={payments} combo={{ enabled: upsell.enabled, bumpTitle: upsell.bumpTitle, bumpText: upsell.bumpText }} />
    </section>
  );
}
