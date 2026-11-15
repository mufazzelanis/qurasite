import { newId, type PageBlock } from "./page-blocks";

const h = (text: string, level: 2 | 3 = 2): PageBlock => ({ id: newId(), type: "heading", text, level });
const t = (text: string): PageBlock => ({ id: newId(), type: "text", text });
const ul = (...items: string[]): PageBlock => ({ id: newId(), type: "list", ordered: false, items });
const ol = (...items: string[]): PageBlock => ({ id: newId(), type: "list", ordered: true, items });
const note = (emoji: string, text: string, tone: "info" | "success" | "warning" = "info"): PageBlock => ({ id: newId(), type: "callout", emoji, text, tone });
const btn = (label: string, href: string): PageBlock => ({ id: newId(), type: "button", label, href, style: "primary" });
const faq = (...items: [string, string][]): PageBlock => ({ id: newId(), type: "faq", items: items.map(([q, a]) => ({ q, a })) });

/** Starting points for new pages — edit everything after creating */
export const PAGE_TEMPLATES: { key: string; name: string; emoji: string; desc: string; title: string; slug: string; excerpt: string; menu: "none" | "header" | "footer"; blocks: () => PageBlock[] }[] = [
  {
    key: "blank",
    name: "Blank page",
    emoji: "📄",
    desc: "Start from scratch",
    title: "নতুন পেজ",
    slug: "new-page",
    excerpt: "",
    menu: "none",
    blocks: () => [t("")],
  },
  {
    key: "about",
    name: "About us",
    emoji: "🌿",
    desc: "Story, mission, why choose us",
    title: "আমাদের সম্পর্কে",
    slug: "about-us",
    excerpt: "কুঁড়া ফুড — প্রকৃতির সেরা উপাদান দিয়ে তৈরি স্বাস্থ্যকর খাবার, সরাসরি আপনার দরজায়।",
    menu: "header",
    blocks: () => [
      h("আমাদের গল্প"),
      t("এখানে আপনার ব্র্যান্ডের শুরুর গল্প লিখুন — কেন শুরু করলেন, কী সমস্যা সমাধান করতে চান।"),
      h("আমাদের লক্ষ্য"),
      t("প্রতিটি পরিবারের কাছে **১০০% প্রাকৃতিক** ও ভেজালমুক্ত খাবার পৌঁছে দেওয়া।"),
      h("কেন কুঁড়া ফুড?"),
      ul("কোনো প্রিজারভেটিভ বা কৃত্রিম রং নেই", "সরাসরি কৃষকের কাছ থেকে সংগ্রহ", "সারা দেশে ক্যাশ অন ডেলিভারি", "পণ্য দেখে নিয়ে পেমেন্ট"),
      btn("আমাদের পণ্য দেখুন", "/shop"),
    ],
  },
  {
    key: "contact",
    name: "Contact",
    emoji: "📞",
    desc: "Phone, WhatsApp, address, hours",
    title: "যোগাযোগ করুন",
    slug: "contact",
    excerpt: "যেকোনো প্রশ্ন, অর্ডার বা পরামর্শের জন্য আমাদের সাথে যোগাযোগ করুন।",
    menu: "footer",
    blocks: () => [
      note("📞", "হেল্পলাইন: [01XXXXXXXXX](tel:01XXXXXXXXX) — সকাল ৯টা থেকে রাত ১০টা", "success"),
      h("অন্যান্য মাধ্যম"),
      ul("WhatsApp: [মেসেজ করুন](https://wa.me/8801XXXXXXXXX)", "ইমেইল: [hello@qurafood.com](mailto:hello@qurafood.com)", "ফেসবুক পেজে মেসেজ করুন"),
      h("ঠিকানা"),
      t("আপনার অফিস / গুদামের ঠিকানা লিখুন।"),
    ],
  },
  {
    key: "privacy",
    name: "Privacy policy",
    emoji: "🔒",
    desc: "Data you collect and why",
    title: "প্রাইভেসি পলিসি",
    slug: "privacy-policy",
    excerpt: "আপনার তথ্য আমরা কীভাবে সংগ্রহ, ব্যবহার ও সুরক্ষিত রাখি।",
    menu: "footer",
    blocks: () => [
      h("আমরা কী তথ্য সংগ্রহ করি"),
      ul("নাম, মোবাইল নাম্বার ও ডেলিভারি ঠিকানা — অর্ডার পৌঁছে দেওয়ার জন্য", "ওয়েবসাইট ব্যবহারের তথ্য (কুকি) — সেবা উন্নত করার জন্য"),
      h("তথ্য কীভাবে ব্যবহার করি"),
      ul("অর্ডার প্রসেস ও ডেলিভারি", "অর্ডার আপডেট SMS পাঠানো", "বিজ্ঞাপন মাপা (Facebook Pixel)"),
      h("তথ্য শেয়ার"),
      t("ডেলিভারির জন্য কুরিয়ার কোম্পানি ছাড়া আমরা আপনার তথ্য কারো কাছে বিক্রি বা শেয়ার করি না।"),
      h("যোগাযোগ"),
      t("আপনার তথ্য মুছে ফেলতে চাইলে আমাদের সাথে যোগাযোগ করুন।"),
    ],
  },
  {
    key: "refund",
    name: "Refund & return",
    emoji: "🔄",
    desc: "Return rules and steps",
    title: "রিটার্ন ও রিফান্ড পলিসি",
    slug: "refund-policy",
    excerpt: "পণ্যে সমস্যা হলে কী করবেন — সহজ রিটার্ন ও রিফান্ডের নিয়ম।",
    menu: "footer",
    blocks: () => [
      note("✅", "ডেলিভারি ম্যানের সামনে পণ্য দেখে নিন। সমস্যা থাকলে তখনই ফেরত দিন — কোনো টাকা লাগবে না।", "success"),
      h("কখন রিটার্ন করা যাবে"),
      ul("ভুল পণ্য পেলে", "প্যাকেট ছেঁড়া বা নষ্ট অবস্থায় পেলে", "মেয়াদোত্তীর্ণ পণ্য পেলে"),
      h("রিটার্নের ধাপ"),
      ol("পণ্য হাতে পাওয়ার ২৪ ঘণ্টার মধ্যে কল / WhatsApp করুন", "পণ্যের ছবি পাঠান", "আমরা নতুন পণ্য পাঠাব অথবা টাকা ফেরত দেব"),
      h("রিফান্ড"),
      t("রিফান্ড ৩–৫ কার্যদিবসের মধ্যে bKash / Nagad এ পাঠানো হয়।"),
    ],
  },
  {
    key: "faq",
    name: "FAQ",
    emoji: "❓",
    desc: "Common questions (shows in Google)",
    title: "সাধারণ জিজ্ঞাসা",
    slug: "faq",
    excerpt: "অর্ডার, ডেলিভারি ও পণ্য নিয়ে সবচেয়ে বেশি জিজ্ঞাসিত প্রশ্নের উত্তর।",
    menu: "footer",
    blocks: () => [
      faq(
        ["ডেলিভারি পেতে কতদিন লাগে?", "ঢাকার ভেতরে ১–২ দিন, ঢাকার বাইরে ২–৪ দিন।"],
        ["ক্যাশ অন ডেলিভারি আছে?", "হ্যাঁ, সারা বাংলাদেশে পণ্য হাতে পেয়ে টাকা দিতে পারবেন।"],
        ["ডেলিভারি চার্জ কত?", "ঢাকার ভেতরে ৬০ টাকা, বাইরে ১২০ টাকা।"],
        ["পণ্য পছন্দ না হলে কী করব?", "ডেলিভারি ম্যানের সামনে দেখে নিন, পছন্দ না হলে ফেরত দিন।"],
      ),
      btn("এখনই অর্ডার করুন", "/shop"),
    ],
  },
  {
    key: "howto",
    name: "How to use",
    emoji: "🥄",
    desc: "Steps, tips, video",
    title: "ব্যবহারবিধি",
    slug: "how-to-use",
    excerpt: "সঠিক নিয়মে খেলে সবচেয়ে বেশি উপকার পাবেন।",
    menu: "none",
    blocks: () => [
      h("খাওয়ার নিয়ম"),
      ol("এক গ্লাস কুসুম গরম দুধ বা পানি নিন", "২ চামচ পাউডার মেশান", "ভালো করে নেড়ে পান করুন"),
      note("💡", "স্বাদ বাড়াতে এক চামচ মধু বা গুড় মিশিয়ে নিন।"),
      { id: newId(), type: "video", url: "" },
    ],
  },
];
