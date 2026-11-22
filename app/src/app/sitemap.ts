import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";
import { allToolSlugs } from "@/lib/tool-pages";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  return [
    { url: base.toString(), changeFrequency: "weekly", priority: 1 },
    ...["about", "privacy", "terms"].map((p) => ({
      url: new URL(`/${p}`, base).toString(),
      changeFrequency: "yearly" as const,
      priority: 0.3,
    })),
    ...allToolSlugs().map((slug) => ({
      url: new URL(`/${slug}`, base).toString(),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
  ];
}
