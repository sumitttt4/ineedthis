"use client";

import dynamic from "next/dynamic";
import GlobalDropzone from "@/components/dropzone/global-dropzone";
import type { ToolDefinition } from "@/components/tools/tools-registry";
import { ShieldCheckIcon, CpuIcon, DownloadIcon, CheckCircleIcon } from "@/components/_ui/icons";

const HeroShader = dynamic(() => import("./hero-shader"), {
  ssr: false,
  loading: () => null,
});

export interface HeroProps {
  toolCount: number;
  onSelectToolWithFile: (tool: ToolDefinition, file: File) => void;
}

const PROOF: Array<{ icon: typeof ShieldCheckIcon; label: string; href?: string }> = [
  { icon: ShieldCheckIcon, label: "Files never leave your device" },
  { icon: CpuIcon, label: "WebAssembly + Web Workers" },
  { icon: DownloadIcon, label: "Installable, works offline" },
  { icon: CheckCircleIcon, label: "Free, no sign-up, no watermark" },
];

export default function Hero({ toolCount, onSelectToolWithFile }: HeroProps) {
  return (
    <section
      aria-labelledby="hero-title"
      className="hero-stage relative isolate overflow-hidden rounded-3xl border border-border"
    >
      {/* CSS fallback paints instantly; the shader fades in over it once WebGL is ready. */}
      <div className="hero-fallback absolute inset-0" aria-hidden="true" />
      <div className="hero-shader absolute inset-0">
        <HeroShader />
      </div>
      <div className="hero-scrim absolute inset-0" aria-hidden="true" />

      <div className="relative grid gap-8 px-5 py-10 sm:px-10 sm:py-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,28rem)] lg:items-center lg:gap-12 lg:px-12 lg:py-16">
        <div className="flex flex-col gap-5">
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-background/70 px-3 py-1 text-[12px] font-medium text-muted-foreground">
            <span className="size-1.5 rounded-full bg-success" aria-hidden="true" />
            <span className="tabular-nums">{toolCount} tools · free · no sign-up</span>
          </span>

          <h1
            id="hero-title"
            className="text-balance text-[34px] font-semibold leading-[1.05] tracking-[-0.035em] text-foreground sm:text-[46px] 2xl:text-[56px]"
          >
            Every file tool you need.
            <span className="block text-muted-foreground">None of the uploads.</span>
          </h1>

          <p className="max-w-[34rem] text-pretty text-[15px] leading-relaxed text-muted-foreground sm:text-[16px]">
            Convert PDFs, compress video, strip photo metadata, and zip folders right in your
            browser. Drop a file and we pick the right tool.
          </p>

          <ul className="flex flex-col gap-2 text-[13px] text-foreground/80 sm:flex-row sm:flex-wrap sm:gap-x-5">
            {PROOF.map(({ icon: Icon, label, href }) => (
              <li key={label} className="flex items-center gap-2">
                <Icon className="size-4 text-primary" aria-hidden="true" />
                {href ? (
                  <a href={href} target="_blank" rel="noopener noreferrer" className="underline-offset-4 hover:underline">
                    {label}
                  </a>
                ) : (
                  label
                )}
              </li>
            ))}
          </ul>
        </div>

        <GlobalDropzone onSelectToolWithFile={onSelectToolWithFile} />
      </div>
    </section>
  );
}
