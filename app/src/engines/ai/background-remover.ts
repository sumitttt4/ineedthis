/**
 * On-device background removal with transformers.js (ONNX Runtime Web).
 * Models download once from the Hugging Face CDN and are cached by the
 * browser; the image itself never leaves the device.
 *
 * Model: Xenova/modnet (Apache-2.0), ~13 MB fp16 — people & portraits.
 *
 * Not shipped: onnx-community/BiRefNet_lite-ONNX (MIT) for arbitrary objects
 * runs out of WebAssembly memory (std::bad_alloc) in fp32 and fp16 at 1024²,
 * so it only works with WebGPU. Re-enable behind a WebGPU check once that path
 * can be verified on real hardware.
 */

export type BgModel = "portrait" | "object";

const MODELS: Record<BgModel, { id: string; dtype: "fp16" | "fp32"; input: string; output: string; sigmoid: boolean }> = {
  portrait: { id: "Xenova/modnet", dtype: "fp16", input: "input", output: "output", sigmoid: false },
  object: { id: "onnx-community/BiRefNet_lite-ONNX", dtype: "fp16", input: "input_image", output: "output_image", sigmoid: true },
};

type Loaded = { model: any; processor: any; device: string };
const cache = new Map<string, Promise<Loaded>>();

export interface LoadProgress {
  /** 0–100 while downloading, -1 when unknown. */
  percent: number;
  message: string;
}

async function load(kind: BgModel, onProgress?: (p: LoadProgress) => void): Promise<Loaded> {
  const key = kind;
  if (!cache.has(key)) {
    const p = (async () => {
      const t = await import("@huggingface/transformers");
      t.env.allowLocalModels = false;
      const cfg = MODELS[kind];
      const files = new Map<string, { loaded: number; total: number }>();
      const progress_callback = (e: { status: string; file?: string; loaded?: number; total?: number }) => {
        if (e.status === "progress" && e.file) {
          files.set(e.file, { loaded: e.loaded ?? 0, total: e.total ?? 0 });
          let loaded = 0;
          let total = 0;
          files.forEach((f) => {
            loaded += f.loaded;
            total += f.total;
          });
          onProgress?.({
            percent: total ? Math.round((loaded / total) * 100) : -1,
            message: `Downloading AI model (one time) · ${(loaded / 1e6).toFixed(0)} / ${(total / 1e6).toFixed(0)} MB`,
          });
        }
      };
      const hasWebGPU = typeof navigator !== "undefined" && "gpu" in navigator && !!(await (navigator as any).gpu?.requestAdapter?.().catch(() => null));
      const device = hasWebGPU ? "webgpu" : "wasm";
      const model = await t.AutoModel.from_pretrained(cfg.id, { dtype: cfg.dtype, device, progress_callback } as any).catch(async (err: unknown) => {
        if (device !== "webgpu") throw err;
        // Some GPUs/drivers can't run the model; fall back to WebAssembly.
        return t.AutoModel.from_pretrained(cfg.id, { dtype: cfg.dtype, device: "wasm", progress_callback } as any);
      });
      const processor = await t.AutoProcessor.from_pretrained(cfg.id);
      return { model, processor, device };
    })();
    p.catch(() => cache.delete(key));
    cache.set(key, p);
  }
  return cache.get(key)!;
}

export interface RemoveBgOptions {
  model: BgModel;
  /** "transparent" or a CSS colour such as "#ffffff". */
  background: string;
}

export async function removeBackground(
  file: Blob,
  opts: RemoveBgOptions,
  onProgress?: (p: LoadProgress) => void
): Promise<Blob> {
  const t = await import("@huggingface/transformers");
  const { model, processor } = await load(opts.model, onProgress);
  onProgress?.({ percent: -1, message: "Finding the subject…" });
  const cfg = MODELS[opts.model];

  const image = await t.RawImage.fromBlob(file);
  const { pixel_values } = await processor(image);
  const outputs = await model({ [cfg.input]: pixel_values });
  let tensor = outputs[cfg.output] ?? Object.values(outputs)[0];
  tensor = tensor[0];
  if (cfg.sigmoid) tensor = tensor.sigmoid();
  const mask = await t.RawImage.fromTensor(tensor.mul(255).to("uint8")).resize(image.width, image.height);

  // Composite: original RGB + mask as alpha.
  const bmp = await createImageBitmap(file);
  const c = document.createElement("canvas");
  c.width = bmp.width;
  c.height = bmp.height;
  const ctx = c.getContext("2d")!;
  ctx.drawImage(bmp, 0, 0);
  const px = ctx.getImageData(0, 0, c.width, c.height);
  const m = mask.data as Uint8Array;
  const channels = mask.channels ?? 1;
  for (let i = 0, j = 0; i < px.data.length; i += 4, j += channels) px.data[i + 3] = m[j];
  ctx.putImageData(px, 0, 0);

  if (opts.background !== "transparent") {
    const out = document.createElement("canvas");
    out.width = c.width;
    out.height = c.height;
    const o = out.getContext("2d")!;
    o.fillStyle = opts.background;
    o.fillRect(0, 0, out.width, out.height);
    o.drawImage(c, 0, 0);
    return new Promise((res, rej) => out.toBlob((b) => (b ? res(b) : rej(new Error("Export failed"))), "image/jpeg", 0.95));
  }
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("Export failed"))), "image/png"));
}
