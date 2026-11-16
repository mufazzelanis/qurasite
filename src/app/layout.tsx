import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";
import { getSetting } from "@/lib/settings";
import { fontVariables } from "@/lib/fonts";
import { typographyVars } from "@/lib/font-catalog";
import "./globals.css";

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

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // fonts chosen in Admin → Fonts (whole site, landing pages and admin)
  const typography = await getSetting("typography");
  return (
    // suppressHydrationWarning: browser extensions (Grammarly, translators, password managers)
    // add attributes to <html>/<body> before React loads — ignore those, only on these two tags
    <html lang="bn" className={fontVariables} style={typographyVars(typography) as React.CSSProperties} suppressHydrationWarning>
      <body suppressHydrationWarning>
        {children}
        <Toaster position="top-center" richColors closeButton />
      </body>
    </html>
  );
}
