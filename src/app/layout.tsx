import type { Metadata, Viewport } from "next";
import { Hind_Siliguri, Plus_Jakarta_Sans } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const hind = Hind_Siliguri({ subsets: ["bengali", "latin"], weight: ["400", "500", "600", "700"], variable: "--font-hind" });
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], weight: ["500", "700", "800"], variable: "--font-jakarta" });

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "কুঁড়া ফুড | Qura Food — Nature in Every Spoon", template: "%s | Qura Food" },
  description:
    "Qura Food — চাল, বাদাম, ডাল, গম, ভুট্টা ও মটরের ১০০% প্রাকৃতিক পাউডার মিশ্রণ। কোনো প্রিজারভেটিভ নেই। সারা বাংলাদেশে ক্যাশ অন ডেলিভারি।",
  openGraph: {
    type: "website",
    siteName: "Qura Food",
    images: [{ url: "/brand/logo-card-t.png", width: 1200, height: 1200 }],
  },
};

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
