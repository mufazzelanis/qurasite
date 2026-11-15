import Image from "next/image";
import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import type { SiteSettings } from "@/lib/settings";

export default function Footer({ site, pages = [] }: { site: SiteSettings; pages?: { slug: string; title: string }[] }) {
  return (
    <footer className="relative mt-24 overflow-hidden bg-brand-900 text-white">
      <svg className="absolute -top-px left-0 w-full text-cream" viewBox="0 0 1440 60" preserveAspectRatio="none" aria-hidden>
        <path fill="currentColor" d="M0,0 L1440,0 L1440,20 C1200,60 960,0 720,25 C480,50 240,5 0,30 Z" />
      </svg>
      <div className="pointer-events-none absolute -right-40 -top-20 size-[500px] rounded-full bg-gold-500/10 blur-3xl" />
      <div className="container-x relative grid gap-12 pb-10 pt-24 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="mb-5 inline-block rounded-2xl bg-white p-3">
            <Image src="/brand/logo-bn-t.png" alt={site.nameBn} width={170} height={60} className="h-12 w-auto" />
          </div>
          <p className="text-white/70">
            {site.tagline}। চাল, বাদাম ও শস্যের ঐতিহ্যবাহী প্রাকৃতিক মিশ্রণ — আপনার প্রতিদিনের সুস্থতার সঙ্গী।
          </p>
        </div>
        <div>
          <h4 className="mb-4 font-display text-lg font-bold text-gold-300">দ্রুত লিংক</h4>
          <ul className="space-y-2.5 text-white/75">
            <li><Link href="/#order" className="hover:text-gold-300">অর্ডার করুন</Link></li>
            <li><Link href="/shop" className="hover:text-gold-300">সব পণ্য</Link></li>
            <li><Link href="/track" className="hover:text-gold-300">অর্ডার ট্র্যাক করুন</Link></li>
            <li><Link href="/#faq" className="hover:text-gold-300">সাধারণ জিজ্ঞাসা</Link></li>
            {pages.map((p) => (
              <li key={p.slug}><Link href={`/${p.slug}`} className="hover:text-gold-300">{p.title}</Link></li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="mb-4 font-display text-lg font-bold text-gold-300">যোগাযোগ</h4>
          <ul className="space-y-3 text-white/75">
            <li className="flex gap-3"><Phone className="mt-0.5 size-4 shrink-0 text-gold-400" /><a href={`tel:${site.phone}`}>{site.phone}</a></li>
            <li className="flex gap-3"><Mail className="mt-0.5 size-4 shrink-0 text-gold-400" /><a href={`mailto:${site.email}`}>{site.email}</a></li>
            <li className="flex gap-3"><MapPin className="mt-0.5 size-4 shrink-0 text-gold-400" />{site.address}</li>
          </ul>
        </div>
        <div>
          <h4 className="mb-4 font-display text-lg font-bold text-gold-300">ফলো করুন</h4>
          <div className="flex flex-wrap gap-2">
            {[
              ["Facebook", site.facebook],
              ["Instagram", site.instagram],
              ["YouTube", site.youtube],
              ["TikTok", site.tiktok],
            ]
              .filter(([, u]) => u)
              .map(([n, u]) => (
                <a key={n} href={u} target="_blank" rel="noreferrer" className="rounded-full border border-white/15 px-4 py-2 text-sm transition hover:border-gold-400 hover:bg-gold-500 hover:text-white">
                  {n}
                </a>
              ))}
          </div>
          <p className="mt-6 text-sm text-white/50">ক্যাশ অন ডেলিভারি • সারা বাংলাদেশ</p>
        </div>
      </div>
      <div className="border-t border-white/10 py-6 text-center text-sm text-white/50">
        © {new Date().getFullYear()} {site.name}. All rights reserved.
      </div>
    </footer>
  );
}
