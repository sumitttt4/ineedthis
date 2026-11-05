"use client";

import type { BatchTaskResult, TaskProgress, TaskResult } from "./types";
import { WorkerController } from "./worker-pool";

type ProgressCb = (progress: TaskProgress) => void;

let controller: WorkerController | null = null;
let workerFailed = false;

function getController(): WorkerController {
  if (!controller) {
    controller = new WorkerController(
      () => new Worker(new URL("../workers/engine-worker.ts", import.meta.url))
    );
  }
  return controller;
}

/**
 * Run a heavy engine action in a Web Worker when possible.
 * Falls back to the provided main-thread runner if the worker fails to boot
 * (e.g. unsupported bundling edge cases).
 */
export async function runEngineAction(
  action: string,
  files: File[],
  options: Record<string, unknown> = {},
  onProgress?: ProgressCb,
  fallback?: () => Promise<TaskResult | BatchTaskResult>
): Promise<TaskResult | BatchTaskResult> {
  if (workerFailed && fallback) {
    return fallback();
  }

  try {
    const ctrl = getController();
    await ctrl.init();

    const buffers = await Promise.all(files.map((f) => f.arrayBuffer()));
    const payload: Record<string, unknown> = {
      ...options,
      options,
      fileNames: files.map((f) => f.name),
      fileSizes: files.map((f) => f.size),
      fileMimeTypes: files.map((f) => f.type),
      fileBuffers: buffers,
    };

    return await ctrl.execute(action, payload, onProgress, buffers);
  } catch (err) {
    workerFailed = true;
    controller?.terminate();
    controller = null;
    if (fallback) {
      onProgress?.({
        state: "processing",
        percent: 20,
        message: "Worker unavailable — continuing on main thread…",
      });
      return fallback();
    }
    throw err;
  }
}

/** Actions routed through the engine worker. */
export const WORKER_ACTIONS = new Set([
  "pdf-to-docx",
  "pdf-merge",
  "pdf-split",
  "pdf-compress",
  "pdf-to-img",
  "docx-to-pdf",
  "data-convert",
  "image-convert",
  "file-hash",
]);
