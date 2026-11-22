"use client";

import { MeshGradient } from "@paper-design/shaders-react";
import { useReducedMotion } from "motion/react";

/**
 * Paper Shaders mesh gradient for the sidebar "made by" card.
 * Deep Glaze cobalt / indigo / celadon in both themes so white text always reads.
 * Rests on a still frame and only animates while the card is hovered or focused,
 * so an always-visible sidebar never keeps the GPU busy.
 */
export default function MakerMesh({ active }: { active: boolean }) {
  const reduceMotion = useReducedMotion();
  return (
    <MeshGradient
      aria-hidden="true"
      className="absolute inset-0 size-full"
      colors={["#0b1240", "#2445e6", "#4f6bff", "#1d6b57"]}
      distortion={0.85}
      swirl={0.35}
      grainMixer={0.18}
      grainOverlay={0.12}
      speed={active && !reduceMotion ? 0.6 : 0}
      frame={4200}
      maxPixelCount={640 * 360}
    />
  );
}
