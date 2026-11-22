"use client";

import Image from "next/image";
import dynamic from "next/dynamic";
import { useState } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { CATEGORIES, type ToolCategory } from "@/components/tools/tools-registry";
import {
  CameraIcon,
  QrCodeIcon,
  VideoIcon,
  XTwitterIcon,
} from "@/components/_ui/icons";

const MakerMesh = dynamic(() => import("@/components/shaders/maker-mesh"), {
  ssr: false,
  loading: () => null,
});

const PORTFOLIO_URL = "https://sumitsharma.pro";
const X_URL = "https://x.com/sumitthq";

const QUICK_LAUNCH = [
  { id: "universal-video-downloader", label: "Video downloader", icon: VideoIcon },
  { id: "screen-recorder", label: "Screen recorder", icon: CameraIcon },
  { id: "qr-studio", label: "QR code studio", icon: QrCodeIcon },
] as const;

export interface AppSidebarProps {
  activeCategory: ToolCategory | "all";
  onSelectCategory: (cat: ToolCategory | "all") => void;
  onOpenToolModal: (toolId: string) => void;
}

export default function AppSidebar({
  activeCategory,
  onSelectCategory,
  onOpenToolModal,
}: AppSidebarProps) {
  const { isMobile, setOpenMobile } = useSidebar();
  const closeOnMobile = () => {
    if (isMobile) setOpenMobile(false);
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              tooltip="All tools"
              onClick={() => {
                onSelectCategory("all");
                closeOnMobile();
              }}
            >
              <Image
                src="/icon.svg"
                alt=""
                width={32}
                height={32}
                unoptimized
                priority
                className="size-8 shrink-0 rounded-lg"
              />
              <span className="flex min-w-0 flex-col leading-tight">
                <span className="truncate text-[14px] font-semibold text-sidebar-foreground">
                  INeedThis
                </span>
                <span className="truncate text-[12px] text-muted-foreground">
                  Private file tools
                </span>
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Categories</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                return (
                  <SidebarMenuItem key={cat.id}>
                    <SidebarMenuButton
                      isActive={activeCategory === cat.id}
                      aria-current={activeCategory === cat.id ? "page" : undefined}
                      tooltip={cat.name}
                      onClick={() => {
                        onSelectCategory(cat.id);
                        closeOnMobile();
                      }}
                    >
                      <Icon aria-hidden="true" />
                      <span>{cat.name}</span>
                    </SidebarMenuButton>
                    <SidebarMenuBadge>{cat.count}</SidebarMenuBadge>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Quick launch</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {QUICK_LAUNCH.map(({ id, label, icon: Icon }) => (
                <SidebarMenuItem key={id}>
                  <SidebarMenuButton
                    tooltip={label}
                    onClick={() => {
                      onOpenToolModal(id);
                      closeOnMobile();
                    }}
                  >
                    <Icon aria-hidden="true" />
                    <span>{label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        {!isMobile && <MakerCard />}
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}

/** Desktop-only credit: Paper Shaders card when expanded, monogram when collapsed. */
function MakerCard() {
  const [active, setActive] = useState(false);
  const on = () => setActive(true);
  const off = () => setActive(false);

  return (
    <>
      {/* Expanded */}
      <div
        onPointerEnter={on}
        onPointerLeave={off}
        onFocus={on}
        onBlur={off}
        className="group/maker relative isolate overflow-hidden rounded-lg border border-white/10 text-white group-data-[collapsible=icon]:hidden"
      >
        <div className="absolute inset-0 bg-[#1b2fa8]" aria-hidden="true" />
        <MakerMesh active={active} />
        <div className="absolute inset-0 bg-black/25" aria-hidden="true" />

        <div className="relative flex items-center gap-2 py-1.5 pl-3 pr-1.5">
          <p className="min-w-0 flex-1 truncate text-[13px] text-white/75">
            Built by{" "}
            <a
              href={PORTFOLIO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-white underline decoration-white/40 underline-offset-[3px] outline-none transition-colors hover:decoration-white focus-visible:rounded focus-visible:ring-2 focus-visible:ring-white/80"
            >
              Sumit Sharma
            </a>
          </p>
          <a
            href={X_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Sumit on X (@sumitthq)"
            title="@sumitthq"
            className="flex size-7 shrink-0 items-center justify-center rounded-md text-white/85 outline-none transition-[background-color,transform] duration-150 ease-out hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-white/80 active:scale-[0.94]"
          >
            <XTwitterIcon className="size-3.5" aria-hidden="true" />
          </a>
        </div>
      </div>

      {/* Collapsed to icons */}
      <SidebarMenu className="hidden group-data-[collapsible=icon]:flex">
        <SidebarMenuItem>
          <SidebarMenuButton
            tooltip="Built by Sumit Sharma"
            render={<a href={PORTFOLIO_URL} target="_blank" rel="noopener noreferrer" />}
          >
            <span
              aria-hidden="true"
              className="flex size-4 shrink-0 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground"
            >
              S
            </span>
            <span className="group-data-[collapsible=icon]:sr-only">Built by Sumit Sharma</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </>
  );
}
