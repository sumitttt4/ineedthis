// ============================================================================
// FFmpeg Worker Manager — Singleton managing @ffmpeg/ffmpeg WASM instance
// ============================================================================

// Dynamic import types
type FFmpegInstance = any;
import type {
  TaskResult,
  VideoCompressOptions,
  VideoTrimOptions,
  VideoToGifOptions,
  AudioConvertOptions,
  AudioTrimOptions,
  AudioBoostOptions,
} from "@/lib/types";
import type { ProgressCallback } from "@/lib/worker-pool";

// ============================================================================
// Singleton FFmpeg Manager
// ============================================================================

class FFmpegManager {
  private ffmpeg: any = null;
  private loaded = false;
  private loading: Promise<void> | null = null;

  /** Lazy-load FFmpeg WASM. */
  async ensureLoaded(onProgress?: ProgressCallback): Promise<any> {
    if (this.ffmpeg && this.loaded) return this.ffmpeg;
    if (this.loading) {
      await this.loading;
      return this.ffmpeg!;
    }

    this.loading = (async () => {
      onProgress?.({
        state: "loading-wasm",
        percent: -1,
        message: "Loading FFmpeg WASM...",
      });

      const { FFmpeg } = await import("@ffmpeg/ffmpeg");
      const { toBlobURL } = await import("@ffmpeg/util");

      this.ffmpeg = new FFmpeg();

      // Progress logging
      this.ffmpeg.on("log", ({ message }: { message: string }) => {
        // Parse FFmpeg progress output
        const timeMatch = message.match(/time=(\d+:\d+:\d+\.\d+)/);
        if (timeMatch) {
          onProgress?.({
            state: "processing",
            percent: -1, // FFmpeg doesn't give total easily
            message: `Encoding... ${timeMatch[1]}`,
            substep: message,
          });
        }
      });

      this.ffmpeg.on("progress", ({ progress, time }: { progress: number; time: number }) => {
        onProgress?.({
          state: "processing",
          percent: Math.round(progress * 100),
          message: `Processing... ${Math.round(progress * 100)}%`,
          substep: `Time: ${(time / 1000000).toFixed(1)}s`,
        });
      });

      // Load from CDN with proper CORS headers
      // Prefer locally hosted core assets for offline/PWA reliability.
      await this.ffmpeg.load({
        coreURL: await toBlobURL("/ffmpeg/ffmpeg-core.js", "text/javascript"),
        wasmURL: await toBlobURL("/ffmpeg/ffmpeg-core.wasm", "application/wasm"),
      });

      this.loaded = true;
    })();

    await this.loading;
    return this.ffmpeg!;
  }

  /** Write a file into FFmpeg's virtual filesystem. */
  async writeFile(name: string, data: ArrayBuffer | Uint8Array | File): Promise<void> {
    const ff = await this.ensureLoaded();
    if (data instanceof File) {
      const buf = new Uint8Array(await data.arrayBuffer());
      await ff.writeFile(name, buf);
    } else {
      await ff.writeFile(name, new Uint8Array(data));
    }
  }

  /** Read a file from FFmpeg's virtual filesystem. */
  async readFile(name: string): Promise<Uint8Array> {
    const ff = await this.ensureLoaded();
    const data = await ff.readFile(name);
    if (typeof data === "string") {
      return new TextEncoder().encode(data);
    }
    return data;
  }

  /** Execute FFmpeg command. */
  async exec(args: string[]): Promise<void> {
    const ff = await this.ensureLoaded();
    await ff.exec(args);
  }

  /** Delete a file from the virtual FS. */
  async deleteFile(name: string): Promise<void> {
    const ff = await this.ensureLoaded();
    try {
      await ff.deleteFile(name);
    } catch {
      // File may not exist
    }
  }

  /** Terminate the FFmpeg instance. */
  terminate(): void {
    if (this.ffmpeg) {
      this.ffmpeg.terminate();
      this.ffmpeg = null;
      this.loaded = false;
      this.loading = null;
    }
  }
}

/** Singleton instance. */
export const ffmpegManager = new FFmpegManager();

// ============================================================================
// Helper: get media duration in seconds via FFprobe-like approach
// ============================================================================

async function getMediaDuration(inputName: string): Promise<number> {
  // FFmpeg in browser doesn't have ffprobe. We extract duration from
  // a quick null-output pass.
  let duration = 0;
  const ff = await ffmpegManager.ensureLoaded();

  // Capture log for duration
  const logHandler = ({ message }: { message: string }) => {
    const match = message.match(/Duration:\s*(\d+):(\d+):(\d+)\.(\d+)/);
    if (match) {
      duration =
        parseInt(match[1]) * 3600 +
        parseInt(match[2]) * 60 +
        parseInt(match[3]) +
        parseInt(match[4]) / 100;
    }
  };

  ff.on("log", logHandler);
  // Run a fast null output to get metadata
  try {
    await ff.exec(["-i", inputName, "-f", "null", "-"]);
  } catch {
    // Expected to "fail" since -f null is not always clean
  }
  ff.off("log", logHandler);

  return duration;
}

function getExtension(filename: string): string {
  return filename.split(".").pop()?.toLowerCase() ?? "";
}

function makeResult(
  data: Uint8Array,
  filename: string,
  mimeType: string,
  startTime: number
): TaskResult {
  return {
    data: new Blob([data as unknown as BlobPart], { type: mimeType }),
    filename,
    mimeType,
    durationMs: performance.now() - startTime,
    sizeBytes: data.byteLength,
  };
}

// ============================================================================
// 1. Target-MB Video Compressor
// ============================================================================

export async function compressVideo(
  file: File,
  options: VideoCompressOptions,
  onProgress?: ProgressCallback
): Promise<TaskResult> {
  const t = performance.now();
  const ff = await ffmpegManager.ensureLoaded(onProgress);
  const inputName = `input.${getExtension(file.name) || "mp4"}`;
  const outputName = "output.mp4";

  await ffmpegManager.writeFile(inputName, file);

  // Get duration
  const duration = await getMediaDuration(inputName);
  if (duration <= 0) throw new Error("Could not determine video duration");

  // Calculate bitrate
  const targetBits = options.targetSizeBytes * 8;
  const audioBitrate = (options.audioBitrate ?? 128) * 1000;
  const videoBitrate = Math.max(
    50000, // minimum 50kbps
    Math.floor(targetBits / duration - audioBitrate)
  );

  onProgress?.({
    state: "processing",
    percent: 5,
    message: `Compressing to ~${(options.targetSizeBytes / 1024 / 1024).toFixed(1)}MB (${Math.round(videoBitrate / 1000)}kbps video)...`,
  });

  await ffmpegManager.exec([
    "-i", inputName,
    "-c:v", "libx264",
    "-b:v", `${videoBitrate}`,
    "-c:a", "aac",
    "-b:a", `${audioBitrate}`,
    "-preset", "fast",
    "-movflags", "+faststart",
    "-y", outputName,
  ]);

  const data = await ffmpegManager.readFile(outputName);
  await ffmpegManager.deleteFile(inputName);
  await ffmpegManager.deleteFile(outputName);

  const baseName = file.name.replace(/\.[^.]+$/, "");
  return makeResult(data, `${baseName}_compressed.mp4`, "video/mp4", t);
}

// ============================================================================
// 2. Lossless Stream-Copy Trimmer
// ============================================================================

export async function trimVideo(
  file: File,
  options: VideoTrimOptions,
  onProgress?: ProgressCallback
): Promise<TaskResult> {
  const t = performance.now();
  await ffmpegManager.ensureLoaded(onProgress);

  const ext = getExtension(file.name) || "mp4";
  const inputName = `input.${ext}`;
  const outputName = `output.${ext}`;

  await ffmpegManager.writeFile(inputName, file);

  const args = [
    "-i", inputName,
    "-ss", String(options.startTime),
    "-to", String(options.endTime),
  ];

  if (options.frameAccurate) {
    args.push("-c:v", "libx264", "-preset", "fast", "-c:a", "aac");
  } else {
    args.push("-c", "copy");
  }

  args.push("-y", outputName);

  onProgress?.({
    state: "processing",
    percent: 30,
    message: options.frameAccurate ? "Re-encoding for frame accuracy..." : "Stream-copy trimming...",
  });

  await ffmpegManager.exec(args);

  const data = await ffmpegManager.readFile(outputName);
  await ffmpegManager.deleteFile(inputName);
  await ffmpegManager.deleteFile(outputName);

  const mimeMap: Record<string, string> = {
    mp4: "video/mp4", webm: "video/webm", mkv: "video/x-matroska",
    mov: "video/quicktime", avi: "video/avi",
    mp3: "audio/mpeg", wav: "audio/wav", m4a: "audio/mp4",
    ogg: "audio/ogg", opus: "audio/opus", flac: "audio/flac",
  };

  const baseName = file.name.replace(/\.[^.]+$/, "");
  return makeResult(
    data,
    `${baseName}_trimmed.${ext}`,
    mimeMap[ext] ?? "video/mp4",
    t
  );
}

// ============================================================================
// 3. Universal MP4 Remuxer
// ============================================================================

export async function remuxToMp4(
  file: File,
  onProgress?: ProgressCallback
): Promise<TaskResult> {
  const t = performance.now();
  await ffmpegManager.ensureLoaded(onProgress);

  const ext = getExtension(file.name) || "mp4";
  const inputName = `input.${ext}`;
  const outputName = "output.mp4";

  await ffmpegManager.writeFile(inputName, file);

  onProgress?.({
    state: "processing",
    percent: 10,
    message: "Remuxing to MP4...",
  });

  // Try fast remux first
  try {
    await ffmpegManager.exec([
      "-i", inputName,
      "-c:v", "copy",
      "-c:a", "aac",
      "-movflags", "+faststart",
      "-y", outputName,
    ]);
  } catch {
    // Fall back to full transcode
    onProgress?.({
      state: "processing",
      percent: 20,
      message: "Remux failed, transcoding to MP4...",
    });

    await ffmpegManager.exec([
      "-i", inputName,
      "-c:v", "libx264",
      "-preset", "fast",
      "-c:a", "aac",
      "-movflags", "+faststart",
      "-y", outputName,
    ]);
  }

  const data = await ffmpegManager.readFile(outputName);
  await ffmpegManager.deleteFile(inputName);
  await ffmpegManager.deleteFile(outputName);

  const baseName = file.name.replace(/\.[^.]+$/, "");
  return makeResult(data, `${baseName}.mp4`, "video/mp4", t);
}

// ============================================================================
// 4. Optimized Video to GIF (two-pass palette)
// ============================================================================

export async function videoToGif(
  file: File,
  options: VideoToGifOptions = {},
  onProgress?: ProgressCallback
): Promise<TaskResult> {
  const t = performance.now();
  await ffmpegManager.ensureLoaded(onProgress);

  const fps = Math.max(10, Math.min(30, options.fps ?? 15));
  const width = Math.max(160, Math.min(1080, options.width ?? 480));
  const loop = options.loop ?? 0;

  const inputName = `input.${getExtension(file.name) || "mp4"}`;
  const paletteName = "palette.png";
  const outputName = "output.gif";

  await ffmpegManager.writeFile(inputName, file);

  const filterComplex = `fps=${fps},scale=${width}:-1:flags=lanczos`;

  // Pass 1: Generate palette
  onProgress?.({
    state: "processing",
    percent: 20,
    message: "Generating palette...",
  });

  await ffmpegManager.exec([
    "-i", inputName,
    "-vf", `${filterComplex},palettegen=stats_mode=diff`,
    "-y", paletteName,
  ]);

  // Pass 2: Use palette to create GIF
  onProgress?.({
    state: "processing",
    percent: 50,
    message: "Creating GIF...",
  });

  await ffmpegManager.exec([
    "-i", inputName,
    "-i", paletteName,
    "-lavfi", `${filterComplex}[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=5`,
    "-loop", String(loop),
    "-y", outputName,
  ]);

  const data = await ffmpegManager.readFile(outputName);
  await ffmpegManager.deleteFile(inputName);
  await ffmpegManager.deleteFile(paletteName);
  await ffmpegManager.deleteFile(outputName);

  const baseName = file.name.replace(/\.[^.]+$/, "");
  return makeResult(data, `${baseName}.gif`, "image/gif", t);
}

// ============================================================================
// 5a. Mute Video (strip audio)
// ============================================================================

export async function muteVideo(
  file: File,
  onProgress?: ProgressCallback
): Promise<TaskResult> {
  const t = performance.now();
  await ffmpegManager.ensureLoaded(onProgress);

  const ext = getExtension(file.name) || "mp4";
  const inputName = `input.${ext}`;
  const outputName = `output.${ext}`;

  await ffmpegManager.writeFile(inputName, file);

  await ffmpegManager.exec([
    "-i", inputName,
    "-an",
    "-c:v", "copy",
    "-y", outputName,
  ]);

  const data = await ffmpegManager.readFile(outputName);
  await ffmpegManager.deleteFile(inputName);
  await ffmpegManager.deleteFile(outputName);

  const baseName = file.name.replace(/\.[^.]+$/, "");
  return makeResult(data, `${baseName}_muted.${ext}`, `video/${ext}`, t);
}

// ============================================================================
// 5b. Extract Audio from Video
// ============================================================================

export async function extractAudio(
  file: File,
  options: AudioConvertOptions = { format: "mp3" },
  onProgress?: ProgressCallback
): Promise<TaskResult> {
  const t = performance.now();
  await ffmpegManager.ensureLoaded(onProgress);

  const inputName = `input.${getExtension(file.name) || "mp4"}`;
  const outputName = `output.${options.format}`;
  const bitrate = options.bitrate ?? 192;

  await ffmpegManager.writeFile(inputName, file);

  const codecMap: Record<string, string> = {
    mp3: "libmp3lame",
    wav: "pcm_s16le",
    m4a: "aac",
    ogg: "libvorbis",
    opus: "libopus",
  };

  const mimeMap: Record<string, string> = {
    mp3: "audio/mpeg",
    wav: "audio/wav",
    m4a: "audio/mp4",
    ogg: "audio/ogg",
    opus: "audio/opus",
  };

  const args = [
    "-i", inputName,
    "-vn",
    "-c:a", codecMap[options.format] ?? "aac",
  ];

  if (options.format !== "wav") {
    args.push("-b:a", `${bitrate}k`);
  }

  args.push("-y", outputName);

  onProgress?.({
    state: "processing",
    percent: 30,
    message: `Extracting audio as ${options.format.toUpperCase()}...`,
  });

  await ffmpegManager.exec(args);

  const data = await ffmpegManager.readFile(outputName);
  await ffmpegManager.deleteFile(inputName);
  await ffmpegManager.deleteFile(outputName);

  const baseName = file.name.replace(/\.[^.]+$/, "");
  return makeResult(
    data,
    `${baseName}.${options.format}`,
    mimeMap[options.format] ?? "audio/mpeg",
    t
  );
}

// ============================================================================
// 5c. Audio Trim with Fade
// ============================================================================

export async function trimAudio(
  file: File,
  options: AudioTrimOptions,
  onProgress?: ProgressCallback
): Promise<TaskResult> {
  const t = performance.now();
  await ffmpegManager.ensureLoaded(onProgress);

  const inputExt = getExtension(file.name) || "mp3";
  const outputFormat = options.format ?? "mp3";
  const inputName = `input.${inputExt}`;
  const outputName = `output.${outputFormat}`;

  await ffmpegManager.writeFile(inputName, file);

  const filters: string[] = [];
  if (options.fadeIn && options.fadeIn > 0) {
    filters.push(`afade=t=in:st=${options.startTime}:d=${options.fadeIn}`);
  }
  if (options.fadeOut && options.fadeOut > 0) {
    const fadeStart = options.endTime - options.fadeOut;
    filters.push(`afade=t=out:st=${fadeStart}:d=${options.fadeOut}`);
  }

  const args = [
    "-i", inputName,
    "-ss", String(options.startTime),
    "-to", String(options.endTime),
  ];

  if (filters.length > 0) {
    args.push("-af", filters.join(","));
  }

  const codecMap: Record<string, string> = {
    mp3: "libmp3lame",
    m4r: "aac",
  };

  args.push("-c:a", codecMap[outputFormat] ?? "libmp3lame");
  args.push("-y", outputName);

  onProgress?.({
    state: "processing",
    percent: 40,
    message: "Trimming audio...",
  });

  await ffmpegManager.exec(args);

  const data = await ffmpegManager.readFile(outputName);
  await ffmpegManager.deleteFile(inputName);
  await ffmpegManager.deleteFile(outputName);

  const mimeMap: Record<string, string> = {
    mp3: "audio/mpeg",
    m4r: "audio/x-m4r",
  };

  const baseName = file.name.replace(/\.[^.]+$/, "");
  return makeResult(
    data,
    `${baseName}_trimmed.${outputFormat}`,
    mimeMap[outputFormat] ?? "audio/mpeg",
    t
  );
}

// ============================================================================
// 5d. Audio Boost (gain / loudnorm)
// ============================================================================

export async function boostAudio(
  file: File,
  options: AudioBoostOptions = {},
  onProgress?: ProgressCallback
): Promise<TaskResult> {
  const t = performance.now();
  await ffmpegManager.ensureLoaded(onProgress);

  const ext = getExtension(file.name) || "mp3";
  const inputName = `input.${ext}`;
  const outputName = `output.${ext}`;

  await ffmpegManager.writeFile(inputName, file);

  let filter: string;
  if (options.normalize) {
    filter = "loudnorm=I=-16:TP=-1.5:LRA=11";
  } else {
    const gain = options.gainDb ?? 3;
    filter = `volume=${gain}dB`;
  }

  const codecMap: Record<string, string> = {
    mp3: "libmp3lame", wav: "pcm_s16le", m4a: "aac",
    ogg: "libvorbis", opus: "libopus", flac: "flac",
  };

  onProgress?.({
    state: "processing",
    percent: 30,
    message: options.normalize ? "Normalizing audio..." : "Adjusting volume...",
  });

  await ffmpegManager.exec([
    "-i", inputName,
    "-af", filter,
    "-c:a", codecMap[ext] ?? "libmp3lame",
    "-y", outputName,
  ]);

  const data = await ffmpegManager.readFile(outputName);
  await ffmpegManager.deleteFile(inputName);
  await ffmpegManager.deleteFile(outputName);

  const mimeMap: Record<string, string> = {
    mp3: "audio/mpeg", wav: "audio/wav", m4a: "audio/mp4",
    ogg: "audio/ogg", opus: "audio/opus", flac: "audio/flac",
  };

  const baseName = file.name.replace(/\.[^.]+$/, "");
  return makeResult(
    data,
    `${baseName}_boosted.${ext}`,
    mimeMap[ext] ?? "audio/mpeg",
    t
  );
}

// ============================================================================
// 5e. Audio Convert (between formats)
// ============================================================================

export async function convertAudio(
  file: File,
  options: AudioConvertOptions,
  onProgress?: ProgressCallback
): Promise<TaskResult> {
  return extractAudio(file, options, onProgress);
}

// ============================================================================
// Barrel export
// ============================================================================

export const mediaEngine = {
  compressVideo,
  trimVideo,
  remuxToMp4,
  videoToGif,
  muteVideo,
  extractAudio,
  trimAudio,
  boostAudio,
  convertAudio,
  ffmpegManager,
} as const;

export type MediaEngine = typeof mediaEngine;
