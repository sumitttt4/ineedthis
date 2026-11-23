import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ToolPageShell from "@/components/tool-page/tool-page-shell";
import CategoryGrid from "@/components/tools/category-grid";
import { CATEGORIES, TOOLS, type ToolDefinition } from "@/components/tools/tools-registry";
import {
  allToolSlugs,
  categorySlug,
  faq,
  howItWorks,
  privacyLine,
  relatedTools,
  seoDescription,
  seoTitle,
  toolBySlug,
  toolSeo,
  toolSlug,
} from "@/lib/tool-pages";
import { CATEGORY_PAGES, type CategorySlug } from "@/lib/seo-content";
import { SITE_NAME, siteUrl } from "@/lib/site";

export const dynamicParams = false;

const isCategory = (slug: string): slug is CategorySlug => slug in CATEGORY_PAGES;
const abs = (path: string) => new URL(path, siteUrl()).toString();

export function generateStaticParams() {
  return [...allToolSlugs(), ...Object.keys(CATEGORY_PAGES)].map((tool) => ({ tool }));
}

export async function generateMetadata({ params }: { params: Promise<{ tool: string }> }): Promise<Metadata> {
  const { tool: slug } = await params;
  if (isCategory(slug)) {
    const c = CATEGORY_PAGES[slug];
    return {
      title: c.title,
      description: c.intro,
      alternates: { canonical: `/${slug}` },
      openGraph: { type: "website", siteName: SITE_NAME, title: c.title, description: c.intro, url: `/${slug}` },
      twitter: { card: "summary_large_image", title: c.title, description: c.intro },
    };
  }
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

function JsonLd({ data }: { data: unknown }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}

const H2 = "text-[18px] font-semibold tracking-[-0.02em]";

export default async function Page({ params }: { params: Promise<{ tool: string }> }) {
  const { tool: slug } = await params;
  if (isCategory(slug)) return <CategoryPage slug={slug} />;
  const t = toolBySlug(slug);
  if (!t) notFound();
  return <ToolPage t={t} slug={slug} />;
}

function ToolPage({ t, slug }: { t: ToolDefinition; slug: string }) {
  const seo = toolSeo(t);
  const steps = howItWorks(t);
  const questions = faq(t);
  const related = relatedTools(t);
  const cat = CATEGORIES.find((c) => c.id === t.category);
  const catSlug = categorySlug(t.category);
  const url = abs(`/${slug}`);

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: seo.h1,
      alternateName: t.name,
      url,
      description: seo.intro,
      applicationCategory: "UtilitiesApplication",
      operatingSystem: "Any (web browser)",
      browserRequirements: "Requires a modern browser with JavaScript and WebAssembly",
      isAccessibleForFree: true,
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      publisher: { "@type": "Organization", name: SITE_NAME, url: abs("/") },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "All tools", item: abs("/") },
        ...(catSlug ? [{ "@type": "ListItem", position: 2, name: cat?.name, item: abs(`/${catSlug}`) }] : []),
        { "@type": "ListItem", position: catSlug ? 3 : 2, name: seo.h1, item: url },
      ],
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
          <h1 className="text-balance text-[28px] font-semibold tracking-[-0.03em] text-foreground sm:text-[34px]">{seo.h1}</h1>
          <p className="max-w-2xl text-pretty text-[15px] leading-relaxed text-muted-foreground">{seo.intro}</p>
          <p className="flex items-center gap-2 text-[13px] text-foreground/80">
            <span className="size-1.5 rounded-full bg-success" aria-hidden="true" />
            {privacyLine(t)}
          </p>
        </header>
      }
    >
      <JsonLd data={jsonLd} />

      <section aria-labelledby="how" className="flex flex-col gap-3">
        <h2 id="how" className={H2}>How it works</h2>
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

      {seo.uses[0] && (
        <section aria-labelledby="uses" className="flex flex-col gap-3">
          <h2 id="uses" className={H2}>What people use it for</h2>
          <ul className="grid gap-2 sm:grid-cols-3">
            {seo.uses.map((u) => (
              <li key={u} className="rounded-xl border border-border bg-card p-4 text-[14px] leading-snug text-foreground">
                {u}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="faq" className="flex flex-col gap-3">
        <h2 id="faq" className={H2}>Questions</h2>
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
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="related" className={H2}>Related tools</h2>
            {catSlug && (
              <Link href={`/${catSlug}`} className="text-[13px] font-medium text-primary hover:underline">
                All {cat?.name}
              </Link>
            )}
          </div>
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/${toolSlug(r.id)}`}
                  className="flex h-full flex-col rounded-xl border border-border bg-card p-3 transition-colors duration-150 hover:border-primary/40"
                >
                  <span className="text-[14px] font-medium text-foreground">{toolSeo(r).h1}</span>
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

function CategoryPage({ slug }: { slug: CategorySlug }) {
  const c = CATEGORY_PAGES[slug];
  const tools = TOOLS.filter((t) => t.category === c.category);
  const url = abs(`/${slug}`);
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: c.h1,
      url,
      description: c.intro,
      mainEntity: {
        "@type": "ItemList",
        numberOfItems: tools.length,
        itemListElement: tools.map((t, i) => ({ "@type": "ListItem", position: i + 1, name: toolSeo(t).h1, url: abs(`/${toolSlug(t.id)}`) })),
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "All tools", item: abs("/") },
        { "@type": "ListItem", position: 2, name: c.h1, item: url },
      ],
    },
  ];

  return (
    <ToolPageShell
      categoryId={c.category}
      intro={
        <header className="flex flex-col gap-2">
          <h1 className="text-balance text-[28px] font-semibold tracking-[-0.03em] text-foreground sm:text-[34px]">{c.h1}</h1>
          <p className="max-w-2xl text-pretty text-[15px] leading-relaxed text-muted-foreground">{c.intro}</p>
          <p className="text-[13px] tabular-nums text-foreground/80">{tools.length} tools · free · no sign-up</p>
        </header>
      }
    >
      <JsonLd data={jsonLd} />
      <CategoryGrid category={c.category} />
    </ToolPageShell>
  );
}
