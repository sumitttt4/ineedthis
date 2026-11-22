"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  MeshGradient,
  GrainGradient,
  Warp,
  NeuroNoise,
  Dithering,
  Swirl,
} from "@paper-design/shaders-react";
import Button from "@/components/_ui/button";
import { CARD_FONTS, ensureFont, type CardFont } from "./fonts";

/* ------------------------------------------------------------------ */
/* Options                                                             */
/* ------------------------------------------------------------------ */

const SIZES = [
  { id: "square", label: "Square", sub: "1:1 · Instagram", w: 1080, h: 1080 },
  { id: "portrait", label: "Portrait", sub: "4:5 · Feed", w: 1080, h: 1350 },
  { id: "story", label: "Story", sub: "9:16 · Status, Reels", w: 1080, h: 1920 },
  { id: "wide", label: "Wide", sub: "16:9 · X, LinkedIn", w: 1920, h: 1080 },
] as const;
type SizeId = (typeof SIZES)[number]["id"];

type Bg = {
  id: string;
  label: string;
  /** Text colour that reads on this background. */
  ink: "light" | "dark";
  swatch: string; // CSS for the picker chip
};

const BACKGROUNDS: Bg[] = [
  { id: "cobalt", label: "Cobalt mesh", ink: "light", swatch: "linear-gradient(135deg,#0b1240,#2445e6,#8fc9b6)" },
  { id: "sunset", label: "Sunset mesh", ink: "light", swatch: "linear-gradient(135deg,#3b0a45,#f08a5d,#f0b25a)" },
  { id: "grain", label: "Grain wave", ink: "light", swatch: "linear-gradient(135deg,#000,#1f35b8,#4f6bff)" },
  { id: "warp", label: "Silk warp", ink: "light", swatch: "linear-gradient(135deg,#1d6b57,#8fc9b6,#2445e6)" },
  { id: "swirl", label: "Swirl", ink: "dark", swatch: "conic-gradient(#ffd6a5,#fdffb6,#caffbf,#a0c4ff,#ffd6a5)" },
  { id: "neuro", label: "Neon threads", ink: "light", swatch: "radial-gradient(circle,#4f6bff,#050510)" },
  { id: "dither", label: "Dithered", ink: "light", swatch: "repeating-linear-gradient(45deg,#111 0 3px,#4f6bff 3px 6px)" },
  { id: "white", label: "Plain white", ink: "dark", swatch: "#ffffff" },
  { id: "black", label: "Plain black", ink: "light", swatch: "#000000" },
];

function ShaderBg({ id, frame, pixelRatio, maxPixels }: { id: string; frame: number; pixelRatio: number; maxPixels: number }) {
  const common = {
    className: "absolute inset-0 size-full",
    speed: 0,
    frame,
    minPixelRatio: pixelRatio,
    maxPixelCount: maxPixels,
    // Needed so the canvas can be read back for export.
    webGlContextAttributes: { preserveDrawingBuffer: true },
  };
  switch (id) {
    case "cobalt":
      return <MeshGradient {...common} colors={["#0b1240", "#2445e6", "#4f6bff", "#8fc9b6"]} distortion={0.8} swirl={0.4} grainOverlay={0.08} />;
    case "sunset":
      return <MeshGradient {...common} colors={["#3b0a45", "#c2410c", "#f08a5d", "#f0b25a"]} distortion={0.9} swirl={0.3} grainOverlay={0.08} />;
    case "grain":
      return <GrainGradient {...common} colorBack="#000000" colors={["#0b1240", "#1f35b8", "#4f6bff", "#0c2c25"]} shape="wave" softness={0.7} intensity={0.4} noise={0.25} />;
    case "warp":
      return <Warp {...common} colors={["#0c2c25", "#1d6b57", "#8fc9b6", "#2445e6"]} proportion={0.45} softness={1} distortion={0.25} swirl={0.8} swirlIterations={10} shape="checks" shapeScale={0.1} />;
    case "swirl":
      return <Swirl {...common} colorBack="#fff7ed" colors={["#ffd6a5", "#fdffb6", "#caffbf", "#a0c4ff", "#bdb2ff"]} bandCount={4} twist={0.3} softness={0.5} noise={0.15} />;
    case "neuro":
      return <NeuroNoise {...common} colorBack="#050510" colorMid="#2445e6" colorFront="#c3ccff" brightness={0.05} contrast={0.3} />;
    case "dither":
      return <Dithering {...common} colorBack="#0a0a0a" colorFront="#4f6bff" shape="warp" type="4x4" size={3} />;
    default:
      return null;
  }
}

/* ------------------------------------------------------------------ */
/* Text layout (shared by preview and export)                          */
/* ------------------------------------------------------------------ */

interface Layout {
  text: string;
  author: string;
  font: CardFont;
  align: "left" | "center";
  ink: "light" | "dark";
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number) {
  const out: string[] = [];
  for (const para of text.split("\n")) {
    if (!para.trim()) {
      out.push("");
      continue;
    }
    let line = "";
    for (const word of para.split(/\s+/)) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width <= maxW || !line) line = test;
      else {
        out.push(line);
        line = word;
      }
    }
    out.push(line);
  }
  return out;
}

/** Draws text onto a W×H context. Finds the largest size that fits. */
function drawText(ctx: CanvasRenderingContext2D, W: number, H: number, L: Layout) {
  const pad = Math.round(Math.min(W, H) * 0.09);
  const maxW = W - pad * 2;
  const authorSize = Math.round(Math.min(W, H) * 0.042);
  const maxH = H - pad * 2 - (L.author ? authorSize * 2.6 : 0);
  const text = L.text.trim() || "Type something worth sharing";
  let size = Math.round(Math.min(W, H) * 0.12 * L.font.scale);
  let lines: string[] = [];
  let lh = 0;
  for (; size > 14; size = Math.floor(size * 0.94)) {
    ctx.font = `${L.font.weight} ${size}px ${L.font.family}`;
    lines = wrap(ctx, text, maxW);
    lh = size * (L.font.kind === "handwritten" ? 1.2 : 1.18);
    const widest = Math.max(...lines.map((l) => ctx.measureText(l).width));
    if (lines.length * lh <= maxH && widest <= maxW) break;
  }
  const light = L.ink === "light";
  ctx.fillStyle = light ? "#ffffff" : "#111317";
  ctx.textBaseline = "middle";
  ctx.textAlign = L.align;
  ctx.shadowColor = light ? "rgba(0,0,0,0.35)" : "transparent";
  ctx.shadowBlur = light ? size * 0.25 : 0;
  const x = L.align === "center" ? W / 2 : pad;
  const blockH = lines.length * lh + (L.author ? authorSize * 2.6 : 0);
  let y = (H - blockH) / 2 + lh / 2;
  for (const line of lines) {
    ctx.fillText(line, x, y);
    y += lh;
  }
  if (L.author) {
    ctx.shadowBlur = 0;
    ctx.font = `500 ${authorSize}px ${L.font.kind === "handwritten" ? L.font.family : L.font.family}`;
    ctx.fillStyle = light ? "rgba(255,255,255,0.78)" : "rgba(17,19,23,0.7)";
    ctx.fillText(`— ${L.author}`, x, y + authorSize * 0.9);
  }
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export default function QuoteCard() {
  const [text, setText] = useState("Small steps every day add up to big things.");
  const [author, setAuthor] = useState("");
  const [fontId, setFontId] = useState("playfair");
  const [bgId, setBgId] = useState("cobalt");
  const [sizeId, setSizeId] = useState<SizeId>("square");
  const [align, setAlign] = useState<"left" | "center">("center");
  const [frame, setFrame] = useState(4200);
  const [busy, setBusy] = useState<"" | "download" | "share" | "copy">("");
  const [note, setNote] = useState("");
  const [fontsReady, setFontsReady] = useState(0);

  const size = SIZES.find((s) => s.id === sizeId)!;
  const font = CARD_FONTS.find((f) => f.id === fontId)!;
  const bg = BACKGROUNDS.find((b) => b.id === bgId)!;
  const layout = useMemo<Layout>(() => ({ text, author, font, align, ink: bg.ink }), [text, author, font, align, bg.ink]);

  const stageRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const [stageW, setStageW] = useState(0);

  // Measure preview width so the shader renders at full export resolution.
  useLayoutEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setStageW(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Load every card font once (they're small), re-draw when ready.
  useEffect(() => {
    let live = true;
    Promise.all(CARD_FONTS.map((f) => ensureFont(f, "Aaअ"))).then(() => live && setFontsReady((n) => n + 1));
    return () => {
      live = false;
    };
  }, []);

  // Draw the text overlay for the preview.
  useEffect(() => {
    const c = overlayRef.current;
    if (!c || !stageW) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = stageW;
    const h = (stageW * size.h) / size.w;
    c.width = Math.round(w * dpr);
    c.height = Math.round(h * dpr);
    const ctx = c.getContext("2d")!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ensureFont(font, text).then(() => {
      ctx.clearRect(0, 0, w, h);
      drawText(ctx, w, h, layout);
    });
  }, [layout, stageW, size, font, text, fontsReady]);

  /** Composite background + text at full resolution. */
  const render = useCallback(async (): Promise<Blob> => {
    await ensureFont(font, text);
    const c = document.createElement("canvas");
    c.width = size.w;
    c.height = size.h;
    const ctx = c.getContext("2d")!;
    if (bg.id === "white" || bg.id === "black") {
      ctx.fillStyle = bg.id === "white" ? "#ffffff" : "#000000";
      ctx.fillRect(0, 0, size.w, size.h);
    } else {
      const gl = stageRef.current?.querySelector("canvas[data-paper-shader], canvas") as HTMLCanvasElement | null;
      if (!gl) throw new Error("Background is still loading. Try again in a moment.");
      ctx.drawImage(gl, 0, 0, size.w, size.h);
    }
    drawText(ctx, size.w, size.h, layout);
    return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("Export failed"))), "image/png"));
  }, [bg.id, font, layout, size, text]);

  const fileName = `ineedthis-${(text.trim().split(/\s+/).slice(0, 4).join("-") || "card").replace(/[^\p{L}\p{N}-]+/gu, "").toLowerCase()}.png`;
  const flash = (m: string) => {
    setNote(m);
    setTimeout(() => setNote(""), 2200);
  };

  const onDownload = async () => {
    setBusy("download");
    try {
      const blob = await render();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 3000);
      flash("Saved");
    } catch (e) {
      flash(e instanceof Error ? e.message : "Couldn't save the image.");
    } finally {
      setBusy("");
    }
  };

  const onShare = async () => {
    setBusy("share");
    try {
      const file = new File([await render()], fileName, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file] });
      } else {
        await navigator.clipboard.write([new ClipboardItem({ "image/png": file })]);
        flash("Sharing isn't available here, so the image was copied instead");
      }
    } catch (e) {
      if ((e as Error)?.name !== "AbortError") flash("Couldn't share. Try Download instead.");
    } finally {
      setBusy("");
    }
  };

  const onCopy = async () => {
    setBusy("copy");
    try {
      const blob = await render();
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      flash("Copied — paste it into any chat");
    } catch {
      flash("Your browser blocked copying images. Use Download.");
    } finally {
      setBusy("");
    }
  };

  const pixelRatio = stageW ? size.w / stageW : 2;
  const chip = "h-8 rounded-lg px-2.5 text-[12px]";

  return (
    <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      {/* Preview */}
      <div className="flex flex-col gap-3 md:order-2">
        <div
          ref={stageRef}
          className="relative w-full overflow-hidden rounded-xl border border-border shadow-sm"
          style={{ aspectRatio: `${size.w} / ${size.h}`, maxHeight: "62vh", background: bg.id === "white" ? "#fff" : "#000" }}
        >
          {stageW > 0 && bg.id !== "white" && bg.id !== "black" && (
            <ShaderBg key={`${bg.id}-${sizeId}`} id={bg.id} frame={frame} pixelRatio={pixelRatio} maxPixels={size.w * size.h} />
          )}
          <canvas ref={overlayRef} aria-hidden="true" className="pointer-events-none absolute inset-0 size-full" />
          <span className="sr-only" aria-live="polite">
            Preview: {text}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Button variant="primary" onClick={onShare} disabled={!!busy}>
            {busy === "share" ? "Preparing…" : "Share"}
          </Button>
          <Button variant="secondary" onClick={onDownload} disabled={!!busy}>
            {busy === "download" ? "Saving…" : "Download"}
          </Button>
          <Button variant="secondary" onClick={onCopy} disabled={!!busy}>
            {busy === "copy" ? "Copying…" : "Copy"}
          </Button>
        </div>
        <p className="min-h-4 text-center text-[12px] text-muted-foreground" role="status">
          {note || `${size.w} × ${size.h} PNG · made on your device`}
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-4 md:order-1">
        <label className="flex flex-col gap-1.5 text-[12px] font-medium text-muted-foreground">
          Your text
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            maxLength={400}
            placeholder="Type a quote, a thought, a wish… हिंदी भी चलेगी"
            className="rounded-lg border border-input bg-background px-3 py-2 text-[14px] text-foreground outline-none focus:ring-2 focus:ring-primary/40"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-[12px] font-medium text-muted-foreground">
          Name or handle (optional)
          <input
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            maxLength={60}
            placeholder="@you"
            className="h-9 rounded-lg border border-input bg-background px-3 text-[14px] text-foreground outline-none focus:ring-2 focus:ring-primary/40"
          />
        </label>

        <fieldset className="flex flex-col gap-1.5">
          <legend className="mb-1.5 text-[12px] font-medium text-muted-foreground">Font</legend>
          {(["normal", "handwritten"] as const).map((kind) => (
            <div key={kind} className="flex flex-wrap gap-1.5">
              {CARD_FONTS.filter((f) => f.kind === kind).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  aria-pressed={fontId === f.id}
                  onClick={() => setFontId(f.id)}
                  className={`${chip} ${f.className} border transition-colors duration-150 ${
                    fontId === f.id ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground hover:bg-secondary"
                  }`}
                  style={{ fontSize: 13 * Math.min(1.25, f.scale) }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          ))}
        </fieldset>

        <fieldset>
          <legend className="mb-1.5 text-[12px] font-medium text-muted-foreground">Background</legend>
          <div className="grid grid-cols-5 gap-2 sm:grid-cols-9 md:grid-cols-5">
            {BACKGROUNDS.map((b) => (
              <button
                key={b.id}
                type="button"
                title={b.label}
                aria-label={b.label}
                aria-pressed={bgId === b.id}
                onClick={() => setBgId(b.id)}
                className={`aspect-square rounded-lg border transition-transform duration-150 ease-out active:scale-95 ${
                  bgId === b.id ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : "border-border"
                }`}
                style={{ background: b.swatch }}
              />
            ))}
          </div>
          {bg.id !== "white" && bg.id !== "black" && (
            <Button size="xs" variant="ghost" className="mt-2" onClick={() => setFrame(Math.round(Math.random() * 60000))}>
              ⟳ Shuffle this background
            </Button>
          )}
        </fieldset>

        <fieldset className="flex flex-col gap-1.5">
          <legend className="mb-1.5 text-[12px] font-medium text-muted-foreground">Size</legend>
          <div className="grid grid-cols-2 gap-1.5">
            {SIZES.map((s) => (
              <button
                key={s.id}
                type="button"
                aria-pressed={sizeId === s.id}
                onClick={() => setSizeId(s.id)}
                className={`flex flex-col items-start rounded-lg border px-2.5 py-1.5 text-left transition-colors duration-150 ${
                  sizeId === s.id ? "border-primary bg-primary/10" : "border-border bg-card hover:bg-secondary"
                }`}
              >
                <span className="text-[13px] font-medium text-foreground">{s.label}</span>
                <span className="text-[11px] text-muted-foreground">{s.sub}</span>
              </button>
            ))}
          </div>
        </fieldset>

        <div className="flex gap-1.5">
          {(["center", "left"] as const).map((a) => (
            <Button key={a} size="xs" variant={align === a ? "primary" : "secondary"} aria-pressed={align === a} onClick={() => setAlign(a)}>
              Align {a}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
