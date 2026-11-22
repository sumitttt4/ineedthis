"use client";

import { GrainGradient } from "@paper-design/shaders-react";
import { useReducedMotion } from "motion/react";
import { useTheme } from "next-themes";

/**
 * Paper Shaders grain gradient behind the hero.
 * Theme-aware palette; frozen under prefers-reduced-motion.
 * ShaderMount already pauses rAF when the canvas is off-screen or the tab is hidden.
 */
const PALETTES = {
  // Glaze palette: porcelain + cobalt (light), black + indigo (dark), celadon support.
  light: {
    colorBack: "#f3f5f7",
    colors: ["#dfe5ff", "#a9b4ff", "#2445e6", "#cfeee4"],
  },
  dark: {
    colorBack: "#000000",
    colors: ["#0b1240", "#1f35b8", "#4f6bff", "#0c2c25"],
  },
};

export default function HeroShader() {
  const { resolvedTheme } = useTheme();
  const reduceMotion = useReducedMotion();
  const palette = resolvedTheme === "light" ? PALETTES.light : PALETTES.dark;

  return (
    <GrainGradient
      aria-hidden="true"
      className="absolute inset-0 size-full"
      colorBack={palette.colorBack}
      colors={palette.colors}
      shape="wave"
      softness={0.75}
      intensity={0.35}
      noise={0.22}
      scale={1.4}
      rotation={-12}
      speed={reduceMotion ? 0 : 0.35}
      frame={6000}
      maxPixelCount={1920 * 1080}
    />
  );
}
