import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export default function CountBadge({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "bg-secondary border border-border text-foreground ml-auto inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1.5 text-[11px] font-medium tabular-nums",
        className
      )}
    >
      {children}
    </span>
  );
}
