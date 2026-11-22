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
  light: {
    colorBack: "#f4f6fb",
    colors: ["#dbe5ff", "#9db8ff", "#3b6cf6", "#c7f0ff"],
  },
  dark: {
    colorBack: "#000000",
    colors: ["#061233", "#163fb0", "#3b82f6", "#0b2a4a"],
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
