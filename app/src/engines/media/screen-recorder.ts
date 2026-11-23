// ============================================================================
// Screen Recorder — MediaRecorder + getDisplayMedia wrapper
// ============================================================================

import type { TaskResult, ScreenRecordOptions } from "@/lib/types";

export interface ScreenRecorderEvents {
  /** Fires when recording starts (true) and when it has fully stopped (false). */
  onStatusChange?: (recording: boolean) => void;
  /**
   * Fires with the finished file when recording ends from outside the app,
   * e.g. the browser's "Stop sharing" button or the shared tab closing.
   */
  onAutoStop?: (result: TaskResult) => void;
}

export class ScreenRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private sources: MediaStream[] = [];
  private audioCtx: AudioContext | null = null;
  private chunks: Blob[] = [];
  private startTime = 0;
  private stopping: Promise<TaskResult> | null = null;
  private events: ScreenRecorderEvents;

  constructor(events: ScreenRecorderEvents = {}) {
    this.events = events;
  }

  /** Start recording a screen, window or tab. Rejects if the user cancels the picker. */
  async start(options: ScreenRecordOptions = {}): Promise<void> {
    if (this.mediaRecorder) throw new Error("Already recording");
    if (!navigator.mediaDevices?.getDisplayMedia) {
      throw new Error("Screen recording isn't supported in this browser. Try Chrome, Edge or Firefox on a computer.");
    }

    const display = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: options.includeSystemAudio !== false,
    });
    this.sources = [display];

    if (options.includeMic) {
      try {
        this.sources.push(await navigator.mediaDevices.getUserMedia({ audio: true }));
      } catch {
        console.warn("Microphone access denied, recording without mic");
      }
    }

    // MediaRecorder only records one audio track, so mix mic + tab/system audio into one.
    const audioTracks = this.sources.flatMap((s) => s.getAudioTracks());
    const tracks: MediaStreamTrack[] = [...display.getVideoTracks()];
    if (audioTracks.length > 1) {
      const ctx = new AudioContext();
      const dest = ctx.createMediaStreamDestination();
      for (const t of audioTracks) ctx.createMediaStreamSource(new MediaStream([t])).connect(dest);
      this.audioCtx = ctx;
      tracks.push(...dest.stream.getAudioTracks());
    } else {
      tracks.push(...audioTracks);
    }
    const stream = new MediaStream(tracks);

    const wanted = options.format === "mp4"
      ? ["video/mp4"]
      : ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm", "video/mp4"];
    const mimeType = wanted.find((m) => MediaRecorder.isTypeSupported(m));

    this.chunks = [];
    this.stopping = null;
    this.startTime = performance.now();
    this.mediaRecorder = new MediaRecorder(stream, {
      ...(mimeType ? { mimeType } : {}),
      videoBitsPerSecond: options.videoBitrate ?? 2500000,
    });
    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.chunks.push(e.data);
    };

    // The browser's "Stop sharing" button (or closing the shared tab) ends the video track.
    // Finish the file and hand it to the app instead of dropping it.
    display.getVideoTracks()[0]?.addEventListener("ended", () => {
      if (this.stopping || !this.mediaRecorder) return;
      this.stop().then((r) => this.events.onAutoStop?.(r)).catch(() => {});
    });

    this.mediaRecorder.start(1000); // collect data every second
    this.events.onStatusChange?.(true);
  }

  /** Stop recording and return the file. Safe to call more than once. */
  stop(): Promise<TaskResult> {
    if (this.stopping) return this.stopping;
    const rec = this.mediaRecorder;
    if (!rec || rec.state === "inactive") return Promise.reject(new Error("Not recording"));

    this.stopping = new Promise<TaskResult>((resolve) => {
      rec.onstop = () => {
        const mimeType = (rec.mimeType || "video/webm").split(";")[0];
        const blob = new Blob(this.chunks, { type: mimeType });
        const ext = mimeType.includes("mp4") ? "mp4" : "webm";
        const durationMs = performance.now() - this.startTime;
        this.cleanup();
        this.events.onStatusChange?.(false);
        resolve({
          data: blob,
          filename: `recording_${new Date().toISOString().slice(0, 19).replace(/[T:]/g, "-")}.${ext}`,
          mimeType,
          durationMs,
          sizeBytes: blob.size,
        });
      };
    });
    rec.stop();
    return this.stopping;
  }

  /** Stop everything without saving (e.g. the dialog was closed). */
  cancel(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
      this.mediaRecorder.onstop = null;
      this.mediaRecorder.stop();
    }
    this.cleanup();
  }

  private cleanup() {
    for (const s of this.sources) s.getTracks().forEach((t) => t.stop());
    this.sources = [];
    this.audioCtx?.close().catch(() => {});
    this.audioCtx = null;
    this.mediaRecorder = null;
    this.chunks = [];
  }

  pause(): void {
    if (this.mediaRecorder?.state === "recording") this.mediaRecorder.pause();
  }

  resume(): void {
    if (this.mediaRecorder?.state === "paused") this.mediaRecorder.resume();
  }

  get isRecording(): boolean {
    return this.mediaRecorder?.state === "recording";
  }

  get isPaused(): boolean {
    return this.mediaRecorder?.state === "paused";
  }
}

export function createScreenRecorder(events?: ScreenRecorderEvents): ScreenRecorder {
  return new ScreenRecorder(events);
}
