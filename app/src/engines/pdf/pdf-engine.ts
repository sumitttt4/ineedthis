// ============================================================================
// PDF Engine — Main-thread service functions
// All heavy work delegates to pdf-lib and pdfjs-dist directly
// (no separate worker needed for most PDF ops since pdf-lib is fast & sync)
// ============================================================================

import { PDFDocument, degrees, rgb, StandardFonts } from "pdf-lib";
import type {
  TaskResult,
  BatchTaskResult,
  PdfSplitOptions,
  PdfOrganizeOptions,
  PdfCompressOptions,
  PdfWatermarkOptions,
  PdfSignOptions,
  PdfPageNumberOptions,
  PdfRedactOptions,
  PdfSecurityOptions,
} from "@/lib/types";
import { loadPdfJs } from "@/lib/pdfjs";

// ============================================================================
// Helpers
// ============================================================================

async function loadPdf(data: ArrayBuffer | Uint8Array): Promise<PDFDocument> {
  return PDFDocument.load(data, { ignoreEncryption: true });
}

function makeResult(
  pdfBytes: Uint8Array,
  filename: string,
  startTime: number
): TaskResult {
  return {
    data: new Blob([pdfBytes as unknown as BlobPart], { type: "application/pdf" }),
    filename,
    mimeType: "application/pdf",
    durationMs: performance.now() - startTime,
    sizeBytes: pdfBytes.byteLength,
  };
}

// ============================================================================
// 1. PDF Merge
// ============================================================================

export async function mergePdfs(
  buffers: ArrayBuffer[],
  filenames: string[]
): Promise<TaskResult> {
  const t = performance.now();
  const merged = await PDFDocument.create();

  for (const buf of buffers) {
    const src = await loadPdf(buf);
    const pages = await merged.copyPages(src, src.getPageIndices());
    for (const page of pages) {
      merged.addPage(page);
    }
  }

  const bytes = await merged.save();
  const baseName = filenames[0]?.replace(/\.pdf$/i, "") ?? "merged";
  return makeResult(bytes, `${baseName}_merged.pdf`, t);
}

// ============================================================================
// 2. PDF Split
// ============================================================================

export async function splitPdf(
  buffer: ArrayBuffer,
  filename: string,
  options: PdfSplitOptions
): Promise<BatchTaskResult> {
  const t = performance.now();
  const src = await loadPdf(buffer);
  const totalPages = src.getPageCount();
  const baseName = filename.replace(/\.pdf$/i, "");
  const results: TaskResult[] = [];

  const extractPages = async (indices: number[], suffix: string): Promise<TaskResult> => {
    const doc = await PDFDocument.create();
    const pages = await doc.copyPages(src, indices);
    for (const p of pages) doc.addPage(p);
    const bytes = await doc.save();
    return makeResult(bytes, `${baseName}_${suffix}.pdf`, t);
  };

  switch (options.mode) {
    case "ranges": {
      const ranges = options.ranges ?? ["1-" + totalPages];
      for (let i = 0; i < ranges.length; i++) {
        const range = ranges[i];
        const [start, end] = range.split("-").map(Number);
        const indices = Array.from(
          { length: (end || start) - start + 1 },
          (_, j) => start - 1 + j
        ).filter((idx) => idx >= 0 && idx < totalPages);
        results.push(await extractPages(indices, `pages_${range}`));
      }
      break;
    }
    case "individual": {
      for (let i = 0; i < totalPages; i++) {
        results.push(await extractPages([i], `page_${i + 1}`));
      }
      break;
    }
    case "half": {
      const mid = Math.ceil(totalPages / 2);
      const firstHalf = Array.from({ length: mid }, (_, i) => i);
      const secondHalf = Array.from({ length: totalPages - mid }, (_, i) => mid + i);
      results.push(await extractPages(firstHalf, "part1"));
      if (secondHalf.length > 0) {
        results.push(await extractPages(secondHalf, "part2"));
      }
      break;
    }
    case "size-limit": {
      const maxBytes = options.maxBytes ?? 5 * 1024 * 1024; // 5MB default
      let currentIndices: number[] = [];

      for (let i = 0; i < totalPages; i++) {
        currentIndices.push(i);
        // Test size by saving
        const testDoc = await PDFDocument.create();
        const testPages = await testDoc.copyPages(src, currentIndices);
        for (const p of testPages) testDoc.addPage(p);
        const testBytes = await testDoc.save();

        if (testBytes.byteLength > maxBytes && currentIndices.length > 1) {
          // Pop the last page and save
          currentIndices.pop();
          results.push(
            await extractPages(currentIndices, `chunk_${results.length + 1}`)
          );
          currentIndices = [i]; // Start new chunk with current page
        }
      }

      if (currentIndices.length > 0) {
        results.push(
          await extractPages(currentIndices, `chunk_${results.length + 1}`)
        );
      }
      break;
    }
  }

  return { files: results, totalDurationMs: performance.now() - t };
}

// ============================================================================
// 3. PDF Organize (reorder, delete, rotate)
// ============================================================================

export async function organizePdf(
  buffer: ArrayBuffer,
  filename: string,
  options: PdfOrganizeOptions
): Promise<TaskResult> {
  const t = performance.now();
  const src = await loadPdf(buffer);
  const baseName = filename.replace(/\.pdf$/i, "");

  // Apply deletions first
  const deleteSet = new Set(options.deletePages ?? []);
  let indices = src.getPageIndices().filter((i) => !deleteSet.has(i));

  // Apply reorder
  if (options.pageOrder && options.pageOrder.length > 0) {
    indices = options.pageOrder.filter((i) => indices.includes(i));
  }

  // Create new doc with reordered pages
  const doc = await PDFDocument.create();
  const pages = await doc.copyPages(src, indices);
  for (const p of pages) doc.addPage(p);

  // Apply rotations
  if (options.rotations) {
    for (const rot of options.rotations) {
      const pageIdx = indices.indexOf(rot.page);
      if (pageIdx >= 0 && pageIdx < doc.getPageCount()) {
        const page = doc.getPage(pageIdx);
        // Add to any rotation the page already has.
        page.setRotation(degrees((page.getRotation().angle + rot.degrees) % 360));
      }
    }
  }

  const bytes = await doc.save();
  return makeResult(bytes, `${baseName}_organized.pdf`, t);
}

// ============================================================================
// 4. PDF Compress (downsample embedded images)
// ============================================================================

export async function compressPdf(
  buffer: ArrayBuffer,
  filename: string,
  options: PdfCompressOptions = {}
): Promise<TaskResult> {
  const t = performance.now();
  const targetDpi = options.targetDpi ?? 150;
  const quality = options.imageQuality ?? 0.65;

  // Load PDF with pdfjs-dist for image extraction would be complex;
  // Instead, use pdf-lib to iterate objects. For a practical approach,
  // we render each page to canvas at reduced resolution and rebuild.

  const pdfjsLib = await loadPdfJs();

  const pdfDoc = await pdfjsLib.getDocument({ data: new Uint8Array(buffer.slice(0)) }).promise;
  const newDoc = await PDFDocument.create();

  for (let i = 1; i <= pdfDoc.numPages; i++) {
    const page = await pdfDoc.getPage(i);
    const viewport = page.getViewport({ scale: targetDpi / 72 });

    // Use OffscreenCanvas if available, otherwise regular canvas
    let canvas: OffscreenCanvas | HTMLCanvasElement;
    let ctx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D | null;

    if (typeof OffscreenCanvas !== "undefined") {
      canvas = new OffscreenCanvas(viewport.width, viewport.height);
      ctx = canvas.getContext("2d");
    } else {
      canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      ctx = canvas.getContext("2d");
    }

    if (!ctx) throw new Error("Could not get canvas context");

    await (page.render as any)({
      canvasContext: ctx,
      viewport,
      canvas,
    }).promise;

    // Convert to JPEG blob
    let jpegBlob: Blob;
    if (canvas instanceof OffscreenCanvas) {
      jpegBlob = await canvas.convertToBlob({ type: "image/jpeg", quality });
    } else {
      jpegBlob = await new Promise<Blob>((resolve) =>
        canvas.toBlob!((b) => resolve(b!), "image/jpeg", quality)
      );
    }

    const jpegBytes = new Uint8Array(await jpegBlob.arrayBuffer());
    const jpegImage = await newDoc.embedJpg(jpegBytes);

    // Get original page dimensions
    const origViewport = page.getViewport({ scale: 1 });
    const newPage = newDoc.addPage([origViewport.width, origViewport.height]);
    newPage.drawImage(jpegImage, {
      x: 0,
      y: 0,
      width: origViewport.width,
      height: origViewport.height,
    });
  }

  (pdfDoc as any).destroy?.();
  const rasterBytes = await newDoc.save();
  const baseName = filename.replace(/\.pdf$/i, "");

  // 1) Lossless: qpdf object streams + recompressed streams (keeps text selectable).
  let losslessBytes: Uint8Array | null = null;
  try {
    const { runQpdf } = await import("@/lib/qpdf");
    losslessBytes = await runQpdf(buffer.slice(0), [
      "--object-streams=generate",
      "--compress-streams=y",
      "--recompress-flate",
      "--compression-level=9",
      "{in}",
      "{out}",
    ]);
  } catch {
    losslessBytes = null;
  }

  // 2) Pick the smallest. Rasterising flattens text into images, so it only wins
  //    when it saves a lot (typical for scanned / image-heavy PDFs). Never return
  //    something bigger than the original.
  const original = new Uint8Array(buffer);
  let best: Uint8Array = original;
  if (losslessBytes && losslessBytes.byteLength < best.byteLength) best = losslessBytes;
  if (rasterBytes.byteLength < best.byteLength * 0.7) best = rasterBytes;

  return makeResult(best, `${baseName}_compressed.pdf`, t);
}

// ============================================================================
// 5. Images to PDF
// ============================================================================

export async function imagesToPdf(
  imageBuffers: ArrayBuffer[],
  filenames: string[],
  pageSize: { width: number; height: number } = { width: 595.28, height: 841.89 }, // A4
  margin = 20
): Promise<TaskResult> {
  const t = performance.now();
  const doc = await PDFDocument.create();

  for (let i = 0; i < imageBuffers.length; i++) {
    const buf = imageBuffers[i];
    const name = filenames[i]?.toLowerCase() ?? "";

    let image;
    if (name.endsWith(".png")) {
      image = await doc.embedPng(buf);
    } else {
      // Default to JPEG for everything else
      image = await doc.embedJpg(buf);
    }

    const imgAspect = image.width / image.height;
    const usableW = pageSize.width - margin * 2;
    const usableH = pageSize.height - margin * 2;
    const pageAspect = usableW / usableH;

    let drawW: number, drawH: number;
    if (imgAspect > pageAspect) {
      drawW = usableW;
      drawH = usableW / imgAspect;
    } else {
      drawH = usableH;
      drawW = usableH * imgAspect;
    }

    const page = doc.addPage([pageSize.width, pageSize.height]);
    page.drawImage(image, {
      x: margin + (usableW - drawW) / 2,
      y: margin + (usableH - drawH) / 2,
      width: drawW,
      height: drawH,
    });
  }

  const bytes = await doc.save();
  return makeResult(bytes, "images_combined.pdf", t);
}

// ============================================================================
// 6. PDF to Images
// ============================================================================

export async function pdfToImages(
  buffer: ArrayBuffer,
  filename: string,
  dpi: 150 | 300 | 600 = 300,
  format: "png" | "jpg" = "png"
): Promise<BatchTaskResult> {
  const t = performance.now();
  const pdfjsLib = await loadPdfJs();

  const pdfDoc = await pdfjsLib.getDocument({ data: new Uint8Array(buffer.slice(0)) }).promise;
  const results: TaskResult[] = [];
  const baseName = filename.replace(/\.pdf$/i, "");

  for (let i = 1; i <= pdfDoc.numPages; i++) {
    const page = await pdfDoc.getPage(i);
    const scale = dpi / 72;
    const viewport = page.getViewport({ scale });

    let canvas: OffscreenCanvas | HTMLCanvasElement;
    let ctx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D | null;

    if (typeof OffscreenCanvas !== "undefined") {
      canvas = new OffscreenCanvas(viewport.width, viewport.height);
      ctx = canvas.getContext("2d");
    } else {
      canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      ctx = canvas.getContext("2d");
    }

    if (!ctx) throw new Error("Could not get canvas context");

    await (page.render as any)({
      canvasContext: ctx,
      viewport,
      canvas,
    }).promise;

    const mimeType = format === "png" ? "image/png" : "image/jpeg";
    let blob: Blob;
    if (canvas instanceof OffscreenCanvas) {
      blob = await canvas.convertToBlob({ type: mimeType, quality: 0.92 });
    } else {
      blob = await new Promise<Blob>((resolve) =>
        canvas.toBlob!((b) => resolve(b!), mimeType, 0.92)
      );
    }

    const ext = format === "png" ? "png" : "jpg";
    results.push({
      data: blob,
      filename: `${baseName}_page_${i}.${ext}`,
      mimeType,
      durationMs: performance.now() - t,
      sizeBytes: blob.size,
    });
  }

  (pdfDoc as any).destroy?.();
  return { files: results, totalDurationMs: performance.now() - t };
}

// ============================================================================
// 7. Watermark & Page Numbers
// ============================================================================

export async function addWatermark(
  buffer: ArrayBuffer,
  filename: string,
  options: PdfWatermarkOptions
): Promise<TaskResult> {
  const t = performance.now();
  const doc = await loadPdf(buffer);
  const baseName = filename.replace(/\.pdf$/i, "");

  const pages = doc.getPages();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const opacity = options.opacity ?? 0.3;
  const fontSize = options.fontSize ?? 48;
  // Classic diagonal: bottom-left to top-right.
  const rotation = options.rotation ?? 45;

  for (const page of pages) {
    const { width, height } = page.getSize();

    if (options.text) {
      const textWidth = font.widthOfTextAtSize(options.text, fontSize);
      let x: number, y: number;

      switch (options.position ?? "center") {
        case "center": {
          // pdf-lib rotates around the text origin, so offset the origin to put
          // the rotated text's midpoint on the page centre.
          const rad = (rotation * Math.PI) / 180;
          const halfW = textWidth / 2;
          const halfH = (fontSize * 0.7) / 2;
          x = width / 2 - (Math.cos(rad) * halfW - Math.sin(rad) * halfH);
          y = height / 2 - (Math.sin(rad) * halfW + Math.cos(rad) * halfH);
          break;
        }
        case "top-left":
          x = 20;
          y = height - fontSize - 20;
          break;
        case "top-right":
          x = width - textWidth - 20;
          y = height - fontSize - 20;
          break;
        case "bottom-left":
          x = 20;
          y = 20;
          break;
        case "bottom-right":
          x = width - textWidth - 20;
          y = 20;
          break;
        default:
          x = (width - textWidth) / 2;
          y = height / 2;
      }

      page.drawText(options.text, {
        x,
        y,
        size: fontSize,
        font,
        color: rgb(0.5, 0.5, 0.5),
        opacity,
        rotate: degrees(rotation),
      });
    }

    if (options.imageData) {
      let image;
      try {
        image = await doc.embedPng(options.imageData);
      } catch {
        image = await doc.embedJpg(options.imageData);
      }
      const imgWidth = Math.min(image.width, width * 0.3);
      const imgHeight = (imgWidth / image.width) * image.height;
      page.drawImage(image, {
        x: (width - imgWidth) / 2,
        y: (height - imgHeight) / 2,
        width: imgWidth,
        height: imgHeight,
        opacity,
      });
    }
  }

  const bytes = await doc.save();
  return makeResult(bytes, `${baseName}_watermarked.pdf`, t);
}

export async function addPageNumbers(
  buffer: ArrayBuffer,
  filename: string,
  options: PdfPageNumberOptions = {}
): Promise<TaskResult> {
  const t = performance.now();
  const doc = await loadPdf(buffer);
  const baseName = filename.replace(/\.pdf$/i, "");
  const font = await doc.embedFont(StandardFonts.Helvetica);

  const pages = doc.getPages();
  const total = pages.length;
  const startNum = options.startNumber ?? 1;
  const fontSize = options.fontSize ?? 12;
  const position = options.position ?? "bottom-center";
  const formatStr = options.format ?? "{n}";

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const { width, height } = page.getSize();
    const pageNum = startNum + i;
    const text = formatStr
      .replace("{n}", String(pageNum))
      .replace("{total}", String(total));

    const textWidth = font.widthOfTextAtSize(text, fontSize);
    let x: number, y: number;

    switch (position) {
      case "top-left": x = 30; y = height - 30; break;
      case "top-center": x = (width - textWidth) / 2; y = height - 30; break;
      case "top-right": x = width - textWidth - 30; y = height - 30; break;
      case "bottom-left": x = 30; y = 20; break;
      case "bottom-center": x = (width - textWidth) / 2; y = 20; break;
      case "bottom-right": x = width - textWidth - 30; y = 20; break;
      default: x = (width - textWidth) / 2; y = 20;
    }

    page.drawText(text, {
      x,
      y,
      size: fontSize,
      font,
      color: rgb(0, 0, 0),
    });
  }

  const bytes = await doc.save();
  return makeResult(bytes, `${baseName}_numbered.pdf`, t);
}

// ============================================================================
// 8. PDF Sign (stamp image on page)
// ============================================================================

export async function signPdf(
  buffer: ArrayBuffer,
  filename: string,
  options: PdfSignOptions
): Promise<TaskResult> {
  const t = performance.now();
  const doc = await loadPdf(buffer);
  const baseName = filename.replace(/\.pdf$/i, "");

  let image;
  try {
    image = await doc.embedPng(options.signatureImage);
  } catch {
    image = await doc.embedJpg(options.signatureImage);
  }

  const page = doc.getPage(options.page);
  const [x, y, w, h] = options.rect;
  page.drawImage(image, { x, y, width: w, height: h });

  const bytes = await doc.save();
  return makeResult(bytes, `${baseName}_signed.pdf`, t);
}

// ============================================================================
// 9. Flatten AcroForm fields
// ============================================================================

export async function flattenPdf(
  buffer: ArrayBuffer,
  filename: string
): Promise<TaskResult> {
  const t = performance.now();
  const doc = await loadPdf(buffer);
  const baseName = filename.replace(/\.pdf$/i, "");

  const form = doc.getForm();
  try {
    form.flatten();
  } catch {
    // No form fields to flatten — pass through
  }

  const bytes = await doc.save();
  return makeResult(bytes, `${baseName}_flattened.pdf`, t);
}

// ============================================================================
// 10. PII Redaction (regex-based black box burn)
// ============================================================================

/** Built-in PII regex patterns (India-centric + global). */
const BUILTIN_PII_PATTERNS: Record<string, RegExp> = {
  aadhaar: /\b\d{4}\s?\d{4}\s?\d{4}\b/g,
  pan: /\b[A-Z]{5}\d{4}[A-Z]\b/g,
  creditCard: /\b(?:\d{4}[\s-]?){3}\d{4}\b/g,
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  phone: /\b(?:\+?\d{1,3}[\s-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/g,
  ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
};

let measureCtx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null = null;
function measureText(text: string, family: string): number {
  if (!text) return 0;
  if (!measureCtx) {
    measureCtx =
      typeof OffscreenCanvas !== "undefined"
        ? new OffscreenCanvas(1, 1).getContext("2d")
        : document.createElement("canvas").getContext("2d");
  }
  if (!measureCtx) return text.length;
  measureCtx.font = `100px ${family}`;
  return measureCtx.measureText(text).width;
}

export async function redactPdf(
  buffer: ArrayBuffer,
  filename: string,
  options: PdfRedactOptions
): Promise<TaskResult> {
  const t = performance.now();
  const baseName = filename.replace(/\.pdf$/i, "");
  const pdfjsLib = await loadPdfJs();
  const pdfDoc = await pdfjsLib.getDocument({ data: new Uint8Array(buffer.slice(0)) }).promise;
  const source = await loadPdf(buffer.slice(0));

  const patterns: RegExp[] = (options.patterns ?? []).map((p) => new RegExp(p, "g"));
  if (options.useBuiltInPatterns) patterns.push(...Object.values(BUILTIN_PII_PATTERNS));

  const out = await PDFDocument.create();
  let redactedCount = 0;

  for (let i = 1; i <= pdfDoc.numPages; i++) {
    const pdfPage = await pdfDoc.getPage(i);
    const textContent = await pdfPage.getTextContent();

    // Collect a box (PDF user space) for every individual match. Widths come from
    // measuring the substring in the item's own font; character-count ratios
    // under-cover narrow glyphs like digits and leak the last characters.
    const boxes: Array<[number, number, number, number]> = [];
    const styles = (textContent as { styles?: Record<string, { fontFamily?: string }> }).styles ?? {};
    for (const item of textContent.items) {
      if (!("str" in item) || !item.str) continue;
      const it = item as { str: string; transform: number[]; width: number; height: number; fontName?: string };
      const [, , , , tx, ty] = it.transform;
      const h = it.height || Math.abs(it.transform[3]) || 10;
      const family = (it.fontName && styles[it.fontName]?.fontFamily) || "sans-serif";
      const full = measureText(it.str, family) || 1;
      for (const pattern of patterns) {
        pattern.lastIndex = 0;
        let m: RegExpExecArray | null;
        while ((m = pattern.exec(it.str))) {
          if (!m[0]) { pattern.lastIndex++; continue; }
          const start = (measureText(it.str.slice(0, m.index), family) / full) * it.width;
          const w = (measureText(m[0], family) / full) * it.width;
          const pad = Math.max(2, h * 0.3);
          boxes.push([tx + start - pad, ty - h * 0.3, w + pad * 2, h * 1.45]);
        }
      }
    }

    if (boxes.length === 0) {
      const [copied] = await out.copyPages(source, [i - 1]);
      out.addPage(copied);
      continue;
    }

    // True redaction: rasterise this page with the boxes burned in, so the
    // original text is gone from the file (not merely covered).
    redactedCount += boxes.length;
    const scale = 2.5;
    const viewport = pdfPage.getViewport({ scale });
    let canvas: OffscreenCanvas | HTMLCanvasElement;
    if (typeof OffscreenCanvas !== "undefined") {
      canvas = new OffscreenCanvas(viewport.width, viewport.height);
    } else {
      canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
    }
    const ctx = canvas.getContext("2d") as CanvasRenderingContext2D | null;
    if (!ctx) throw new Error("Could not get canvas context");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, viewport.width, viewport.height);
    await (pdfPage.render as any)({ canvasContext: ctx, viewport, canvas }).promise;
    ctx.fillStyle = "#000000";
    for (const [x, y, w, h] of boxes) {
      // PDF user space -> canvas pixels via the viewport transform [a b c d e f].
      const [ta, tb, tc, td, te, tf] = viewport.transform as number[];
      const map = (px: number, py: number) => [ta * px + tc * py + te, tb * px + td * py + tf];
      const [x1, y1] = map(x, y);
      const [x2, y2] = map(x + w, y + h);
      ctx.fillRect(Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1));
    }
    const blob =
      canvas instanceof OffscreenCanvas
        ? await canvas.convertToBlob({ type: "image/png" })
        : await new Promise<Blob>((res) => (canvas as HTMLCanvasElement).toBlob((b) => res(b!), "image/png"));
    const png = await out.embedPng(new Uint8Array(await blob.arrayBuffer()));
    const base = pdfPage.getViewport({ scale: 1 });
    const page = out.addPage([base.width, base.height]);
    page.drawImage(png, { x: 0, y: 0, width: base.width, height: base.height });
  }

  (pdfDoc as any).destroy?.();
  // Drop identifying metadata too.
  out.setTitle(""); out.setAuthor(""); out.setSubject(""); out.setKeywords([]);
  out.setProducer("INeedThis"); out.setCreator("INeedThis");
  if (redactedCount === 0) {
    throw new Error("No matching personal data was found, so nothing was redacted.");
  }
  const bytes = await out.save();
  return makeResult(bytes, `${baseName}_redacted.pdf`, t);
}

// ============================================================================
// 11. PDF Security (unlock/protect) — basic owner password handling
// ============================================================================

export async function handlePdfSecurity(
  buffer: ArrayBuffer,
  filename: string,
  options: PdfSecurityOptions
): Promise<TaskResult> {
  const t = performance.now();
  const baseName = filename.replace(/\.pdf$/i, "");
  const { runQpdf } = await import("@/lib/qpdf");

  if (options.action === "unlock") {
    // Real decryption via qpdf (pdf-lib cannot decrypt). Works with the user
    // (open) password or the owner (permissions) password.
    const args = ["--decrypt", "{in}", "{out}"];
    if (options.password) args.unshift(`--password=${options.password}`);
    const bytes = await runQpdf(buffer, args);
    return makeResult(bytes, `${baseName}_unlocked.pdf`, t);
  }

  if (!options.password) throw new Error("Enter a password to protect this PDF.");
  // AES-256 encryption; the same password opens and owns the file.
  const bytes = await runQpdf(buffer, [
    "--encrypt", options.password, options.password, "256", "--",
    "{in}", "{out}",
  ]);
  return makeResult(bytes, `${baseName}_protected.pdf`, t);
}

// ============================================================================
// Barrel export
// ============================================================================

export const pdfEngine = {
  merge: mergePdfs,
  split: splitPdf,
  organize: organizePdf,
  compress: compressPdf,
  imagesToPdf,
  pdfToImages,
  watermark: addWatermark,
  pageNumbers: addPageNumbers,
  sign: signPdf,
  flatten: flattenPdf,
  redact: redactPdf,
  security: handlePdfSecurity,
} as const;

export type PdfEngine = typeof pdfEngine;
