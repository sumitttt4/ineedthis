/// <reference lib="webworker" />

/**
 * Heavy-job worker for PDF / document / image / data engines.
 * Keeps the UI thread responsive for merge, convert, compress, etc.
 */

import type {
  WorkerRequest,
  WorkerResponse,
  TaskResult,
  BatchTaskResult,
} from "../lib/types";

declare const self: DedicatedWorkerGlobalScope;

const cancelled = new Set<string>();

function post(msg: WorkerResponse, transfer?: Transferable[]) {
  if (transfer?.length) {
    self.postMessage(msg, transfer);
  } else {
    self.postMessage(msg);
  }
}

async function toArrayBuffer(data: Blob | ArrayBuffer): Promise<ArrayBuffer> {
  if (data instanceof ArrayBuffer) return data;
  return data.arrayBuffer();
}

async function serializeResult(
  taskId: string,
  result: TaskResult | BatchTaskResult
): Promise<void> {
  if ("files" in result) {
    const files = [];
    const transfer: Transferable[] = [];
    for (const f of result.files) {
      const buf = await toArrayBuffer(f.data as Blob | ArrayBuffer);
      files.push({
        data: buf,
        metadata: {
          filename: f.filename,
          mimeType: f.mimeType,
          sizeBytes: f.sizeBytes,
          durationMs: f.durationMs,
        },
      });
      transfer.push(buf);
    }
    post(
      {
        type: "batch-result",
        taskId,
        files,
        totalDurationMs: result.totalDurationMs,
      },
      transfer
    );
    return;
  }

  const buf = await toArrayBuffer(result.data as Blob | ArrayBuffer);
  post(
    {
      type: "result",
      taskId,
      data: buf,
      metadata: {
        filename: result.filename,
        mimeType: result.mimeType,
        sizeBytes: result.sizeBytes,
        durationMs: result.durationMs,
      },
    },
    [buf]
  );
}

async function runAction(
  action: string,
  payload: Record<string, unknown>,
  taskId: string
): Promise<TaskResult | BatchTaskResult> {
  const buffers = (payload.fileBuffers as ArrayBuffer[]) ?? [];
  const names = (payload.fileNames as string[]) ?? [];
  const options = (payload.options as Record<string, unknown>) ?? payload;

  const progress = (percent: number, message: string) => {
    if (cancelled.has(taskId)) return;
    post({
      type: "progress",
      taskId,
      progress: { state: "processing", percent, message },
    });
  };

  switch (action) {
    case "pdf-to-docx": {
      const { pdfToDocx } = await import("../engines/pdf/document-engine");
      progress(20, "Converting PDF to Word…");
      return pdfToDocx(buffers[0], names[0] ?? "document.pdf");
    }
    case "pdf-merge": {
      const { mergePdfs } = await import("../engines/pdf/pdf-engine");
      progress(20, "Merging PDFs…");
      return mergePdfs(buffers, names);
    }
    case "pdf-split": {
      const { splitPdf } = await import("../engines/pdf/pdf-engine");
      progress(20, "Splitting PDF…");
      return splitPdf(buffers[0], names[0] ?? "document.pdf", {
        mode: "individual",
        ...(options as object),
      });
    }
    case "pdf-compress": {
      const { compressPdf } = await import("../engines/pdf/pdf-engine");
      progress(20, "Compressing PDF…");
      return compressPdf(buffers[0], names[0] ?? "document.pdf", {
        targetDpi: 150,
        imageQuality: 0.65,
        ...(options as object),
      });
    }
    case "pdf-to-img": {
      const { pdfToImages } = await import("../engines/pdf/pdf-engine");
      progress(20, "Rendering PDF pages…");
      return pdfToImages(buffers[0], names[0] ?? "document.pdf", 300, "png");
    }
    case "docx-to-pdf": {
      const { docxToPdf } = await import("../engines/pdf/document-engine");
      progress(20, "Converting Word to PDF…");
      return docxToPdf(buffers[0], names[0] ?? "document.docx");
    }
    case "data-convert": {
      const { convertData } = await import("../engines/data/data-engine");
      progress(20, "Converting data…");
      const file = new File([buffers[0]], names[0] ?? "data.json");
      return convertData(file, {
        to: (options.to as "json" | "csv" | "xlsx") ?? "csv",
      });
    }
    case "image-convert": {
      const { batchConvertImages } = await import(
        "../engines/image/image-engine"
      );
      progress(20, "Converting images…");
      const files = buffers.map(
        (b, i) => new File([b], names[i] ?? `image-${i}.png`)
      );
      return batchConvertImages(files, {
        format: (options.format as "jpg" | "png" | "webp") ?? "webp",
        quality: 0.85,
      });
    }
    case "file-hash": {
      const { computeFileHashes } = await import("../engines/data/data-engine");
      progress(20, "Hashing file…");
      const file = new File([buffers[0]], names[0] ?? "file.bin");
      const hashRes = await computeFileHashes(file, {
        algorithms: ["sha-256", "sha-1", "md5"],
      });
      const blob = new Blob([JSON.stringify(hashRes.hashes, null, 2)], {
        type: "application/json",
      });
      return {
        data: blob,
        filename: `${file.name}_checksums.json`,
        mimeType: "application/json",
        durationMs: hashRes.durationMs,
        sizeBytes: blob.size,
      };
    }
    default:
      throw new Error(`Worker action not supported: ${action}`);
  }
}

self.onmessage = async (e: MessageEvent<WorkerRequest>) => {
  const msg = e.data;

  if (msg.type === "init") {
    post({ type: "ready" });
    return;
  }

  if (msg.type === "cancel") {
    if (msg.taskId) cancelled.add(msg.taskId);
    return;
  }

  if (msg.type === "terminate") {
    self.close();
    return;
  }

  if (msg.type === "execute") {
    const { taskId, action, payload } = msg;
    try {
      cancelled.delete(taskId);
      const result = await runAction(action, payload ?? {}, taskId);
      if (cancelled.has(taskId)) {
        post({
          type: "error",
          taskId,
          error: { code: "CANCELLED", message: "Task cancelled" },
        });
        return;
      }
      await serializeResult(taskId, result);
    } catch (err) {
      post({
        type: "error",
        taskId,
        error: {
          code: "WORKER_ERROR",
          message: err instanceof Error ? err.message : String(err),
        },
      });
    }
  }
};
