"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import AppSidebar from "@/components/sidebar/app-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/_ui/theme-toggle";
import ToolModal from "@/components/tools/tool-modal";
import P2PPanel from "@/components/p2p/p2p-panel";
import Toaster from "@/components/_ui/toaster";
import FeatureRequest from "@/components/feedback/feature-request";
import { CATEGORIES, TOOLS, type ToolCategory } from "@/components/tools/tools-registry";
import { categorySlug, toolSlug } from "@/lib/tool-pages";
import { CATEGORY_PAGES, type CategorySlug } from "@/lib/seo-content";

/** Tool page (with the tool runner) or, without toolId, a category landing page. */
export default function ToolPageShell({
  toolId,
  categoryId,
  intro,
  children,
}: {
  toolId?: string;
  categoryId?: ToolCategory;
  intro: ReactNode;
  children: ReactNode;
}) {
  const router = useRouter();
  const tool = toolId ? TOOLS.find((t) => t.id === toolId) : undefined;
  const catId = (tool?.category ?? categoryId)!;
  const category = CATEGORIES.find((c) => c.id === catId);
  const catSlug = categorySlug(catId);
  const catHref = catSlug ? `/${catSlug}` : `/?c=${catId}`;

  return (
    <SidebarProvider className="h-dvh max-w-full overflow-hidden bg-background text-foreground">
      <a href="#main" className="skip-link rounded-lg bg-primary px-3 py-2 text-[13px] font-semibold text-primary-foreground">
        Skip to content
      </a>
      <AppSidebar
        activeCategory={catId}
        onSelectCategory={(c) => {
          const slug = categorySlug(c);
          router.push(c === "all" ? "/" : slug ? `/${slug}` : `/?c=${c}`);
        }}
        onOpenToolModal={(id) => router.push(`/${toolSlug(id)}`)}
      />
      <SidebarInset className="min-w-0 overflow-hidden">
        <header className="sticky top-0 z-40 flex shrink-0 items-center justify-between gap-3 border-b border-border bg-card/60 px-4 py-3 backdrop-blur-md sm:px-6">
          <div className="flex min-w-0 items-center gap-2.5">
            <SidebarTrigger className="-ml-1 shrink-0" />
            <Separator orientation="vertical" className="h-4 self-center" />
            <nav aria-label="Breadcrumb" className="min-w-0">
              <ol className="flex min-w-0 items-center gap-1.5 text-[13px] text-muted-foreground">
                <li>
                  <Link href="/" className="hover:text-foreground">
                    All tools
                  </Link>
                </li>
                <li aria-hidden="true">/</li>
                {tool ? (
                  <>
                    <li className="hidden sm:block">
                      <Link href={catHref} className="hover:text-foreground">
                        {category?.name}
                      </Link>
                    </li>
                    <li aria-hidden="true" className="hidden sm:block">
                      /
                    </li>
                    <li aria-current="page" className="truncate font-medium text-foreground">
                      {tool.name}
                    </li>
                  </>
                ) : (
                  <li aria-current="page" className="truncate font-medium text-foreground">
                    {category?.name}
                  </li>
                )}
              </ol>
            </nav>
          </div>
          <ThemeToggle />
        </header>

        <div id="main" tabIndex={-1} className="min-h-0 flex-1 overflow-y-auto px-4 py-6 outline-none sm:px-6 sm:py-8">
          <div className="mx-auto flex max-w-4xl flex-col gap-8">
            {intro}
            {tool &&
              (tool.id === "p2p-transfer" ? (
                <P2PPanel />
              ) : (
                <ToolModal tool={tool} open inline onClose={() => router.push("/")} />
              ))}
            {children}
            <nav aria-label="Tool categories" className="flex flex-wrap gap-x-4 gap-y-2 border-t border-border pt-6 text-[13px]">
              {(Object.keys(CATEGORY_PAGES) as CategorySlug[]).map((slug) => (
                <Link key={slug} href={`/${slug}`} className="text-muted-foreground hover:text-foreground">
                  {CATEGORY_PAGES[slug].h1.replace(/^Free /, "")}
                </Link>
              ))}
            </nav>
            <footer className="-mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] text-muted-foreground">
              <span>Free to use · files stay on your device</span>
              <FeatureRequest
                defaultTool={tool?.id}
                trigger={(open) => (
                  <button type="button" onClick={open} className="font-medium text-foreground underline-offset-4 hover:underline">
                    Request a feature
                  </button>
                )}
              />
              <nav aria-label="Legal" className="flex gap-3 sm:ml-auto">
                <Link href="/about" className="hover:text-foreground">About</Link>
                <Link href="/privacy" className="hover:text-foreground">Privacy</Link>
                <Link href="/terms" className="hover:text-foreground">Terms</Link>
              </nav>
            </footer>
          </div>
        </div>
      </SidebarInset>
      <Toaster />
    </SidebarProvider>
  );
}
