"use client";

import { Sheet } from "@/components/_ui/sheet";
import SidebarContent, { type SidebarContentProps } from "./sidebar-content";
import SidebarResizer from "./sidebar-resizer";

export interface SidebarProps extends SidebarContentProps {
  mobileOpen: boolean;
  onMobileOpenChange: (open: boolean) => void;
}

export default function Sidebar({
  mobileOpen,
  onMobileOpenChange,
  ...contentProps
}: SidebarProps) {
  return (
    <>
      {/* Desktop Sticky Resizable Sidebar */}
      <aside className="relative hidden w-[var(--sidebar-width)] shrink-0 border-r border-sidebar-border bg-sidebar lg:flex lg:flex-col">
        <SidebarContent {...contentProps} />
        <SidebarResizer />
      </aside>

      {/* Mobile Drawer Sheet */}
      <Sheet
        open={mobileOpen}
        onOpenChange={onMobileOpenChange}
        title="Navigation"
      >
        <SidebarContent
          {...contentProps}
          onSelectCategory={(cat) => {
            contentProps.onSelectCategory(cat);
            onMobileOpenChange(false);
          }}
          onOpenToolModal={(id) => {
            contentProps.onOpenToolModal(id);
            onMobileOpenChange(false);
          }}
        />
      </Sheet>
    </>
  );
}
