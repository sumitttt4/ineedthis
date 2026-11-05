// ============================================================================
// WorkerPool — Manages Web Worker lifecycle, job dispatch, and progress relay
// ============================================================================

import type {
  TaskProgress,
  TaskResult,
  BatchTaskResult,
  TaskError,
  WorkerRequest,
  WorkerResponse,
} from "./types";

/** Generate a unique task ID. */
let _taskCounter = 0;
export function generateTaskId(): string {
  return `task-${Date.now()}-${++_taskCounter}`;
}

/** Callback for progress updates. */
export type ProgressCallback = (progress: TaskProgress) => void;

/** Pending task entry in the worker pool. */
interface PendingTask {
  taskId: string;
  resolve: (result: TaskResult | BatchTaskResult) => void;
  reject: (error: TaskError) => void;
  onProgress?: ProgressCallback;
  startTime: number;
}

/**
 * WorkerController wraps a single Web Worker with typed messaging,
 * progress relay, and cleanup.
 */
export class WorkerController {
  private worker: Worker | null = null;
  private pendingTasks = new Map<string, PendingTask>();
  private isReady = false;
  private readyPromise: Promise<void> | null = null;
  private workerFactory: string | URL | (() => Worker);
  private objectUrls: string[] = [];

  constructor(workerFactory: string | URL | (() => Worker)) {
    this.workerFactory = workerFactory;
  }

  /** Lazily initialize the worker on first use. */
  async init(config?: Record<string, unknown>): Promise<void> {
    if (this.readyPromise) return this.readyPromise;

    this.readyPromise = new Promise<void>((resolve, reject) => {
      try {
        this.worker =
          typeof this.workerFactory === "function"
            ? this.workerFactory()
            : new Worker(this.workerFactory, { type: "module" });

        const onReady = (e: MessageEvent<WorkerResponse>) => {
          if (e.data.type === "ready") {
            this.isReady = true;
            this.worker!.removeEventListener("message", onReady);
            this.worker!.addEventListener("message", this.handleMessage);
            resolve();
          }
        };

        this.worker.addEventListener("message", onReady);
        this.worker.addEventListener("error", (err) => {
          if (!this.isReady) {
            reject(
              new Error(`Worker failed to initialize: ${err.message}`)
            );
          }
        });

        // Send init message
        this.postMessage({ type: "init", config });
      } catch (err) {
        reject(err);
      }
    });

    return this.readyPromise;
  }

  /** Execute a task on this worker. */
  async execute(
    action: string,
    payload: Record<string, unknown>,
    onProgress?: ProgressCallback,
    transfers?: ArrayBuffer[]
  ): Promise<TaskResult | BatchTaskResult> {
    if (!this.isReady || !this.worker) {
      await this.init();
    }

    const taskId = generateTaskId();

    return new Promise<TaskResult | BatchTaskResult>((resolve, reject) => {
      this.pendingTasks.set(taskId, {
        taskId,
        resolve,
        reject,
        onProgress,
        startTime: performance.now(),
      });

      const msg: WorkerRequest = {
        type: "execute",
        taskId,
        action,
        payload,
      };

      if (transfers && transfers.length > 0) {
        this.worker!.postMessage(msg, transfers);
      } else {
        this.postMessage(msg);
      }
    });
  }

  /** Cancel a running task. */
  cancel(taskId?: string): void {
    if (taskId) {
      this.postMessage({ type: "cancel", taskId });
      const pending = this.pendingTasks.get(taskId);
      if (pending) {
        pending.reject({ code: "CANCELLED", message: "Task cancelled by user" });
        this.pendingTasks.delete(taskId);
      }
    } else {
      // Cancel all pending tasks
      for (const [id, pending] of this.pendingTasks) {
        this.postMessage({ type: "cancel", taskId: id });
        pending.reject({ code: "CANCELLED", message: "Task cancelled by user" });
      }
      this.pendingTasks.clear();
    }
  }

  /** Terminate the worker and clean up all resources. */
  terminate(): void {
    this.cancel();
    if (this.worker) {
      this.postMessage({ type: "terminate" });
      this.worker.terminate();
      this.worker = null;
    }
    this.isReady = false;
    this.readyPromise = null;
    // Revoke any object URLs
    for (const url of this.objectUrls) {
      URL.revokeObjectURL(url);
    }
    this.objectUrls = [];
  }

  /** Track an object URL for cleanup. */
  trackObjectUrl(url: string): void {
    this.objectUrls.push(url);
  }

  private postMessage(msg: WorkerRequest): void {
    this.worker?.postMessage(msg);
  }

  private handleMessage = (e: MessageEvent<WorkerResponse>): void => {
    const msg = e.data;

    switch (msg.type) {
      case "progress": {
        const pending = this.pendingTasks.get(msg.taskId);
        pending?.onProgress?.(msg.progress);
        break;
      }
      case "result": {
        const pending = this.pendingTasks.get(msg.taskId);
        if (pending) {
          const durationMs = performance.now() - pending.startTime;
          const buffer = Array.isArray(msg.data) ? msg.data[0] : msg.data;
          const blob = new Blob([buffer], {
            type: msg.metadata.mimeType,
          });
          pending.resolve({
            data: blob,
            filename: msg.metadata.filename,
            mimeType: msg.metadata.mimeType,
            durationMs,
            sizeBytes: buffer.byteLength,
          });
          this.pendingTasks.delete(msg.taskId);
        }
        break;
      }
      case "batch-result": {
        const pending = this.pendingTasks.get(msg.taskId);
        if (pending) {
          const durationMs = performance.now() - pending.startTime;
          const files: TaskResult[] = msg.files.map((f) => {
            const blob = new Blob([f.data], { type: f.metadata.mimeType });
            return {
              data: blob,
              filename: f.metadata.filename,
              mimeType: f.metadata.mimeType,
              durationMs,
              sizeBytes: f.data.byteLength,
            };
          });
          pending.resolve({ files, totalDurationMs: durationMs });
          this.pendingTasks.delete(msg.taskId);
        }
        break;
      }
      case "error": {
        const pending = this.pendingTasks.get(msg.taskId);
        if (pending) {
          pending.reject(msg.error);
          this.pendingTasks.delete(msg.taskId);
        }
        break;
      }
    }
  };
}

// ============================================================================
// Helper: Create object URL for download and auto-track for cleanup
// ============================================================================

export function createDownloadUrl(result: TaskResult): string {
  const url = URL.createObjectURL(result.data as Blob);
  return url;
}

export function downloadResult(result: TaskResult): void {
  const url = createDownloadUrl(result);
  const a = document.createElement("a");
  a.href = url;
  a.download = result.filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Revoke after a brief delay to allow download to start
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export function downloadBatchResult(batch: BatchTaskResult): void {
  for (const file of batch.files) {
    downloadResult(file);
  }
}

// ============================================================================
// Default progress factory
// ============================================================================

export function createIdleProgress(): TaskProgress {
  return {
    state: "idle",
    percent: 0,
    message: "Ready",
  };
}

export function createLoadingProgress(message = "Loading WASM module..."): TaskProgress {
  return {
    state: "loading-wasm",
    percent: -1,
    message,
  };
}

export function createProcessingProgress(
  percent: number,
  message: string,
  substep?: string
): TaskProgress {
  return {
    state: "processing",
    percent: Math.max(0, Math.min(100, percent)),
    message,
    substep,
  };
}
