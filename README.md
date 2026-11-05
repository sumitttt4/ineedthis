# INeedThis — Local-First File & Media Studio

An ultra-fast, browser-based Swiss Army knife for files, media, and documents (33 tools). Most tools process **entirely on your device** with WebAssembly, Web Workers, and local canvas/decoders.

Built with Next.js, TypeScript, Tailwind CSS, and Geist typography.

---

## Highlights

- **Local-first privacy**: PDF, image, audio/video transform, ZIP, hash, and QR tools never upload your files.
- **True 1-tap execution**: Drop or select files — optimal defaults process and auto-download (including multi-file batches).
- **High-fidelity PDF → Word (DOCX)**: Reconstructs geometry, typography, native Word tables, headings, and page breaks.
- **Universal video downloader**: Paste YouTube, X, TikTok, Instagram, Reddit, or direct MP4 links. **This tool is server-assisted** (resolves via the app API + third-party extractors).
- **Real WebRTC P2P**: Manual SDP offer/answer exchange for browser-to-browser file transfer (STUN only).
- **PWA ready**: Installable on desktop and mobile with a local service worker and offline-friendly WASM/worker assets.

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

### Installation & Run

```bash
git clone https://github.com/sumitttt4/ineedthis.git
cd ineedthis
cd app
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Production Build

```bash
npm run build
npm run start
```

### Quality scripts (from `app/`)

```bash
npm run lint
npm run typecheck
npm run test:engine      # requires `npm run start` for the video API check
npm run test:upload
```

---

## Author & Links

- **Sumit** — [sumitsharma.pro](https://sumitsharma.pro)
- **X / Twitter** — [@sumitthq](https://x.com/sumitthq)
- **Repository** — [github.com/sumitttt4/ineedthis](https://github.com/sumitttt4/ineedthis)
