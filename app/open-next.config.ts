import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import staticAssetsIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache";

// Every page is prerendered at build time and never revalidated; the only
// dynamic route (/api/video-downloader) is uncached. The read-only static-assets
// cache serves those prerendered entries straight from Workers assets — no R2/KV
// bucket to provision.
export default defineCloudflareConfig({
  incrementalCache: staticAssetsIncrementalCache,
  enableCacheInterception: true,
});
