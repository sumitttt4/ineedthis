// ============================================================================
// FileRouter — Magic-byte detection & action pipeline mapping
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
  // PDF
  { bytes: [0x25, 0x50, 0x44, 0x46], offset: 0, mimeType: "application/pdf", extension: "pdf", category: "pdf" },
  // PNG
  { bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], offset: 0, mimeType: "image/png", extension: "png", category: "image" },
  // JPEG
  { bytes: [0xff, 0xd8, 0xff], offset: 0, mimeType: "image/jpeg", extension: "jpg", category: "image" },
  // GIF
  { bytes: [0x47, 0x49, 0x46, 0x38], offset: 0, mimeType: "image/gif", extension: "gif", category: "image" },
  // WebP (RIFF....WEBP)
  { bytes: [0x52, 0x49, 0x46, 0x46], offset: 0, mimeType: "image/webp", extension: "webp", category: "image" },
  // HEIF/HEIC (ftyp at offset 4)
  { bytes: [0x66, 0x74, 0x79, 0x70, 0x68, 0x65, 0x69, 0x63], offset: 4, mimeType: "image/heic", extension: "heic", category: "image" },
  { bytes: [0x66, 0x74, 0x79, 0x70, 0x68, 0x65, 0x69, 0x66], offset: 4, mimeType: "image/heif", extension: "heif", category: "image" },
  // AVIF
  { bytes: [0x66, 0x74, 0x79, 0x70, 0x61, 0x76, 0x69, 0x66], offset: 4, mimeType: "image/avif", extension: "avif", category: "image" },
  // MP4 (ftyp)
  { bytes: [0x66, 0x74, 0x79, 0x70], offset: 4, mimeType: "video/mp4", extension: "mp4", category: "video" },
  // WebM / MKV (EBML header)
  { bytes: [0x1a, 0x45, 0xdf, 0xa3], offset: 0, mimeType: "video/webm", extension: "webm", category: "video" },
  // AVI
  { bytes: [0x52, 0x49, 0x46, 0x46], offset: 0, mimeType: "video/avi", extension: "avi", category: "video" },
  // MOV (moov/mdat atoms often start with ftyp qt)
  { bytes: [0x66, 0x74, 0x79, 0x70, 0x71, 0x74], offset: 4, mimeType: "video/quicktime", extension: "mov", category: "video" },
  // MP3 (ID3 tag)
  { bytes: [0x49, 0x44, 0x33], offset: 0, mimeType: "audio/mpeg", extension: "mp3", category: "audio" },
  // MP3 (frame sync)
  { bytes: [0xff, 0xfb], offset: 0, mimeType: "audio/mpeg", extension: "mp3", category: "audio" },
  // WAV
  { bytes: [0x52, 0x49, 0x46, 0x46], offset: 0, mimeType: "audio/wav", extension: "wav", category: "audio" },
  // OGG
  { bytes: [0x4f, 0x67, 0x67, 0x53], offset: 0, mimeType: "audio/ogg", extension: "ogg", category: "audio" },
  // FLAC
  { bytes: [0x66, 0x4c, 0x61, 0x43], offset: 0, mimeType: "audio/flac", extension: "flac", category: "audio" },
  // ZIP (also DOCX, XLSX, PPTX)
  { bytes: [0x50, 0x4b, 0x03, 0x04], offset: 0, mimeType: "application/zip", extension: "zip", category: "archive" },
  // GZIP
  { bytes: [0x1f, 0x8b], offset: 0, mimeType: "application/gzip", extension: "gz", category: "archive" },
  // TAR (ustar at offset 257)
  { bytes: [0x75, 0x73, 0x74, 0x61, 0x72], offset: 257, mimeType: "application/x-tar", extension: "tar", category: "archive" },
  // BMP
  { bytes: [0x42, 0x4d], offset: 0, mimeType: "image/bmp", extension: "bmp", category: "image" },
  // ICO
  { bytes: [0x00, 0x00, 0x01, 0x00], offset: 0, mimeType: "image/x-icon", extension: "ico", category: "image" },
];

/** Extension-based fallback mapping. */
const EXTENSION_MAP: Record<string, { mimeType: string; category: FileCategory }> = {
  // Documents
  pdf: { mimeType: "application/pdf", category: "pdf" },
  docx: { mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", category: "document" },
  doc: { mimeType: "application/msword", category: "document" },
  // Spreadsheets
  xlsx: { mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", category: "spreadsheet" },
  xls: { mimeType: "application/vnd.ms-excel", category: "spreadsheet" },
  csv: { mimeType: "text/csv", category: "spreadsheet" },
  // Presentations
  pptx: { mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation", category: "presentation" },
  ppt: { mimeType: "application/vnd.ms-powerpoint", category: "presentation" },
  // Images
  jpg: { mimeType: "image/jpeg", category: "image" },
  jpeg: { mimeType: "image/jpeg", category: "image" },
  png: { mimeType: "image/png", category: "image" },
  gif: { mimeType: "image/gif", category: "image" },
  webp: { mimeType: "image/webp", category: "image" },
  svg: { mimeType: "image/svg+xml", category: "image" },
  heic: { mimeType: "image/heic", category: "image" },
  heif: { mimeType: "image/heif", category: "image" },
  avif: { mimeType: "image/avif", category: "image" },
  bmp: { mimeType: "image/bmp", category: "image" },
  ico: { mimeType: "image/x-icon", category: "image" },
  // Video
  mp4: { mimeType: "video/mp4", category: "video" },
  webm: { mimeType: "video/webm", category: "video" },
  mkv: { mimeType: "video/x-matroska", category: "video" },
  mov: { mimeType: "video/quicktime", category: "video" },
  avi: { mimeType: "video/avi", category: "video" },
  // Audio
  mp3: { mimeType: "audio/mpeg", category: "audio" },
  wav: { mimeType: "audio/wav", category: "audio" },
  ogg: { mimeType: "audio/ogg", category: "audio" },
  opus: { mimeType: "audio/opus", category: "audio" },
  m4a: { mimeType: "audio/mp4", category: "audio" },
  flac: { mimeType: "audio/flac", category: "audio" },
  m4r: { mimeType: "audio/x-m4r", category: "audio" },
  // Archives
  zip: { mimeType: "application/zip", category: "archive" },
  gz: { mimeType: "application/gzip", category: "archive" },
  tar: { mimeType: "application/x-tar", category: "archive" },
  // Data
  json: { mimeType: "application/json", category: "data" },
  xml: { mimeType: "application/xml", category: "data" },
  // Text
  txt: { mimeType: "text/plain", category: "text" },
  md: { mimeType: "text/markdown", category: "text" },
  html: { mimeType: "text/html", category: "text" },
};

/** Action pipelines available per file category. */
const CATEGORY_ACTIONS: Record<FileCategory, string[]> = {
  pdf: [
    "pdf:merge",
    "pdf:split",
    "pdf:organize",
    "pdf:compress",
    "pdf:to-images",
    "pdf:to-pptx",
    "pdf:to-docx",
    "pdf:to-xlsx",
    "pdf:unlock",
    "pdf:protect",
    "pdf:sign",
    "pdf:watermark",
    "pdf:page-numbers",
    "pdf:flatten",
    "pdf:redact",
  ],
  image: [
    "image:convert",
    "image:compress",
    "image:resize",
    "image:strip-exif",
    "image:passport-photo",
    "image:favicon-pack",
    "image:to-pdf",
  ],
  video: [
    "video:compress",
    "video:trim",
    "video:to-mp4",
    "video:to-gif",
    "video:mute",
    "video:extract-audio",
  ],
  audio: [
    "audio:convert",
    "audio:trim",
    "audio:boost",
    "audio:cut-ringtone",
  ],
  document: [
    "document:to-pdf",
    "document:to-docx",
  ],
  spreadsheet: [
    "spreadsheet:to-pdf",
    "spreadsheet:to-xlsx",
    "spreadsheet:to-csv",
    "spreadsheet:to-json",
    "data:convert",
  ],
  presentation: [
    "presentation:to-pdf",
    "presentation:to-pptx",
  ],
  archive: [
    "archive:extract",
    "archive:list",
  ],
  data: [
    "data:convert",
    "data:hash",
    "data:diff",
  ],
  text: [
    "text:to-pdf",
    "data:diff",
    "data:hash",
  ],
  unknown: [
    "data:hash",
  ],
};

/** Additional actions for specific extensions (beyond category defaults). */
const EXTENSION_ACTIONS: Record<string, string[]> = {
  csv: ["data:convert"],
  json: ["data:convert", "qr:generate"],
  md: ["text:to-pdf"],
};

/**
 * Read the first N bytes of a file for magic-byte detection.
 */
async function readFileHead(file: File, bytes = 512): Promise<Uint8Array> {
  const slice = file.slice(0, bytes);
  const buffer = await slice.arrayBuffer();
  return new Uint8Array(buffer);
}

/**
 * Match magic bytes against known signatures.
 */
function matchMagicBytes(
  header: Uint8Array
): { mimeType: string; extension: string; category: FileCategory } | null {
  for (const sig of MAGIC_BYTES) {
    if (header.length < sig.offset + sig.bytes.length) continue;
    let match = true;
    for (let i = 0; i < sig.bytes.length; i++) {
      if (header[sig.offset + i] !== sig.bytes[i]) {
        match = false;
        break;
      }
    }
    if (match) {
      return {
        mimeType: sig.mimeType,
        extension: sig.extension,
        category: sig.category,
      };
    }
  }
  return null;
}

/**
 * Get file extension from filename (lowercase, no dot).
 */
function getExtension(filename: string): string {
  const parts = filename.split(".");
  return parts.length > 1 ? parts.pop()!.toLowerCase() : "";
}

/**
 * Disambiguate ZIP-based Office formats by checking for internal structure markers.
 */
async function disambiguateZip(
  file: File,
  ext: string
): Promise<{ mimeType: string; extension: string; category: FileCategory }> {
  // Office OpenXML formats are ZIP archives
  const officeExtensions: Record<string, { mimeType: string; category: FileCategory }> = {
    docx: { mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", category: "document" },
    xlsx: { mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", category: "spreadsheet" },
    pptx: { mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation", category: "presentation" },
  };

  if (ext in officeExtensions) {
    return {
      mimeType: officeExtensions[ext].mimeType,
      extension: ext,
      category: officeExtensions[ext].category,
    };
  }

  return { mimeType: "application/zip", extension: "zip", category: "archive" };
}

/**
 * Inspect a file: detect its type via magic bytes + extension, return valid actions.
 */
export async function inspectFile(file: File): Promise<InspectedFile> {
  const ext = getExtension(file.name);
  const header = await readFileHead(file);
  let detected = matchMagicBytes(header);

  // For ZIP-based files, disambiguate using extension
  if (detected?.mimeType === "application/zip") {
    detected = await disambiguateZip(file, ext);
  }

  // For RIFF-based files (WebP vs WAV vs AVI), disambiguate
  if (detected?.mimeType === "image/webp" && header.length >= 12) {
    const fourCC = String.fromCharCode(header[8], header[9], header[10], header[11]);
    if (fourCC === "WEBP") {
      detected = { mimeType: "image/webp", extension: "webp", category: "image" };
    } else if (fourCC === "WAVE") {
      detected = { mimeType: "audio/wav", extension: "wav", category: "audio" };
    } else if (fourCC === "AVI ") {
      detected = { mimeType: "video/avi", extension: "avi", category: "video" };
    }
  }

  // Fallback to extension-based detection
  if (!detected && ext && ext in EXTENSION_MAP) {
    detected = { ...EXTENSION_MAP[ext], extension: ext };
  }

  const category: FileCategory = detected?.category ?? "unknown";
  const mimeType = detected?.mimeType ?? (file.type || "application/octet-stream");
  const extension = detected?.extension ?? ext;

  // Build action list
  const actions = [
    ...(CATEGORY_ACTIONS[category] || []),
    ...(EXTENSION_ACTIONS[extension] || []),
  ];

  return {
    file,
    mimeType,
    category,
    extension,
    actions: [...new Set(actions)], // deduplicate
  };
}

/**
 * Batch inspect multiple files.
 */
export async function inspectFiles(files: File[]): Promise<InspectedFile[]> {
  return Promise.all(files.map(inspectFile));
}

/**
 * Check if a file supports a specific action.
 */
export async function fileSupportsAction(
  file: File,
  action: string
): Promise<boolean> {
  const inspected = await inspectFile(file);
  return inspected.actions.includes(action);
}
