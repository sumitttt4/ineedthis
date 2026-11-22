import type { NextConfig } from "next";

import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function buildId(): string {
  const ciSha = process.env.WORKERS_CI_COMMIT_SHA || process.env.GITHUB_SHA;
  if (ciSha) return ciSha.slice(0, 12);
  try {
    return execSync("git rev-parse --short=12 HEAD", { stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
  } catch {
    return Date.now().toString(36);
  }
}

/**
 * Where ffmpeg.wasm is loaded from. Self-hosted (/ffmpeg) everywhere except
 * Cloudflare (FFMPEG_FROM_CDN=1), whose 25 MiB per-asset cap is smaller than the
 * 32 MB core. The CDN URL is pinned to the exact installed @ffmpeg/core version.
 */
function ffmpegBaseUrl(): string {
  if (process.env.FFMPEG_FROM_CDN !== "1") return "/ffmpeg";
  const { version } = JSON.parse(
    readFileSync(join(process.cwd(), "node_modules/@ffmpeg/core/package.json"), "utf8")
  ) as { version: string };
  return `https://cdn.jsdelivr.net/npm/@ffmpeg/core@${version}/dist/esm`;
}

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), geolocation=(), microphone=(self), display-capture=(self)" },
];

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_BUILD_ID: buildId(),
    NEXT_PUBLIC_FFMPEG_BASE_URL: ffmpegBaseUrl(),
  },
  poweredByHeader: false,
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.ineedthis.site" }],
        destination: "https://ineedthis.site/:path*",
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
      {
        source: "/ffmpeg/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ];
  },
  serverExternalPackages: ["libheif-js"],
  webpack: (config, { isServer, webpack }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        https: false,
        http: false,
        os: false,
        stream: false,
        crypto: false,
      };
      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(/^node:/, (resource: any) => {
          resource.request = resource.request.replace(/^node:/, "");
        })
      );
    }
    return config;
  },
};

export default nextConfig;
