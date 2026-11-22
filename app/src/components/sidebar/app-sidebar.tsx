"use client";

import Image from "next/image";
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
  ShieldCheckIcon,
  VideoIcon,
} from "@/components/_ui/icons";

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
        <div className="flex items-start gap-2.5 rounded-lg border border-sidebar-border bg-card p-3 text-[12px] leading-snug text-muted-foreground group-data-[collapsible=icon]:hidden">
          <ShieldCheckIcon className="mt-px size-4 shrink-0 text-success" aria-hidden="true" />
          <span>
            <span className="font-medium text-sidebar-foreground">Files stay on your device.</span>{" "}
            Only the video downloader uses a server.
          </span>
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
