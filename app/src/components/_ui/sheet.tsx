"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import Button from "./button";
import { XCloseIcon } from "./icons";
import { ease } from "@/lib/easings";
import { cn } from "@/lib/utils";

export type SheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
  side?: "left" | "right";
  className?: string;
  title?: string;
};

export function Sheet({
  open,
  onOpenChange,
  children,
  side = "left",
  className,
  title = "Navigation",
}: SheetProps) {
  const [mounted, setMounted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    document.body.classList.add("overflow-hidden");
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onOpenChange(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.classList.remove("overflow-hidden");
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onOpenChange]);

  if (!mounted) return null;

  const isLeft = side === "left";

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[75] flex">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16, ease: ease.power3Out }}
            onClick={() => onOpenChange(false)}
            className="bg-black/60 backdrop-blur-xs fixed inset-0"
          />
          <motion.div
            ref={ref}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ x: isLeft ? "-100%" : "100%" }}
            animate={{ x: 0 }}
            exit={{ x: isLeft ? "-100%" : "100%" }}
            transition={{ duration: 0.22, ease: ease.power3Out }}
            className={cn(
              "border-border relative z-10 flex h-full w-[280px] max-w-[85vw] flex-col border-r bg-sidebar text-sidebar-foreground shadow-2xl",
              !isLeft && "ml-auto border-r-0 border-l",
              className
            )}
          >
            <div className="flex items-center justify-between border-b border-sidebar-border p-3 lg:hidden">
              <span className="text-[13px] font-semibold text-foreground tracking-[-0.01em]">
                {title}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onOpenChange(false)}
                aria-label="Close"
              >
                <XCloseIcon className="size-4" />
              </Button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
