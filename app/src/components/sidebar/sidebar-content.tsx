"use client";

import Image from "next/image";
import Button from "@/components/_ui/button";
import CountBadge from "@/components/_ui/count-badge";
import { CATEGORIES, type ToolCategory } from "@/components/tools/tools-registry";
import {
  ShieldCheckIcon,
  CpuIcon,
  CameraIcon,
  QrCodeIcon,
  VideoIcon,
} from "@/components/_ui/icons";

export interface SidebarContentProps {
  activeCategory: ToolCategory | "all";
  onSelectCategory: (cat: ToolCategory | "all") => void;
  onOpenToolModal: (toolId: string) => void;
}

export default function SidebarContent({
  activeCategory,
  onSelectCategory,
  onOpenToolModal,
}: SidebarContentProps) {
  return (
    <div className="flex h-full min-h-0 flex-col bg-sidebar text-sidebar-foreground">
      {/* Brand Header */}
      <div className="border-sidebar-border bg-sidebar-accent/50 flex shrink-0 items-center gap-3 border-b p-4">
        <Image src="/icon.svg" alt="" width={32} height={32} unoptimized className="size-8 shrink-0 rounded-[9px]" priority />
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-[14px] font-semibold text-foreground tracking-[-0.01em]">
            INeedThis
          </span>
          <span className="text-[11px] text-muted-foreground truncate">
            Private file tools
          </span>
        </div>
      </div>

      {/* Navigation Sections */}
      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-3">
        <div className="mb-2 px-2.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80">
            Categories
          </span>
        </div>

        <nav className="flex flex-col gap-0.5">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.id;

            return (
              <Button
                key={cat.id}
                variant="nav"
                size="md"
                data-active={isActive}
                onClick={() => onSelectCategory(cat.id)}
                className="justify-between"
              >
                <div className="flex items-center gap-2 truncate">
                  <Icon className="size-4 text-muted-foreground group-data-[active=true]:text-primary transition-colors shrink-0" />
                  <span className="truncate">{cat.name}</span>
                </div>
                <CountBadge>{cat.count}</CountBadge>
              </Button>
            );
          })}
        </nav>

        {/* Quick Launch Utilities */}
        <div className="mt-6 mb-2 px-2.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80">
            Quick launch
          </span>
        </div>

        <div className="flex flex-col gap-1 px-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenToolModal("universal-video-downloader")}
            className="justify-start gap-2 text-muted-foreground hover:text-foreground"
          >
            <VideoIcon className="size-3.5 text-icon" aria-hidden="true" />
            <span>One-Tap Video Downloader</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenToolModal("screen-recorder")}
            className="justify-start gap-2 text-muted-foreground hover:text-foreground"
          >
            <CameraIcon className="size-3.5 text-icon" aria-hidden="true" />
            <span>Screen & Tab Recorder</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenToolModal("qr-studio")}
            className="justify-start gap-2 text-muted-foreground hover:text-foreground"
          >
            <QrCodeIcon className="size-3.5 text-icon" aria-hidden="true" />
            <span>QR Code Studio</span>
          </Button>
        </div>
      </div>

      {/* Security Info Footer */}
      <div className="border-sidebar-border bg-sidebar-accent/30 flex shrink-0 flex-col gap-2 border-t p-3.5 text-[12px]">
        <div className="flex items-center gap-2 text-muted-foreground">
          <ShieldCheckIcon className="size-4 text-emerald-500 shrink-0" />
          <span className="truncate">File tools stay on-device</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <CpuIcon className="size-4 text-primary shrink-0" aria-hidden="true" />
          <span className="truncate">Runs directly on your device</span>
        </div>
      </div>
    </div>
  );
}
