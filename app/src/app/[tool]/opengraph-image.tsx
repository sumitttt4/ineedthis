import { ImageResponse } from "next/og";
import { allToolSlugs, toolBySlug } from "@/lib/tool-pages";
import { SITE_DOMAIN } from "@/lib/site";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "INeedThis tool";

export function generateStaticParams() {
  return allToolSlugs().map((tool) => ({ tool }));
}

export default async function Image({ params }: { params: Promise<{ tool: string }> }) {
  const { tool } = await params;
  const t = toolBySlug(tool);
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
        <div style={{ display: "flex", fontSize: 28, color: "#a1a1a1" }}>INeedThis · free · private</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ fontSize: 80, fontWeight: 700, letterSpacing: -3, lineHeight: 1.02 }}>{t?.name ?? "INeedThis"}</div>
          <div style={{ fontSize: 30, color: "#a1a1a1", lineHeight: 1.3, maxWidth: 980 }}>{t?.description ?? ""}</div>
        </div>
        <div style={{ display: "flex", fontSize: 26, color: "#8c9bff" }}>{SITE_DOMAIN}/{tool}</div>
      </div>
    ),
    size
  );
}
