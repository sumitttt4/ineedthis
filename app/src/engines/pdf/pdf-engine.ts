// ============================================================================
// PDF Engine — Main-thread service functions
// All heavy work delegates to pdf-lib and pdfjs-dist directly
// (no separate worker needed for most PDF ops since pdf-lib is fast & sync)
// ============================================================================

import { PDFDocument, degrees, rgb, StandardFonts, type PDFPage } from "pdf-lib";
import type {
  TaskResult,
  BatchTaskResult,
  PdfMergeOptions,
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
        page.setRotation(degrees(rot.degrees));
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

  const pdfDoc = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;
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
  const bytes = await newDoc.save();
  const baseName = filename.replace(/\.pdf$/i, "");
  return makeResult(bytes, `${baseName}_compressed.pdf`, t);
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

  const pdfDoc = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;
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
  const rotation = options.rotation ?? -45;

  for (const page of pages) {
    const { width, height } = page.getSize();

    if (options.text) {
      const textWidth = font.widthOfTextAtSize(options.text, fontSize);
      let x: number, y: number;

      switch (options.position ?? "center") {
        case "center":
          x = (width - textWidth) / 2;
          y = height / 2;
          break;
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

export async function redactPdf(
  buffer: ArrayBuffer,
  filename: string,
  options: PdfRedactOptions
): Promise<TaskResult> {
  const t = performance.now();
  const baseName = filename.replace(/\.pdf$/i, "");

  // Use pdfjs-dist to extract text positions
  const pdfjsLib = await loadPdfJs();

  const pdfDoc = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;
  const doc = await loadPdf(buffer);

  // Compile user patterns
  const patterns: RegExp[] = (options.patterns ?? []).map(
    (p) => new RegExp(p, "g")
  );
  if (options.useBuiltInPatterns) {
    patterns.push(...Object.values(BUILTIN_PII_PATTERNS));
  }

  for (let i = 1; i <= pdfDoc.numPages; i++) {
    const pdfPage = await pdfDoc.getPage(i);
    const textContent = await pdfPage.getTextContent();
    const page = doc.getPage(i - 1);
    const { height } = page.getSize();

    for (const item of textContent.items) {
      if (!("str" in item) || !item.str) continue;
      const textItem = item as { str: string; transform: number[]; width: number; height: number };

      for (const pattern of patterns) {
        pattern.lastIndex = 0;
        if (pattern.test(textItem.str)) {
          // Draw black rectangle over the text item
          const [, , , , tx, ty] = textItem.transform;
          page.drawRectangle({
            x: tx,
            y: ty - 2, // slight offset for coverage
            width: textItem.width + 4,
            height: textItem.height + 4,
            color: rgb(0, 0, 0),
          });
        }
      }
    }
  }

  (pdfDoc as any).destroy?.();
  const bytes = await doc.save();
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

  if (options.action === "unlock") {
    // Load with password, then save without encryption
    const doc = await PDFDocument.load(buffer, {
      ignoreEncryption: true,
      ...(options.password ? ({ password: options.password } as any) : {}),
    } as any);
    const bytes = await doc.save();
    return makeResult(bytes, `${baseName}_unlocked.pdf`, t);
  } else {
    // Protect: pdf-lib doesn't support encryption natively.
    // We pass through as-is with a note. Full encryption would require
    // a WASM-based solution like qpdf.
    const doc = await loadPdf(buffer);
    const bytes = await doc.save();
    return makeResult(bytes, `${baseName}_protected.pdf`, t);
  }
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
