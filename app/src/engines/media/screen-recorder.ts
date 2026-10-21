// ============================================================================
// Screen Recorder — MediaRecorder + getDisplayMedia wrapper
// ============================================================================

import type { TaskResult, ScreenRecordOptions } from "@/lib/types";

export class ScreenRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private chunks: Blob[] = [];
  private startTime = 0;
  private onStatusChange?: (recording: boolean) => void;

  constructor(onStatusChange?: (recording: boolean) => void) {
    this.onStatusChange = onStatusChange;
  }

  /** Start recording screen/tab. */
  async start(options: ScreenRecordOptions = {}): Promise<void> {
    if (this.mediaRecorder) {
      throw new Error("Already recording");
    }

    const displayStream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: options.includeSystemAudio !== false,
    });

    const tracks: MediaStreamTrack[] = [...displayStream.getTracks()];

    // Optionally add microphone
    if (options.includeMic) {
      try {
        const micStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        tracks.push(...micStream.getAudioTracks());
      } catch {
        console.warn("Microphone access denied, recording without mic");
      }
    }

    this.stream = new MediaStream(tracks);
    this.chunks = [];
    this.startTime = performance.now();

    const mimeType = options.format === "mp4"
      ? "video/mp4"
      : "video/webm;codecs=vp9,opus";

    // Check if the MIME type is supported
    const actualMime = MediaRecorder.isTypeSupported(mimeType)
      ? mimeType
      : "video/webm";

    this.mediaRecorder = new MediaRecorder(this.stream, {
      mimeType: actualMime,
      videoBitsPerSecond: options.videoBitrate ?? 2500000,
    });

    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        this.chunks.push(e.data);
      }
    };

    // Handle stream ending (user clicks "Stop sharing")
    displayStream.getVideoTracks()[0]?.addEventListener("ended", () => {
      this.stop();
    });

    this.mediaRecorder.start(1000); // Collect data every second
    this.onStatusChange?.(true);
  }

  /** Stop recording and return the result. */
  async stop(): Promise<TaskResult> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder || this.mediaRecorder.state === "inactive") {
        reject(new Error("Not recording"));
        return;
      }

      this.mediaRecorder.onstop = () => {
        const mimeType = this.mediaRecorder?.mimeType ?? "video/webm";
        const blob = new Blob(this.chunks, { type: mimeType });
        const ext = mimeType.includes("mp4") ? "mp4" : "webm";
        const durationMs = performance.now() - this.startTime;

        // Cleanup
        this.stream?.getTracks().forEach((track) => track.stop());
        this.stream = null;
        this.mediaRecorder = null;
        this.chunks = [];
        this.onStatusChange?.(false);

        resolve({
          data: blob,
          filename: `recording_${Date.now()}.${ext}`,
          mimeType,
          durationMs,
          sizeBytes: blob.size,
        });
      };

      this.mediaRecorder.stop();
    });
  }

  /** Pause recording. */
  pause(): void {
    if (this.mediaRecorder?.state === "recording") {
      this.mediaRecorder.pause();
    }
  }

  /** Resume recording. */
  resume(): void {
    if (this.mediaRecorder?.state === "paused") {
      this.mediaRecorder.resume();
    }
  }

  /** Check if currently recording. */
  get isRecording(): boolean {
    return this.mediaRecorder?.state === "recording";
  }

  /** Check if paused. */
  get isPaused(): boolean {
    return this.mediaRecorder?.state === "paused";
  }
}

export function createScreenRecorder(
  onStatusChange?: (recording: boolean) => void
): ScreenRecorder {
  return new ScreenRecorder(onStatusChange);
}
