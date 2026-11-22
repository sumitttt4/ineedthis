import { ImageResponse } from "next/og";
import { SITE_DOMAIN, SITE_NAME } from "@/lib/site";

export const alt = `${SITE_NAME} — every file tool you need, none of the uploads`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Inlined (not read from disk) so the route also renders on edge runtimes
// without a filesystem, e.g. Cloudflare Workers. Keep in sync with public/icon.svg.
const ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="none"><rect width="512" height="512" rx="120" fill="#0a0a0c"/><path d="M176 128h120l64 64v192a16 16 0 0 1-16 16H176a16 16 0 0 1-16-16V144a16 16 0 0 1 16-16Z" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6" stroke-width="22" stroke-linejoin="round"/><path d="M292 128v52a12 12 0 0 0 12 12h56" stroke="#3b82f6" stroke-width="22" stroke-linejoin="round"/><path d="M262 236l-44 72h40l-8 56 44-72h-40l8-56Z" fill="#f4f4f5"/></svg>`;

export default function OpengraphImage() {
  const icon = Buffer.from(ICON_SVG).toString("base64");

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
          color: "#f4f4f5",
          background:
            "radial-gradient(70% 90% at 88% 18%, rgba(59,130,246,0.55), transparent 60%), radial-gradient(60% 70% at 70% 110%, rgba(22,63,176,0.6), transparent 70%), #000",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 30, fontWeight: 600 }}>
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <img src={`data:image/svg+xml;base64,${icon}`} width={52} height={52} />
          {SITE_NAME}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ fontSize: 76, fontWeight: 700, letterSpacing: -3, lineHeight: 1.02 }}>
            Every file tool you need.
          </div>
          <div style={{ fontSize: 76, fontWeight: 700, letterSpacing: -3, lineHeight: 1.02, color: "#a1a1aa" }}>
            None of the uploads.
          </div>
        </div>
        <div style={{ display: "flex", gap: 28, fontSize: 26, color: "#a1a1aa" }}>
          <span>PDF</span>
          <span>Images</span>
          <span>Video</span>
          <span>Audio</span>
          <span>ZIP</span>
          <span>QR</span>
          <span style={{ color: "#60a5fa" }}>{SITE_DOMAIN}</span>
        </div>
      </div>
    ),
    size
  );
}
