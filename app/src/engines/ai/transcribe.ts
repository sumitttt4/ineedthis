/**
 * Speech → text on device. Audio is decoded to 16 kHz mono in the browser
 * (Web Audio, with an ffmpeg.wasm fallback for formats it can't decode) and
 * transcribed by Whisper in a Web Worker. Nothing is uploaded.
 */

export interface Cue {
  text: string;
  start: number;
  end: number;
}

export interface TranscribeOptions {
  model: "tiny" | "base";
  language: string;
  task: "transcribe" | "translate";
  signal?: AbortSignal;
  onProgress?: (p: { phase: string; percent: number; message: string }) => void;
  onPartial?: (cues: Cue[]) => void;
}

async function toMono16k(buf: ArrayBuffer): Promise<Float32Array> {
  const ctx = new OfflineAudioContext(1, 1, 16000);
  const decoded = await ctx.decodeAudioData(buf);
  const length = Math.ceil(decoded.duration * 16000);
  const off = new OfflineAudioContext(1, length, 16000);
  const src = off.createBufferSource();
  src.buffer = decoded;
  src.connect(off.destination); // mixes all channels down to mono
  src.start();
  const rendered = await off.startRendering();
  return rendered.getChannelData(0);
}

export async function decodeAudio(file: File, onProgress?: TranscribeOptions["onProgress"]): Promise<Float32Array> {
  onProgress?.({ phase: "decode", percent: -1, message: "Reading audio…" });
  try {
    return await toMono16k(await file.arrayBuffer());
  } catch {
    // Containers the browser can't decode directly (e.g. some MKV/MOV): extract with ffmpeg first.
    onProgress?.({ phase: "decode", percent: -1, message: "Extracting audio track…" });
    const { convertAudio } = await import("@/engines/media/media-engine");
    const wav = await convertAudio(file, { format: "wav", bitrate: 128 });
    return toMono16k(await (wav.data as Blob).arrayBuffer());
  }
}

export async function transcribe(file: File, opts: TranscribeOptions): Promise<{ cues: Cue[]; duration: number }> {
  const audio = await decodeAudio(file, opts.onProgress);
  if (audio.length < 16000 * 0.3) throw new Error("This file has no audio, or it's too short to transcribe.");
  const worker = new Worker(new URL("../../workers/whisper.worker.ts", import.meta.url), { type: "module" });
  return new Promise((resolve, reject) => {
    const stop = () => {
      worker.terminate();
      reject(new DOMException("Cancelled", "AbortError"));
    };
    opts.signal?.addEventListener("abort", stop, { once: true });
    worker.onmessage = (e) => {
      const m = e.data;
      if (m.type === "progress") opts.onProgress?.(m);
      else if (m.type === "partial") opts.onPartial?.(m.chunks);
      else if (m.type === "done") {
        worker.terminate();
        resolve({ cues: m.chunks, duration: m.duration });
      } else if (m.type === "error") {
        worker.terminate();
        reject(new Error(m.message));
      }
    };
    worker.onerror = (e) => {
      worker.terminate();
      reject(new Error(e.message || "The speech engine failed to start."));
    };
    worker.postMessage({ type: "run", audio, model: opts.model, language: opts.language, task: opts.task }, [audio.buffer]);
  });
}

/* ------------------------------------------------------------------ */
/* Subtitle formatting                                                 */
/* ------------------------------------------------------------------ */

/** Split long segments into readable cues (≤ ~84 chars, ≤ ~6 s), timing by word share. */
export function toCues(segments: Cue[], maxChars = 84, maxDur = 6): Cue[] {
  const out: Cue[] = [];
  for (const seg of segments) {
    const words = seg.text.split(/\s+/).filter(Boolean);
    const dur = Math.max(0.3, seg.end - seg.start);
    const parts = Math.max(1, Math.ceil(seg.text.length / maxChars), Math.ceil(dur / maxDur));
    const per = Math.ceil(words.length / parts);
    // Break near the target size, preferring words that end a clause.
    const breaks: number[] = [];
    for (let target = per; target < words.length; target += per) {
      let best = target;
      for (let k = Math.max(breaks.at(-1) ?? 0, target - 3) + 1; k <= Math.min(words.length - 1, target + 3); k++) {
        if (/[.,!?;:]$/.test(words[k - 1])) {
          best = k;
          if (/[.!?]$/.test(words[k - 1])) break;
        }
      }
      if (best > (breaks.at(-1) ?? 0)) breaks.push(best);
    }
    const bounds = [0, ...breaks, words.length];
    for (let b = 0; b < bounds.length - 1; b++) {
      const i = bounds[b];
      const j = bounds[b + 1];
      const s = seg.start + (i / words.length) * dur;
      const e = seg.start + (j / words.length) * dur;
      out.push({ text: wrapTwoLines(words.slice(i, j).join(" ")), start: s, end: Math.max(e, s + 0.5) });
    }
  }
  return out;
}

function wrapTwoLines(t: string, width = 42) {
  if (t.length <= width) return t;
  const mid = t.lastIndexOf(" ", Math.min(t.length - 1, Math.ceil(t.length / 2) + 6));
  return mid > 0 ? `${t.slice(0, mid)}\n${t.slice(mid + 1)}` : t;
}

function stamp(s: number, sep: "," | ".") {
  const ms = Math.round(s * 1000);
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const sec = Math.floor((ms % 60000) / 1000);
  const pad = (n: number, w = 2) => String(n).padStart(w, "0");
  return `${pad(h)}:${pad(m)}:${pad(sec)}${sep}${pad(ms % 1000, 3)}`;
}

export function toSrt(cues: Cue[]) {
  return cues.map((c, i) => `${i + 1}\n${stamp(c.start, ",")} --> ${stamp(c.end, ",")}\n${c.text}\n`).join("\n");
}

export function toVtt(cues: Cue[]) {
  return "WEBVTT\n\n" + cues.map((c) => `${stamp(c.start, ".")} --> ${stamp(c.end, ".")}\n${c.text}\n`).join("\n");
}

export function toText(segments: Cue[], withTimes: boolean) {
  return segments
    .map((s) => (withTimes ? `[${stamp(s.start, ".").slice(0, 8)}] ${s.text}` : s.text))
    .join(withTimes ? "\n" : " ")
    .replace(/\s+([.,!?])/g, "$1");
}
