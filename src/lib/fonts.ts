import { Anek_Bangla, Atma, Baloo_Da_2, DM_Sans, Galada, Hind_Siliguri, Inter, Lora, Manrope, Mina, Montserrat, Noto_Sans_Bengali, Noto_Serif_Bengali, Nunito, Outfit, Playfair_Display, Plus_Jakarta_Sans, Poppins, Tiro_Bangla } from "next/font/google";

/**
 * Every selectable font, self-hosted by Next.js. Only @font-face rules are added to the page —
 * the browser downloads a font file only when the chosen font is actually used (preload: false).
 * Bangla fonts load only the Bengali subset, so English letters always come from the English font.
 *
 * NOTE: next/font needs plain literal options in every call (no spreads / shared variables).
 */

// ── বাংলা ──
const hind = Hind_Siliguri({ subsets: ["bengali"], weight: ["400", "500", "600", "700"], display: "swap", preload: false, variable: "--font-hind" });
const notoBn = Noto_Sans_Bengali({ subsets: ["bengali"], display: "swap", preload: false, variable: "--font-noto-bn" });
const anek = Anek_Bangla({ subsets: ["bengali"], display: "swap", preload: false, variable: "--font-anek" });
const balooDa = Baloo_Da_2({ subsets: ["bengali"], display: "swap", preload: false, variable: "--font-baloo-da" });
const atma = Atma({ subsets: ["bengali"], weight: ["400", "500", "600", "700"], display: "swap", preload: false, variable: "--font-atma" });
const mina = Mina({ subsets: ["bengali"], weight: ["400", "700"], display: "swap", preload: false, variable: "--font-mina" });
const notoSerifBn = Noto_Serif_Bengali({ subsets: ["bengali"], display: "swap", preload: false, variable: "--font-noto-serif-bn" });
const tiro = Tiro_Bangla({ subsets: ["bengali"], weight: "400", display: "swap", preload: false, variable: "--font-tiro" });
const galada = Galada({ subsets: ["bengali"], weight: "400", display: "swap", preload: false, variable: "--font-galada" });

// ── English ──
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-jakarta" });
const inter = Inter({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-inter" });
const poppins = Poppins({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], display: "swap", preload: false, variable: "--font-poppins" });
const dmSans = DM_Sans({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-dm-sans" });
const manrope = Manrope({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-manrope" });
const outfit = Outfit({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-outfit" });
const nunito = Nunito({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-nunito" });
const montserrat = Montserrat({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-montserrat" });
const playfair = Playfair_Display({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-playfair" });
const lora = Lora({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-lora" });

/** className that defines every --font-<key> variable — put on <html> */
export const fontVariables = [hind, notoBn, anek, balooDa, atma, mina, notoSerifBn, tiro, galada, jakarta, inter, poppins, dmSans, manrope, outfit, nunito, montserrat, playfair, lora].map((f) => f.variable).join(" ");
