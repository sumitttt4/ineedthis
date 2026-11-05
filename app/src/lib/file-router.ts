// ============================================================================
// FileRouter — Magic-byte detection & action pipeline mapping
// Actions are REAL tool ids from tools-registry (hyphenated).
// ============================================================================

import type { FileCategory, InspectedFile } from "./types";

/** Magic byte signatures for file type detection. */
const MAGIC_BYTES: Array<{
  bytes: number[];
  offset: number;
  mimeType: string;
  extension: string;
  category: FileCategory;
}> = [
  { bytes: [0x25, 0x50, 0x44, 0x46], offset: 0, mimeType: "application/pdf", extension: "pdf", category: "pdf" },
  { bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], offset: 0, mimeType: "image/png", extension: "png", category: "image" },
  { bytes: [0xff, 0xd8, 0xff], offset: 0, mimeType: "image/jpeg", extension: "jpg", category: "image" },
  { bytes: [0x47, 0x49, 0x46, 0x38], offset: 0, mimeType: "image/gif", extension: "gif", category: "image" },
  { bytes: [0x52, 0x49, 0x46, 0x46], offset: 0, mimeType: "image/webp", extension: "webp", category: "image" },
  { bytes: [0x66, 0x74, 0x79, 0x70, 0x68, 0x65, 0x69, 0x63], offset: 4, mimeType: "image/heic", extension: "heic", category: "image" },
  { bytes: [0x66, 0x74, 0x79, 0x70, 0x68, 0x65, 0x69, 0x66], offset: 4, mimeType: "image/heif", extension: "heif", category: "image" },
  { bytes: [0x66, 0x74, 0x79, 0x70, 0x61, 0x76, 0x69, 0x66], offset: 4, mimeType: "image/avif", extension: "avif", category: "image" },
  // Prefer specific QuickTime brand before generic ftyp/mp4
  { bytes: [0x66, 0x74, 0x79, 0x70, 0x71, 0x74], offset: 4, mimeType: "video/quicktime", extension: "mov", category: "video" },
  { bytes: [0x66, 0x74, 0x79, 0x70], offset: 4, mimeType: "video/mp4", extension: "mp4", category: "video" },
  { bytes: [0x1a, 0x45, 0xdf, 0xa3], offset: 0, mimeType: "video/webm", extension: "webm", category: "video" },
  { bytes: [0x49, 0x44, 0x33], offset: 0, mimeType: "audio/mpeg", extension: "mp3", category: "audio" },
  { bytes: [0xff, 0xfb], offset: 0, mimeType: "audio/mpeg", extension: "mp3", category: "audio" },
  { bytes: [0x4f, 0x67, 0x67, 0x53], offset: 0, mimeType: "audio/ogg", extension: "ogg", category: "audio" },
  { bytes: [0x66, 0x4c, 0x61, 0x43], offset: 0, mimeType: "audio/flac", extension: "flac", category: "audio" },
  { bytes: [0x50, 0x4b, 0x03, 0x04], offset: 0, mimeType: "application/zip", extension: "zip", category: "archive" },
  { bytes: [0x1f, 0x8b], offset: 0, mimeType: "application/gzip", extension: "gz", category: "archive" },
];

const EXTENSION_MAP: Record<
  string,
  { mimeType: string; category: FileCategory }
> = {
  pdf: { mimeType: "application/pdf", category: "pdf" },
  png: { mimeType: "image/png", category: "image" },
  jpg: { mimeType: "image/jpeg", category: "image" },
  jpeg: { mimeType: "image/jpeg", category: "image" },
  gif: { mimeType: "image/gif", category: "image" },
  webp: { mimeType: "image/webp", category: "image" },
  heic: { mimeType: "image/heic", category: "image" },
  heif: { mimeType: "image/heif", category: "image" },
  avif: { mimeType: "image/avif", category: "image" },
  svg: { mimeType: "image/svg+xml", category: "image" },
  bmp: { mimeType: "image/bmp", category: "image" },
  mp4: { mimeType: "video/mp4", category: "video" },
  webm: { mimeType: "video/webm", category: "video" },
  mkv: { mimeType: "video/x-matroska", category: "video" },
  mov: { mimeType: "video/quicktime", category: "video" },
  avi: { mimeType: "video/avi", category: "video" },
  m4v: { mimeType: "video/mp4", category: "video" },
  mp3: { mimeType: "audio/mpeg", category: "audio" },
  wav: { mimeType: "audio/wav", category: "audio" },
  m4a: { mimeType: "audio/mp4", category: "audio" },
  ogg: { mimeType: "audio/ogg", category: "audio" },
  opus: { mimeType: "audio/opus", category: "audio" },
  flac: { mimeType: "audio/flac", category: "audio" },
  docx: {
    mimeType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    category: "document",
  },
  doc: { mimeType: "application/msword", category: "document" },
  xlsx: {
    mimeType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    category: "spreadsheet",
  },
  xls: { mimeType: "application/vnd.ms-excel", category: "spreadsheet" },
  csv: { mimeType: "text/csv", category: "spreadsheet" },
  pptx: {
    mimeType:
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    category: "presentation",
  },
  zip: { mimeType: "application/zip", category: "archive" },
  gz: { mimeType: "application/gzip", category: "archive" },
  tar: { mimeType: "application/x-tar", category: "archive" },
  json: { mimeType: "application/json", category: "data" },
  xml: { mimeType: "application/xml", category: "data" },
  txt: { mimeType: "text/plain", category: "text" },
  md: { mimeType: "text/markdown", category: "text" },
  markdown: { mimeType: "text/markdown", category: "text" },
  html: { mimeType: "text/html", category: "text" },
};

/** Real tool ids suggested per inspected file category. */
const CATEGORY_ACTIONS: Record<FileCategory, string[]> = {
  pdf: [
    "pdf-to-docx",
    "pdf-compress",
    "pdf-split",
    "pdf-merge",
    "pdf-to-img",
    "pdf-watermark",
    "pdf-redact",
    "pdf-sign",
    "pdf-unlock",
    "pdf-to-pptx",
  ],
  image: [
    "image-convert",
    "image-compress-kb",
    "image-resize",
    "image-exif",
    "image-heic",
    "image-passport",
    "image-favicon",
  ],
  video: [
    "video-to-mp4",
    "video-compress-mb",
    "video-trim",
    "video-to-gif",
    "audio-extract-convert",
  ],
  audio: ["audio-extract-convert", "audio-booster", "file-hash"],
  document: ["docx-to-pdf", "file-hash"],
  spreadsheet: ["xlsx-to-pdf", "data-convert", "file-hash"],
  presentation: ["file-hash"],
  archive: ["archive-zip", "file-hash"],
  data: ["data-convert", "file-hash", "qr-studio"],
  text: ["md-to-pdf", "file-hash", "qr-studio"],
  unknown: ["file-hash", "archive-zip"],
};

const EXTENSION_ACTIONS: Record<string, string[]> = {
  heic: ["image-heic", "image-convert", "image-compress-kb"],
  heif: ["image-heic", "image-convert", "image-compress-kb"],
  mov: ["video-to-mp4", "video-compress-mb", "video-trim"],
  webm: ["video-to-mp4", "video-compress-mb", "video-to-gif"],
  mkv: ["video-to-mp4", "video-compress-mb", "audio-extract-convert"],
  csv: ["data-convert", "xlsx-to-pdf"],
  json: ["data-convert", "qr-studio", "file-hash"],
  md: ["md-to-pdf", "file-hash"],
  zip: ["archive-zip", "file-hash"],
};

async function readFileHead(file: File, bytes = 512): Promise<Uint8Array> {
  const slice = file.slice(0, bytes);
  const buffer = await slice.arrayBuffer();
  return new Uint8Array(buffer);
}

function matchMagic(head: Uint8Array) {
  for (const sig of MAGIC_BYTES) {
    let ok = true;
    for (let i = 0; i < sig.bytes.length; i++) {
      if (head[sig.offset + i] !== sig.bytes[i]) {
        ok = false;
        break;
      }
    }
    if (ok) return sig;
  }
  return null;
}

function getExtension(filename: string): string {
  const parts = filename.split(".");
  return parts.length > 1 ? (parts.pop() as string).toLowerCase() : "";
}

/**
 * Inspect a File and return mime, category, and suggested tool ids.
 */
export async function inspectFile(file: File): Promise<InspectedFile> {
  const head = await readFileHead(file);
  const ext = getExtension(file.name);
  const magic = matchMagic(head);
  const byExt = EXTENSION_MAP[ext];

  // ZIP-based Office formats: magic says zip; prefer extension category
  let mimeType = magic?.mimeType ?? byExt?.mimeType ?? file.type ?? "application/octet-stream";
  let category: FileCategory =
    magic?.category ?? byExt?.category ?? "unknown";
  let extension = magic?.extension ?? (ext || "bin");

  if (magic?.extension === "zip" && byExt && ["document", "spreadsheet", "presentation"].includes(byExt.category)) {
    mimeType = byExt.mimeType;
    category = byExt.category;
    extension = ext;
  }

  // RIFF collision: WebP vs WAV vs AVI — prefer extension when present
  if (ext && byExt && (ext === "webp" || ext === "wav" || ext === "avi")) {
    mimeType = byExt.mimeType;
    category = byExt.category;
    extension = ext;
  }

  if (!magic && byExt) {
    mimeType = byExt.mimeType;
    category = byExt.category;
    extension = ext;
  }

  const actions = Array.from(
    new Set([
      ...(CATEGORY_ACTIONS[category] ?? []),
      ...(EXTENSION_ACTIONS[extension] ?? []),
    ])
  );

  return {
    file,
    mimeType,
    category,
    extension,
    actions,
  };
}

/** Map inspected file categories onto tool registry categories. */
export function fileCategoryToToolCategory(
  category: FileCategory
): Array<"pdf" | "image" | "media" | "data" | "p2p"> {
  switch (category) {
    case "pdf":
    case "document":
    case "spreadsheet":
    case "presentation":
    case "text":
      return ["pdf"];
    case "image":
      return ["image"];
    case "video":
    case "audio":
      return ["media"];
    case "archive":
    case "data":
      return ["data"];
    default:
      return ["data"];
  }
}
