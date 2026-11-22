import type { ToolCategory } from "@/components/tools/tools-registry";
import { formatBytes } from "@/lib/utils";

/**
 * Practical in-browser ceilings. ffmpeg.wasm runs in 32-bit WebAssembly memory
 * (hard cap ~2 GB for input + output together), and PDF / image tools decode
 * whole files into memory. Above these sizes tabs tend to crash, especially on
 * phones, so we refuse up front with a clear message instead.
 */
const LIMITS: Record<ToolCategory, number> = {
  media: 1024 * 1024 * 1024, // 1 GB
  pdf: 300 * 1024 * 1024,
  image: 150 * 1024 * 1024,
  data: 1024 * 1024 * 1024,
  p2p: Number.POSITIVE_INFINITY,
};

export function fileSizeError(category: ToolCategory, files: File[]): string | null {
  const limit = LIMITS[category];
  const tooBig = files.find((f) => f.size > limit);
  if (!tooBig) return null;
  return `"${tooBig.name}" is ${formatBytes(tooBig.size)}. This tool handles files up to ${formatBytes(limit)} in the browser.`;
}
