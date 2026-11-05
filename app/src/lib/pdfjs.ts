/** Configure pdfjs-dist for browser (local worker) or Node (legacy build). */
export async function loadPdfJs() {
  // pdfjs-dist 6 expects Promise.try (ES2025); polyfill for older runtimes.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const P: any = Promise;
  if (typeof P.try !== "function") {
    P.try = (callbackFn: (...a: unknown[]) => unknown, ...args: unknown[]) =>
      new Promise((resolve, reject) => {
        try {
          resolve(callbackFn(...args));
        } catch (err) {
          reject(err);
        }
      });
  }

  const isBrowser =
    typeof window !== "undefined" ||
    (typeof self !== "undefined" &&
      typeof (self as unknown as { importScripts?: unknown }).importScripts ===
        "function");

  if (isBrowser) {
    const pdfjsLib = await import("pdfjs-dist");
    pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
    return pdfjsLib;
  }

  // Node / test runners: legacy build avoids worker transport issues.
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
  return pdfjsLib;
}
