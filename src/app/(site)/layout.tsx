import SiteChrome from "@/components/site/SiteChrome";

/** Main website (qurafood.com) — cached; no per-request work so pages stay fast. Main-site pixels. */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return <SiteChrome source="shop">{children}</SiteChrome>;
}
