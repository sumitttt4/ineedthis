import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function copyFile(from, to) {
  if (!fs.existsSync(from)) {
    console.warn(`[copy-runtime-assets] missing source: ${from}`);
    return false;
  }
  ensureDir(path.dirname(to));
  fs.copyFileSync(from, to);
  console.log(`[copy-runtime-assets] ${path.relative(root, to)}`);
  return true;
}

const pdfWorker = path.join(
  root,
  "node_modules/pdfjs-dist/build/pdf.worker.min.mjs"
);
copyFile(pdfWorker, path.join(root, "public/pdf.worker.min.mjs"));

const ffmpegDir = path.join(root, "node_modules/@ffmpeg/core/dist/esm");
copyFile(
  path.join(ffmpegDir, "ffmpeg-core.js"),
  path.join(root, "public/ffmpeg/ffmpeg-core.js")
);
copyFile(
  path.join(ffmpegDir, "ffmpeg-core.wasm"),
  path.join(root, "public/ffmpeg/ffmpeg-core.wasm")
);
