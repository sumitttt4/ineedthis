import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { SITE_NAME } from "@/lib/site";

export const alt = `${SITE_NAME} — every file tool you need, none of the uploads`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  const icon = await readFile(join(process.cwd(), "public/icon.svg"), "base64");

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
          <span style={{ color: "#60a5fa" }}>Runs in your browser</span>
        </div>
      </div>
    ),
    size
  );
}
