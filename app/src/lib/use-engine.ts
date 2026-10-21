// ============================================================================
// useEngine — Generic React hook for any engine worker
// ============================================================================

"use client";

import { useState, useCallback, useRef } from "react";
import type {
  TaskState,
  TaskProgress,
  TaskResult,
  BatchTaskResult,
  TaskError,
  UseEngineReturn,
} from "./types";
import {
  WorkerController,
  createIdleProgress,
  type ProgressCallback,
} from "./worker-pool";

/**
 * Generic hook that manages a WorkerController lifecycle for any engine.
 * Each engine module wraps this with its own worker URL and typed options.
 */
export function useEngine<TOptions = Record<string, unknown>>(
  workerUrl: string | URL | (() => Worker)
): UseEngineReturn<TOptions> {
  const [state, setState] = useState<TaskState>("idle");
  const [progress, setProgress] = useState<TaskProgress>(createIdleProgress());
  const [error, setError] = useState<TaskError | null>(null);

  const controllerRef = useRef<WorkerController | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const getController = useCallback((): WorkerController => {
    if (!controllerRef.current) {
      const url =
        typeof workerUrl === "function"
          ? // For Next.js worker URL pattern: new Worker(new URL(...))
            // We pass the URL string; the function form is for the hook consumer
            (workerUrl as unknown as string | URL)
          : workerUrl;
      controllerRef.current = new WorkerController(url);
    }
    return controllerRef.current;
  }, [workerUrl]);

  const onProgress: ProgressCallback = useCallback((p: TaskProgress) => {
    setProgress(p);
    setState(p.state);
  }, []);

  const execute = useCallback(
    async (
      files: File | File[],
      action: string,
      options?: TOptions
    ): Promise<TaskResult | BatchTaskResult> => {
      const controller = getController();
      abortRef.current = new AbortController();

      setError(null);
      setState("loading-wasm");
      setProgress({
        state: "loading-wasm",
        percent: -1,
        message: "Initializing engine...",
      });

      try {
        await controller.init();

        setState("processing");
        setProgress({
          state: "processing",
          percent: 0,
          message: "Processing...",
        });

        const fileArray = Array.isArray(files) ? files : [files];
        const buffers = await Promise.all(
          fileArray.map((f) => f.arrayBuffer())
        );

        const payload: Record<string, unknown> = {
          ...((options as Record<string, unknown>) ?? {}),
          action,
          fileNames: fileArray.map((f) => f.name),
          fileSizes: fileArray.map((f) => f.size),
          fileMimeTypes: fileArray.map((f) => f.type),
          fileBuffers: buffers,
        };

        const result = await controller.execute(
          action,
          payload,
          onProgress,
          buffers
        );

        setState("completed");
        setProgress({
          state: "completed",
          percent: 100,
          message: "Done!",
        });

        return result;
      } catch (err) {
        const taskError: TaskError =
          err && typeof err === "object" && "code" in err
            ? (err as TaskError)
            : {
                code: "UNKNOWN_ERROR",
                message:
                  err instanceof Error ? err.message : "Unknown error occurred",
              };

        setState("error");
        setError(taskError);
        setProgress({
          state: "error",
          percent: 0,
          message: taskError.message,
        });

        throw taskError;
      }
    },
    [getController, onProgress]
  );

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    controllerRef.current?.cancel();
    setState("cancelled");
    setProgress({
      state: "cancelled",
      percent: 0,
      message: "Cancelled",
    });
  }, []);

  const reset = useCallback(() => {
    controllerRef.current?.terminate();
    controllerRef.current = null;
    setState("idle");
    setProgress(createIdleProgress());
    setError(null);
  }, []);

  return {
    state,
    progress,
    execute,
    cancel,
    reset,
    isProcessing: state === "processing" || state === "loading-wasm",
    error,
  };
}
