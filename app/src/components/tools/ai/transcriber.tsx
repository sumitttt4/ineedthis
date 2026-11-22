"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Button from "@/components/_ui/button";
import { formatBytes } from "@/lib/utils";
import type { Cue } from "@/engines/ai/transcribe";

const LANGUAGES: Array<[string, string]> = [
  ["", "Detect automatically"],
  ["english", "English"],
  ["hindi", "Hindi"],
  ["spanish", "Spanish"],
  ["portuguese", "Portuguese"],
  ["french", "French"],
  ["german", "German"],
  ["italian", "Italian"],
  ["arabic", "Arabic"],
  ["bengali", "Bengali"],
  ["tamil", "Tamil"],
  ["telugu", "Telugu"],
  ["marathi", "Marathi"],
  ["urdu", "Urdu"],
  ["indonesian", "Indonesian"],
  ["japanese", "Japanese"],
  ["korean", "Korean"],
  ["chinese", "Chinese"],
  ["russian", "Russian"],
  ["turkish", "Turkish"],
];

const MAX_BYTES = 1024 * 1024 * 1024;

function save(text: string, name: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}

export default function Transcriber({ mode }: { mode: "text" | "subtitles" }) {
  const [file, setFile] = useState<File | null>(null);
  const [model, setModel] = useState<"tiny" | "base">("base");
  const [language, setLanguage] = useState("");
  const [task, setTask] = useState<"transcribe" | "translate">("transcribe");
  const [state, setState] = useState<"idle" | "working" | "done" | "error">("idle");
  const [progress, setProgress] = useState({ percent: -1, message: "" });
  const [segments, setSegments] = useState<Cue[]>([]);
  const [error, setError] = useState("");
  const [withTimes, setWithTimes] = useState(mode === "subtitles");
  const [copied, setCopied] = useState(false);
  const abort = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const mediaUrl = useMemo(() => (file ? URL.createObjectURL(file) : ""), [file]);
  useEffect(() => () => {
    if (mediaUrl) URL.revokeObjectURL(mediaUrl);
  }, [mediaUrl]);
  useEffect(() => () => abort.current?.abort(), []);

  const [fmt, setFmt] = useState<null | typeof import("@/engines/ai/transcribe")>(null);
  useEffect(() => {
    import("@/engines/ai/transcribe").then(setFmt);
  }, []);

  const cues = useMemo(() => (fmt ? fmt.toCues(segments) : []), [fmt, segments]);
  const vttUrl = useMemo(
    () => (fmt && cues.length ? URL.createObjectURL(new Blob([fmt.toVtt(cues)], { type: "text/vtt" })) : ""),
    [fmt, cues]
  );
  useEffect(() => () => {
    if (vttUrl) URL.revokeObjectURL(vttUrl);
  }, [vttUrl]);

  const pick = (f: File | undefined) => {
    if (!f) return;
    if (f.size > MAX_BYTES) {
      setError(`"${f.name}" is ${formatBytes(f.size)}. Files up to 1 GB work in the browser.`);
      return;
    }
    setFile(f);
    setSegments([]);
    setError("");
    setState("idle");
  };

  const start = async () => {
    if (!file) return;
    setState("working");
    setError("");
    setSegments([]);
    abort.current = new AbortController();
    try {
      const { transcribe } = await import("@/engines/ai/transcribe");
      const { cues: segs } = await transcribe(file, {
        model,
        language,
        task,
        signal: abort.current.signal,
        onProgress: (p) => setProgress({ percent: p.percent, message: p.message }),
        onPartial: (c) => setSegments(c),
      });
      setSegments(segs);
      if (!segs.length) throw new Error("No speech was found in this file.");
      setState("done");
    } catch (e) {
      if ((e as Error).name === "AbortError") {
        setState("idle");
        return;
      }
      setError(e instanceof Error ? e.message : "Transcription failed.");
      setState("error");
    }
  };

  const base = file ? file.name.replace(/\.[^.]+$/, "") : "transcript";
  const plain = fmt ? fmt.toText(segments, withTimes) : "";
  const isVideo = !!file && (file.type.startsWith("video/") || /\.(mp4|mov|webm|mkv|m4v)$/i.test(file.name));
  const field = "h-9 rounded-lg border border-input bg-background px-2.5 text-[13px] text-foreground outline-none focus:ring-2 focus:ring-primary/40";

  return (
    <div className="flex flex-col gap-4">
      {/* File */}
      <div
        role="button"
        tabIndex={0}
        aria-label="Choose an audio or video file"
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), inputRef.current?.click())}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          pick(e.dataTransfer.files?.[0]);
        }}
        className="flex cursor-pointer flex-col items-center gap-1.5 rounded-xl border-2 border-dashed border-border bg-secondary/40 p-6 text-center outline-none transition-colors hover:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/50"
      >
        <input ref={inputRef} type="file" accept="audio/*,video/*,.mkv,.mov,.m4a,.opus" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
        <p className="text-[14px] font-semibold">{file ? file.name : "Drop an audio or video file, or click to choose"}</p>
        <p className="text-[12px] text-muted-foreground">
          {file ? formatBytes(file.size) : "MP3, WAV, M4A, MP4, MOV, WebM… processed on your device"}
        </p>
      </div>

      {/* Options */}
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-[12px] font-medium text-muted-foreground">
          Spoken language
          <select value={language} onChange={(e) => setLanguage(e.target.value)} className={field} disabled={state === "working"}>
            {LANGUAGES.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-[12px] font-medium text-muted-foreground">
          Output
          <select value={task} onChange={(e) => setTask(e.target.value as "transcribe" | "translate")} className={field} disabled={state === "working"}>
            <option value="transcribe">Same language</option>
            <option value="translate">Translate to English</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-[12px] font-medium text-muted-foreground">
          Accuracy
          <select value={model} onChange={(e) => setModel(e.target.value as "tiny" | "base")} className={field} disabled={state === "working"}>
            <option value="base">Accurate · 77 MB model</option>
            <option value="tiny">Fast · 41 MB model</option>
          </select>
        </label>
      </div>
      <p className="-mt-1 text-[12px] text-muted-foreground">
        The speech model downloads once and is cached. Your recording never leaves this device.
      </p>

      {/* Action / progress */}
      {state === "working" ? (
        <div role="status" aria-live="polite" className="flex flex-col gap-2 rounded-xl border border-border bg-secondary/50 p-4">
          <div className="flex items-center justify-between gap-3 text-[12px]">
            <span className="font-medium text-foreground">{progress.message || "Starting…"}</span>
            <Button size="xs" variant="ghost" onClick={() => abort.current?.abort()}>
              Cancel
            </Button>
          </div>
          <div role="progressbar" aria-label="Transcription progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress.percent >= 0 ? progress.percent : undefined} className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full w-full origin-left bg-primary transition-transform duration-300 ease-out ${progress.percent < 0 ? "animate-pulse" : ""}`}
              style={{ transform: `scaleX(${progress.percent < 0 ? 1 : Math.max(0.04, progress.percent / 100)})` }}
            />
          </div>
        </div>
      ) : (
        <Button variant="primary" onClick={start} disabled={!file}>
          {state === "done" ? "Run again" : mode === "subtitles" ? "Generate subtitles" : "Transcribe"}
        </Button>
      )}
      {error && (
        <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-[13px] text-destructive">
          {error}
        </p>
      )}

      {/* Results */}
      {segments.length > 0 && (
        <div className="flex flex-col gap-3">
          {mode === "subtitles" && isVideo && vttUrl && state === "done" && (
            <video key={vttUrl} controls src={mediaUrl} className="max-h-80 w-full rounded-lg bg-black">
              <track kind="subtitles" src={vttUrl} srcLang="en" label="Generated" default />
            </video>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-[12px] text-muted-foreground tabular-nums">
              {cues.length} subtitle lines · {segments.reduce((n, s) => n + s.text.split(/\s+/).length, 0)} words
            </span>
            <label className="flex items-center gap-2 text-[12px] text-muted-foreground">
              <input type="checkbox" checked={withTimes} onChange={(e) => setWithTimes(e.target.checked)} className="accent-[var(--primary)]" />
              Show timestamps
            </label>
          </div>
          <textarea readOnly value={plain} rows={10} aria-label="Transcript" className="rounded-lg border border-input bg-background px-3 py-2 text-[13px] leading-relaxed text-foreground" />
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={async () => {
                await navigator.clipboard?.writeText(plain);
                setCopied(true);
                setTimeout(() => setCopied(false), 1200);
              }}
            >
              {copied ? "Copied" : "Copy text"}
            </Button>
            <Button size="sm" variant={mode === "text" ? "primary" : "secondary"} onClick={() => save(plain, `${base}.txt`, "text/plain;charset=utf-8")}>
              Download .txt
            </Button>
            <Button size="sm" variant={mode === "subtitles" ? "primary" : "secondary"} disabled={!fmt} onClick={() => fmt && save(fmt.toSrt(cues), `${base}.srt`, "application/x-subrip;charset=utf-8")}>
              Download .srt
            </Button>
            <Button size="sm" variant="secondary" disabled={!fmt} onClick={() => fmt && save(fmt.toVtt(cues), `${base}.vtt`, "text/vtt;charset=utf-8")}>
              Download .vtt
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
