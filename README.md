# INeedThis

**Every file tool you need. None of the uploads.**

🌐 **[ineedthis.site](https://ineedthis.site)**

An ultra-fast, browser-based Swiss Army knife for files, media, and documents (58 tools). Most tools process **entirely on your device** with WebAssembly, Web Workers, and local canvas/decoders.

Built with Next.js, TypeScript, Tailwind CSS, Geist, and [Paper Shaders](https://shaders.paper.design) for the hero.

---

## Highlights

- **Local-first privacy**: PDF, image, audio/video transform, ZIP, hash, and QR tools never upload your files.
- **True 1-tap execution**: Drop or select files — optimal defaults process and auto-download (including multi-file batches).
- **High-fidelity PDF → Word (DOCX)**: Reconstructs geometry, typography, native Word tables, headings, and page breaks.
- **Universal video downloader**: Paste YouTube, X, TikTok, Instagram, Reddit, or direct MP4 links. **This tool is server-assisted** (resolves via the app API + third-party extractors).
- **Every tool has its own page** (`/pdf-to-word`, `/compress-pdf`, …) with its own title, FAQ and share image — 58 statically generated pages in the sitemap.
- **On-device AI** (transformers.js, models download once and are cached): background removal (MODNet, Apache-2.0) and speech-to-text / subtitles in 99 languages (Whisper tiny/base, MIT) running in a Web Worker. Files never leave the device.
- **Real WebRTC P2P**: Manual SDP offer/answer exchange for browser-to-browser transfer. STUN by default; add a TURN relay via env for strict NATs.
- **PWA ready**: Installable on desktop and mobile. After a tool has been used once, its WASM / worker runtime is cached and works offline.

---

## 58 Included Utilities

### PDF & Documents
1. PDF to Word (DOCX)
2. Word (DOCX) to PDF
3. PDF Merge
4. PDF Splitter
5. PDF Compressor
6. PDF to Images
7. Excel / CSV to PDF
8. Markdown to PDF
9. PDF to PowerPoint (PPTX)
10. PDF Watermark & Numbering
11. PII & Pattern Redactor (true redaction)
12. PDF Digital Signature
13. PDF Password Unlock & Protect (AES-256)
14. Images to PDF
15. Organize PDF Pages (rotate, reorder, delete)
16. Flatten PDF Forms
17. PDF to Text

### Video & Audio Lab
18. Universal Video Downloader *(server-assisted)*
19. Convert to MP4 (MOV / WEBM / MKV → MP4)
20. Target-MB Video Compressor
21. Precision Video Trimmer
22. Video to GIF Converter
23. Audio Extractor & Converter
24. Audio Volume Booster
25. Live Screen & Audio Recorder
26. Mute Video
27. Audio Trimmer & Ringtone Maker (MP3 / M4R)
28. Change Video Speed (0.25×–4×)
29. Rotate & Flip Video
30. Voice Recorder
31. Transcribe Audio to Text (Whisper AI, on device)
32. Subtitle Generator — SRT / VTT, translate to English (Whisper AI, on device)

### Image Lab
33. HEIC / HEIF to JPG/PNG
34. Target-KB Image Compressor
35. EXIF & GPS Metadata Stripper
36. Passport Photo Grid Generator
37. Favicon & App Icon Generator
38. High-DPI Image Resizer
39. Universal Batch Image Converter
40. Crop & Rotate Image
41. Add Text / Watermark to Image
42. Color Palette from Image
43. Screenshot Beautifier
44. Text to Image (Paper Shaders backgrounds, Hindi fonts)
45. Remove Background (on-device AI)

### Data, Security & P2P
46. In-Browser ZIP Archiver & Extractor
47. Tabular Data Format Converter (JSON ↔ CSV ↔ XLSX)
48. File Checksum & Hash Generator
49. Vector QR Code Studio (Text / Wi‑Fi / UPI / vCard)
50. Live Encrypted P2P File Transfer

### Text & Developer
51. Word & Character Counter
52. Text Case Converter
53. JSON Formatter & Validator
54. Base64 Encode & Decode
55. URL Encode & Decode
56. Password & UUID Generator
57. Unix Timestamp Converter
58. Text Diff Checker

---

## License

Proprietary — © 2026 Sumit Sharma. All rights reserved. The website is free to use; the source code is not licensed for reuse. See [LICENSE](LICENSE). Third-party components keep their own licenses (listed at https://ineedthis.site/about).

### Roadmap

- **Next:** noise remover (on device), "any object" background removal behind WebGPU, more presets.
- **Later (undecided):** an optional Pro tier for heavy jobs. The current tools stay free.

## Getting Started

### Prerequisites
- Node.js 22.13+ (required by pdfjs-dist 6; see `.nvmrc`)
- npm

### Run locally

```bash
git clone https://github.com/sumitttt4/ineedthis.git
cd ineedthis/app
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment

Copy `app/.env.example` to `app/.env.local`.

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | No | Canonical URL for metadata, Open Graph and sitemap. Defaults to `https://ineedthis.site` in production; set it for preview/staging deploys |
| `NEXT_PUBLIC_TURN_URL` / `_USERNAME` / `_CREDENTIAL` | No | TURN relay for P2P transfer behind symmetric NATs |

### Production

```bash
npm run build
npm run start
```

Deploys as a standard Next.js app (Node server or container). The only server route is `/api/video-downloader`.

### Deploy to Cloudflare Workers (ineedthis.site)

Production runs on Cloudflare Workers via [OpenNext](https://opennext.js.org/cloudflare). Config lives in `app/wrangler.jsonc` and `app/open-next.config.ts`.

```bash
cd app
npx wrangler login          # once
npm run cf:preview          # build + run locally in workerd at http://localhost:8787
npm run cf:deploy           # build + deploy to Cloudflare
```

**Deploying from Git (Cloudflare Workers Builds)**

The repo root works with the dashboard's default settings (root directory `/`, build command `npm run build`, deploy command `npx wrangler deploy`). `scripts/cloudflare-build.mjs` installs `app/` dependencies, runs `cf:build`, and writes a root `wrangler.json` (generated, git-ignored) from `app/wrangler.jsonc` with paths pointing into `app/`. The Worker must be named `ineedthis` and the `ineedthis.site` zone must be on the same account; it attaches via zone routes on `ineedthis.site/*` and `www.ineedthis.site/*`, which need proxied (orange-cloud) DNS records for both hosts.

**How the Workers build differs**

- `ffmpeg-core.wasm` is 32 MB, over Workers' 25 MiB per-asset limit, so the Cloudflare build (`FFMPEG_FROM_CDN=1`) loads the core from jsDelivr pinned to the exact installed `@ffmpeg/core` version. The ONNX Runtime wasm that webpack emits for transformers.js is dropped too: transformers.js always loads it from jsDelivr. Only engine code is downloaded; user files still never leave the device. `scripts/cf-check-assets.mjs` fails the build if any asset exceeds 25 MiB.
- Pages are prerendered and served from Workers static assets (read-only incremental cache), so no R2 / KV bindings are needed.
- `global_fetch_strictly_public` makes Cloudflare refuse outbound fetches to private or internal addresses, which backs up the downloader's SSRF guard.
- The in-app rate limit is per Worker isolate. For a hard global limit, add a Cloudflare WAF rate-limiting rule on `/api/video-downloader`.

### Quality checks (from `app/`)

```bash
npm run lint
npm run typecheck
npm run test:accuracy   # every registry tool is wired
npm run test:upload     # PDF→DOCX→PDF and JSON→CSV/XLSX round trips
npm run test:engine     # engines + API; needs `npm run start` running
                        # (TEST_BASE_URL=http://localhost:8787 to test the Workers preview)
```

CI runs all of the above plus `npm audit --audit-level=high`, and a Cloudflare Workers build, on every push and PR.

---

## Limits & browser support

- Works in current Chrome, Edge, Firefox and Safari (desktop and mobile). Video tools use the single-threaded ffmpeg.wasm build, so no cross-origin isolation headers are required.
- Per-file ceilings (to avoid tab crashes): **video/audio 1 GB**, **PDF 300 MB**, **images 150 MB**, **data / hash / ZIP 1 GB**.
- Screen recording requires `getDisplayMedia` (desktop browsers).

## Security

- `/api/video-downloader` validates every target (http/https only, default ports, DNS-resolved public IPs only, redirects re-validated) to block SSRF, is rate limited per IP, streams only audio/video content types, and never logs URLs.
- Security headers (`X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, `Permissions-Policy`) are set for every route.
- Found an issue? Please open a private security advisory on GitHub.

---

## Author & links

- **Sumit** — [sumitsharma.pro](https://sumitsharma.pro)
- **X / Twitter** — [@sumitthq](https://x.com/sumitthq)
- **Website** — [ineedthis.site](https://ineedthis.site)

© 2026 Sumit Sharma. All rights reserved.
