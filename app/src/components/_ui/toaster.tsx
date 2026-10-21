"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ease } from "@/lib/easings";
import { CheckCircleIcon, ShieldCheckIcon, XCloseIcon } from "./icons";
import { cn } from "@/lib/utils";

export interface ToastItem {
  id: string;
  title: string;
  description?: string;
  type?: "success" | "error" | "info";
}

let toastListeners: Array<(toasts: ToastItem[]) => void> = [];
let currentToasts: ToastItem[] = [];

function notify() {
  toastListeners.forEach((l) => l([...currentToasts]));
}

export function toast(
  title: string,
  options?: { description?: string; type?: "success" | "error" | "info"; duration?: number }
) {
  const id = `toast-${Date.now()}-${Math.random()}`;
  const item: ToastItem = {
    id,
    title,
    description: options?.description,
    type: options?.type ?? "success",
  };
  currentToasts = [...currentToasts, item];
  notify();

  setTimeout(() => {
    currentToasts = currentToasts.filter((t) => t.id !== id);
    notify();
  }, options?.duration ?? 3500);
}

export default function Toaster() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    toastListeners.push(setToasts);
    return () => {
      toastListeners = toastListeners.filter((l) => l !== setToasts);
    };
  }, []);

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-4 z-[90] flex flex-col items-center gap-2 px-4"
    >
      <AnimatePresence initial={false}>
        {toasts.map((item) => (
          <motion.div
            key={item.id}
            layout
            initial={{ opacity: 0, y: 14, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.2, ease: ease.power3Out }}
            className={cn(
              "pointer-events-auto flex items-start gap-2.5 rounded-xl border px-3.5 py-2.5 shadow-popover text-[13px] font-medium tracking-[-0.01em] max-w-md",
              item.type === "error"
                ? "bg-destructive text-white border-destructive/50"
                : item.type === "info"
                ? "bg-card text-foreground border-border"
                : "bg-card text-foreground border-border"
            )}
          >
            {item.type === "error" ? (
              <XCloseIcon className="size-4 shrink-0 mt-0.5" />
            ) : item.type === "info" ? (
              <ShieldCheckIcon className="size-4 shrink-0 mt-0.5 text-blue-500" />
            ) : (
              <CheckCircleIcon className="size-4 shrink-0 mt-0.5 text-emerald-500" />
            )}
            <div className="flex-1 min-w-0">
              <p className="font-semibold">{item.title}</p>
              {item.description && (
                <p className="text-[12px] opacity-80 mt-0.5">{item.description}</p>
              )}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
