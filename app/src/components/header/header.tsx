"use client";

import Button from "@/components/_ui/button";
import { ThemeToggle } from "@/components/_ui/theme-toggle";
import {
  MenuIcon,
  SearchIcon,
  ShieldCheckIcon,
} from "@/components/_ui/icons";
import { CATEGORIES, type ToolCategory } from "@/components/tools/tools-registry";

export interface HeaderProps {
  activeCategory: ToolCategory | "all";
  onSelectCategory: (cat: ToolCategory | "all") => void;
  onOpenMobileSidebar: () => void;
  searchQuery: string;
  onSearchQueryChange: (q: string) => void;
  totalToolsCount: number;
}

export default function Header({
  activeCategory,
  onSelectCategory,
  onOpenMobileSidebar,
  searchQuery,
  onSearchQueryChange,
  totalToolsCount,
}: HeaderProps) {
  const currentCategoryObj =
    CATEGORIES.find((c) => c.id === activeCategory) ?? CATEGORIES[0];

  return (
    <header className="shrink-0 border-b border-border bg-card/60 backdrop-blur-md sticky top-0 z-40">
      <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
        {/* Left: Mobile menu + Category title */}
        <div className="flex min-w-0 items-center gap-2.5">
          <Button
            variant="secondary"
            size="icon"
            className="lg:hidden shrink-0"
            aria-label="Open sidebar"
            onClick={onOpenMobileSidebar}
          >
            <MenuIcon className="size-4" />
          </Button>

          <div className="flex items-center gap-2 truncate">
            <h1 className="text-[16px] font-semibold tracking-[-0.02em] text-foreground truncate">
              {currentCategoryObj.name}
            </h1>
          </div>
        </div>

        {/* Right: Search + Privacy Pill + Theme Switcher */}
        <div className="flex items-center gap-2.5">
          {/* Quick Search */}
          <div className="relative hidden md:block w-52 lg:w-64">
            <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
            <input
              id="board-search"
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchQueryChange(e.target.value)}
              placeholder="Search tools... (Press /)"
              className="border-input bg-secondary/80 focus:bg-background text-foreground placeholder:text-muted-foreground h-8 w-full rounded-lg border pl-8 pr-3 text-[13px] outline-none transition-all focus:ring-2 focus:ring-primary/40"
            />
          </div>

          <div className="hidden xl:flex items-center gap-1.5 rounded-full border border-border bg-secondary/60 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
            <ShieldCheckIcon className="size-3.5 text-emerald-500" />
            <span>Zero Uploads</span>
          </div>

          {/* Next-Themes Light / Dark Toggle */}
          <ThemeToggle />
        </div>
      </div>

      {/* Category Tabs Scroll Bar */}
      <div className="flex items-center gap-1 px-4 sm:px-6 overflow-x-auto no-scrollbar border-t border-border/40 py-1.5">
        {CATEGORIES.map((cat) => {
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(cat.id)}
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-1 text-[13px] font-medium transition-colors cursor-pointer select-none ${
                isActive
                  ? "bg-secondary text-foreground font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
              }`}
            >
              <span>{cat.name}</span>
              <span
                className={`text-[10px] tabular-nums px-1 rounded ${
                  isActive
                    ? "bg-primary text-primary-foreground font-bold"
                    : "text-muted-foreground"
                }`}
              >
                {cat.count}
              </span>
            </button>
          );
        })}
      </div>
    </header>
  );
}
