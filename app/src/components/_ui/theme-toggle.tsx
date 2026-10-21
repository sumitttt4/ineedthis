"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import Button from "./button";
import { SunIcon, MoonIcon } from "./icons";

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button
        variant="secondary"
        size="icon"
        className={className}
        aria-label="Toggle theme"
      >
        <span className="size-4 block" />
      </Button>
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <Button
      variant="secondary"
      size="icon"
      className={className}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? (
        <SunIcon className="size-4 text-warning transition-transform hover:rotate-45" />
      ) : (
        <MoonIcon className="size-4 text-primary transition-transform hover:-rotate-12" />
      )}
    </Button>
  );
}
