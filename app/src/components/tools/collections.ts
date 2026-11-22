/**
 * Curated home-page collections. Everyday = the jobs most people do weekly,
 * labelled by the task rather than the tool name. Gems = things most tool
 * sites don't have. Pick by tool id; the registry stays the source of truth.
 */

export const EVERYDAY: Array<{ id: string; label: string }> = [
  { id: "pdf-compress", label: "Compress PDF" },
  { id: "pdf-merge", label: "Merge PDF" },
  { id: "pdf-to-docx", label: "PDF to Word" },
  { id: "images-to-pdf", label: "JPG to PDF" },
  { id: "image-heic", label: "HEIC to JPG" },
  { id: "image-compress-kb", label: "Compress image" },
  { id: "image-resize", label: "Resize image" },
  { id: "image-bg-remove", label: "Remove background" },
  { id: "video-compress-mb", label: "Compress video" },
  { id: "audio-extract-convert", label: "MP4 to MP3" },
  { id: "transcribe-audio", label: "Audio to text" },
  { id: "qr-studio", label: "QR code" },
];

export const GEMS: Array<{ id: string; why: string }> = [
  { id: "text-to-image", why: "Turn a thought into a shareable card on a live shader background — Hindi handwriting fonts included." },
  { id: "auto-subtitles", why: "AI writes subtitles for your video and plays them back, without the video ever being uploaded." },
  { id: "pdf-redact", why: "Real redaction: emails, phone and card numbers are removed from the file, not just covered with boxes." },
  { id: "p2p-transfer", why: "Send a big file straight from one browser to another. No cloud, no size-limited upload." },
  { id: "image-exif", why: "Photos carry your GPS location. Strip it before you post or send them." },
  { id: "screenshot-beautify", why: "Frame a plain screenshot on a gradient with shadow and rounded corners, ready to post." },
];
