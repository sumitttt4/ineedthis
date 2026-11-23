/**
 * Post-build step for Cloudflare: drop the self-hosted ffmpeg core (the
 * Cloudflare build loads a version-pinned copy from jsDelivr instead) and
 * fail loudly if any static asset is over Workers' 25 MiB per-file limit.
 */
import fs from "node:fs";
import path from "node:path";

const assets = path.resolve(".open-next/assets");
if (!fs.existsSync(assets)) {
  console.error("[cf-check-assets] .open-next/assets not found — run the OpenNext build first.");
  process.exit(1);
}

// Drop only the large core; the small unbundled class worker (ffmpeg/class/*)
// must stay same-origin.
for (const f of ["ffmpeg-core.js", "ffmpeg-core.wasm"]) {
  fs.rmSync(path.join(assets, "ffmpeg", f), { force: true });
}

// onnxruntime-web's wasm binaries get emitted by webpack, but transformers.js
// always loads them from jsDelivr at runtime (env.backends.onnx.wasm.wasmPaths),
// and the asyncify build is over the 25 MiB limit. Drop the unused copies.
const media = path.join(assets, "_next/static/media");
if (fs.existsSync(media)) {
  for (const f of fs.readdirSync(media)) {
    if (/^ort-wasm.*\.wasm$/.test(f)) fs.rmSync(path.join(media, f), { force: true });
  }
}

const LIMIT = 25 * 1024 * 1024;
const tooBig = [];
let count = 0;
(function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p);
    else {
      count++;
      const { size } = fs.statSync(p);
      if (size > LIMIT) tooBig.push(`${path.relative(assets, p)} (${(size / 1048576).toFixed(1)} MiB)`);
    }
  }
})(assets);

if (tooBig.length) {
  console.error(`[cf-check-assets] Assets over 25 MiB:\n  ${tooBig.join("\n  ")}`);
  process.exit(1);
}
console.log(`[cf-check-assets] ${count} assets OK (all under 25 MiB, ffmpeg and ONNX runtime served from CDN).`);
