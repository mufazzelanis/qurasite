import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { DEFAULT_LANDING_CONTENT } from "../src/lib/settings-defaults";

const db = new PrismaClient();

/** Safe to run many times — only creates what is missing. Prices are PLACEHOLDERS: change them in Admin → Products. */
async function main() {
  const email = (process.env.ADMIN_EMAIL || "admin@qurafood.com").toLowerCase();
  await db.admin.upsert({
    where: { email },
    update: {},
    create: { email, name: "Qura Admin", password: await bcrypt.hash(process.env.ADMIN_PASSWORD || "ChangeMe@123", 10), role: "ADMIN" },
  });
  console.log(`✔ Admin: ${email}`);

  const cats = [
    { slug: "qura-mix", name: "Qura Mix", nameBn: "কুঁড়া মিক্স", sortOrder: 1 },
    { slug: "honey-gur", name: "Honey & Jaggery", nameBn: "মধু ও গুড়", sortOrder: 2 },
  ];
  for (const c of cats) await db.category.upsert({ where: { slug: c.slug }, update: {}, create: c });
  const catId = Object.fromEntries((await db.category.findMany()).map((c) => [c.slug, c.id]));
  console.log("✔ categories");

  const products = [
    {
      slug: "qura-mix-250gm",
      name: "Qura Mix 250gm",
      nameBn: "কুঁড়া মিক্স — ২৫০ গ্রাম",
      tagline: "চাল, বাদাম, ডাল, গম, ভুট্টা ও মটরের প্রাকৃতিক পাউডার মিশ্রণ",
      description:
        "QURA FOOD is a powdered blend of nuts, grains and other food ingredients, bringing a touch of traditional food preparation to your everyday routine.\n\n• দীর্ঘক্ষণ পেট ভরা রাখে\n• ন্যাচারাল এনার্জি বুস্ট — জিমের আগে ও পরে\n• হজমে সাহায্য করে\n• কোনো কৃত্রিম ফ্লেভার বা প্রিজারভেটিভ নেই\n\nখাওয়ার নিয়ম: ২–৪ চা চামচ (৩০ গ্রাম) কুঁড়া এক গ্লাস (২৫০ মিলি) পানিতে মিশিয়ে পান করুন। স্বাদমতো মধু বা গুড় মিশিয়ে নিন।",
      price: 800,
      comparePrice: null,
      weight: "250gm",
      image: "/brand/logo-card-t.png",
      featured: true,
      sortOrder: 1,
      categoryId: catId["qura-mix"],
    },
    { slug: "qura-mix-500gm", name: "Qura Mix 500gm (2 Pack)", nameBn: "কুঁড়া মিক্স — ৫০০ গ্রাম (২ প্যাক)", tagline: "পরিবারের জন্য সাশ্রয়ী প্যাক", price: 1500, comparePrice: 1600, weight: "500gm", image: "/brand/logo-card-t.png", sortOrder: 2, categoryId: catId["qura-mix"] },
    { slug: "qura-family-combo", name: "Qura Family Combo (4 Pack)", nameBn: "কুঁড়া ফ্যামিলি কম্বো — ১ কেজি", tagline: "পুরো মাসের জন্য — সবচেয়ে বেশি সাশ্রয়", price: 2800, comparePrice: 3200, weight: "1kg", image: "/brand/logo-card-t.png", sortOrder: 3, categoryId: catId["qura-mix"] },
    {
      slug: "natural-honey-250gm",
      name: "Natural Honey 250gm",
      nameBn: "খাঁটি মধু — ২৫০ গ্রাম",
      tagline: "কুঁড়ার সাথে মিশিয়ে খান — চিনির বদলে প্রাকৃতিক মিষ্টতা",
      price: 350,
      comboPrice: 299,
      addonNote: "চিনির বদলে প্রাকৃতিক মিষ্টতা, বাড়তি এনার্জি",
      weight: "250gm",
      image: "/brand/honey.png",
      isAddon: true,
      sortOrder: 10,
      categoryId: catId["honey-gur"],
    },
    {
      slug: "sugarcane-gur-500gm",
      name: "Sugarcane Jaggery 500gm",
      nameBn: "আখের গুড় — ৫০০ গ্রাম",
      tagline: "গ্রামের ঐতিহ্যবাহী স্বাদ",
      price: 220,
      comboPrice: 180,
      addonNote: "ঐতিহ্যবাহী গ্রামীণ স্বাদ, আয়রন সমৃদ্ধ",
      weight: "500gm",
      image: "/brand/gur.png",
      isAddon: true,
      sortOrder: 11,
      categoryId: catId["honey-gur"],
    },
  ];
  for (const p of products) {
    const { categoryId, ...rest } = p;
    await db.product.upsert({ where: { slug: p.slug }, update: { categoryId }, create: { ...rest, categoryId, stock: 500 } });
  }
  console.log(`✔ ${products.length} products (incl. honey + gur add-ons)`);

  const main = await db.product.findUniqueOrThrow({ where: { slug: "qura-mix-250gm" } });
  const extras = await db.product.findMany({ where: { slug: { in: ["qura-mix-500gm", "qura-family-combo"] } } });
  const addons = await db.product.findMany({ where: { isAddon: true } });
  if (!(await db.landingPage.findUnique({ where: { slug: "qura" } }))) {
    await db.landingPage.create({
      data: {
        slug: "qura",
        title: "কুঁড়া মিক্স — অফার",
        productId: main.id,
        extraIds: extras.map((e) => e.id),
        addonIds: addons.map((a) => a.id),
        content: DEFAULT_LANDING_CONTENT as object,
      },
    });
    console.log("✔ landing page /qura");
  }

  await db.coupon.upsert({ where: { code: "QURA50" }, update: {}, create: { code: "QURA50", type: "FLAT", value: 50, minOrder: 800 } });
  console.log("✔ coupon QURA50 (৳50 off over ৳800)");

  const guides = [
    { slug: "refund-policy", title: "রিটার্ন ও রিফান্ড পলিসি", content: "## পণ্য দেখে নিন\n\nডেলিভারির সময় ডেলিভারি ম্যানের সামনে পণ্য দেখে নিন।\n\n## রিটার্ন\n\n- পণ্য ক্ষতিগ্রস্ত বা ভুল হলে ৩ দিনের মধ্যে জানান\n- আমরা বিনামূল্যে পরিবর্তন করে দেব" },
    { slug: "how-to-use", title: "ব্যবহারবিধি — কুঁড়া মিক্স", content: "## সকালে নাস্তায়\n\n- ২–৩ চামচ কুঁড়া মিক্স এক গ্লাস গরম দুধ বা পানিতে মিশিয়ে নিন\n- ১ চামচ মধু বা একটু গুড় দিন — স্বাদ ও পুষ্টি দুটোই বাড়বে\n\n## রাতে\n\n- ঘুমানোর ১ ঘণ্টা আগে আধা গ্লাস কুসুম গরম দুধের সাথে খান\n\n## বিশেষ টিপস\n\n- বয়ামের মুখ ভালো করে বন্ধ রাখুন, শুকনো চামচ ব্যবহার করুন\n- শিশুদের জন্য অর্ধেক পরিমাণ দিন" },
    { slug: "privacy-policy", title: "প্রাইভেসি পলিসি", content: "আপনার নাম, মোবাইল ও ঠিকানা শুধু অর্ডার ডেলিভারির জন্য ব্যবহার করা হয়। আমরা কারও সাথে আপনার তথ্য বিক্রি করি না।" },
  ];
  for (const g of guides) await db.guidePage.upsert({ where: { slug: g.slug }, update: {}, create: g });
  console.log("✔ guide pages");

  if ((await db.review.count()) === 0) {
    await db.review.createMany({
      data: [
        { name: "রাশেদ আহমেদ", location: "ঢাকা", rating: 5, text: "সকালে নাস্তার বদলে এক গ্লাস কুঁড়া খাই — দুপুর পর্যন্ত ক্ষুধা লাগে না। দারুণ!" },
        { name: "নুসরাত জাহান", location: "চট্টগ্রাম", rating: 5, text: "মধু মিশিয়ে জিমের আগে খাই, এনার্জি অনেক ভালো থাকে।" },
        { name: "মাহমুদুল হাসান", location: "বগুড়া", rating: 5, text: "গুড় দিয়ে খেলে একদম গ্রামের স্বাদ! পরিবারের সবাই পছন্দ করেছে।" },
        { name: "সাবরিনা ইসলাম", location: "সিলেট", rating: 4, text: "প্রাকৃতিক জিনিস, কোনো কেমিক্যাল নেই — এটাই সবচেয়ে ভালো লেগেছে।" },
        { name: "তানভীর রহমান", location: "রাজশাহী", rating: 5, text: "হজমের সমস্যা অনেকটা কমেছে। আবারও অর্ডার করবো।" },
      ],
    });
    console.log("✔ reviews (demo — replace with real ones)");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
