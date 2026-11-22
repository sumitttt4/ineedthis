"use client";

import Link from "next/link";
import { CATEGORIES, TOOLS, type ToolDefinition } from "@/components/tools/tools-registry";
import { EVERYDAY, GEMS } from "@/components/tools/collections";
import ToolCard from "@/components/tools/tool-card";
import { toolSlug } from "@/lib/tool-pages";
import { SparklesIcon, ChevronRightIcon } from "@/components/_ui/icons";
import { categoryTexture, toolVariant } from "@/lib/category-style";

const byId = (id: string) => TOOLS.find((t) => t.id === id);

function SectionHead({ id, title, sub }: { id: string; title: string; sub: string }) {
  return (
    <div className="flex flex-col gap-1">
      <h2 id={id} className="text-[18px] font-semibold tracking-[-0.02em] text-foreground">
        {title}
      </h2>
      <p className="text-[13px] text-muted-foreground">{sub}</p>
    </div>
  );
}

export function EverydaySection() {
  return (
    <section aria-labelledby="everyday" className="flex flex-col gap-4">
      <SectionHead id="everyday" title="Everyday" sub="The jobs people come back for every week." />
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {EVERYDAY.map(({ id, label }) => {
          const t = byId(id);
          if (!t) return null;
          const Icon = t.icon;
          return (
            <li key={id}>
              <Link
                href={`/${toolSlug(id)}`}
                className="group flex h-full items-center gap-3 rounded-xl border border-border bg-card px-3 py-3 shadow-card outline-none transition-[border-color,transform] duration-150 ease-out focus-visible:ring-2 focus-visible:ring-primary/60 active:scale-[0.98] [@media(hover:hover)]:hover:border-primary/40"
              >
                <span className="shader-chip flex size-9 shrink-0 items-center justify-center rounded-lg" style={{ backgroundImage: `url(${categoryTexture(t.category)})`, ...toolVariant(id).chip }}>
                  <Icon className="size-4.5" aria-hidden="true" />
                </span>
                <span className="min-w-0 text-[14px] font-medium leading-tight text-foreground">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function GemsSection() {
  return (
    <section aria-labelledby="gems" className="flex flex-col gap-4">
      <SectionHead id="gems" title="Hidden gems" sub="Things you won't find on most tool sites." />
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {GEMS.map(({ id, why }) => {
          const t = byId(id);
          if (!t) return null;
          const Icon = t.icon;
          return (
            <li key={id}>
              <Link
                href={`/${toolSlug(id)}`}
                className="group relative flex h-full flex-col gap-3 overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-card outline-none transition-[border-color,transform] duration-200 ease-out focus-visible:ring-2 focus-visible:ring-primary/60 active:scale-[0.99] [@media(hover:hover)]:hover:border-primary/40"
              >
                <span aria-hidden="true" className="shader-wash" style={{ backgroundImage: `url(${categoryTexture(t.category)})`, ...toolVariant(id).wash }} />
                <div className="relative flex items-center justify-between">
                  <span className="shader-chip flex size-9 items-center justify-center rounded-lg" style={{ backgroundImage: `url(${categoryTexture(t.category)})`, ...toolVariant(id).chip }}>
                    <Icon className="size-4.5" aria-hidden="true" />
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                    <SparklesIcon className="size-3" aria-hidden="true" />
                    Gem
                  </span>
                </div>
                <div className="relative flex flex-col gap-1">
                  <h3 className="text-[15px] font-semibold tracking-[-0.02em] text-foreground">{t.name}</h3>
                  <p className="text-[13px] leading-snug text-muted-foreground">{why}</p>
                </div>
                <span className="relative mt-auto flex items-center gap-0.5 text-[12px] font-medium text-muted-foreground transition-colors group-hover:text-primary">
                  Try it
                  <ChevronRightIcon className="size-3.5" aria-hidden="true" />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function AllByCategory() {
  const groups = CATEGORIES.filter((c) => c.id !== "all").map((c) => ({
    ...c,
    tools: TOOLS.filter((t) => t.category === c.id) as ToolDefinition[],
  }));
  return (
    <section aria-labelledby="all-tools" className="flex flex-col gap-8">
      <SectionHead id="all-tools" title={`All ${TOOLS.length} tools`} sub="Everything, grouped. Free and open source." />
      {groups.map((g) => (
        <div key={g.id} className="flex flex-col gap-3">
          <h3 className="flex items-center gap-2 text-[14px] font-semibold text-foreground">
            {g.name}
            <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium tabular-nums text-muted-foreground">{g.tools.length}</span>
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {g.tools.map((t) => (
              <ToolCard key={t.id} tool={t} />
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
