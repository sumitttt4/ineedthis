"use client";

import { useState, useMemo, useEffect } from "react";
import Sidebar from "@/components/sidebar/sidebar";
import Header from "@/components/header/header";
import GlobalDropzone from "@/components/dropzone/global-dropzone";
import ToolCard from "@/components/tools/tool-card";
import ToolModal from "@/components/tools/tool-modal";
import P2PPanel from "@/components/p2p/p2p-panel";
import Toaster, { toast } from "@/components/_ui/toaster";
import Button from "@/components/_ui/button";
import {
  TOOLS,
  type ToolCategory,
  type ToolDefinition,
} from "@/components/tools/tools-registry";
import {
  GridIcon,
  SparklesIcon,
  CpuIcon,
  ShieldCheckIcon,
  XTwitterIcon,
} from "@/components/_ui/icons";
import PwaInstallButton from "@/components/_ui/pwa-install-button";

export default function Home() {
  const [activeCategory, setActiveCategory] = useState<ToolCategory | "all">("all");
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTool, setSelectedTool] = useState<ToolDefinition | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [initialFiles, setInitialFiles] = useState<File[]>([]);

  // Keyboard shortcut for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === "/" &&
        !["INPUT", "TEXTAREA"].includes((e.target as HTMLElement).tagName)
      ) {
        e.preventDefault();
        document.getElementById("board-search")?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const filteredTools = useMemo(() => {
    return TOOLS.filter((tool) => {
      const matchesCategory =
        activeCategory === "all" || tool.category === activeCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        tool.name.toLowerCase().includes(q) ||
        tool.description.toLowerCase().includes(q) ||
        tool.formats.some((f) => f.toLowerCase().includes(q));
      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, searchQuery]);

  const handleOpenTool = (tool: ToolDefinition, files?: File[]) => {
    setSelectedTool(tool);
    setInitialFiles(files ?? []);
    setModalOpen(true);
  };

  const handleOpenToolById = (toolId: string) => {
    const found = TOOLS.find((t) => t.id === toolId);
    if (found) {
      handleOpenTool(found);
    }
  };

  return (
    <div className="flex h-dvh max-w-full overflow-hidden bg-background text-foreground">
      {/* Resizable Sidebar */}
      <Sidebar
        activeCategory={activeCategory}
        onSelectCategory={setActiveCategory}
        onOpenToolModal={handleOpenToolById}
        mobileOpen={mobileSidebarOpen}
        onMobileOpenChange={setMobileSidebarOpen}
      />

      {/* Main Studio Work Area */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header
          activeCategory={activeCategory}
          onSelectCategory={setActiveCategory}
          onOpenMobileSidebar={() => setMobileSidebarOpen(true)}
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          totalToolsCount={TOOLS.length}
        />

        <main className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6 sm:py-8">
          <div className="mx-auto max-w-7xl flex flex-col gap-8">
            {activeCategory === "p2p" ? (
              <P2PPanel />
            ) : (
              <>
                {/* Global File Dropzone */}
                <GlobalDropzone
                  onSelectToolWithFile={(tool, file) =>
                    handleOpenTool(tool, [file])
                  }
                />

                {/* Toolbar Filter Info */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-[14px] font-semibold text-foreground">
                      Available Utilities
                    </span>
                    <span className="bg-secondary text-muted-foreground border border-border rounded-full px-2 py-0.5 text-[11px] tabular-nums font-semibold">
                      {filteredTools.length} {filteredTools.length === 1 ? "tool" : "tools"}
                    </span>
                    {searchQuery && (
                      <span className="bg-secondary text-muted-foreground border border-border rounded-full px-2.5 py-0.5 text-[11px] font-medium">
                        Filtered by &quot;{searchQuery}&quot;
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <ShieldCheckIcon className="size-3.5 text-emerald-500" />
                      100% Private
                    </span>
                    <span className="opacity-40">•</span>
                    <span>Zero Uploads</span>
                  </div>
                </div>

                {/* Tools Grid */}
                {filteredTools.length > 0 ? (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {filteredTools.map((tool) => (
                      <ToolCard
                        key={tool.id}
                        tool={tool}
                        onClick={() => handleOpenTool(tool)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="border-border bg-card/40 rounded-2xl border p-12 text-center flex flex-col items-center justify-center gap-3">
                    <p className="text-[15px] font-medium text-foreground">
                      No utilities found matching &quot;{searchQuery}&quot;
                    </p>
                    <p className="text-[13px] text-muted-foreground">
                      Try searching for PDF, HEIC, GIF, Video, EXIF, or Checksum.
                    </p>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setSearchQuery("")}
                    >
                      Clear Search Filter
                    </Button>
                  </div>
                )}

                {/* Studio Footer */}
                <footer className="mt-8 border-t border-border/80 pt-6 pb-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[13px] text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <ShieldCheckIcon className="size-4 text-emerald-500 shrink-0" />
                    <span>Files are processed directly in your browser. Nothing is ever uploaded.</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <PwaInstallButton />

                    <span className="text-border" aria-hidden="true">•</span>

                    <span className="flex items-center gap-1.5">
                      Made by{" "}
                      <a
                        href="https://sumitsharma.pro"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-foreground underline-offset-4 hover:underline hover:text-primary transition-colors"
                      >
                        Sumit
                      </a>
                    </span>

                    <span className="text-border" aria-hidden="true">•</span>

                    <a
                      href="https://x.com/sumitthq"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 font-medium text-foreground hover:text-primary transition-colors group"
                    >
                      <XTwitterIcon className="size-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                      <span>@sumitthq</span>
                    </a>
                  </div>
                </footer>
              </>
            )}
          </div>
        </main>
      </div>

      {/* Execution Dialog */}
      <ToolModal
        tool={selectedTool}
        initialFiles={initialFiles}
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedTool(null);
          setInitialFiles([]);
        }}
      />

      {/* Toaster Popups */}
      <Toaster />
    </div>
  );
}
