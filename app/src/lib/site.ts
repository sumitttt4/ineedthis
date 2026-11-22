export const SITE_NAME = "INeedThis";
export const SITE_DOMAIN = "ineedthis.site";
export const SITE_URL = `https://${SITE_DOMAIN}`;
export const SITE_TAGLINE = "Every file tool you need. None of the uploads.";
export const SITE_DESCRIPTION =
  "56 free tools that run in your browser: PDF to Word, compress video, HEIC to JPG, AI background remover, text to image, JSON formatter and more. Your files never leave your device.";

/**
 * Canonical origin for metadata, OG and sitemap URLs.
 * Production defaults to https://ineedthis.site; override with NEXT_PUBLIC_SITE_URL
 * (e.g. for preview deployments). Dev falls back to localhost.
 */
export function siteUrl(): URL {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.NODE_ENV === "production" ? SITE_URL : "http://localhost:3000");
  return new URL(raw);
}
