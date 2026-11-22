import type { ToolCategory } from "@/components/tools/tools-registry";

/**
 * Paper Shaders mesh textures, pre-rendered once per category
 * (public/textures/*.webp, ~1.5 KB each). Using images instead of live WebGL
 * keeps 70+ cards cheap — browsers cap live WebGL contexts at ~16 per page.
 * Colours are Glaze's tones: clay, fern, iris, ocean, sun, cobalt.
 */
export function categoryTexture(category: ToolCategory): string {
  return `/textures/${category}.webp`;
}

/** Stable per-tool variation: a different crop of the category texture and a slight hue shift. */
export function toolVariant(id: string) {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619) >>> 0;
  const x = h % 101;
  const y = (h >>> 8) % 101;
  const hue = ((h >>> 16) % 41) - 20; // -20..20 deg
  return {
    chip: { backgroundSize: "320%", backgroundPosition: `${x}% ${y}%` },
    wash: { backgroundPosition: `${100 - x}% ${100 - y}%`, filter: `blur(28px) hue-rotate(${hue}deg)` },
  };
}
