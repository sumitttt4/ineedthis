// ============================================================================
// Core Type Definitions — Unified Job Queue & Worker Protocol
// ============================================================================

/** Task state machine: every operation follows this lifecycle. */
export type TaskState =
  | "idle"
  | "loading-wasm"
  | "processing"
  | "completed"
  | "error"
  | "cancelled";

/** Progress update emitted by workers/engines during processing. */
export interface TaskProgress {
  /** Current state of the task. */
  state: TaskState;
  /** Progress percentage 0-100. -1 if indeterminate. */
  percent: number;
  /** Human-readable status message. */
  message: string;
  /** Optional: bytes processed so far. */
  bytesProcessed?: number;
  /** Optional: total bytes to process. */
  bytesTotal?: number;
  /** Optional: current sub-step label (e.g., "Extracting audio..."). */
  substep?: string;
}

/** Result returned when a task completes successfully. */
export interface TaskResult<T = Blob> {
  /** The output data. */
  data: T;
  /** Output filename suggestion. */
  filename: string;
  /** MIME type of the output. */
  mimeType: string;
  /** Processing duration in milliseconds. */
  durationMs: number;
  /** Output size in bytes. */
  sizeBytes: number;
}

/** Multiple file outputs (e.g., split PDF, batch conversion). */
export interface BatchTaskResult {
  files: TaskResult[];
  /** Total processing duration in milliseconds. */
  totalDurationMs: number;
}

/** Error details for failed tasks. */
export interface TaskError {
  code: string;
  message: string;
  details?: unknown;
}

// ============================================================================
// Worker Message Protocol
// ============================================================================

/** Messages sent FROM the main thread TO the worker. */
export type WorkerRequest =
  | {
      type: "init";
      /** Optional WASM URLs or config for the worker. */
      config?: Record<string, unknown>;
    }
  | {
      type: "execute";
      taskId: string;
      action: string;
      payload: Record<string, unknown>;
      /** Transferable ArrayBuffers are listed separately. */
      transfers?: ArrayBuffer[];
    }
  | {
      type: "cancel";
      taskId: string;
    }
  | {
      type: "terminate";
    };

/** Messages sent FROM the worker TO the main thread. */
export type WorkerResponse =
  | {
      type: "ready";
    }
  | {
      type: "progress";
      taskId: string;
      progress: TaskProgress;
    }
  | {
      type: "result";
      taskId: string;
      data: ArrayBuffer | ArrayBuffer[];
      metadata: Omit<TaskResult, "data"> & { data?: never };
    }
  | {
      type: "batch-result";
      taskId: string;
      files: Array<{
        data: ArrayBuffer;
        metadata: Omit<TaskResult, "data"> & { data?: never };
      }>;
      totalDurationMs: number;
    }
  | {
      type: "error";
      taskId: string;
      error: TaskError;
    };

// ============================================================================
// File Inspection & Router Types
// ============================================================================

/** Supported file categories. */
export type FileCategory =
  | "pdf"
  | "image"
  | "video"
  | "audio"
  | "document"
  | "spreadsheet"
  | "presentation"
  | "archive"
  | "data"
  | "text"
  | "unknown";

/** A detected file with its metadata and valid actions. */
export interface InspectedFile {
  /** Original file reference. */
  file: File;
  /** Detected MIME type (from magic bytes, fallback to extension). */
  mimeType: string;
  /** File category. */
  category: FileCategory;
  /** File extension (lowercase, without dot). */
  extension: string;
  /** Valid pipeline actions for this file type. */
  actions: string[];
}

// ============================================================================
// Hook Return Types
// ============================================================================

/** Standard return type for all engine hooks. */
export interface UseEngineReturn<TOptions = Record<string, unknown>> {
  /** Current task state. */
  state: TaskState;
  /** Current progress info. */
  progress: TaskProgress;
  /** Execute a task. Returns the result or throws. */
  execute: (
    files: File | File[],
    action: string,
    options?: TOptions
  ) => Promise<TaskResult | BatchTaskResult>;
  /** Cancel the current task. */
  cancel: () => void;
  /** Reset to idle state. */
  reset: () => void;
  /** Whether a task is currently running. */
  isProcessing: boolean;
  /** Last error, if any. */
  error: TaskError | null;
}

// ============================================================================
// PDF-specific Option Types
// ============================================================================

export interface PdfMergeOptions {
  /** Files to merge, in order. */
  files: File[];
}

export interface PdfSplitOptions {
  mode: "ranges" | "individual" | "half" | "size-limit";
  /** Page ranges like ["1-3", "5-8"]. For mode="ranges". */
  ranges?: string[];
  /** Max bytes per chunk. For mode="size-limit". */
  maxBytes?: number;
}

export interface PdfOrganizeOptions {
  /** New page order (0-indexed). */
  pageOrder?: number[];
  /** Pages to delete (0-indexed). */
  deletePages?: number[];
  /** Pages to rotate with degrees. */
  rotations?: Array<{ page: number; degrees: 90 | 180 | 270 }>;
}

export interface PdfCompressOptions {
  /** Target DPI for embedded images. Default: 150. */
  targetDpi?: number;
  /** JPEG quality 0-1 for recompressing images. Default: 0.65. */
  imageQuality?: number;
}

export interface PdfSecurityOptions {
  action: "unlock" | "protect";
  password: string;
  /** For protect: new owner password. */
  ownerPassword?: string;
}

export interface PdfWatermarkOptions {
  /** Text to stamp. */
  text?: string;
  /** Image to stamp (PNG with transparency). */
  imageData?: ArrayBuffer;
  /** Font size for text watermarks. */
  fontSize?: number;
  /** Opacity 0-1. */
  opacity?: number;
  /** Position. */
  position?: "center" | "top-left" | "top-right" | "bottom-left" | "bottom-right";
  /** Rotation in degrees. */
  rotation?: number;
}

export interface PdfSignOptions {
  /** Signature image (PNG). */
  signatureImage: ArrayBuffer;
  /** Page to sign (0-indexed). */
  page: number;
  /** Position rectangle [x, y, width, height]. */
  rect: [number, number, number, number];
}

export interface PdfRedactOptions {
  /** Regex patterns to search for. */
  patterns: string[];
  /** Whether to use built-in PII patterns. */
  useBuiltInPatterns?: boolean;
}

export interface PdfPageNumberOptions {
  /** Start number. Default: 1. */
  startNumber?: number;
  /** Position. */
  position?: "top-left" | "top-center" | "top-right" | "bottom-left" | "bottom-center" | "bottom-right";
  /** Font size. Default: 12. */
  fontSize?: number;
  /** Format string. Use {n} for page number, {total} for total pages. */
  format?: string;
}

// ============================================================================
// Media-specific Option Types
// ============================================================================

export interface VideoCompressOptions {
  /** Target file size in bytes. */
  targetSizeBytes: number;
  /** Audio bitrate in kbps. Default: 128. */
  audioBitrate?: number;
}

export interface VideoTrimOptions {
  /** Start time in seconds. */
  startTime: number;
  /** End time in seconds. */
  endTime: number;
  /** If true, re-encode for frame accuracy. Default: false (stream copy). */
  frameAccurate?: boolean;
}

export interface VideoToGifOptions {
  /** Output FPS. Default: 15. Range: 10-30. */
  fps?: number;
  /** Output width in pixels. Height auto-scales. Default: 480. */
  width?: number;
  /** Loop count. 0 = infinite. Default: 0. */
  loop?: number;
}

export interface AudioConvertOptions {
  /** Target format. */
  format: "mp3" | "wav" | "m4a" | "ogg" | "opus";
  /** Bitrate in kbps. Default: 192. */
  bitrate?: number;
}

export interface AudioTrimOptions {
  startTime: number;
  endTime: number;
  /** Fade in duration in seconds. Default: 0. */
  fadeIn?: number;
  /** Fade out duration in seconds. Default: 0. */
  fadeOut?: number;
  /** Output format. Default: "mp3". */
  format?: "mp3" | "m4r";
}

export interface AudioBoostOptions {
  /** Gain in dB. Positive = louder, negative = quieter. */
  gainDb?: number;
  /** If true, apply loudnorm filter instead of raw gain. */
  normalize?: boolean;
}

export interface ScreenRecordOptions {
  /** Include microphone audio. Default: false. */
  includeMic?: boolean;
  /** Include system audio. Default: true. */
  includeSystemAudio?: boolean;
  /** Output format. Default: "webm". */
  format?: "webm" | "mp4";
  /** Video bitrate in bps. Default: 2500000. */
  videoBitrate?: number;
}

// ============================================================================
// Image-specific Option Types
// ============================================================================

export interface ImageConvertOptions {
  /** Target format. */
  format: "jpg" | "png" | "webp";
  /** Quality 0-1 for lossy formats. Default: 0.85. */
  quality?: number;
}

export interface ImageCompressOptions {
  /** Maximum output size in bytes. */
  maxSizeBytes: number;
  /** Minimum acceptable quality 0-1. Default: 0.1. */
  minQuality?: number;
}

export interface ImageResizeOptions {
  /** Target width. */
  width?: number;
  /** Target height. */
  height?: number;
  /** Maintain aspect ratio. Default: true. */
  maintainAspectRatio?: boolean;
}

export interface PassportPhotoOptions {
  /** Preset size name or custom dimensions in mm. */
  size: "35x45mm" | "2x2inch" | "51x51mm" | { widthMm: number; heightMm: number };
  /** Number of copies to tile. */
  copies: 4 | 6 | 8;
  /** Print sheet size. */
  sheetSize: "4x6" | "A4";
  /** DPI for output. Default: 300. */
  dpi?: number;
}

export interface FaviconOptions {
  /** Source image. Must be square or will be center-cropped. */
  sizes?: number[];
  /** Include site.webmanifest. Default: true. */
  includeManifest?: boolean;
}

// ============================================================================
// Data/Archive-specific Option Types
// ============================================================================

export interface ArchiveExtractOptions {
  /** Extract only specific file paths. Empty = extract all. */
  filterPaths?: string[];
}

export interface DataConvertOptions {
  from: "json" | "csv" | "xlsx";
  to: "json" | "csv" | "xlsx";
  /** Sheet name/index for xlsx. Default: first sheet. */
  sheet?: string | number;
}

export interface FileHashOptions {
  algorithms: Array<"sha-256" | "sha-1" | "md5">;
}

export interface QrCodeOptions {
  /** QR content. */
  content: string;
  /** Output format. */
  format: "svg" | "png";
  /** Size in pixels for PNG. Default: 512. */
  size?: number;
  /** Error correction level. Default: "M". */
  errorCorrection?: "L" | "M" | "Q" | "H";
}

export interface WebRtcTransferOptions {
  /** Chunk size in bytes. Default: 65536 (64KB). */
  chunkSize?: number;
}
