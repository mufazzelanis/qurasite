import type { Metadata, Viewport } from "next";
import { Hind_Siliguri, Plus_Jakarta_Sans } from "next/font/google";
import { Toaster } from "sonner";
import { getSetting } from "@/lib/settings";
import "./globals.css";

const hind = Hind_Siliguri({ subsets: ["bengali", "latin"], weight: ["400", "500", "600", "700"], variable: "--font-hind" });
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], weight: ["500", "700", "800"], variable: "--font-jakarta" });

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

/** Site-wide SEO from Admin → Main Site Settings → SEO & sharing */
export async function generateMetadata(): Promise<Metadata> {
  const [seo, site] = await Promise.all([getSetting("seo"), getSetting("site")]);
  return {
    metadataBase: new URL(siteUrl),
    title: { default: seo.title, template: `%s | ${seo.titleSuffix || site.name}` },
    description: seo.description,
    keywords: seo.keywords ? seo.keywords.split(",").map((k) => k.trim()).filter(Boolean) : undefined,
    applicationName: site.name,
    robots: seo.indexable ? { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 } } : { index: false, follow: false },
    verification: {
      google: seo.googleVerification || undefined,
      other: seo.bingVerification ? { "msvalidate.01": seo.bingVerification } : undefined,
    },
    openGraph: {
      type: "website",
      locale: "bn_BD",
      siteName: site.name,
      title: seo.title,
      description: seo.description,
      images: seo.ogImage ? [{ url: seo.ogImage }] : undefined,
    },
    twitter: { card: "summary_large_image", title: seo.title, description: seo.description, images: seo.ogImage ? [seo.ogImage] : undefined },
  };
}

export const viewport: Viewport = { themeColor: "#0d4524" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="bn" className={`${hind.variable} ${jakarta.variable}`}>
      <body>
        {children}
        <Toaster position="top-center" richColors closeButton />
      </body>
    </html>
  );
}
