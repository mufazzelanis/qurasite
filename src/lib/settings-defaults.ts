/** Settings types + defaults. No server imports — safe for client components. */

export type SiteSettings = {
  name: string;
  nameBn: string;
  tagline: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  facebook: string;
  instagram: string;
  youtube: string;
  tiktok: string;
};

export type DeliverySettings = {
  insideDhaka: number;
  subDhaka: number;
  outsideDhaka: number;
  freeDeliveryOver: number; // 0 = disabled
};

/** token is secret — never sent to the browser. site=false → library-only pixel (used by landing pages / pages that pick it, not the main site) */
export type FbPixel = { id: string; label: string; token: string; site?: boolean };

/** How a landing page / content page chooses Facebook pixels */
export type PixelMode = "site" | "own" | "none";

/** Events that can be switched on/off (browser + server). OrderDelivered/OrderCancelled are server-only. */
export const FB_EVENTS = [
  ["PageView", "Every public page"],
  ["ViewContent", "Landing page with product & price"],
  ["AddToCart", "Quantity increased in the order form"],
  ["InitiateCheckout", "First click in the order form"],
  ["Purchase", "Order — value, order ID, hashed phone & name"],
  ["OrderDelivered", "Server only — when an order is marked Delivered (for audiences of real buyers)"],
  ["OrderCancelled", "Server only — when an order is marked Cancelled (exclude fake / cancelled buyers)"],
] as const;
export type FbEventName = (typeof FB_EVENTS)[number][0];
export const SERVER_ONLY_EVENTS: string[] = ["OrderDelivered", "OrderCancelled"];

export type TrackingSettings = {
  pixels: FbPixel[]; // up to 5, the first one is the primary
  browserEnabled: boolean;
  capiEnabled: boolean;
  serverPageView: boolean;
  fbTestEventCode: string;
  graphVersion: string;
  events: Record<FbEventName, boolean>;
  purchaseTrigger: "placed" | "confirmed" | "delivered";
  purchaseValue: "total" | "products";
  ga4Id: string;
  gtmId: string;
  tiktokPixelId: string;
  /** @deprecated old single-pixel fields (migrated into `pixels`) */
  fbPixelId?: string;
  fbCapiToken?: string;
};

export type FraudSettings = {
  maxOrdersPerPhonePerDay: number;
  maxOrdersPerIpPerDay: number;
  blockScore: number;
  courierApiUrl: string; // optional, {phone} placeholder
  courierApiKey: string;
};

/** Texts of a landing page (also the default template for new landing pages) */
export type LandingSettings = {
  heroBadge: string;
  heroTitle: string;
  heroHighlight: string;
  heroSubtitle: string;
  offerText: string;
  offerEndsAt: string;
  stats: { value: number; suffix: string; label: string }[];
  ingredients: { name: string; nameBn: string; emoji: string; benefit: string }[];
  benefits: { title: string; text: string; icon: string }[];
  steps: { title: string; text: string }[];
  faqs: { q: string; a: string }[];
};

export type UpsellSettings = {
  enabled: boolean;
  pairBadge: string;
  pairTitle: string;
  pairHighlight: string;
  pairText: string;
  bumpTitle: string;
  bumpText: string;
  postPurchaseEnabled: boolean;
  postPurchaseMinutes: number;
  postPurchaseTitle: string;
  tips: { emoji: string; title: string; text: string }[];
};

export type MainSiteSettings = {
  announcement: string;
  slides: { image: string; title: string; subtitle: string; cta: string; link: string }[];
  featuredTitle: string;
  showReviews: boolean;
  trustBadges: { emoji: string; title: string; text: string }[];
};

export type PaymentSettings = {
  codEnabled: boolean;
  /** none = pure COD, delivery = delivery charge in advance, full = full payment */
  advanceMode: "none" | "delivery" | "full";
  /** only ask advance for orders outside Dhaka */
  advanceOutsideDhakaOnly: boolean;
  bkash: { enabled: boolean; number: string; type: string };
  nagad: { enabled: boolean; number: string; type: string };
  rocket: { enabled: boolean; number: string; type: string };
  instructions: string;
};

export type SmsSettings = {
  enabled: boolean;
  /** GET/POST URL; placeholders {phone} {message} {apiKey} {senderId} */
  apiUrl: string;
  method: "GET" | "POST";
  apiKey: string;
  senderId: string;
  adminPhone: string;
  otpEnabled: boolean;
  /** OTP only when fraud score >= this (0 = always) */
  otpMinRisk: number;
  templates: {
    placed: string;
    confirmed: string;
    shipped: string;
    delivered: string;
    cancelled: string;
    otp: string;
    adminNewOrder: string;
  };
};

export type EmailSettings = {
  enabled: boolean;
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
  notifyTo: string; // admin email for new orders
};

export type InvoiceSettings = {
  title: string;
  companyLine: string;
  footerNote: string;
  showFraudScore: boolean;
  showSource: boolean;
};

export type CourierSettings = {
  steadfastApiKey: string;
  steadfastSecretKey: string;
  steadfastBaseUrl: string;
};

export type ThankYouGuide = { icon: string; title: string; subtitle: string; href: string };
export type ThankYouSettings = {
  heading: string;
  subheading: string;
  codNote: string;
  guidesTitle: string;
  guides: ThankYouGuide[]; // icon: book | spoon | leaf | heart | truck | shield | phone | star | gift
};

export type SeoSettings = {
  /** Homepage <title> (50–60 characters is ideal) */
  title: string;
  /** Homepage meta description (120–160 characters) */
  description: string;
  keywords: string;
  /** Default social share image (1200×630) */
  ogImage: string;
  /** Appended to every page title: "Product | Qura Food" */
  titleSuffix: string;
  googleVerification: string;
  bingVerification: string;
  /** false = ask search engines not to index the site (staging) */
  indexable: boolean;
};

export type AllSettings = {
  site: SiteSettings;
  delivery: DeliverySettings;
  tracking: TrackingSettings;
  fraud: FraudSettings;
  landing: LandingSettings;
  upsell: UpsellSettings;
  mainSite: MainSiteSettings;
  payments: PaymentSettings;
  sms: SmsSettings;
  email: EmailSettings;
  invoice: InvoiceSettings;
  courier: CourierSettings;
  thankYou: ThankYouSettings;
  seo: SeoSettings;
};

/** Per landing page content (stored in LandingPage.content) */
export type LandingContent = {
  heroImage: string;
  videoUrl: string;
  primary: string; // theme color
  accent: string;
  sections: {
    stats: boolean;
    ingredients: boolean;
    benefits: boolean;
    howto: boolean;
    combo: boolean;
    promise: boolean;
    reviews: boolean;
    faq: boolean;
  };
  copy: LandingSettings;
  combo: Pick<UpsellSettings, "enabled" | "pairBadge" | "pairTitle" | "pairHighlight" | "pairText" | "bumpTitle" | "bumpText" | "tips">;
  orderTitle: string;
  orderSubtitle: string;
  stickyText: string;
};

const LANDING_COPY: LandingSettings = {
  heroBadge: "১০০% প্রাকৃতিক • কোনো প্রিজারভেটিভ নেই",
  heroTitle: "প্রতিদিনের শক্তি,",
  heroHighlight: "এক চামচে প্রকৃতি",
  heroSubtitle:
    "চাল, বাদাম, ডাল, গম, ভুট্টা ও মটরের ঐতিহ্যবাহী মিশ্রণ — কুঁড়া ফুড আপনাকে রাখে দীর্ঘক্ষণ পেট ভরা, এনার্জেটিক ও সুস্থ।",
  offerText: "আজ অর্ডার করলেই বিশেষ ছাড়!",
  offerEndsAt: "",
  stats: [
    { value: 10000, suffix: "+", label: "সন্তুষ্ট গ্রাহক" },
    { value: 6, suffix: "টি", label: "প্রাকৃতিক উপাদান" },
    { value: 0, suffix: "%", label: "কৃত্রিম ফ্লেভার" },
    { value: 64, suffix: "", label: "জেলায় ডেলিভারি" },
  ],
  ingredients: [
    { name: "Rice", nameBn: "চাল", emoji: "🌾", benefit: "দ্রুত শক্তির উৎস কার্বোহাইড্রেট" },
    { name: "Nuts", nameBn: "বাদাম", emoji: "🥜", benefit: "স্বাস্থ্যকর ফ্যাট ও প্রোটিন" },
    { name: "Lentils", nameBn: "ডাল", emoji: "🥣", benefit: "উদ্ভিজ্জ প্রোটিন ও আয়রন" },
    { name: "Wheat", nameBn: "গম", emoji: "🌿", benefit: "ফাইবার যা হজমে সাহায্য করে" },
    { name: "Maize", nameBn: "ভুট্টা", emoji: "🌽", benefit: "ভিটামিন ও অ্যান্টিঅক্সিডেন্ট" },
    { name: "Peas", nameBn: "মটর", emoji: "🟢", benefit: "মিনারেল ও দীর্ঘস্থায়ী এনার্জি" },
  ],
  benefits: [
    { icon: "zap", title: "দীর্ঘক্ষণ পেট ভরা রাখে", text: "কার্বোহাইড্রেট, প্রোটিন ও হেলদি ফ্যাট সারাদিন আপনাকে চালিয়ে নেয়।" },
    { icon: "dumbbell", title: "ন্যাচারাল এনার্জি বুস্ট", text: "জিমের আগে ও পরে — অপ্রয়োজনীয় স্ন্যাকিং কমায়।" },
    { icon: "heart", title: "হজম ও গাট হেলথ", text: "হোল গ্রেইনের ডায়েটারি ফাইবার নিয়মিত হজমে সাহায্য করে।" },
    { icon: "shield", title: "দুর্বলতা দূর করে", text: "প্রতিদিন এক গ্লাস — শরীর রাখে সতেজ ও কর্মক্ষম।" },
    { icon: "droplet", title: "পানি পানের সঙ্গী", text: "দৈনিক পানি গ্রহণ বাড়াতে সুস্বাদু এক সমাধান।" },
    { icon: "leaf", title: "১০০% প্রাকৃতিক", text: "কোনো কৃত্রিম ফ্লেভার বা প্রিজারভেটিভ নেই।" },
  ],
  steps: [
    { title: "কুঁড়া মিক্স নিন", text: "শুকনো চামচে ২–৪ চা চামচ (৩০ গ্রাম)" },
    { title: "পানি যোগ করুন", text: "এক গ্লাস (২৫০ মিলি) পানিতে মেশান" },
    { title: "মধু বা গুড় মেশান", text: "স্বাদমতো মধু বা গুড় মিশিয়ে নেড়ে উপভোগ করুন" },
  ],
  faqs: [
    { q: "কুঁড়া ফুড কী?", a: "কুঁড়া ফুড হলো বাদাম, শস্য ও অন্যান্য প্রাকৃতিক উপাদানের পাউডার মিশ্রণ, যা ঐতিহ্যবাহী পদ্ধতিতে তৈরি।" },
    { q: "দিনে কতবার খাওয়া যায়?", a: "দিনে ১–২ বার, সকালে নাস্তায় বা ব্যায়ামের আগে/পরে খাওয়া সবচেয়ে ভালো।" },
    { q: "মধু বা গুড় দিয়ে কেন খাবো?", a: "চিনির বদলে প্রাকৃতিক মিষ্টতা — স্বাদ বাড়ে, আর মধু/গুড় নিজেও বাড়তি প্রাকৃতিক শক্তি দেয়।" },
    { q: "ডেলিভারি কতদিনে পাবো?", a: "ঢাকার ভেতরে ১–২ দিন, ঢাকার বাইরে ২–৪ দিনের মধ্যে ক্যাশ অন ডেলিভারি।" },
    { q: "পণ্য পছন্দ না হলে?", a: "ডেলিভারির সময় পণ্য দেখে নিতে পারবেন। সমস্যা থাকলে রিটার্ন পলিসি অনুযায়ী পরিবর্তন করে দেওয়া হবে।" },
  ],
};

const UPSELL: UpsellSettings = {
  enabled: true,
  pairBadge: "পারফেক্ট কম্বো",
  pairTitle: "কুঁড়া + মধু + গুড় =",
  pairHighlight: "স্বাদ ও শক্তি দ্বিগুণ",
  pairText:
    "চিনির বদলে খাঁটি মধু বা আখের গুড় মিশিয়ে নিন — প্রাকৃতিক মিষ্টতায় কুঁড়ার স্বাদ হয় আরও অসাধারণ, আর শরীর পায় বাড়তি প্রাকৃতিক এনার্জি। কুঁড়ার সাথে নিলেই পাচ্ছেন বিশেষ কম্বো দাম!",
  bumpTitle: "স্বাদ দ্বিগুণ করুন! 🍯",
  bumpText: "কুঁড়ার সাথে নিলে বিশেষ কম্বো দাম — শুধু এই অর্ডারে",
  postPurchaseEnabled: true,
  postPurchaseMinutes: 15,
  postPurchaseTitle: "অপেক্ষা করুন! আপনার অর্ডারে যোগ করুন এক ক্লিকে",
  tips: [
    { emoji: "🍯", title: "মধু দিয়ে", text: "এক গ্লাস কুঁড়ায় ১ চা চামচ মধু — সকালের সেরা এনার্জি ড্রিংক" },
    { emoji: "🟤", title: "গুড় দিয়ে", text: "কুসুম গরম পানিতে কুঁড়া + গুড় — ঐতিহ্যবাহী গ্রামীণ স্বাদ" },
    { emoji: "🥛", title: "দুধ দিয়ে", text: "পানির বদলে দুধ + মধু — বাচ্চাদের প্রিয় পুষ্টিকর শেক" },
    { emoji: "💪", title: "জিমের আগে", text: "কুঁড়া + মধু — ওয়ার্কআউটের ৩০ মিনিট আগে দ্রুত শক্তি" },
  ],
};

export const DEFAULT_SETTINGS: AllSettings = {
  site: {
    name: "Qura Food",
    nameBn: "কুঁড়া ফুড",
    tagline: "Nature in Every Spoon",
    phone: "01302387210",
    whatsapp: "8801302387210",
    email: "foodqura@gmail.com",
    address: "2nd Baipus, Matidali, Bogura Sadar, Bogura",
    facebook: "https://facebook.com/qurafood",
    instagram: "https://instagram.com/qurafood",
    youtube: "https://youtube.com/@qurafood",
    tiktok: "https://tiktok.com/@qurafood",
  },
  delivery: { insideDhaka: 60, subDhaka: 80, outsideDhaka: 120, freeDeliveryOver: 0 },
  tracking: {
    pixels: [],
    browserEnabled: true,
    capiEnabled: true,
    serverPageView: true,
    fbTestEventCode: "",
    graphVersion: "v23.0",
    events: { PageView: true, ViewContent: true, AddToCart: true, InitiateCheckout: true, Purchase: true, OrderDelivered: true, OrderCancelled: true },
    purchaseTrigger: "placed",
    purchaseValue: "total",
    ga4Id: "",
    gtmId: "",
    tiktokPixelId: "",
  },
  fraud: { maxOrdersPerPhonePerDay: 3, maxOrdersPerIpPerDay: 5, blockScore: 80, courierApiUrl: "", courierApiKey: "" },
  landing: LANDING_COPY,
  upsell: UPSELL,
  mainSite: {
    announcement: "সারা বাংলাদেশে ক্যাশ অন ডেলিভারি • কুঁড়া + মধু কম্বোতে বিশেষ ছাড়",
    slides: [
      { image: "/brand/spoon.jpg", title: "প্রতিদিনের শক্তি, এক চামচে প্রকৃতি", subtitle: "চাল, বাদাম, ডাল, গম, ভুট্টা ও মটরের প্রাকৃতিক মিশ্রণ", cta: "এখনই কিনুন", link: "/shop" },
      { image: "/brand/label.jpg", title: "কুঁড়া + মধু + গুড়", subtitle: "পারফেক্ট কম্বো — স্বাদ ও শক্তি দ্বিগুণ", cta: "কম্বো দেখুন", link: "/qura#combo" },
    ],
    featuredTitle: "জনপ্রিয় পণ্য",
    showReviews: true,
    trustBadges: [
      { emoji: "🚚", title: "সারা দেশে ডেলিভারি", text: "ক্যাশ অন ডেলিভারি" },
      { emoji: "🌿", title: "১০০% প্রাকৃতিক", text: "কোনো প্রিজারভেটিভ নেই" },
      { emoji: "🔄", title: "সহজ রিটার্ন", text: "দেখে নিয়ে পেমেন্ট" },
      { emoji: "📞", title: "হেল্পলাইন", text: "সকাল ৯টা – রাত ১০টা" },
    ],
  },
  payments: {
    codEnabled: true,
    advanceMode: "none",
    advanceOutsideDhakaOnly: true,
    bkash: { enabled: false, number: "", type: "Personal" },
    nagad: { enabled: false, number: "", type: "Personal" },
    rocket: { enabled: false, number: "", type: "Personal" },
    instructions: "উপরের নাম্বারে Send Money করে Transaction ID লিখুন।",
  },
  sms: {
    enabled: false,
    apiUrl: "",
    method: "GET",
    apiKey: "",
    senderId: "",
    adminPhone: "",
    otpEnabled: false,
    otpMinRisk: 0,
    templates: {
      placed: "প্রিয় {name}, আপনার অর্ডার {orderNo} গ্রহণ করা হয়েছে। মোট: {total} টাকা। - Qura Food",
      confirmed: "আপনার অর্ডার {orderNo} কনফার্ম হয়েছে। শীঘ্রই পাঠানো হবে। - Qura Food",
      shipped: "আপনার অর্ডার {orderNo} কুরিয়ারে পাঠানো হয়েছে। ট্র্যাকিং: {tracking} - Qura Food",
      delivered: "আপনার অর্ডার {orderNo} ডেলিভারি হয়েছে। ধন্যবাদ! - Qura Food",
      cancelled: "আপনার অর্ডার {orderNo} বাতিল করা হয়েছে। - Qura Food",
      otp: "Qura Food: আপনার ভেরিফিকেশন কোড {code}",
      adminNewOrder: "New order {orderNo} - {name} {phone} - {total} Tk",
    },
  },
  email: { enabled: false, host: "", port: 587, user: "", pass: "", from: "", notifyTo: "" },
  invoice: {
    title: "INVOICE",
    companyLine: "Qura Food — Nature in Every Spoon",
    footerNote: "পণ্য বুঝে নিয়ে মূল্য পরিশোধ করুন। ধন্যবাদ!",
    showFraudScore: false,
    showSource: false,
  },
  courier: { steadfastApiKey: "", steadfastSecretKey: "", steadfastBaseUrl: "https://portal.packzy.com/api/v1" },
  thankYou: {
    heading: "আপনার অর্ডারটি সফলভাবে গ্রহণ করা হয়েছে।",
    subheading: "কিছুক্ষণের মধ্যে আমাদের একজন প্রতিনিধি আপনাকে কল করে কনফার্ম করবেন।",
    codNote: "পণ্য হাতে পেয়ে ডেলিভারি ম্যানকে টাকা দিন (ক্যাশ অন ডেলিভারি)।",
    guidesTitle: "পণ্য হাতে পাওয়ার আগেই জেনে নিন",
    guides: [
      { icon: "spoon", title: "ব্যবহারবিধি", subtitle: "সকাল, রাত ও বিশেষ ব্যবহারের সঠিক নিয়ম", href: "/how-to-use" },
      { icon: "truck", title: "অর্ডার ট্র্যাক করুন", subtitle: "আপনার পার্সেল এখন কোথায় দেখুন", href: "/track" },
      { icon: "shield", title: "রিটার্ন ও রিফান্ড পলিসি", subtitle: "পণ্যে সমস্যা হলে কী করবেন", href: "/refund-policy" },
    ],
  },
  seo: {
    title: "কুঁড়া ফুড | Qura Food — Nature in Every Spoon",
    description: "Qura Food — চাল, বাদাম, ডাল, গম, ভুট্টা ও মটরের ১০০% প্রাকৃতিক পাউডার মিশ্রণ। কোনো প্রিজারভেটিভ নেই। সারা বাংলাদেশে ক্যাশ অন ডেলিভারি।",
    keywords: "কুঁড়া, qura food, প্রাকৃতিক খাবার, healthy food bangladesh, মধু, আখের গুড়",
    ogImage: "/brand/logo-card-t.png",
    titleSuffix: "Qura Food",
    googleVerification: "",
    bingVerification: "",
    indexable: true,
  },
};

export const DEFAULT_LANDING_CONTENT: LandingContent = {
  heroImage: "/brand/logo-card-t.png",
  videoUrl: "",
  primary: "#0d4524",
  accent: "#da9128",
  sections: { stats: true, ingredients: true, benefits: true, howto: true, combo: true, promise: true, reviews: true, faq: true },
  copy: LANDING_COPY,
  combo: {
    enabled: UPSELL.enabled,
    pairBadge: UPSELL.pairBadge,
    pairTitle: UPSELL.pairTitle,
    pairHighlight: UPSELL.pairHighlight,
    pairText: UPSELL.pairText,
    bumpTitle: UPSELL.bumpTitle,
    bumpText: UPSELL.bumpText,
    tips: UPSELL.tips,
  },
  orderTitle: "অর্ডার করতে নিচের ফর্মটি পূরণ করুন",
  orderSubtitle: "পণ্য হাতে পেয়ে মূল্য পরিশোধ করুন — কোনো অগ্রিম টাকা লাগবে না।",
  stickyText: "এখনই অর্ডার করুন",
};

/** Merge stored (possibly partial / older) content with defaults */
export function mergeLandingContent(raw: unknown): LandingContent {
  const c = (raw && typeof raw === "object" ? raw : {}) as Partial<LandingContent>;
  const d = DEFAULT_LANDING_CONTENT;
  return {
    ...d,
    ...c,
    sections: { ...d.sections, ...(c.sections || {}) },
    copy: { ...d.copy, ...(c.copy || {}) },
    combo: { ...d.combo, ...(c.combo || {}) },
  };
}

export const RESERVED_SLUGS = new Set([
  "admin", "api", "shop", "cart", "checkout", "track", "order", "p", "category", "guide", "search",
  "login", "account", "_next", "brand", "uploads", "icon.png", "favicon.ico", "robots.txt", "sitemap.xml",
]);
