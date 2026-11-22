# INeedThis

**Every file tool you need. None of the uploads.**

An ultra-fast, browser-based Swiss Army knife for files, media, and documents (33 tools). Most tools process **entirely on your device** with WebAssembly, Web Workers, and local canvas/decoders.

Built with Next.js, TypeScript, Tailwind CSS, Geist, and [Paper Shaders](https://shaders.paper.design) for the hero.

---

## Highlights

- **Local-first privacy**: PDF, image, audio/video transform, ZIP, hash, and QR tools never upload your files.
- **True 1-tap execution**: Drop or select files — optimal defaults process and auto-download (including multi-file batches).
- **High-fidelity PDF → Word (DOCX)**: Reconstructs geometry, typography, native Word tables, headings, and page breaks.
- **Universal video downloader**: Paste YouTube, X, TikTok, Instagram, Reddit, or direct MP4 links. **This tool is server-assisted** (resolves via the app API + third-party extractors).
- **Real WebRTC P2P**: Manual SDP offer/answer exchange for browser-to-browser transfer. STUN by default; add a TURN relay via env for strict NATs.
- **PWA ready**: Installable on desktop and mobile. After a tool has been used once, its WASM / worker runtime is cached and works offline.

---

## 33 Included Utilities

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
11. PII & Pattern Redactor
12. PDF Digital Signature
13. PDF Password Unlock

### Video & Audio Lab
14. Universal Video Downloader *(server-assisted)*
15. Convert to MP4 (MOV / WEBM / MKV → MP4)
16. Target-MB Video Compressor
17. Precision Video Trimmer
18. Video to GIF Converter
19. Audio Extractor & Converter
20. Audio Volume Booster
21. Live Screen & Audio Recorder

### Image Lab
22. HEIC / HEIF to JPG/PNG
23. Target-KB Image Compressor
24. EXIF & GPS Metadata Stripper
25. Passport Photo Grid Generator
26. Favicon & App Icon Generator
27. High-DPI Image Resizer
28. Universal Batch Image Converter

### Data, Security & P2P
29. In-Browser ZIP Archiver & Extractor
30. Tabular Data Format Converter
31. File Checksum & Hash Generator
32. Vector QR Code Studio (Text / Wi‑Fi / UPI / vCard)
33. Live Encrypted P2P File Transfer

---

## Getting Started

### Prerequisites
- Node.js 20+
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
| `NEXT_PUBLIC_SITE_URL` | In production | Absolute URL for canonical, Open Graph and sitemap links |
| `NEXT_PUBLIC_TURN_URL` / `_USERNAME` / `_CREDENTIAL` | No | TURN relay for P2P transfer behind symmetric NATs |

### Production

```bash
npm run build
npm run start
```

Deploys as a standard Next.js app (Vercel, Node server, or container). The only server route is `/api/video-downloader`.

### Quality checks (from `app/`)

```bash
npm run lint
npm run typecheck
npm run test:accuracy   # every registry tool is wired
npm run test:upload     # PDF→DOCX→PDF and JSON→CSV/XLSX round trips
npm run test:engine     # engines + API; needs `npm run start` running
```

CI runs all of the above plus `npm audit --audit-level=high` on every push and PR.

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
- **Repository** — [github.com/sumitttt4/ineedthis](https://github.com/sumitttt4/ineedthis)

Licensed under the [MIT License](LICENSE).
