import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

export const LEGAL_UPDATED = "22 November 2026";

export function LegalPage({ title, intro, children }: { title: string; intro?: string; children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-4">
          <Link href="/" className="flex items-center gap-2.5 font-semibold">
            <Image src="/icon.svg" alt="" width={28} height={28} unoptimized className="size-7 rounded-lg" />
            INeedThis
          </Link>
          <Link href="/" className="text-[13px] text-muted-foreground hover:text-foreground">
            ← All tools
          </Link>
        </div>
      </header>
      <main id="main" className="mx-auto max-w-3xl px-5 py-10 sm:py-14">
        <h1 className="text-[30px] font-semibold tracking-[-0.03em] sm:text-[36px]">{title}</h1>
        <p className="mt-2 text-[13px] text-muted-foreground">Last updated {LEGAL_UPDATED}</p>
        {intro && <p className="mt-5 text-pretty text-[16px] leading-relaxed text-foreground/85">{intro}</p>}
        <div className="legal-prose mt-8">{children}</div>
      </main>
      <LegalFooter />
    </div>
  );
}

export function LegalFooter() {
  return (
    <footer className="border-t border-border">
      <nav aria-label="Legal" className="mx-auto flex max-w-3xl flex-wrap gap-x-5 gap-y-2 px-5 py-6 text-[13px] text-muted-foreground">
        <Link href="/about" className="hover:text-foreground">About</Link>
        <Link href="/privacy" className="hover:text-foreground">Privacy</Link>
        <Link href="/terms" className="hover:text-foreground">Terms</Link>
        <a href="https://github.com/sumitttt4/ineedthis" target="_blank" rel="noopener noreferrer" className="hover:text-foreground">GitHub</a>
      </nav>
    </footer>
  );
}
