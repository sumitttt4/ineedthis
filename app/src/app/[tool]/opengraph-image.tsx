import { ImageResponse } from "next/og";
import { allToolSlugs, toolBySlug, toolSeo } from "@/lib/tool-pages";
import { CATEGORY_PAGES, type CategorySlug } from "@/lib/seo-content";
import { SITE_DOMAIN } from "@/lib/site";
import { LOGO_DATA_URI } from "@/lib/logo";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "INeedThis tool";

export function generateStaticParams() {
  return [...allToolSlugs(), ...Object.keys(CATEGORY_PAGES)].map((tool) => ({ tool }));
}

export default async function Image({ params }: { params: Promise<{ tool: string }> }) {
  const { tool } = await params;
  const t = toolBySlug(tool);
  const cat = tool in CATEGORY_PAGES ? CATEGORY_PAGES[tool as CategorySlug] : null;
  const heading = cat ? cat.h1 : t ? toolSeo(t).h1 : "INeedThis";
  const sub = cat ? cat.intro : t ? toolSeo(t).intro : "";
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          color: "#ededed",
          background:
            "radial-gradient(70% 90% at 88% 18%, rgba(79,107,255,0.55), transparent 60%), radial-gradient(60% 70% at 70% 110%, rgba(31,53,184,0.6), transparent 70%), #000",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 28, color: "#a1a1a1" }}>
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <img src={LOGO_DATA_URI} width={48} height={48} />
          INeedThis · free · private
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ fontSize: 80, fontWeight: 700, letterSpacing: -3, lineHeight: 1.02 }}>{heading}</div>
          <div style={{ fontSize: 30, color: "#a1a1a1", lineHeight: 1.3, maxWidth: 980 }}>{sub}</div>
        </div>
        <div style={{ display: "flex", fontSize: 26, color: "#8c9bff" }}>{SITE_DOMAIN}/{tool}</div>
      </div>
    ),
    size
  );
}
