/// <reference lib="webworker" />
/**
 * Whisper speech recognition in a worker (transformers.js), so long
 * transcriptions never freeze the page. Audio arrives as 16 kHz mono PCM.
 */

type Req = {
  type: "run";
  audio: Float32Array;
  model: "tiny" | "base";
  language: string; // "" = auto-detect
  task: "transcribe" | "translate";
};

const MODEL_IDS = { tiny: "onnx-community/whisper-tiny", base: "onnx-community/whisper-base" };
const SR = 16000;
const BLOCK_S = 120; // report progress every 2 minutes of audio

const pipes = new Map<string, Promise<any>>();

async function getPipe(model: Req["model"]) {
  if (!pipes.has(model)) {
    const p = (async () => {
      const t = await import("@huggingface/transformers");
      t.env.allowLocalModels = false;
      const files = new Map<string, { loaded: number; total: number }>();
      const progress_callback = (e: { status: string; file?: string; loaded?: number; total?: number }) => {
        if (e.status !== "progress" || !e.file) return;
        files.set(e.file, { loaded: e.loaded ?? 0, total: e.total ?? 0 });
        let loaded = 0;
        let total = 0;
        files.forEach((f) => {
          loaded += f.loaded;
          total += f.total;
        });
        self.postMessage({
          type: "progress",
          phase: "download",
          percent: total ? Math.round((loaded / total) * 100) : -1,
          message: `Downloading speech model (one time) · ${(loaded / 1e6).toFixed(0)} / ${(total / 1e6).toFixed(0)} MB`,
        });
      };
      const hasGpu = "gpu" in navigator && !!(await (navigator as unknown as { gpu: { requestAdapter: () => Promise<unknown> } }).gpu.requestAdapter().catch(() => null));
      const opts = { dtype: "q8", device: hasGpu ? "webgpu" : "wasm", progress_callback };
      try {
        return await t.pipeline("automatic-speech-recognition", MODEL_IDS[model], opts as never);
      } catch (err) {
        if (!hasGpu) throw err;
        return t.pipeline("automatic-speech-recognition", MODEL_IDS[model], { ...opts, device: "wasm" } as never);
      }
    })();
    p.catch(() => pipes.delete(model));
    pipes.set(model, p);
  }
  return pipes.get(model)!;
}

self.onmessage = async (ev: MessageEvent<Req>) => {
  const { audio, model, language, task } = ev.data;
  try {
    const asr = await getPipe(model);
    const total = audio.length / SR;
    const chunks: Array<{ text: string; start: number; end: number }> = [];
    for (let offset = 0; offset < audio.length; offset += BLOCK_S * SR) {
      const block = audio.subarray(offset, Math.min(audio.length, offset + BLOCK_S * SR));
      const startS = offset / SR;
      self.postMessage({
        type: "progress",
        phase: "transcribe",
        percent: Math.round((startS / total) * 100),
        message: `Listening… ${fmt(startS)} of ${fmt(total)}`,
      });
      const out = await asr(block, {
        chunk_length_s: 30,
        stride_length_s: 5,
        return_timestamps: true,
        task,
        ...(language ? { language } : {}),
      });
      for (const c of out.chunks ?? [{ text: out.text, timestamp: [0, block.length / SR] }]) {
        const [s, e] = c.timestamp as [number, number | null];
        const text = String(c.text ?? "").trim();
        if (!text) continue;
        chunks.push({ text, start: startS + (s ?? 0), end: startS + (e ?? Math.min(block.length / SR, (s ?? 0) + 5)) });
      }
      self.postMessage({ type: "partial", chunks });
    }
    self.postMessage({ type: "done", chunks, duration: total });
  } catch (err) {
    self.postMessage({ type: "error", message: err instanceof Error ? err.message : String(err) });
  }
};

function fmt(s: number) {
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}
