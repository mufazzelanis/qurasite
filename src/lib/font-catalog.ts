/** Fonts the admin can choose — client-safe metadata (the actual loading is in lib/fonts.ts) */

export type FontScript = "bn" | "en";
export type FontInfo = { key: string; name: string; script: FontScript; style: "Sans" | "Serif" | "Rounded" | "Display"; desc: string };

export const FONTS: FontInfo[] = [
  // ── বাংলা ──
  { key: "hind", name: "Hind Siliguri", script: "bn", style: "Sans", desc: "পরিষ্কার ও আধুনিক — ওয়েবের সবচেয়ে জনপ্রিয় বাংলা ফন্ট" },
  { key: "noto-bn", name: "Noto Sans Bengali", script: "bn", style: "Sans", desc: "Google-এর ফন্ট — ছোট লেখাতেও খুব পরিষ্কার" },
  { key: "anek", name: "Anek Bangla", script: "bn", style: "Sans", desc: "আধুনিক ও স্টাইলিশ — শিরোনামে দারুণ" },
  { key: "baloo-da", name: "Baloo Da 2", script: "bn", style: "Rounded", desc: "গোলাকার ও বন্ধুসুলভ — খাবারের ব্র্যান্ডে মানানসই" },
  { key: "atma", name: "Atma", script: "bn", style: "Rounded", desc: "নরম ও হাতে লেখার মতো অনুভূতি" },
  { key: "mina", name: "Mina", script: "bn", style: "Sans", desc: "হালকা জ্যামিতিক ছাঁদ" },
  { key: "noto-serif-bn", name: "Noto Serif Bengali", script: "bn", style: "Serif", desc: "ঐতিহ্যবাহী বইয়ের মতো — বিশ্বাসযোগ্য অনুভূতি" },
  { key: "tiro", name: "Tiro Bangla", script: "bn", style: "Serif", desc: "ক্লাসিক ছাপার অক্ষর — শুধু শিরোনামের জন্য ভালো" },
  { key: "galada", name: "Galada", script: "bn", style: "Display", desc: "আলংকারিক — শুধু বড় শিরোনামে ব্যবহার করুন" },
  // ── English ──
  { key: "jakarta", name: "Plus Jakarta Sans", script: "en", style: "Sans", desc: "Modern and premium — great for brands" },
  { key: "inter", name: "Inter", script: "en", style: "Sans", desc: "Extremely readable at every size" },
  { key: "poppins", name: "Poppins", script: "en", style: "Sans", desc: "Geometric and friendly — very popular in BD" },
  { key: "dm-sans", name: "DM Sans", script: "en", style: "Sans", desc: "Soft and clean, low contrast" },
  { key: "manrope", name: "Manrope", script: "en", style: "Sans", desc: "Modern with a technical touch" },
  { key: "outfit", name: "Outfit", script: "en", style: "Sans", desc: "Rounded geometric — playful headings" },
  { key: "nunito", name: "Nunito", script: "en", style: "Rounded", desc: "Rounded ends — warm and approachable" },
  { key: "montserrat", name: "Montserrat", script: "en", style: "Sans", desc: "Bold, wide headings" },
  { key: "playfair", name: "Playfair Display", script: "en", style: "Serif", desc: "Elegant serif — luxury headings" },
  { key: "lora", name: "Lora", script: "en", style: "Serif", desc: "Warm serif for stories and blogs" },
];

export const fontVar = (key: string) => `--font-${key}`;
export const fontByKey = (key: string) => FONTS.find((f) => f.key === key);

export const DEFAULT_TYPOGRAPHY = { bnBody: "hind", bnHeading: "hind", enBody: "jakarta", enHeading: "jakarta" };
export type TypographySettings = typeof DEFAULT_TYPOGRAPHY;

/** CSS custom properties for the chosen fonts (set on <html>, read by --font-sans / --font-display) */
export function typographyVars(t: Partial<TypographySettings>) {
  const pick = (key: string | undefined, script: FontScript, fallback: string) => (key && FONTS.some((f) => f.key === key && f.script === script) ? key : fallback);
  const d = DEFAULT_TYPOGRAPHY;
  return {
    "--font-bn": `var(${fontVar(pick(t.bnBody, "bn", d.bnBody))})`,
    "--font-bn-h": `var(${fontVar(pick(t.bnHeading, "bn", d.bnHeading))})`,
    "--font-en": `var(${fontVar(pick(t.enBody, "en", d.enBody))})`,
    "--font-en-h": `var(${fontVar(pick(t.enHeading, "en", d.enHeading))})`,
  } as Record<string, string>;
}
