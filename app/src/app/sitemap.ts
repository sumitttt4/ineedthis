import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";
import { allToolSlugs } from "@/lib/tool-pages";
import { CATEGORY_PAGES } from "@/lib/seo-content";

// Pages change when the site is deployed, so the build time is an honest lastModified.
const BUILT = new Date();

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  const at = (path: string) => new URL(path, base).toString();
  return [
    { url: base.toString(), lastModified: BUILT, changeFrequency: "weekly", priority: 1 },
    ...Object.keys(CATEGORY_PAGES).map((slug) => ({
      url: at(`/${slug}`),
      lastModified: BUILT,
      changeFrequency: "weekly" as const,
      priority: 0.9,
    })),
    ...allToolSlugs().map((slug) => ({
      url: at(`/${slug}`),
      lastModified: BUILT,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    ...["about", "privacy", "terms"].map((p) => ({
      url: at(`/${p}`),
      lastModified: BUILT,
      changeFrequency: "yearly" as const,
      priority: 0.3,
    })),
  ];
}
