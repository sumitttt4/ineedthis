export const SITE_NAME = "INeedThis";
export const SITE_TAGLINE = "Every file tool you need. None of the uploads.";
export const SITE_DESCRIPTION =
  "33 free file tools that run in your browser: PDF to Word, video compression, HEIC to JPG, EXIF removal, ZIP, QR codes and more. Your files never leave your device.";

/** Set NEXT_PUBLIC_SITE_URL in production so canonical / OG URLs are absolute. */
export function siteUrl(): URL {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "http://localhost:3000");
  return new URL(raw);
}
