import { TOOLS } from "@/components/tools/tools-registry";

/**
 * Paper Shaders mesh textures, pre-rendered once (public/textures/*.webp,
 * ~1.5 KB each). Static images instead of live WebGL keep 70+ cards cheap —
 * browsers cap live WebGL contexts at ~16 per page.
 *
 * Colour rotates per card (not per category) so a grid never turns one colour.
 * With 8 colourways and ≤4 columns, horizontal and vertical neighbours differ.
 */
const PALETTE = ["cobalt", "fern", "iris", "sun", "ocean", "clay", "teal", "dusk"] as const;

function indexInCategory(id: string): number {
  const t = TOOLS.find((x) => x.id === id);
  if (!t) return 0;
  return TOOLS.filter((x) => x.category === t.category).findIndex((x) => x.id === id);
}

/** Texture for a tool. Pass `position` when the tool appears in a custom list (Everyday, Gems). */
export function toolTexture(id: string, position?: number): string {
  const i = position ?? indexInCategory(id);
  return `/textures/${PALETTE[((i % PALETTE.length) + PALETTE.length) % PALETTE.length]}.webp`;
}

/** Stable per-tool variation: a different crop of the texture. */
export function toolVariant(id: string) {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619) >>> 0;
  const x = h % 101;
  const y = (h >>> 8) % 101;
  return {
    chip: { backgroundSize: "320%", backgroundPosition: `${x}% ${y}%` },
    wash: { backgroundPosition: `${100 - x}% ${100 - y}%` },
  };
}
