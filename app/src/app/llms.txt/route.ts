import { TOOLS, CATEGORIES } from "@/components/tools/tools-registry";
import { SITE_DESCRIPTION, SITE_NAME, siteUrl } from "@/lib/site";
import { toolSeo, toolSlug, categorySlug } from "@/lib/tool-pages";

// /llms.txt: a plain-text map of the site for AI assistants and answer engines (llmstxt.org).
export const dynamic = "force-static";

export function GET() {
  const at = (p: string) => new URL(p, siteUrl()).toString();
  const sections = CATEGORIES.filter((c) => c.id !== "all").map((c) => {
    const tools = TOOLS.filter((t) => t.category === c.id);
    const slug = categorySlug(c.id);
    const head = slug ? `## [${c.name}](${at(`/${slug}`)})` : `## ${c.name}`;
    return [head, "", ...tools.map((t) => `- [${toolSeo(t).h1}](${at(`/${toolSlug(t.id)}`)}): ${toolSeo(t).intro}`)].join("\n");
  });
  const body = [
    `# ${SITE_NAME}`,
    "",
    `> ${SITE_DESCRIPTION}`,
    "",
    "Every tool is free, needs no account and adds no watermark. Files are processed in the browser with WebAssembly and on-device AI, so they are not uploaded. The only exceptions are the video downloader (the link is resolved by our server) and peer-to-peer transfer (files go directly between two browsers).",
    "",
    ...sections.flatMap((s) => [s, ""]),
    "## About",
    "",
    `- [About ${SITE_NAME}](${at("/about")})`,
    `- [Privacy policy](${at("/privacy")})`,
    "",
  ].join("\n");
  return new Response(body, { headers: { "content-type": "text/plain; charset=utf-8" } });
}
