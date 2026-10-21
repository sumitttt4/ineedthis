# INeedThis — 100% Private File & Media Studio

An ultra-fast, client-side Swiss Army knife for files, media, and documents. Everything processes directly in your browser using WebAssembly, Web Workers, and local canvas/decoders with **zero server uploads**.

Built with Next.js, TypeScript, Tailwind CSS, and Geist typography.

---

## Highlights

- **100% Private & Local**: Files never touch an external server for processing.
- **True 1-Tap Execution**: Drop or select files and they process with optimal settings and auto-download immediately.
- **High-Fidelity PDF to Word (DOCX)**: Reconstructs exact PDF document geometry, typography, column layouts, native Word tables (`<w:tbl>`), headings, and page breaks without layout distortion.
- **Universal 1-Tap Video Downloader**: Paste any link from YouTube, X (Twitter), TikTok, Instagram, Reddit, or direct MP4 streams to download in a single tap.
- **PWA & Mobile Ready**: Fully installable Progressive Web App on Desktop (Chrome, Edge, Brave) and Mobile (iOS Safari & Android Chrome) with a dedicated footer install option.
- **Pure Black Modern Dark Mode**: Clean `#000000` background, high contrast, smooth transitions, and unified Geist font throughout.

---

## 32 Included Utilities

### 📄 PDF & Documents
1. **PDF to Word (DOCX)** — Convert PDFs into editable Microsoft Word documents with exact structure, table alignments, fonts, and headings.
2. **Word (DOCX) to PDF** — Convert Word files to clean, paginated PDF documents.
3. **PDF Merge** — Combine multiple PDF documents into a single organized file.
4. **PDF Splitter** — Extract specific page ranges, individual pages, or split by size.
5. **PDF Compressor** — Shrink PDF file size while preserving layout readability.
6. **PDF to Images** — Render every page into high-resolution PNG or JPG images.
7. **Excel / CSV to PDF** — Render spreadsheet data into clean, paginated tables.
8. **Markdown to PDF** — Render GitHub-flavored markdown documents to PDF.
9. **PDF to PowerPoint (PPTX)** — Convert PDF pages into slide decks with selectable text overlay.
10. **PDF Watermark & Numbering** — Stamp diagonal/corner text watermarks and page numbering.
11. **PII & Pattern Redactor** — Auto-scan and black-box redact emails, phone numbers, and SSNs.
12. **PDF Digital Signature** — Place transparent signatures onto any page with custom coordinates.
13. **PDF Password Unlock** — Remove owner passwords and printing restrictions client-side.

### 🎬 Video & Audio Lab
14. **Universal 1-Tap Video Downloader** — Download videos from YouTube, X, TikTok, Instagram, Reddit, or direct MP4 links with zero ads.
15. **Target-MB Video Compressor** — Compress videos down to exact MB limits (e.g. 8MB for Discord, 25MB for Email) via client-side FFmpeg WebAssembly.
16. **Precision Video Trimmer** — Lossless video trimming with timeline preview.
17. **Video to GIF Converter** — Turn video clips into smooth, optimized animated GIFs.
18. **Audio Extractor & Converter** — Extract and convert audio tracks to MP3, WAV, AAC, OGG, or FLAC.
19. **Audio Volume Booster** — Boost low-volume audio recordings with normalization.
20. **Live Screen & Audio Recorder** — Capture desktop, browser tab, and microphone audio directly to MP4/WebM.

### 🖼️ Image Lab
21. **HEIC / HEIF to JPG/PNG** — Decode and convert Apple iPhone HEIC/HEIF photos client-side.
22. **Target-KB Image Compressor** — Shrink photos to an exact maximum KB (e.g. 50KB or 200KB for application portals).
23. **EXIF & GPS Metadata Stripper** — Sanitize photos before sharing by removing GPS coordinates, camera serial, and dates.
24. **Passport Photo Grid Generator** — Generate 35x45mm / 2x2" print sheets for official documents.
25. **Favicon & App Icon Generator** — Generate complete multi-size icon packs (16px to 512px) in a single ZIP.
26. **High-DPI Image Resizer** — Resize images by dimensions or percentages with aspect ratio lock.
27. **Universal Batch Image Converter** — Batch convert images across WebP, PNG, and JPEG.

### 📦 Data, Security & P2P
28. **In-Browser ZIP Archiver & Extractor** — Compress files into ZIP archives or extract them with zero uploads.
29. **Tabular Data Format Converter** — Seamlessly convert between JSON, CSV, and XLSX spreadsheets.
30. **File Checksum & Hash Generator** — Calculate SHA-256, SHA-1, and MD5 integrity hashes instantly.
31. **Vector QR Code Studio** — Generate customizable, high-resolution QR codes in PNG and SVG.
32. **Live Encrypted P2P File Transfer** — Share files directly browser-to-browser via WebRTC with end-to-end encryption.

---

## Getting Started

### Prerequisites
- Node.js 18+ or 20+
- npm, pnpm, or yarn

### Installation & Run

```bash
# Clone the repository
git clone https://github.com/sumitttt4/ineedthis.git
cd ineedthis

# Install dependencies in the app
cd app
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build

```bash
npm run build
npm run start
```

---

## Author & Links

- **Sumit** — [sumitsharma.pro](https://sumitsharma.pro)
- **X / Twitter** — [@sumitthq](https://x.com/sumitthq)
- **Repository** — [github.com/sumitttt4/ineedthis](https://github.com/sumitttt4/ineedthis)
