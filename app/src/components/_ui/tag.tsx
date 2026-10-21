import type { ReactNode } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const tagVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold leading-normal border tracking-[-0.01em] shadow-xs select-none",
  {
    variants: {
      color: {
        blue: "bg-blue-600 text-white border-blue-500 shadow-xs dark:bg-blue-600 dark:text-white dark:border-blue-500",
        purple: "bg-purple-600 text-white border-purple-500 shadow-xs dark:bg-purple-600 dark:text-white dark:border-purple-500",
        green: "bg-emerald-600 text-white border-emerald-500 shadow-xs dark:bg-emerald-600 dark:text-white dark:border-emerald-500",
        amber: "bg-amber-600 text-white border-amber-500 shadow-xs dark:bg-amber-600 dark:text-white dark:border-amber-500",
        red: "bg-rose-600 text-white border-rose-500 shadow-xs dark:bg-rose-600 dark:text-white dark:border-rose-500",
        teal: "bg-teal-600 text-white border-teal-500 shadow-xs dark:bg-teal-600 dark:text-white dark:border-teal-500",
        neutral: "bg-zinc-800 text-zinc-100 border-zinc-700 shadow-xs dark:bg-zinc-800 dark:text-zinc-100 dark:border-zinc-700",
      },
    },
    defaultVariants: {
      color: "neutral",
    },
  }
);

export type TagProps = VariantProps<typeof tagVariants> & {
  children: ReactNode;
  className?: string;
  dot?: boolean;
};

export default function Tag({ color, className, children, dot }: TagProps) {
  return (
    <span className={cn(tagVariants({ color }), className)}>
      {dot && (
        <span
          className="size-1.5 rounded-full bg-current opacity-90 shrink-0"
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
}
