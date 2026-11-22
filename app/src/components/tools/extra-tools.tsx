"use client";

/**
 * File-based tools added after the original 33. Each entry declares what it
 * accepts, an optional options panel (with live preview where useful) and a
 * run() that returns a TaskResult. The tool dialog only knows this interface,
 * so new tools don't grow tool-modal.tsx.
 */

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Button from "@/components/_ui/button";
import type { TaskProgress, TaskResult, BatchTaskResult } from "@/lib/types";

export type ExtraOpts = Record<string, unknown>;
export interface ExtraOptionsProps {
  files: File[];
  value: ExtraOpts;
  onChange: (next: ExtraOpts) => void;
}
export interface ExtraTool {
  accept: string;
  multiple?: boolean;
  /** Wait for the user to set options and press the button instead of running on file select. */
  manual?: boolean;
  defaults: ExtraOpts;
  Options?: (props: ExtraOptionsProps) => ReactNode;
  run: (files: File[], opts: ExtraOpts, onProgress: (p: TaskProgress) => void) => Promise<TaskResult | BatchTaskResult>;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const IMAGE_ACCEPT = "image/*,.heic,.heif";

function baseName(name: string) {
  return name.replace(/\.[^.]+$/, "");
}

function result(blob: Blob, filename: string, t: number): TaskResult {
  return { data: blob, filename, mimeType: blob.type, durationMs: performance.now() - t, sizeBytes: blob.size };
}

async function decode(file: File): Promise<ImageBitmap> {
  if (/\.(heic|heif)$/i.test(file.name) || /hei[cf]/i.test(file.type)) {
    const { batchConvertImages } = await import("@/engines/image/image-engine");
    const res = await batchConvertImages([file], { format: "png", quality: 1 });
    return createImageBitmap(res.files[0].data as Blob);
  }
  return createImageBitmap(file);
}

function canvasOf(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available in this browser.");
  return { c, ctx };
}

function toBlob(c: HTMLCanvasElement, type = "image/png", q = 0.92) {
  return new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("Encoding failed"))), type, q));
}

function outType(file: File): { type: string; ext: string } {
  if (/png|webp|gif|svg/i.test(file.type) || /\.(png|webp|gif)$/i.test(file.name)) return { type: "image/png", ext: "png" };
  return { type: "image/jpeg", ext: "jpg" };
}

/** Small reusable segmented control. */
function Choice<T extends string | number>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[12px] font-medium text-muted-foreground">{label}</span>
      <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1.5">
        {options.map((o) => (
          <Button
            key={String(o.value)}
            role="radio"
            aria-checked={value === o.value}
            size="xs"
            variant={value === o.value ? "primary" : "secondary"}
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-[12px] font-medium text-muted-foreground">
      {label}
      <span className="flex items-center gap-1.5">
        <input
          type="number"
          inputMode="decimal"
          value={Number.isFinite(value) ? value : ""}
          min={min}
          max={max}
          step={step}
          onChange={(e) => onChange(Number(e.target.value))}
          className="h-9 w-full rounded-lg border border-input bg-background px-2.5 text-[13px] text-foreground tabular-nums outline-none focus:ring-2 focus:ring-primary/40"
        />
        {suffix && <span className="text-[12px]">{suffix}</span>}
      </span>
    </label>
  );
}

function Panel({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4">{children}</div>;
}

/** Renders `draw` into a preview canvas whenever inputs change (debounced). */
function Preview({ file, draw, deps }: { file?: File; draw: (bmp: ImageBitmap) => HTMLCanvasElement; deps: unknown[] }) {
  const [url, setUrl] = useState<string | null>(null);
  const bmpRef = useRef<{ file: File; bmp: ImageBitmap } | null>(null);
  useEffect(() => {
    if (!file) return;
    let cancelled = false;
    let made: string | null = null;
    const id = setTimeout(async () => {
      try {
        if (bmpRef.current?.file !== file) bmpRef.current = { file, bmp: await decode(file) };
        const c = draw(bmpRef.current.bmp);
        const blob = await toBlob(c, "image/png");
        if (cancelled) return;
        made = URL.createObjectURL(blob);
        setUrl((old) => {
          if (old) URL.revokeObjectURL(old);
          return made;
        });
      } catch {
        /* preview is best-effort */
      }
    }, 120);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file, ...deps]);
  if (!file) return null;
  return (
    <div className="flex justify-center rounded-lg border border-border bg-[repeating-conic-gradient(var(--muted)_0_25%,transparent_0_50%)] bg-[length:16px_16px] p-2">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="Preview" className="max-h-64 w-auto rounded object-contain" />
      ) : (
        <div className="h-40 w-full animate-pulse rounded bg-muted" />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Image: crop & rotate                                                */
/* ------------------------------------------------------------------ */

const ASPECTS = [
  { value: "original", label: "Original" },
  { value: "1:1", label: "1:1" },
  { value: "4:5", label: "4:5" },
  { value: "3:2", label: "3:2" },
  { value: "16:9", label: "16:9" },
  { value: "9:16", label: "9:16" },
] as const;

function cropRotate(bmp: ImageBitmap, o: ExtraOpts, maxSide = Infinity) {
  const rot = Number(o.rotate) || 0;
  const swap = rot === 90 || rot === 270;
  const srcW = bmp.width;
  const srcH = bmp.height;
  // Rotated dimensions before crop
  const rw = swap ? srcH : srcW;
  const rh = swap ? srcW : srcH;
  let cw = rw;
  let ch = rh;
  if (o.aspect !== "original") {
    const [a, b] = String(o.aspect).split(":").map(Number);
    const target = a / b;
    if (rw / rh > target) cw = rh * target;
    else ch = rw / target;
  }
  const scale = Math.min(1, maxSide / Math.max(cw, ch));
  const { c, ctx } = canvasOf(cw * scale, ch * scale);
  ctx.scale(scale, scale);
  ctx.translate(cw / 2, ch / 2);
  ctx.rotate((rot * Math.PI) / 180);
  ctx.scale(o.flipH ? -1 : 1, o.flipV ? -1 : 1);
  ctx.drawImage(bmp, -srcW / 2, -srcH / 2);
  return c;
}

const imageCrop: ExtraTool = {
  accept: IMAGE_ACCEPT,
  manual: true,
  defaults: { aspect: "original", rotate: 0, flipH: false, flipV: false },
  Options: ({ files, value, onChange }) => (
    <Panel>
      <Choice
        label="Crop to"
        value={String(value.aspect)}
        options={ASPECTS.map((a) => ({ value: a.value, label: a.label }))}
        onChange={(v) => onChange({ ...value, aspect: v })}
      />
      <div className="flex flex-wrap gap-1.5">
        <Button size="xs" variant="secondary" onClick={() => onChange({ ...value, rotate: (Number(value.rotate) + 270) % 360 })}>
          ⟲ Rotate left
        </Button>
        <Button size="xs" variant="secondary" onClick={() => onChange({ ...value, rotate: (Number(value.rotate) + 90) % 360 })}>
          ⟳ Rotate right
        </Button>
        <Button size="xs" variant={value.flipH ? "primary" : "secondary"} aria-pressed={!!value.flipH} onClick={() => onChange({ ...value, flipH: !value.flipH })}>
          Flip horizontal
        </Button>
        <Button size="xs" variant={value.flipV ? "primary" : "secondary"} aria-pressed={!!value.flipV} onClick={() => onChange({ ...value, flipV: !value.flipV })}>
          Flip vertical
        </Button>
      </div>
      <Preview file={files[0]} deps={[value.aspect, value.rotate, value.flipH, value.flipV]} draw={(b) => cropRotate(b, value, 640)} />
    </Panel>
  ),
  run: async (files, o) => {
    const t = performance.now();
    const f = files[0];
    const c = cropRotate(await decode(f), o);
    const { type, ext } = outType(f);
    return result(await toBlob(c, type, 0.92), `${baseName(f.name)}_edited.${ext}`, t);
  },
};

/* ------------------------------------------------------------------ */
/* Image: text / watermark on image                                    */
/* ------------------------------------------------------------------ */

function drawTextOn(bmp: ImageBitmap, o: ExtraOpts, maxSide = Infinity) {
  const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
  const w = bmp.width * scale;
  const h = bmp.height * scale;
  const { c, ctx } = canvasOf(w, h);
  ctx.drawImage(bmp, 0, 0, w, h);
  const text = String(o.text || "");
  if (!text) return c;
  const size = (Number(o.size) / 100) * Math.min(w, h);
  ctx.font = `600 ${size}px "Manrope Variable", system-ui, sans-serif`;
  ctx.fillStyle = o.color === "black" ? "rgba(0,0,0,0.92)" : "rgba(255,255,255,0.95)";
  ctx.shadowColor = o.color === "black" ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.55)";
  ctx.shadowBlur = size * 0.25;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  if (o.position === "tile") {
    ctx.globalAlpha = 0.28;
    ctx.translate(w / 2, h / 2);
    ctx.rotate(-Math.PI / 6);
    const stepX = ctx.measureText(text).width + size * 2;
    const stepY = size * 3;
    for (let y = -h; y < h; y += stepY) for (let x = -w; x < w; x += stepX) ctx.fillText(text, x, y);
    return c;
  }
  const pad = size * 0.9;
  const y = o.position === "top" ? pad : o.position === "center" ? h / 2 : h - pad;
  ctx.fillText(text, w / 2, y, w - pad * 2);
  return c;
}

const imageText: ExtraTool = {
  accept: IMAGE_ACCEPT,
  manual: true,
  defaults: { text: "© Your name", position: "bottom", size: 6, color: "white" },
  Options: ({ files, value, onChange }) => (
    <Panel>
      <label className="flex flex-col gap-1 text-[12px] font-medium text-muted-foreground">
        Text
        <input
          value={String(value.text)}
          onChange={(e) => onChange({ ...value, text: e.target.value })}
          className="h-9 rounded-lg border border-input bg-background px-3 text-[13px] text-foreground outline-none focus:ring-2 focus:ring-primary/40"
        />
      </label>
      <Choice
        label="Position"
        value={String(value.position)}
        options={[
          { value: "top", label: "Top" },
          { value: "center", label: "Center" },
          { value: "bottom", label: "Bottom" },
          { value: "tile", label: "Tiled watermark" },
        ]}
        onChange={(v) => onChange({ ...value, position: v })}
      />
      <div className="grid grid-cols-2 gap-3">
        <NumberField label="Size" value={Number(value.size)} min={2} max={30} suffix="%" onChange={(n) => onChange({ ...value, size: n })} />
        <Choice
          label="Color"
          value={String(value.color)}
          options={[
            { value: "white", label: "White" },
            { value: "black", label: "Black" },
          ]}
          onChange={(v) => onChange({ ...value, color: v })}
        />
      </div>
      <Preview file={files[0]} deps={[value.text, value.position, value.size, value.color]} draw={(b) => drawTextOn(b, value, 640)} />
    </Panel>
  ),
  run: async (files, o) => {
    const t = performance.now();
    const f = files[0];
    const c = drawTextOn(await decode(f), o);
    const { type, ext } = outType(f);
    return result(await toBlob(c, type, 0.92), `${baseName(f.name)}_text.${ext}`, t);
  },
};

/* ------------------------------------------------------------------ */
/* Image: colour palette                                               */
/* ------------------------------------------------------------------ */

function hex(r: number, g: number, b: number) {
  return "#" + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");
}

/** Median-cut palette on a downsampled copy. Deterministic and fast. */
function extractPalette(bmp: ImageBitmap, count = 6): string[] {
  const s = Math.min(1, 160 / Math.max(bmp.width, bmp.height));
  const { ctx } = canvasOf(bmp.width * s, bmp.height * s);
  ctx.drawImage(bmp, 0, 0, bmp.width * s, bmp.height * s);
  const { data } = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
  const px: number[][] = [];
  for (let i = 0; i < data.length; i += 4) if (data[i + 3] > 128) px.push([data[i], data[i + 1], data[i + 2]]);
  let boxes: number[][][] = [px];
  while (boxes.length < count) {
    boxes.sort((a, b) => b.length - a.length);
    const box = boxes.shift();
    if (!box || box.length < 2) break;
    const ranges = [0, 1, 2].map((ch) => Math.max(...box.map((p) => p[ch])) - Math.min(...box.map((p) => p[ch])));
    const ch = ranges.indexOf(Math.max(...ranges));
    box.sort((a, b) => a[ch] - b[ch]);
    const mid = box.length >> 1;
    boxes.push(box.slice(0, mid), box.slice(mid));
  }
  boxes = boxes.filter((b) => b.length).sort((a, b) => b.length - a.length);
  return boxes.map((b) => {
    const avg = [0, 1, 2].map((ch) => b.reduce((sum, p) => sum + p[ch], 0) / b.length);
    return hex(avg[0], avg[1], avg[2]);
  });
}

function PaletteSwatches({ file }: { file?: File }) {
  const [colors, setColors] = useState<string[]>([]);
  const [copied, setCopied] = useState<string | null>(null);
  useEffect(() => {
    if (!file) return;
    let live = true;
    decode(file).then((b) => live && setColors(extractPalette(b)));
    return () => {
      live = false;
    };
  }, [file]);
  if (!file) return <p className="text-[13px] text-muted-foreground">Add an image to see its colours.</p>;
  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
      {colors.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => {
            navigator.clipboard?.writeText(c);
            setCopied(c);
            setTimeout(() => setCopied(null), 1200);
          }}
          className="group flex flex-col overflow-hidden rounded-lg border border-border text-left transition-transform duration-150 ease-out active:scale-[0.97]"
          aria-label={`Copy ${c}`}
        >
          <span className="h-14 w-full" style={{ background: c }} />
          <span className="px-2 py-1.5 font-mono text-[12px] text-foreground">{copied === c ? "Copied" : c}</span>
        </button>
      ))}
    </div>
  );
}

const imageColors: ExtraTool = {
  accept: IMAGE_ACCEPT,
  manual: true,
  defaults: {},
  Options: ({ files }) => (
    <Panel>
      <span className="text-[12px] font-medium text-muted-foreground">Palette — click a swatch to copy its hex</span>
      <PaletteSwatches file={files[0]} />
    </Panel>
  ),
  run: async (files) => {
    const t = performance.now();
    const f = files[0];
    const colors = extractPalette(await decode(f));
    const { c, ctx } = canvasOf(colors.length * 200, 260);
    colors.forEach((col, i) => {
      ctx.fillStyle = col;
      ctx.fillRect(i * 200, 0, 200, 200);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(i * 200, 200, 200, 60);
      ctx.fillStyle = "#15171c";
      ctx.font = "600 22px ui-monospace, monospace";
      ctx.textAlign = "center";
      ctx.fillText(col.toUpperCase(), i * 200 + 100, 238);
    });
    return result(await toBlob(c), `${baseName(f.name)}_palette.png`, t);
  },
};

/* ------------------------------------------------------------------ */
/* Image: screenshot beautifier                                        */
/* ------------------------------------------------------------------ */

const BACKGROUNDS: Record<string, [string, string]> = {
  cobalt: ["#2445e6", "#8fc9b6"],
  dusk: ["#0b1240", "#4f6bff"],
  sunset: ["#f08a5d", "#f0b25a"],
  mint: ["#d4f3e7", "#a9b4ff"],
  mono: ["#e9edf2", "#cfd5de"],
};

function beautify(bmp: ImageBitmap, o: ExtraOpts, maxSide = Infinity) {
  const padPct = Number(o.padding) / 100;
  const pad = Math.round(Math.max(bmp.width, bmp.height) * padPct);
  const W = bmp.width + pad * 2;
  const H = bmp.height + pad * 2;
  const scale = Math.min(1, maxSide / Math.max(W, H));
  const { c, ctx } = canvasOf(W * scale, H * scale);
  ctx.scale(scale, scale);
  const [a, b] = BACKGROUNDS[String(o.background)] ?? BACKGROUNDS.cobalt;
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, a);
  g.addColorStop(1, b);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  const r = (Number(o.radius) / 100) * Math.min(bmp.width, bmp.height);
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.35)";
  ctx.shadowBlur = o.shadow ? pad * 0.6 : 0;
  ctx.shadowOffsetY = o.shadow ? pad * 0.15 : 0;
  ctx.beginPath();
  ctx.roundRect(pad, pad, bmp.width, bmp.height, r);
  ctx.fillStyle = "#fff";
  ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(pad, pad, bmp.width, bmp.height, r);
  ctx.clip();
  ctx.drawImage(bmp, pad, pad);
  ctx.restore();
  return c;
}

const screenshotBeautify: ExtraTool = {
  accept: "image/png,image/jpeg,image/webp",
  manual: true,
  defaults: { background: "cobalt", padding: 8, radius: 2, shadow: true },
  Options: ({ files, value, onChange }) => (
    <Panel>
      <Choice
        label="Background"
        value={String(value.background)}
        options={Object.keys(BACKGROUNDS).map((k) => ({ value: k, label: k[0].toUpperCase() + k.slice(1) }))}
        onChange={(v) => onChange({ ...value, background: v })}
      />
      <div className="grid grid-cols-2 gap-3">
        <NumberField label="Padding" value={Number(value.padding)} min={0} max={30} suffix="%" onChange={(n) => onChange({ ...value, padding: n })} />
        <NumberField label="Corner radius" value={Number(value.radius)} min={0} max={10} suffix="%" onChange={(n) => onChange({ ...value, radius: n })} />
      </div>
      <Choice
        label="Shadow"
        value={value.shadow ? "on" : "off"}
        options={[
          { value: "on", label: "On" },
          { value: "off", label: "Off" },
        ]}
        onChange={(v) => onChange({ ...value, shadow: v === "on" })}
      />
      <Preview file={files[0]} deps={[value.background, value.padding, value.radius, value.shadow]} draw={(b) => beautify(b, value, 720)} />
    </Panel>
  ),
  run: async (files, o) => {
    const t = performance.now();
    const f = files[0];
    return result(await toBlob(beautify(await decode(f), o)), `${baseName(f.name)}_beautified.png`, t);
  },
};

/* ------------------------------------------------------------------ */
/* PDF: images -> PDF, organize, flatten, to text                      */
/* ------------------------------------------------------------------ */

const PAGE_SIZES: Record<string, [number, number] | null> = {
  a4: [595.28, 841.89],
  letter: [612, 792],
  fit: null,
};

const imagesToPdfTool: ExtraTool = {
  accept: IMAGE_ACCEPT,
  multiple: true,
  defaults: { page: "a4", margin: 24 },
  Options: ({ files, value, onChange }) => (
    <Panel>
      <Choice
        label="Page size"
        value={String(value.page)}
        options={[
          { value: "a4", label: "A4" },
          { value: "letter", label: "US Letter" },
          { value: "fit", label: "Fit each image" },
        ]}
        onChange={(v) => onChange({ ...value, page: v })}
      />
      <NumberField label="Margin" value={Number(value.margin)} min={0} max={96} suffix="pt" onChange={(n) => onChange({ ...value, margin: n })} />
      {files.length > 1 && (
        <p className="text-[12px] text-muted-foreground">{files.length} images, one per page, in the order selected.</p>
      )}
    </Panel>
  ),
  run: async (files, o, onProgress) => {
    const t = performance.now();
    const { PDFDocument } = await import("pdf-lib");
    const doc = await PDFDocument.create();
    const margin = Math.max(0, Number(o.margin) || 0);
    for (let i = 0; i < files.length; i++) {
      onProgress({ state: "processing", percent: Math.round((i / files.length) * 90), message: `Adding image ${i + 1} of ${files.length}…` });
      const bmp = await decode(files[i]);
      const { c } = canvasOf(bmp.width, bmp.height);
      const ctx = c.getContext("2d")!;
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(bmp, 0, 0);
      const jpg = await doc.embedJpg(new Uint8Array(await (await toBlob(c, "image/jpeg", 0.9)).arrayBuffer()));
      const size = PAGE_SIZES[String(o.page)];
      const [pw, ph] = size ?? [jpg.width * 0.75 + margin * 2, jpg.height * 0.75 + margin * 2];
      const page = doc.addPage([pw, ph]);
      const s = Math.min((pw - margin * 2) / jpg.width, (ph - margin * 2) / jpg.height);
      const w = jpg.width * s;
      const h = jpg.height * s;
      page.drawImage(jpg, { x: (pw - w) / 2, y: (ph - h) / 2, width: w, height: h });
    }
    const bytes = await doc.save();
    const name = files.length === 1 ? baseName(files[0].name) : "images";
    return result(new Blob([bytes as BlobPart], { type: "application/pdf" }), `${name}.pdf`, t);
  },
};

type PageState = { rotate: number; deleted: boolean };

function PageOrganizer({ files, value, onChange }: ExtraOptionsProps) {
  const file = files[0];
  const [thumbs, setThumbs] = useState<string[]>([]);
  const order = (value.order as number[]) ?? [];
  const pages = (value.pages as PageState[]) ?? [];

  useEffect(() => {
    if (!file) return;
    let live = true;
    const urls: string[] = [];
    (async () => {
      const { loadPdfJs } = await import("@/lib/pdfjs");
      const pdfjs = await loadPdfJs();
      const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
      const n = doc.numPages;
      if (live) onChange({ order: [...Array(n).keys()], pages: Array.from({ length: n }, () => ({ rotate: 0, deleted: false })) });
      for (let i = 1; i <= n && live; i++) {
        const page = await doc.getPage(i);
        const vp = page.getViewport({ scale: 0.3 });
        const { c, ctx } = canvasOf(vp.width, vp.height);
        await (page.render as unknown as (o: object) => { promise: Promise<void> })({ canvasContext: ctx, viewport: vp, canvas: c }).promise;
        const url = URL.createObjectURL(await toBlob(c, "image/jpeg", 0.7));
        urls.push(url);
        if (live) setThumbs((t) => [...t, url]);
      }
    })().catch(() => {});
    return () => {
      live = false;
      urls.forEach(URL.revokeObjectURL);
      setThumbs([]);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file]);

  if (!file) return null;
  const set = (nextOrder: number[], nextPages: PageState[]) => onChange({ order: nextOrder, pages: nextPages });
  const move = (pos: number, dir: -1 | 1) => {
    const to = pos + dir;
    if (to < 0 || to >= order.length) return;
    const next = [...order];
    [next[pos], next[to]] = [next[to], next[pos]];
    set(next, pages);
  };
  const patch = (idx: number, p: Partial<PageState>) => set(order, pages.map((s, i) => (i === idx ? { ...s, ...p } : s)));
  const kept = pages.filter((p) => !p.deleted).length;

  return (
    <Panel>
      <div className="flex items-center justify-between text-[12px] text-muted-foreground">
        <span>
          {order.length} pages · <span className="tabular-nums">{kept}</span> kept
        </span>
        <span>Rotate, reorder or remove, then press the button below.</span>
      </div>
      <ol className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {order.map((idx, pos) => {
          const st = pages[idx] ?? { rotate: 0, deleted: false };
          return (
            <li key={idx} className={`flex flex-col gap-1.5 rounded-lg border border-border bg-background p-2 ${st.deleted ? "opacity-40" : ""}`}>
              <div className="flex aspect-[3/4] items-center justify-center overflow-hidden rounded bg-muted">
                {thumbs[idx] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={thumbs[idx]}
                    alt={`Page ${idx + 1}`}
                    className="max-h-full max-w-full transition-transform duration-200 ease-out"
                    style={{ transform: `rotate(${st.rotate}deg)` }}
                  />
                ) : (
                  <span className="text-[11px] text-muted-foreground">Page {idx + 1}</span>
                )}
              </div>
              <span className="text-center text-[11px] tabular-nums text-muted-foreground">Page {idx + 1}</span>
              <div className="grid grid-cols-4 gap-1">
                <Button size="xs" variant="ghost" aria-label={`Move page ${idx + 1} earlier`} disabled={pos === 0} onClick={() => move(pos, -1)}>←</Button>
                <Button size="xs" variant="ghost" aria-label={`Rotate page ${idx + 1}`} onClick={() => patch(idx, { rotate: (st.rotate + 90) % 360 })}>⟳</Button>
                <Button size="xs" variant={st.deleted ? "primary" : "ghost"} aria-pressed={st.deleted} aria-label={st.deleted ? `Restore page ${idx + 1}` : `Delete page ${idx + 1}`} onClick={() => patch(idx, { deleted: !st.deleted })}>✕</Button>
                <Button size="xs" variant="ghost" aria-label={`Move page ${idx + 1} later`} disabled={pos === order.length - 1} onClick={() => move(pos, 1)}>→</Button>
              </div>
            </li>
          );
        })}
      </ol>
    </Panel>
  );
}

const pdfOrganize: ExtraTool = {
  accept: "application/pdf,.pdf",
  manual: true,
  defaults: { order: [], pages: [] },
  Options: PageOrganizer,
  run: async (files, o) => {
    const order = (o.order as number[]) ?? [];
    const pages = (o.pages as PageState[]) ?? [];
    const keep = order.filter((i) => !pages[i]?.deleted);
    if (order.length && keep.length === 0) throw new Error("You removed every page. Keep at least one.");
    const { organizePdf } = await import("@/engines/pdf/pdf-engine");
    // organizePdf takes original page indices for order and rotations.
    const pageOrder = keep;
    const rotations = keep
      .map((i) => ({ page: i, degrees: pages[i]?.rotate as 90 | 180 | 270 }))
      .filter((r) => r.degrees);
    return organizePdf(await files[0].arrayBuffer(), files[0].name, {
      deletePages: [...Array(order.length).keys()].filter((i) => pages[i]?.deleted),
      pageOrder: order.length ? pageOrder : undefined,
      rotations,
    });
  },
};

const pdfFlatten: ExtraTool = {
  accept: "application/pdf,.pdf",
  defaults: {},
  run: async (files) => {
    const { flattenPdf } = await import("@/engines/pdf/pdf-engine");
    return flattenPdf(await files[0].arrayBuffer(), files[0].name);
  },
};

const pdfToText: ExtraTool = {
  accept: "application/pdf,.pdf",
  defaults: {},
  run: async (files, _o, onProgress) => {
    const t = performance.now();
    const { loadPdfJs } = await import("@/lib/pdfjs");
    const pdfjs = await loadPdfJs();
    const doc = await pdfjs.getDocument({ data: new Uint8Array(await files[0].arrayBuffer()) }).promise;
    const out: string[] = [];
    for (let i = 1; i <= doc.numPages; i++) {
      onProgress({ state: "processing", percent: Math.round((i / doc.numPages) * 95), message: `Reading page ${i} of ${doc.numPages}…` });
      const content = await (await doc.getPage(i)).getTextContent();
      // Rebuild lines from y positions so paragraphs survive.
      const lines: string[] = [];
      let lastY: number | null = null;
      let line = "";
      for (const item of content.items as Array<{ str?: string; transform?: number[]; hasEOL?: boolean }>) {
        if (typeof item.str !== "string") continue;
        const y = item.transform?.[5] ?? 0;
        if (lastY !== null && Math.abs(y - lastY) > 2) {
          lines.push(line.trimEnd());
          line = "";
        }
        line += item.str;
        if (item.hasEOL) {
          lines.push(line.trimEnd());
          line = "";
          lastY = null;
          continue;
        }
        lastY = y;
      }
      if (line) lines.push(line.trimEnd());
      out.push(`--- Page ${i} ---\n${lines.join("\n")}`);
    }
    const text = out.join("\n\n");
    if (!text.replace(/--- Page \d+ ---/g, "").trim()) {
      throw new Error("No text found. This PDF is probably scanned images, which needs OCR.");
    }
    return result(new Blob([text], { type: "text/plain;charset=utf-8" }), `${baseName(files[0].name)}.txt`, t);
  },
};

/* ------------------------------------------------------------------ */
/* Audio / video                                                       */
/* ------------------------------------------------------------------ */

const VIDEO_ACCEPT = "video/*,.mkv,.mov";

const videoMute: ExtraTool = {
  accept: VIDEO_ACCEPT,
  defaults: {},
  run: async (files, _o, onProgress) => {
    const { muteVideo } = await import("@/engines/media/media-engine");
    return muteVideo(files[0], onProgress);
  },
};

const videoSpeed: ExtraTool = {
  accept: VIDEO_ACCEPT,
  manual: true,
  defaults: { speed: 2 },
  Options: ({ value, onChange }) => (
    <Panel>
      <Choice
        label="Speed"
        value={Number(value.speed)}
        options={[0.25, 0.5, 0.75, 1.25, 1.5, 2, 3, 4].map((s) => ({ value: s, label: `${s}×` }))}
        onChange={(v) => onChange({ ...value, speed: v })}
      />
      <p className="text-[12px] text-muted-foreground">Audio pitch is preserved.</p>
    </Panel>
  ),
  run: async (files, o, onProgress) => {
    const { changeVideoSpeed } = await import("@/engines/media/media-engine");
    return changeVideoSpeed(files[0], Number(o.speed) || 1, onProgress);
  },
};

const videoRotate: ExtraTool = {
  accept: VIDEO_ACCEPT,
  manual: true,
  defaults: { rotation: "90" },
  Options: ({ value, onChange }) => (
    <Panel>
      <Choice
        label="Rotate or flip"
        value={String(value.rotation)}
        options={[
          { value: "90", label: "90° right" },
          { value: "270", label: "90° left" },
          { value: "180", label: "180°" },
          { value: "flip-h", label: "Flip horizontal" },
          { value: "flip-v", label: "Flip vertical" },
        ]}
        onChange={(v) => onChange({ ...value, rotation: v })}
      />
    </Panel>
  ),
  run: async (files, o, onProgress) => {
    const { rotateVideo } = await import("@/engines/media/media-engine");
    return rotateVideo(files[0], o.rotation as "90", onProgress);
  },
};

const audioTrim: ExtraTool = {
  accept: "audio/*,video/*",
  manual: true,
  defaults: { start: 0, end: 30, fadeIn: 0, fadeOut: 1, format: "mp3" },
  Options: ({ value, onChange }) => (
    <Panel>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <NumberField label="Start" value={Number(value.start)} min={0} step={0.5} suffix="s" onChange={(n) => onChange({ ...value, start: n })} />
        <NumberField label="End" value={Number(value.end)} min={0} step={0.5} suffix="s" onChange={(n) => onChange({ ...value, end: n })} />
        <NumberField label="Fade in" value={Number(value.fadeIn)} min={0} max={10} step={0.5} suffix="s" onChange={(n) => onChange({ ...value, fadeIn: n })} />
        <NumberField label="Fade out" value={Number(value.fadeOut)} min={0} max={10} step={0.5} suffix="s" onChange={(n) => onChange({ ...value, fadeOut: n })} />
      </div>
      <Choice
        label="Save as"
        value={String(value.format)}
        options={[
          { value: "mp3", label: "MP3" },
          { value: "m4r", label: "iPhone ringtone (M4R)" },
        ]}
        onChange={(v) => onChange({ ...value, format: v })}
      />
      {value.format === "m4r" && Number(value.end) - Number(value.start) > 40 && (
        <p className="text-[12px] text-warning">iPhone ringtones must be 40 seconds or shorter.</p>
      )}
    </Panel>
  ),
  run: async (files, o, onProgress) => {
    const start = Number(o.start) || 0;
    const end = Number(o.end) || 0;
    if (end <= start) throw new Error("End time must be after the start time.");
    const { trimAudio } = await import("@/engines/media/media-engine");
    return trimAudio(
      files[0],
      { startTime: start, endTime: end, fadeIn: Number(o.fadeIn) || 0, fadeOut: Number(o.fadeOut) || 0, format: o.format as "mp3" },
      onProgress
    );
  },
};

/* ------------------------------------------------------------------ */
/* Registry                                                            */
/* ------------------------------------------------------------------ */

export const EXTRA_TOOLS: Record<string, ExtraTool> = {
  "images-to-pdf": imagesToPdfTool,
  "pdf-organize": pdfOrganize,
  "pdf-flatten": pdfFlatten,
  "pdf-to-text": pdfToText,
  "video-mute": videoMute,
  "video-speed": videoSpeed,
  "video-rotate": videoRotate,
  "audio-trim": audioTrim,
  "image-crop": imageCrop,
  "image-text": imageText,
  "image-colors": imageColors,
  "screenshot-beautify": screenshotBeautify,
};

export function useExtraDefaults(id: string | undefined) {
  return useMemo(() => (id && EXTRA_TOOLS[id] ? { ...EXTRA_TOOLS[id].defaults } : {}), [id]);
}
