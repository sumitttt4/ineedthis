"use client";

import dynamic from "next/dynamic";

const HeroShader = dynamic(() => import("@/components/hero/hero-shader"), {
  ssr: false,
  loading: () => null,
});

/** Full-bleed Paper Shaders grain backdrop with the same fallback + scrim as the hero. */
export default function GrainBackdrop() {
  return (
    <div aria-hidden="true" className="absolute inset-0 -z-10">
      <div className="hero-fallback absolute inset-0" />
      <div className="hero-shader absolute inset-0">
        <HeroShader />
      </div>
      <div className="absolute inset-0 bg-[radial-gradient(60%_55%_at_50%_50%,var(--background)_0%,color-mix(in_oklab,var(--background)_70%,transparent)_55%,transparent_100%)]" />
    </div>
  );
}
