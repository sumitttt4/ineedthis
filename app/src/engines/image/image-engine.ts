// ============================================================================
// Image Engine — Batch convert, compress-to-KB, EXIF strip, passport photo,
// favicon pack — all client-side via OffscreenCanvas + libheif-js
// ============================================================================

import type {
  TaskResult,
  BatchTaskResult,
  ImageConvertOptions,
  ImageCompressOptions,
  ImageResizeOptions,
  PassportPhotoOptions,
  FaviconOptions,
} from "@/lib/types";

// ============================================================================
// Helpers
// ============================================================================

/**
 * Decode any supported image format into an ImageBitmap.
 * HEIC/HEIF requires libheif-js WASM decoding first.
 */
async function decodeImage(
  buffer: ArrayBuffer,
  mimeType: string
): Promise<ImageBitmap> {
  const lowerMime = mimeType.toLowerCase();

  if (lowerMime.includes("heic") || lowerMime.includes("heif")) {
    // Dynamic import libheif-js for HEIC decoding
    const libheif = await import("libheif-js");
    const decoder = new libheif.HeifDecoder();
    const data = decoder.decode(new Uint8Array(buffer));

    if (!data || data.length === 0) {
      throw new Error("Failed to decode HEIC/HEIF image");
    }

    const image = data[0];
    const width = image.get_width();
    const height = image.get_height();

    // Create canvas and draw decoded pixel data
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext("2d")!;
    const imageData = ctx.createImageData(width, height);

    // libheif-js provides display() that draws to canvas context
    image.display(imageData, (displayData: ImageData) => {
      ctx.putImageData(displayData, 0, 0);
    });

    return createImageBitmap(canvas);
  }

  // Standard browser-decodable formats
  const blob = new Blob([buffer], { type: mimeType });
  return createImageBitmap(blob);
}

/**
 * Render an ImageBitmap to an OffscreenCanvas at given dimensions.
 */
function renderToCanvas(
  bitmap: ImageBitmap,
  width: number,
  height: number
): OffscreenCanvas {
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0, width, height);
  return canvas;
}

/**
 * Convert canvas to blob of specified format.
 */
async function canvasToBlob(
  canvas: OffscreenCanvas,
  format: "jpg" | "png" | "webp",
  quality?: number
): Promise<Blob> {
  const mimeMap: Record<string, string> = {
    jpg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
  };
  return canvas.convertToBlob({
    type: mimeMap[format],
    quality: format === "png" ? undefined : (quality ?? 0.85),
  });
}

function getExtension(filename: string): string {
  return filename.split(".").pop()?.toLowerCase() ?? "";
}

function getMimeType(ext: string): string {
  const map: Record<string, string> = {
    jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png",
    webp: "image/webp", gif: "image/gif", svg: "image/svg+xml",
    heic: "image/heic", heif: "image/heif", avif: "image/avif",
    bmp: "image/bmp",
  };
  return map[ext] ?? "image/png";
}

// ============================================================================
// 1. Universal Batch Converter
// ============================================================================

export async function batchConvertImages(
  files: File[],
  options: ImageConvertOptions
): Promise<BatchTaskResult> {
  const t = performance.now();
  const results: TaskResult[] = [];

  for (const file of files) {
    const buffer = await file.arrayBuffer();
    const ext = getExtension(file.name);
    const mime = file.type || getMimeType(ext);

    const bitmap = await decodeImage(buffer, mime);
    const canvas = renderToCanvas(bitmap, bitmap.width, bitmap.height);
    const blob = await canvasToBlob(canvas, options.format, options.quality);
    bitmap.close();

    const baseName = file.name.replace(/\.[^.]+$/, "");
    results.push({
      data: blob,
      filename: `${baseName}.${options.format}`,
      mimeType: blob.type,
      durationMs: performance.now() - t,
      sizeBytes: blob.size,
    });
  }

  return { files: results, totalDurationMs: performance.now() - t };
}

// ============================================================================
// 2. Strict-KB Target Compressor (binary search quality/scale)
// ============================================================================

export async function compressImageToSize(
  file: File,
  options: ImageCompressOptions
): Promise<TaskResult> {
  const t = performance.now();
  const buffer = await file.arrayBuffer();
  const ext = getExtension(file.name);
  const mime = file.type || getMimeType(ext);
  const bitmap = await decodeImage(buffer, mime);

  const maxBytes = options.maxSizeBytes;
  const minQuality = options.minQuality ?? 0.1;
  const outputFormat: "jpg" | "webp" = "jpg"; // Lossy for compression

  let bestBlob: Blob | null = null;
  let currentWidth = bitmap.width;
  let currentHeight = bitmap.height;
  let scale = 1.0;

  // Binary search over quality and scale
  for (let scaleStep = 0; scaleStep < 5; scaleStep++) {
    let lo = minQuality;
    let hi = 1.0;

    for (let i = 0; i < 10; i++) {
      const mid = (lo + hi) / 2;
      const w = Math.round(bitmap.width * scale);
      const h = Math.round(bitmap.height * scale);
      const canvas = renderToCanvas(bitmap, w, h);
      const blob = await canvasToBlob(canvas, outputFormat, mid);

      if (blob.size <= maxBytes) {
        bestBlob = blob;
        currentWidth = w;
        currentHeight = h;
        lo = mid; // Try higher quality
      } else {
        hi = mid; // Lower quality
      }
    }

    // If we found a result at current scale, we're done
    if (bestBlob && bestBlob.size <= maxBytes) break;

    // Reduce scale and try again
    scale *= 0.75;
    if (scale < 0.1) break;
  }

  bitmap.close();

  if (!bestBlob || bestBlob.size > maxBytes) {
    // Last resort: tiny canvas
    const canvas = renderToCanvas(
      await decodeImage(buffer, mime),
      Math.max(32, Math.round(bitmap.width * 0.1)),
      Math.max(32, Math.round(bitmap.height * 0.1))
    );
    bestBlob = await canvasToBlob(canvas, outputFormat, minQuality);
  }

  const baseName = file.name.replace(/\.[^.]+$/, "");
  return {
    data: bestBlob,
    filename: `${baseName}_compressed.${outputFormat}`,
    mimeType: bestBlob.type,
    durationMs: performance.now() - t,
    sizeBytes: bestBlob.size,
  };
}

// ============================================================================
// 3. Image Resize
// ============================================================================

export async function resizeImage(
  file: File,
  options: ImageResizeOptions,
  outputFormat?: "jpg" | "png" | "webp"
): Promise<TaskResult> {
  const t = performance.now();
  const buffer = await file.arrayBuffer();
  const ext = getExtension(file.name);
  const mime = file.type || getMimeType(ext);
  const bitmap = await decodeImage(buffer, mime);

  let targetW = options.width ?? bitmap.width;
  let targetH = options.height ?? bitmap.height;

  if (options.maintainAspectRatio !== false) {
    const aspect = bitmap.width / bitmap.height;
    if (options.width && !options.height) {
      targetH = Math.round(targetW / aspect);
    } else if (options.height && !options.width) {
      targetW = Math.round(targetH * aspect);
    } else {
      // Both specified: fit within bounds
      const scaleW = targetW / bitmap.width;
      const scaleH = targetH / bitmap.height;
      const scale = Math.min(scaleW, scaleH);
      targetW = Math.round(bitmap.width * scale);
      targetH = Math.round(bitmap.height * scale);
    }
  }

  const canvas = renderToCanvas(bitmap, targetW, targetH);
  bitmap.close();

  const format = outputFormat ?? (ext === "png" ? "png" : ext === "webp" ? "webp" : "jpg");
  const blob = await canvasToBlob(canvas, format);

  const baseName = file.name.replace(/\.[^.]+$/, "");
  return {
    data: blob,
    filename: `${baseName}_${targetW}x${targetH}.${format}`,
    mimeType: blob.type,
    durationMs: performance.now() - t,
    sizeBytes: blob.size,
  };
}

// ============================================================================
// 4. EXIF & Metadata Scrubber
// ============================================================================

export async function stripExif(file: File): Promise<TaskResult> {
  const t = performance.now();
  const buffer = await file.arrayBuffer();
  const ext = getExtension(file.name);
  const mime = file.type || getMimeType(ext);

  // Decode and re-encode to strip all metadata
  const bitmap = await decodeImage(buffer, mime);
  const canvas = renderToCanvas(bitmap, bitmap.width, bitmap.height);
  bitmap.close();

  const format: "jpg" | "png" | "webp" =
    ext === "png" ? "png" : ext === "webp" ? "webp" : "jpg";
  const blob = await canvasToBlob(canvas, format, 0.95);

  const baseName = file.name.replace(/\.[^.]+$/, "");
  return {
    data: blob,
    filename: `${baseName}_clean.${format}`,
    mimeType: blob.type,
    durationMs: performance.now() - t,
    sizeBytes: blob.size,
  };
}

/**
 * Read EXIF data from an image (returns raw EXIF tags as object).
 */
export async function readExif(
  file: File
): Promise<Record<string, unknown> | null> {
  try {
    const piexif = await import("piexifjs");
    const buffer = await file.arrayBuffer();
    const dataUrl = `data:image/jpeg;base64,${btoa(
      new Uint8Array(buffer).reduce(
        (d, byte) => d + String.fromCharCode(byte),
        ""
      )
    )}`;
    const exifData = piexif.load(dataUrl);
    return exifData as Record<string, unknown>;
  } catch {
    return null;
  }
}

// ============================================================================
// 5. Passport Photo & Print Grid Generator
// ============================================================================

/** Standard passport photo sizes in mm. */
const PASSPORT_SIZES: Record<string, { widthMm: number; heightMm: number }> = {
  "35x45mm": { widthMm: 35, heightMm: 45 },
  "2x2inch": { widthMm: 50.8, heightMm: 50.8 },
  "51x51mm": { widthMm: 51, heightMm: 51 },
};

/** Print sheet sizes in mm. */
const SHEET_SIZES: Record<string, { widthMm: number; heightMm: number }> = {
  "4x6": { widthMm: 101.6, heightMm: 152.4 },
  A4: { widthMm: 210, heightMm: 297 },
};

export async function generatePassportGrid(
  file: File,
  options: PassportPhotoOptions
): Promise<TaskResult> {
  const t = performance.now();
  const dpi = options.dpi ?? 300;
  const mmToPixels = (mm: number) => Math.round((mm / 25.4) * dpi);

  // Get photo size
  const photoSize =
    typeof options.size === "string"
      ? PASSPORT_SIZES[options.size]
      : options.size;
  if (!photoSize) throw new Error("Invalid passport photo size");

  const photoW = mmToPixels(photoSize.widthMm);
  const photoH = mmToPixels(photoSize.heightMm);

  // Get sheet size
  const sheetSize = SHEET_SIZES[options.sheetSize];
  if (!sheetSize) throw new Error("Invalid sheet size");

  const sheetW = mmToPixels(sheetSize.widthMm);
  const sheetH = mmToPixels(sheetSize.heightMm);

  // Decode source image
  const buffer = await file.arrayBuffer();
  const ext = getExtension(file.name);
  const mime = file.type || getMimeType(ext);
  const bitmap = await decodeImage(buffer, mime);

  // Crop to passport photo aspect ratio (center crop)
  const targetAspect = photoSize.widthMm / photoSize.heightMm;
  const srcAspect = bitmap.width / bitmap.height;
  let cropW: number, cropH: number, cropX: number, cropY: number;

  if (srcAspect > targetAspect) {
    cropH = bitmap.height;
    cropW = Math.round(cropH * targetAspect);
    cropX = Math.round((bitmap.width - cropW) / 2);
    cropY = 0;
  } else {
    cropW = bitmap.width;
    cropH = Math.round(cropW / targetAspect);
    cropX = 0;
    cropY = Math.round((bitmap.height - cropH) / 2);
  }

  // Render cropped photo at target passport size
  const photoCanvas = new OffscreenCanvas(photoW, photoH);
  const photoCtx = photoCanvas.getContext("2d")!;
  photoCtx.drawImage(
    bitmap,
    cropX, cropY, cropW, cropH,
    0, 0, photoW, photoH
  );
  bitmap.close();

  // Create sheet canvas and tile photos
  const sheetCanvas = new OffscreenCanvas(sheetW, sheetH);
  const sheetCtx = sheetCanvas.getContext("2d")!;
  sheetCtx.fillStyle = "white";
  sheetCtx.fillRect(0, 0, sheetW, sheetH);

  const cols = Math.floor(sheetW / (photoW + mmToPixels(2))); // 2mm gap
  const rows = Math.floor(sheetH / (photoH + mmToPixels(2)));
  const gap = mmToPixels(2);
  const totalPhotos = Math.min(options.copies, cols * rows);

  const offsetX = Math.round((sheetW - cols * (photoW + gap) + gap) / 2);
  const offsetY = Math.round((sheetH - rows * (photoH + gap) + gap) / 2);

  let placed = 0;
  for (let r = 0; r < rows && placed < totalPhotos; r++) {
    for (let c = 0; c < cols && placed < totalPhotos; c++) {
      const x = offsetX + c * (photoW + gap);
      const y = offsetY + r * (photoH + gap);
      sheetCtx.drawImage(photoCanvas, x, y);
      placed++;
    }
  }

  const blob = await sheetCanvas.convertToBlob({
    type: "image/jpeg",
    quality: 0.95,
  });

  const baseName = file.name.replace(/\.[^.]+$/, "");
  return {
    data: blob,
    filename: `${baseName}_passport_${options.sheetSize}.jpg`,
    mimeType: "image/jpeg",
    durationMs: performance.now() - t,
    sizeBytes: blob.size,
  };
}

// ============================================================================
// 6. Favicon & App Icon Pack Builder
// ============================================================================

export async function generateFaviconPack(
  file: File,
  options: FaviconOptions = {}
): Promise<TaskResult> {
  const t = performance.now();
  const fflate = await import("fflate");

  const buffer = await file.arrayBuffer();
  const ext = getExtension(file.name);
  const mime = file.type || getMimeType(ext);
  const bitmap = await decodeImage(buffer, mime);

  const sizes = options.sizes ?? [16, 32, 48, 64, 128, 180, 192, 512];
  const zipFiles: Record<string, Uint8Array> = {};

  // Generate PNG icons at each size
  for (const size of sizes) {
    const canvas = renderToCanvas(bitmap, size, size);
    const blob = await canvas.convertToBlob({ type: "image/png" });
    const pngBuffer = new Uint8Array(await blob.arrayBuffer());

    if (size === 180) {
      zipFiles["apple-touch-icon.png"] = pngBuffer;
    } else {
      zipFiles[`icon-${size}x${size}.png`] = pngBuffer;
    }
  }

  // Generate favicon.ico (multi-size: 16, 32, 48)
  // ICO format: header + directory entries + image data
  const icoSizes = [16, 32, 48];
  const icoImages: Uint8Array[] = [];

  for (const size of icoSizes) {
    const canvas = renderToCanvas(bitmap, size, size);
    const blob = await canvas.convertToBlob({ type: "image/png" });
    icoImages.push(new Uint8Array(await blob.arrayBuffer()));
  }

  // Build ICO binary
  const icoHeader = new ArrayBuffer(6 + icoSizes.length * 16);
  const icoView = new DataView(icoHeader);
  icoView.setUint16(0, 0, true); // Reserved
  icoView.setUint16(2, 1, true); // Type: ICO
  icoView.setUint16(4, icoSizes.length, true); // Count

  let dataOffset = 6 + icoSizes.length * 16;
  const icoParts: ArrayBuffer[] = [icoHeader];

  for (let i = 0; i < icoSizes.length; i++) {
    const size = icoSizes[i];
    const imageData = icoImages[i];
    const entryOffset = 6 + i * 16;

    icoView.setUint8(entryOffset, size === 256 ? 0 : size); // Width
    icoView.setUint8(entryOffset + 1, size === 256 ? 0 : size); // Height
    icoView.setUint8(entryOffset + 2, 0); // Color palette
    icoView.setUint8(entryOffset + 3, 0); // Reserved
    icoView.setUint16(entryOffset + 4, 1, true); // Color planes
    icoView.setUint16(entryOffset + 6, 32, true); // Bits per pixel
    icoView.setUint32(entryOffset + 8, imageData.byteLength, true); // Size
    icoView.setUint32(entryOffset + 12, dataOffset, true); // Offset

    icoParts.push(imageData.buffer as ArrayBuffer);
    dataOffset += imageData.byteLength;
  }

  const icoBlob = new Blob(icoParts, { type: "image/x-icon" });
  zipFiles["favicon.ico"] = new Uint8Array(await icoBlob.arrayBuffer());

  // Generate site.webmanifest
  if (options.includeManifest !== false) {
    const manifest = JSON.stringify(
      {
        name: "",
        short_name: "",
        icons: [
          { src: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "/icon-512x512.png", sizes: "512x512", type: "image/png" },
        ],
        theme_color: "#ffffff",
        background_color: "#ffffff",
        display: "standalone",
      },
      null,
      2
    );
    zipFiles["site.webmanifest"] = new TextEncoder().encode(manifest);
  }

  bitmap.close();

  // Create ZIP
  const zipped = fflate.zipSync(zipFiles);
  const zipBlob = new Blob([zipped], { type: "application/zip" });

  return {
    data: zipBlob,
    filename: "favicon-pack.zip",
    mimeType: "application/zip",
    durationMs: performance.now() - t,
    sizeBytes: zipBlob.size,
  };
}

// ============================================================================
// Barrel export
// ============================================================================

export const imageEngine = {
  batchConvert: batchConvertImages,
  compressToSize: compressImageToSize,
  resize: resizeImage,
  stripExif,
  readExif,
  passportPhoto: generatePassportGrid,
  faviconPack: generateFaviconPack,
} as const;

export type ImageEngine = typeof imageEngine;
