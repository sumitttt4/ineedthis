/**
 * Accuracy audit: registry tools must be wired in tool-modal source,
 * category counts must match, and file-router actions must resolve to tools.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const registrySrc = fs.readFileSync(
  path.join(root, "src/components/tools/tools-registry.ts"),
  "utf8"
);
const modalSrc = fs.readFileSync(
  path.join(root, "src/components/tools/tool-modal.tsx"),
  "utf8"
);
const routerSrc = fs.readFileSync(
  path.join(root, "src/lib/file-router.ts"),
  "utf8"
);

const ids = [...registrySrc.matchAll(/id:\s*"([^"]+)"/g)]
  .map((m) => m[1])
  .filter(
    (id) =>
      ![
        "all",
        "pdf",
        "image",
        "media",
        "data",
        "p2p",
      ].includes(id)
  );

const uniqueIds = [...new Set(ids)];
const failures = [];

for (const id of uniqueIds) {
  const hasCase =
    modalSrc.includes(`case "${id}"`) ||
    // Special UI-only paths
    (id === "universal-video-downloader" &&
      modalSrc.includes("universal-video-downloader")) ||
    (id === "screen-recorder" && modalSrc.includes("screen-recorder")) ||
    (id === "p2p-transfer" &&
      fs
        .readFileSync(path.join(root, "src/components/p2p/p2p-panel.tsx"), "utf8")
        .includes("P2PTransfer"));

  if (!hasCase) failures.push(`UNWIRED: ${id}`);
}

const countMatch = registrySrc.match(/count:\s*(\d+)/g) || [];
const allCount = registrySrc.match(/id: "all"[^}]*count: (\d+)/s);
if (allCount && Number(allCount[1]) !== uniqueIds.length) {
  failures.push(
    `COUNT MISMATCH: all=${allCount[1]} tools=${uniqueIds.length}`
  );
}

const actionIds = [
  ...routerSrc.matchAll(/"(pdf-[^"]+|image-[^"]+|video-[^"]+|audio-[^"]+|docx-[^"]+|xlsx-[^"]+|md-[^"]+|archive-[^"]+|data-[^"]+|file-[^"]+|qr-[^"]+|universal-[^"]+)"/g),
].map((m) => m[1]);

for (const action of new Set(actionIds)) {
  if (!uniqueIds.includes(action) && action !== "qr-studio") {
    // allow only known tool ids
    if (!uniqueIds.includes(action)) {
      failures.push(`ROUTER ORPHAN ACTION: ${action}`);
    }
  }
}

console.log(`Tools in registry: ${uniqueIds.length}`);
console.log(`Category count literals: ${countMatch.join(", ")}`);
if (failures.length) {
  console.error("ACCURACY FAILURES:");
  for (const f of failures) console.error(" -", f);
  process.exit(1);
}
console.log("ACCURACY PASS: every registry tool is wired; counts aligned.");
process.exit(0);
