import { TOOLS, type ToolCategory, type ToolDefinition } from "@/components/tools/tools-registry";

/**
 * Public URL slug for every tool: the words people actually search for.
 * Anything not listed falls back to a slug of the tool name.
 */
const SLUGS: Record<string, string> = {
  "pdf-to-docx": "pdf-to-word",
  "docx-to-pdf": "word-to-pdf",
  "pdf-merge": "merge-pdf",
  "pdf-split": "split-pdf",
  "pdf-compress": "compress-pdf",
  "pdf-to-img": "pdf-to-jpg",
  "xlsx-to-pdf": "excel-to-pdf",
  "md-to-pdf": "markdown-to-pdf",
  "pdf-to-pptx": "pdf-to-powerpoint",
  "pdf-watermark": "add-watermark-to-pdf",
  "pdf-redact": "redact-pdf",
  "pdf-sign": "sign-pdf",
  "pdf-unlock": "unlock-pdf",
  "images-to-pdf": "jpg-to-pdf",
  "pdf-organize": "organize-pdf-pages",
  "pdf-flatten": "flatten-pdf",
  "pdf-to-text": "pdf-to-text",
  "image-heic": "heic-to-jpg",
  "image-compress-kb": "compress-image",
  "image-exif": "remove-exif-data",
  "image-convert": "convert-image",
  "image-passport": "passport-photo-maker",
  "image-favicon": "favicon-generator",
  "image-resize": "resize-image",
  "text-to-image": "text-to-image",
  "image-bg-remove": "remove-background",
  "image-crop": "crop-image",
  "image-text": "add-text-to-image",
  "image-colors": "color-palette-from-image",
  "screenshot-beautify": "screenshot-beautifier",
  "universal-video-downloader": "video-downloader",
  "video-to-mp4": "convert-to-mp4",
  "video-compress-mb": "compress-video",
  "video-trim": "trim-video",
  "video-to-gif": "video-to-gif",
  "audio-extract-convert": "mp4-to-mp3",
  "audio-booster": "increase-volume",
  "screen-recorder": "screen-recorder",
  "video-mute": "remove-audio-from-video",
  "audio-trim": "audio-cutter",
  "video-speed": "change-video-speed",
  "video-rotate": "rotate-video",
  "voice-recorder": "voice-recorder",
  "archive-zip": "zip-unzip",
  "data-convert": "json-to-csv",
  "file-hash": "checksum-calculator",
  "qr-studio": "qr-code-generator",
  "word-counter": "word-counter",
  "case-converter": "case-converter",
  "json-formatter": "json-formatter",
  "base64-tool": "base64-encode-decode",
  "url-encoder": "url-encode-decode",
  "uuid-password": "password-generator",
  "timestamp-converter": "unix-timestamp-converter",
  "text-diff": "text-diff-checker",
  "p2p-transfer": "send-files-p2p",
};

const slugify = (s: string) =>
  s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

export function toolSlug(id: string): string {
  const t = TOOLS.find((x) => x.id === id);
  return SLUGS[id] ?? (t ? slugify(t.name) : id);
}

export function toolBySlug(slug: string): ToolDefinition | undefined {
  return TOOLS.find((t) => toolSlug(t.id) === slug);
}

export function allToolSlugs(): string[] {
  return TOOLS.map((t) => toolSlug(t.id));
}

/* ------------------------------------------------------------------ */
/* Page copy                                                           */
/* ------------------------------------------------------------------ */

const SERVER_TOOLS = new Set(["universal-video-downloader"]);
const NO_FILE_TOOLS = new Set([
  "qr-studio", "screen-recorder", "voice-recorder", "text-to-image", "word-counter", "case-converter",
  "json-formatter", "base64-tool", "url-encoder", "uuid-password", "timestamp-converter", "text-diff",
  "universal-video-downloader", "p2p-transfer",
]);

const LIMIT_TEXT: Partial<Record<ToolCategory, string>> = {
  media: "1 GB",
  pdf: "300 MB",
  image: "150 MB",
  data: "1 GB",
};

export function privacyLine(t: ToolDefinition): string {
  if (SERVER_TOOLS.has(t.id)) return "Links are resolved by our server; no account and no tracking.";
  if (t.id === "p2p-transfer") return "Files go straight from one browser to the other, encrypted, never through our servers.";
  return "Runs entirely in your browser. Your files never leave your device.";
}

export function seoTitle(t: ToolDefinition): string {
  if (NO_FILE_TOOLS.has(t.id)) return `${t.name} — free online, no sign-up`;
  return `${t.name} — free, private, no upload`;
}

export function seoDescription(t: ToolDefinition): string {
  return `${t.description} ${privacyLine(t)} Free, no sign-up, no watermark.`;
}

export function howItWorks(t: ToolDefinition): string[] {
  if (t.category === "text") {
    return ["Type or paste your text.", "Results update instantly as you type.", "Copy the result with one click."];
  }
  if (t.id === "text-to-image") {
    return ["Type your message or quote.", "Pick a background, font and size.", "Share it directly, or download the PNG."];
  }
  if (t.id === "voice-recorder" || t.id === "screen-recorder") {
    return ["Allow access when your browser asks.", "Record, then stop when you're done.", "Save the recording to your device."];
  }
  if (t.id === "qr-studio") {
    return ["Choose text, Wi‑Fi, UPI or contact.", "Fill in the details.", "Download the QR code as PNG or SVG."];
  }
  if (t.id === "universal-video-downloader") {
    return ["Paste a public video link.", "Pick quality or audio only.", "Download the file."];
  }
  if (t.id === "p2p-transfer") {
    return ["Create an offer on the sending device.", "Paste the answer from the receiving device.", "Send files directly, browser to browser."];
  }
  const formats = t.formats.slice(0, 3).join(", ");
  return [
    `Drop your ${formats} file${t.formats.length > 1 ? "s" : ""} or click to choose.`,
    "Adjust the options if you want — sensible defaults are already set.",
    "Your result downloads automatically. Nothing is uploaded.",
  ];
}

export function faq(t: ToolDefinition): Array<{ q: string; a: string }> {
  const items = [
    { q: `Is ${t.name} free?`, a: "Yes. Every tool on INeedThis is free, with no sign-up, no watermark and no limit on how many times you use it." },
    {
      q: "Are my files uploaded?",
      a: SERVER_TOOLS.has(t.id)
        ? "This tool asks our server to resolve the video link. Everything else on the site runs on your device."
        : NO_FILE_TOOLS.has(t.id)
          ? "No. Everything you type or record stays in your browser."
          : "No. The file is processed by your own browser using WebAssembly. It never reaches a server, which is why it also works offline once loaded.",
    },
    { q: "Does it work on my phone?", a: "Yes. It works in current Chrome, Safari, Edge and Firefox on phones, tablets and computers, and you can install the site as an app." },
  ];
  const limit = LIMIT_TEXT[t.category];
  if (limit && !NO_FILE_TOOLS.has(t.id)) {
    items.push({ q: "Is there a file size limit?", a: `Files up to ${limit} work in the browser. Bigger files can make phones run out of memory, so we stop you before that happens.` });
  }
  return items;
}

export function relatedTools(t: ToolDefinition, n = 6): ToolDefinition[] {
  return TOOLS.filter((x) => x.category === t.category && x.id !== t.id).slice(0, n);
}
