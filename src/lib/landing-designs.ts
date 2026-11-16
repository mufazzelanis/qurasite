/**
 * Landing page designs. Each design remaps the theme colors for the whole landing page
 * (every section adapts automatically) and picks a hero layout.
 * primary / accent are the editable button + highlight colors (copied into the page when a design is chosen).
 */

export type HeroLayout = "orbit" | "centered" | "bold" | "luxe" | "story";

export type LandingDesign = {
  key: string;
  name: string;
  tagline: string;
  desc: string;
  bestFor: string;
  hero: HeroLayout;
  primary: string;
  accent: string;
  dark?: boolean;
  /** CSS variables set on the landing page root */
  vars: Record<string, string>;
  /** tiny preview swatches */
  preview: { bg: string; surface: string; text: string };
};

export const LANDING_DESIGNS: LandingDesign[] = [
  {
    key: "classic",
    name: "Classic Natural",
    tagline: "Warm, trusted, organic",
    desc: "Cream background, deep green and gold, floating ingredient chips around the product.",
    bestFor: "Health & natural food",
    hero: "orbit",
    primary: "#0d4524",
    accent: "#da9128",
    vars: {},
    preview: { bg: "#faf3e6", surface: "#ffffff", text: "#08301a" },
  },
  {
    key: "fresh",
    name: "Fresh Minimal",
    tagline: "Clean, modern, airy",
    desc: "Bright white space, soft mint tints, centered headline with a large product photo.",
    bestFor: "Modern brands, young buyers",
    hero: "centered",
    primary: "#0f766e",
    accent: "#10b981",
    vars: {
      "--color-cream": "#f7faf9",
      "--color-brand-50": "#effaf6",
      "--color-brand-100": "#d7f2e8",
      "--color-brand-200": "#b0e4d2",
      "--color-brand-300": "#7fd0b5",
      "--color-brand-600": "#0f766e",
      "--color-brand-700": "#0d6560",
      "--color-brand-900": "#0b2a2a",
      "--color-gold-50": "#ecfdf5",
      "--color-gold-100": "#d1fae5",
      "--color-gold-300": "#6ee7b7",
      "--color-gold-400": "#34d399",
      "--color-gold-600": "#059669",
      "--color-gold-700": "#047857",
    },
    preview: { bg: "#f7faf9", surface: "#ffffff", text: "#0b2a2a" },
  },
  {
    key: "bold",
    name: "Bold Offer",
    tagline: "Urgent, loud, high-converting",
    desc: "Red and yellow sale energy, huge price stamp, countdown and urgency everywhere.",
    bestFor: "Flash sales & Facebook ads",
    hero: "bold",
    primary: "#b91c1c",
    accent: "#f59e0b",
    vars: {
      "--color-cream": "#fff8ef",
      "--color-brand-50": "#fef2f2",
      "--color-brand-100": "#fee2e2",
      "--color-brand-200": "#fecaca",
      "--color-brand-300": "#fca5a5",
      "--color-brand-600": "#dc2626",
      "--color-brand-700": "#b91c1c",
      "--color-brand-900": "#1f0f0a",
      "--color-gold-50": "#fffbeb",
      "--color-gold-100": "#fef3c7",
      "--color-gold-300": "#fcd34d",
      "--color-gold-400": "#fbbf24",
      "--color-gold-600": "#d97706",
      "--color-gold-700": "#b45309",
    },
    preview: { bg: "#fff8ef", surface: "#ffffff", text: "#1f0f0a" },
  },
  {
    key: "premium",
    name: "Premium Dark",
    tagline: "Luxury, elegant, exclusive",
    desc: "Deep charcoal with champagne gold, product in a glowing spotlight. Feels expensive.",
    bestFor: "Gift boxes, premium combos",
    hero: "luxe",
    primary: "#c9a24a",
    accent: "#e3c27a",
    dark: true,
    vars: {
      "--color-cream": "#0d110f",
      "--color-white": "#161c19",
      "--color-black": "#f5ecd8",
      "--color-brand-50": "#1a221e",
      "--color-brand-100": "#212b26",
      "--color-brand-200": "#2b3832",
      "--color-brand-300": "#3d5047",
      "--color-brand-400": "#8fa79a",
      "--color-brand-500": "#b9c9bf",
      "--color-brand-600": "#d9b864",
      "--color-brand-700": "#e3c27a",
      "--color-brand-900": "#f3ead7",
      "--color-brand-950": "#fbf6ea",
      "--color-gold-50": "#1d1a12",
      "--color-gold-100": "#2a2416",
      "--color-gold-200": "#3a311c",
      "--color-gold-300": "#e8cf8d",
      "--color-gold-400": "#d9b864",
      "--color-gold-600": "#e3c27a",
      "--color-gold-700": "#ecd396",
      "--color-zinc-50": "#1a201d",
      "--color-zinc-100": "#212824",
      "--color-zinc-200": "#2c3530",
      "--color-zinc-300": "#3a443e",
      "--color-zinc-400": "#8a948e",
      "--color-zinc-500": "#a5ada8",
      "--color-zinc-600": "#c3c9c5",
      "--color-zinc-700": "#dde1de",
      "--color-zinc-900": "#f3f4f3",
    },
    preview: { bg: "#0d110f", surface: "#161c19", text: "#f3ead7" },
  },
  {
    key: "earthy",
    name: "Earthy Story",
    tagline: "Handmade, village, story-driven",
    desc: "Olive and terracotta, full-width photo hero with the story on top. Feels homemade.",
    bestFor: "Gur, honey, traditional foods",
    hero: "story",
    primary: "#4d5a24",
    accent: "#c2643a",
    vars: {
      "--color-cream": "#f5efe3",
      "--color-brand-50": "#f3f4e8",
      "--color-brand-100": "#e4e8cc",
      "--color-brand-200": "#cdd4a6",
      "--color-brand-300": "#a9b46f",
      "--color-brand-600": "#5d6b2c",
      "--color-brand-700": "#4d5a24",
      "--color-brand-900": "#2a2414",
      "--color-gold-50": "#fbf1ea",
      "--color-gold-100": "#f6dfd0",
      "--color-gold-300": "#e3a27f",
      "--color-gold-400": "#d4825a",
      "--color-gold-600": "#a8532e",
      "--color-gold-700": "#8a4225",
    },
    preview: { bg: "#f5efe3", surface: "#ffffff", text: "#2a2414" },
  },
];

export const designByKey = (k?: string | null) => LANDING_DESIGNS.find((d) => d.key === k) ?? LANDING_DESIGNS[0];

/** Root style for a landing page: design palette + the page's own primary/accent */
export function designStyle(designKey: string | undefined, primary: string, accent: string) {
  const d = designByKey(designKey);
  return { ...d.vars, "--color-brand-800": primary || d.primary, "--color-gold-500": accent || d.accent } as Record<string, string>;
}
