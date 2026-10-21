"use client";

import type { ToolDefinition } from "./tools-registry";
import { ChevronRightIcon } from "@/components/_ui/icons";
import { cn } from "@/lib/utils";

export interface ToolCardProps {
  tool: ToolDefinition;
  onClick: (tool: ToolDefinition) => void;
  className?: string;
}

export default function ToolCard({ tool, onClick, className }: ToolCardProps) {
  const Icon = tool.icon;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onClick(tool)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick(tool);
        }
      }}
      className={cn(
        "group relative flex flex-col justify-between overflow-hidden rounded-2xl bg-card border border-card-border p-4 sm:p-5 shadow-card transition-all duration-200 ease-power2-out hover:shadow-card-hover hover:border-border cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary/60 active:scale-[0.99]",
        className
      )}
    >
      <div>
        <div className="mb-3.5 flex items-center justify-between">
          <div className="bg-secondary text-foreground group-hover:text-primary group-hover:bg-primary/10 flex size-9 items-center justify-center rounded-xl border border-border/80 transition-colors">
            <Icon className="size-4.5" />
          </div>
        </div>

        <h3 className="text-[15px] font-semibold tracking-[-0.02em] text-foreground group-hover:text-primary transition-colors">
          {tool.name}
        </h3>
        <p className="text-muted-foreground mt-1.5 text-[13px] leading-snug line-clamp-2">
          {tool.description}
        </p>
      </div>

      <div className="border-border/60 mt-4 flex items-center justify-between border-t pt-3">
        <div className="flex flex-wrap gap-1">
          {tool.formats.slice(0, 3).map((fmt) => (
            <span
              key={fmt}
              className="bg-secondary text-muted-foreground rounded px-1.5 py-0.5 text-[10px] uppercase font-semibold"
            >
              {fmt}
            </span>
          ))}
          {tool.formats.length > 3 && (
            <span className="text-muted-foreground text-[10px] self-center">
              +{tool.formats.length - 3}
            </span>
          )}
        </div>

        <div className="text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 flex items-center gap-0.5 text-[12px] font-medium transition-all">
          <span>Run</span>
          <ChevronRightIcon className="size-3.5" />
        </div>
      </div>
    </div>
  );
}
