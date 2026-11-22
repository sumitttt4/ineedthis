import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ToolPageShell from "@/components/tool-page/tool-page-shell";
import {
  allToolSlugs,
  faq,
  howItWorks,
  privacyLine,
  relatedTools,
  seoDescription,
  seoTitle,
  toolBySlug,
  toolSlug,
} from "@/lib/tool-pages";
import { SITE_NAME, siteUrl } from "@/lib/site";

export const dynamicParams = false;

export function generateStaticParams() {
  return allToolSlugs().map((tool) => ({ tool }));
}

export async function generateMetadata({ params }: { params: Promise<{ tool: string }> }): Promise<Metadata> {
  const { tool: slug } = await params;
  const t = toolBySlug(slug);
  if (!t) return {};
  const title = seoTitle(t);
  const description = seoDescription(t);
  return {
    title,
    description,
    alternates: { canonical: `/${slug}` },
    openGraph: { type: "website", siteName: SITE_NAME, title, description, url: `/${slug}` },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function ToolPage({ params }: { params: Promise<{ tool: string }> }) {
  const { tool: slug } = await params;
  const t = toolBySlug(slug);
  if (!t) notFound();

  const steps = howItWorks(t);
  const questions = faq(t);
  const related = relatedTools(t);
  const url = new URL(`/${slug}`, siteUrl()).toString();
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: t.name,
      url,
      description: t.description,
      applicationCategory: "UtilitiesApplication",
      operatingSystem: "Any (web browser)",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: questions.map((x) => ({ "@type": "Question", name: x.q, acceptedAnswer: { "@type": "Answer", text: x.a } })),
    },
  ];

  return (
    <ToolPageShell
      toolId={t.id}
      intro={
        <header className="flex flex-col gap-2">
          <h1 className="text-balance text-[28px] font-semibold tracking-[-0.03em] text-foreground sm:text-[34px]">{t.name}</h1>
          <p className="max-w-2xl text-pretty text-[15px] leading-relaxed text-muted-foreground">{t.description}</p>
          <p className="flex items-center gap-2 text-[13px] text-foreground/80">
            <span className="size-1.5 rounded-full bg-success" aria-hidden="true" />
            {privacyLine(t)}
          </p>
        </header>
      }
    >
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />

      <section aria-labelledby="how" className="flex flex-col gap-3">
        <h2 id="how" className="text-[18px] font-semibold tracking-[-0.02em]">How it works</h2>
        <ol className="grid gap-3 sm:grid-cols-3">
          {steps.map((s, i) => (
            <li key={i} className="flex gap-3 rounded-xl border border-border bg-card p-4">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[12px] font-semibold tabular-nums text-primary">
                {i + 1}
              </span>
              <span className="text-[14px] leading-snug text-foreground">{s}</span>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="faq" className="flex flex-col gap-3">
        <h2 id="faq" className="text-[18px] font-semibold tracking-[-0.02em]">Questions</h2>
        <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
          {questions.map((x) => (
            <details key={x.q} className="group px-4 py-3">
              <summary className="cursor-pointer list-none text-[14px] font-medium text-foreground marker:hidden">
                <span className="flex items-center justify-between gap-3">
                  {x.q}
                  <span aria-hidden="true" className="text-muted-foreground transition-transform duration-200 group-open:rotate-45">+</span>
                </span>
              </summary>
              <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">{x.a}</p>
            </details>
          ))}
        </div>
      </section>

      {related.length > 0 && (
        <nav aria-labelledby="related" className="flex flex-col gap-3">
          <h2 id="related" className="text-[18px] font-semibold tracking-[-0.02em]">Related tools</h2>
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/${toolSlug(r.id)}`}
                  className="flex h-full flex-col rounded-xl border border-border bg-card p-3 transition-colors duration-150 hover:border-primary/40"
                >
                  <span className="text-[14px] font-medium text-foreground">{r.name}</span>
                  <span className="line-clamp-2 text-[12px] text-muted-foreground">{r.description}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </ToolPageShell>
  );
}
