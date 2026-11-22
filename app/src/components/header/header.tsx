"use client";

import { ThemeToggle } from "@/components/_ui/theme-toggle";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  SearchIcon,
  ShieldCheckIcon,
} from "@/components/_ui/icons";
import { CATEGORIES, type ToolCategory } from "@/components/tools/tools-registry";

export interface HeaderProps {
  activeCategory: ToolCategory | "all";
  onSelectCategory: (cat: ToolCategory | "all") => void;
  searchQuery: string;
  onSearchQueryChange: (q: string) => void;
  totalToolsCount: number;
}

export default function Header({
  activeCategory,
  onSelectCategory,
  searchQuery,
  onSearchQueryChange,
}: HeaderProps) {
  const currentCategoryObj =
    CATEGORIES.find((c) => c.id === activeCategory) ?? CATEGORIES[0];

  return (
    <header className="shrink-0 border-b border-border bg-card/60 backdrop-blur-md sticky top-0 z-40">
      <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
        {/* Left: sidebar toggle + current category */}
        <div className="flex min-w-0 items-center gap-2.5">
          <SidebarTrigger className="-ml-1 shrink-0" />
          <Separator orientation="vertical" className="h-4 self-center" />

          <div className="flex items-center gap-2 truncate">
            <span className="text-[16px] font-semibold tracking-[-0.02em] text-foreground truncate">
              {currentCategoryObj.name}
            </span>
          </div>
        </div>

        {/* Right: Search + Privacy Pill + Theme Switcher */}
        <div className="flex items-center gap-2.5">
          {/* Quick Search */}
          <div className="relative hidden md:block w-52 lg:w-64">
            <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
            <label htmlFor="board-search" className="sr-only">
              Search tools
            </label>
            <input
              id="board-search"
              data-tool-search
              type="search"
              value={searchQuery}
              onChange={(e) => onSearchQueryChange(e.target.value)}
              placeholder="Search tools (press /)"
              className="border-input bg-secondary/80 focus:bg-background text-foreground placeholder:text-muted-foreground h-8 w-full rounded-lg border pl-8 pr-3 text-[13px] outline-none transition-[background-color,box-shadow] focus:ring-2 focus:ring-primary/40"
            />
          </div>

          <div className="hidden xl:flex items-center gap-1.5 rounded-full border border-border bg-secondary/60 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
            <ShieldCheckIcon className="size-3.5 text-emerald-500" />
            <span>Local-first</span>
          </div>

          {/* Next-Themes Light / Dark Toggle */}
          <ThemeToggle />
        </div>
      </div>

      {/* Category Tabs Scroll Bar */}
      <div className="flex items-center gap-1 px-4 sm:px-6 overflow-x-auto no-scrollbar border-t border-border/40 py-1.5 md:hidden">
        {CATEGORIES.map((cat) => {
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              aria-pressed={isActive}
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
