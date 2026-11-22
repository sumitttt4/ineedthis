import {
  Inter,
  Playfair_Display,
  Space_Grotesk,
  Bebas_Neue,
  JetBrains_Mono,
  Caveat,
  Dancing_Script,
  Kalam,
  Noto_Sans_Devanagari,
} from "next/font/google";

// preload: false — these only download when someone opens the card maker.
const inter = Inter({ subsets: ["latin"], weight: ["500", "700"], preload: false, display: "swap" });
const playfair = Playfair_Display({ subsets: ["latin"], weight: ["500", "700"], style: ["normal", "italic"], preload: false, display: "swap" });
const grotesk = Space_Grotesk({ subsets: ["latin"], weight: ["500", "700"], preload: false, display: "swap" });
const bebas = Bebas_Neue({ subsets: ["latin"], weight: "400", preload: false, display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], weight: ["500", "700"], preload: false, display: "swap" });
const caveat = Caveat({ subsets: ["latin"], weight: ["500", "700"], preload: false, display: "swap" });
const dancing = Dancing_Script({ subsets: ["latin"], weight: ["500", "700"], preload: false, display: "swap" });
const kalam = Kalam({ subsets: ["latin", "devanagari"], weight: ["400", "700"], preload: false, display: "swap" });
// Hindi / Devanagari fallback for the non-handwritten fonts.
const devanagari = Noto_Sans_Devanagari({ subsets: ["devanagari"], weight: ["500", "700"], preload: false, display: "swap" });

export interface CardFont {
  id: string;
  label: string;
  kind: "normal" | "handwritten";
  family: string; // CSS font-family list usable by canvas
  weight: number;
  className: string;
  /** Visual size tweak so fonts look similar at the same nominal size. */
  scale: number;
}

const withHindi = (f: string) => `${f}, ${devanagari.style.fontFamily}`;

export const CARD_FONTS: CardFont[] = [
  { id: "inter", label: "Inter", kind: "normal", family: withHindi(inter.style.fontFamily), weight: 700, className: inter.className, scale: 1 },
  { id: "playfair", label: "Playfair", kind: "normal", family: withHindi(playfair.style.fontFamily), weight: 700, className: playfair.className, scale: 1.05 },
  { id: "grotesk", label: "Space Grotesk", kind: "normal", family: withHindi(grotesk.style.fontFamily), weight: 700, className: grotesk.className, scale: 1 },
  { id: "bebas", label: "Bebas Neue", kind: "normal", family: withHindi(bebas.style.fontFamily), weight: 400, className: bebas.className, scale: 1.3 },
  { id: "mono", label: "JetBrains Mono", kind: "normal", family: withHindi(mono.style.fontFamily), weight: 700, className: mono.className, scale: 0.9 },
  { id: "caveat", label: "Caveat", kind: "handwritten", family: caveat.style.fontFamily, weight: 700, className: caveat.className, scale: 1.35 },
  { id: "dancing", label: "Dancing Script", kind: "handwritten", family: dancing.style.fontFamily, weight: 700, className: dancing.className, scale: 1.2 },
  { id: "kalam", label: "Kalam (Hindi)", kind: "handwritten", family: kalam.style.fontFamily, weight: 700, className: kalam.className, scale: 1.05 },
];

/** Ensure the font files are actually loaded before drawing to canvas. */
export async function ensureFont(font: CardFont, sample: string) {
  try {
    await document.fonts.load(`${font.weight} 48px ${font.family}`, sample || "Aa");
    await document.fonts.load(`500 24px ${font.family}`, sample || "Aa");
  } catch {
    /* canvas falls back to system font */
  }
}
