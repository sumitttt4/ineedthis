/** Configure pdfjs-dist to use the locally hosted worker (PWA / offline friendly). */
export async function loadPdfJs() {
  const pdfjsLib = await import("pdfjs-dist");
  if (typeof window !== "undefined" || typeof self !== "undefined") {
    pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  }
  return pdfjsLib;
}
