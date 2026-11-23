"use client";

/**
 * Shows a tool's output before anything is saved: images, video, audio, PDF pages,
 * text, and what's inside ZIPs. Nothing downloads until the user asks for it.
 */
import { useEffect, useMemo, useState } from "react";
import { FileArchive, FileText, File as FileIcon, FileSpreadsheet, Presentation } from "lucide-react";
import Button from "@/components/_ui/button";
import { DownloadIcon } from "@/components/_ui/icons";
import { formatBytes } from "@/lib/utils";
import type { TaskResult, BatchTaskResult } from "@/lib/types";

type Kind = "image" | "video" | "audio" | "pdf" | "zip" | "text" | "doc" | "sheet" | "slides" | "other";

const TEXT_EXT = /\.(txt|md|csv|tsv|json|srt|vtt|xml|html?|css|js|ts|yaml|yml|log|ini|svg)$/i;

export function kindOf(name: string, mime = ""): Kind {
  const n = name.toLowerCase();
  if (/\.(svg)$/.test(n) || mime === "image/svg+xml") return "image";
  if (mime.startsWith("image/") || /\.(png|jpe?g|webp|gif|avif|bmp|ico)$/.test(n)) return "image";
  if (mime.startsWith("video/") || /\.(mp4|webm|mov|mkv|m4v)$/.test(n)) return "video";
  if (mime.startsWith("audio/") || /\.(mp3|wav|m4a|m4r|aac|ogg|opus|flac)$/.test(n)) return "audio";
  if (mime === "application/pdf" || n.endsWith(".pdf")) return "pdf";
  if (mime.includes("zip") || n.endsWith(".zip")) return "zip";
  if (/\.(docx?|odt|rtf)$/.test(n)) return "doc";
  if (/\.(xlsx?|ods)$/.test(n)) return "sheet";
  if (/\.(pptx?|odp)$/.test(n)) return "slides";
  if (mime.startsWith("text/") || mime.includes("json") || TEXT_EXT.test(n)) return "text";
  return "other";
}

function useObjectUrl(blob: Blob | null) {
  const url = useMemo(() => (blob ? URL.createObjectURL(blob) : null), [blob]);
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);
  return url;
}

const CHECKER =
  "bg-[conic-gradient(var(--color-muted)_25%,transparent_0_50%,var(--color-muted)_0_75%,transparent_0)] bg-[length:16px_16px]";

/* ------------------------------------------------------------------ */
/* Single-file previews                                                */
/* ------------------------------------------------------------------ */

function ImagePreview({ blob, alt, compact }: { blob: Blob; alt: string; compact?: boolean }) {
  const url = useObjectUrl(blob);
  const [dims, setDims] = useState<string | null>(null);
  if (!url) return null;
  return (
    <figure className="flex flex-col gap-1.5">
      <div className={`flex items-center justify-center overflow-hidden rounded-lg border border-border ${CHECKER} ${compact ? "h-32" : "max-h-[420px] min-h-40 p-3"}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={alt}
          onLoad={(e) => setDims(`${e.currentTarget.naturalWidth} × ${e.currentTarget.naturalHeight}`)}
          className={compact ? "max-h-full max-w-full object-contain" : "max-h-[396px] max-w-full object-contain"}
        />
      </div>
      {!compact && dims && <figcaption className="text-[12px] tabular-nums text-muted-foreground">{dims} px</figcaption>}
    </figure>
  );
}

function PdfPreview({ blob, compact }: { blob: Blob; compact?: boolean }) {
  const [pages, setPages] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [failed, setFailed] = useState<null | "locked" | "error">(null);
  useEffect(() => {
    let live = true;
    const made: string[] = [];
    (async () => {
      try {
        const { loadPdfJs } = await import("@/lib/pdfjs");
        const pdfjs = await loadPdfJs();
        const doc = await pdfjs.getDocument({ data: new Uint8Array(await blob.arrayBuffer()) }).promise;
        if (!live) return;
        setTotal(doc.numPages);
        for (let i = 1; i <= Math.min(doc.numPages, compact ? 1 : 6) && live; i++) {
          const page = await doc.getPage(i);
          const vp = page.getViewport({ scale: 1 });
          const scale = (compact ? 240 : 360) / vp.width;
          const v = page.getViewport({ scale });
          const canvas = document.createElement("canvas");
          canvas.width = Math.ceil(v.width);
          canvas.height = Math.ceil(v.height);
          await page.render({ canvas, canvasContext: canvas.getContext("2d")!, viewport: v }).promise;
          const u = await new Promise<string>((r) => canvas.toBlob((b) => r(URL.createObjectURL(b!)), "image/png"));
          made.push(u);
          if (live) setPages([...made]);
        }
        await doc.loadingTask.destroy();
      } catch (e) {
        if (live) setFailed((e as { name?: string })?.name === "PasswordException" ? "locked" : "error");
      }
    })();
    return () => {
      live = false;
      made.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [blob, compact]);

  if (failed)
    return (
      <p className="rounded-lg border border-border bg-muted/40 p-3 text-[13px] text-muted-foreground">
        {failed === "locked"
          ? "This PDF is password-protected, so it can't be previewed here. It opens with your password."
          : "Preview isn't available for this PDF, but the file is ready."}
      </p>
    );
  if (compact)
    return pages[0] ? (
      <div className="flex h-32 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted/40 p-1.5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={pages[0]} alt="First page" className="max-h-full max-w-full rounded-sm bg-white shadow-sm" />
      </div>
    ) : (
      <div className="h-32 animate-pulse rounded-lg bg-muted" />
    );
  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {pages.length === 0 && <div className="col-span-full h-40 animate-pulse rounded-lg bg-muted" aria-label="Rendering pages" />}
        {pages.map((u, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={u} src={u} alt={`Page ${i + 1}`} className="w-full rounded-md border border-border bg-white shadow-sm" />
        ))}
      </div>
      {total > 0 && (
        <p className="text-[12px] text-muted-foreground">
          {total} page{total === 1 ? "" : "s"}{total > 6 ? ", showing the first 6" : ""}
        </p>
      )}
    </div>
  );
}

function TextPreview({ blob }: { blob: Blob }) {
  const [text, setText] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    blob.slice(0, 200_000).text().then((t) => live && setText(t));
    return () => { live = false; };
  }, [blob]);
  if (text === null) return <div className="h-32 animate-pulse rounded-lg bg-muted" />;
  const lines = text.split("\n");
  const shown = lines.slice(0, 300).join("\n");
  return (
    <div className="flex flex-col gap-1.5">
      <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-border bg-muted/40 p-3 font-mono text-[12px] leading-relaxed text-foreground">
        {shown || "(empty file)"}
      </pre>
      {(lines.length > 300 || blob.size > 200_000) && <p className="text-[12px] text-muted-foreground">Showing the start of the file.</p>}
    </div>
  );
}

type ZipEntry = { name: string; size: number; blob?: Blob };

function ZipPreview({ blob }: { blob: Blob }) {
  const [entries, setEntries] = useState<ZipEntry[] | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const JSZip = (await import("jszip")).default;
        const zip = await JSZip.loadAsync(blob);
        const files = Object.values(zip.files).filter((f) => !f.dir);
        const out: ZipEntry[] = [];
        for (const f of files.slice(0, 200)) {
          const isImg = kindOf(f.name) === "image";
          const data = isImg && out.filter((e) => e.blob).length < 24 ? await f.async("blob") : undefined;
          const typed = data && f.name.toLowerCase().endsWith(".svg") ? new Blob([data], { type: "image/svg+xml" }) : data;
          // JSZip exposes the uncompressed size on an internal field; fall back to the blob size.
          const size = (f as unknown as { _data?: { uncompressedSize?: number } })._data?.uncompressedSize ?? typed?.size ?? 0;
          out.push({ name: f.name, size, blob: typed });
        }
        if (live) setEntries(out);
      } catch {
        if (live) setFailed(true);
      }
    })();
    return () => { live = false; };
  }, [blob]);

  if (failed) return <p className="text-[13px] text-muted-foreground">Couldn&apos;t list this ZIP, but the file is ready.</p>;
  if (!entries) return <div className="h-32 animate-pulse rounded-lg bg-muted" />;
  const images = entries.filter((e) => e.blob);
  const others = entries.filter((e) => !e.blob);
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[12px] text-muted-foreground">
        {entries.length} file{entries.length === 1 ? "" : "s"} inside
      </p>
      {images.length > 0 && (
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
          {images.map((e) => (
            <li key={e.name} className="flex min-w-0 flex-col gap-1">
              <ZipThumb blob={e.blob!} name={e.name} />
              <span className="truncate text-[11px] text-muted-foreground" title={e.name}>{e.name.split("/").pop()}</span>
            </li>
          ))}
        </ul>
      )}
      {others.length > 0 && (
        <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border text-[12px]">
          {others.map((e) => (
            <li key={e.name} className="flex items-center justify-between gap-3 px-3 py-2">
              <span className="truncate font-mono text-foreground">{e.name}</span>
              {e.size > 0 && <span className="shrink-0 tabular-nums text-muted-foreground">{formatBytes(e.size)}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ZipThumb({ blob, name }: { blob: Blob; name: string }) {
  const url = useObjectUrl(blob);
  if (!url) return null;
  return (
    <div className={`flex aspect-square items-center justify-center overflow-hidden rounded-md border border-border p-1.5 ${CHECKER}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt={name} className="max-h-full max-w-full object-contain [image-rendering:auto]" />
    </div>
  );
}

function FileCard({ kind }: { kind: Kind }) {
  const Icon = kind === "zip" ? FileArchive : kind === "sheet" ? FileSpreadsheet : kind === "slides" ? Presentation : kind === "doc" || kind === "text" ? FileText : FileIcon;
  const label =
    kind === "doc" ? "Word document" : kind === "sheet" ? "Spreadsheet" : kind === "slides" ? "Presentation" : "File";
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 p-4">
      <Icon className="size-8 shrink-0 text-primary" aria-hidden="true" />
      <p className="text-[13px] text-muted-foreground">{label} ready. Open it after downloading to check it.</p>
    </div>
  );
}

function MediaBody({ file, compact }: { file: TaskResult; compact?: boolean }) {
  const blob = file.data as Blob;
  const kind = kindOf(file.filename, file.mimeType || blob.type);
  const url = useObjectUrl(kind === "video" || kind === "audio" ? blob : null);
  switch (kind) {
    case "image":
      return <ImagePreview blob={blob} alt={file.filename} compact={compact} />;
    case "video":
      return url ? <video src={url} controls playsInline preload="metadata" className={`w-full rounded-lg border border-border bg-black ${compact ? "h-32 object-contain" : "max-h-[420px]"}`} aria-label={`Preview of ${file.filename}`} /> : null;
    case "audio":
      return url ? <audio src={url} controls preload="metadata" className="w-full" aria-label={`Preview of ${file.filename}`} /> : null;
    case "pdf":
      return <PdfPreview blob={blob} compact={compact} />;
    case "zip":
      return compact ? <FileCard kind="zip" /> : <ZipPreview blob={blob} />;
    case "text":
      return compact ? <FileCard kind="text" /> : <TextPreview blob={blob} />;
    default:
      return <FileCard kind={kind} />;
  }
}

/* ------------------------------------------------------------------ */
/* Public component                                                    */
/* ------------------------------------------------------------------ */

export interface ResultPreviewProps {
  result: TaskResult | BatchTaskResult;
  /** Combined size of the input files, to show before → after. */
  inputBytes?: number;
  /** Download one file of a multi-file result. The main Download button lives in the tool footer. */
  onDownload: (file: TaskResult) => void;
}

function SizeChange({ before, after }: { before?: number; after: number }) {
  const pct = before && after ? Math.round((1 - after / before) * 100) : 0;
  // Only compare when the file actually shrank (compressing, resizing); otherwise it's a different output.
  if (pct < 1) return <span className="tabular-nums">{formatBytes(after)}</span>;
  return (
    <span className="tabular-nums">
      {formatBytes(before!)} → {formatBytes(after)}
      <span className="ml-1.5 font-medium text-emerald-700 dark:text-emerald-400">{pct}% smaller</span>
    </span>
  );
}

export default function ResultPreview({ result, inputBytes, onDownload }: ResultPreviewProps) {
  if ("files" in result) {
    const total = result.files.reduce((s, f) => s + f.sizeBytes, 0);
    return (
      <section aria-label="Results" className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-col">
            <h3 className="text-[14px] font-semibold text-foreground">{result.files.length} files ready. Check them, then download.</h3>
            <p className="text-[12px] text-muted-foreground"><SizeChange before={inputBytes} after={total} /></p>
          </div>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {result.files.map((f, i) => (
            <li key={`${f.filename}-${i}`} className="flex min-w-0 flex-col gap-2 rounded-lg border border-border p-2.5">
              <MediaBody file={f} compact />
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-[12px] font-medium text-foreground" title={f.filename}>{f.filename}</p>
                  <p className="text-[11px] tabular-nums text-muted-foreground">{formatBytes(f.sizeBytes)}</p>
                </div>
                <Button variant="secondary" size="icon-sm" aria-label={`Download ${f.filename}`} title="Download" onClick={() => onDownload(f)}>
                  <DownloadIcon className="size-3.5" aria-hidden="true" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </section>
    );
  }

  return (
    <section aria-label="Result" className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-[14px] font-semibold text-foreground" title={result.filename}>{result.filename}</h3>
          <p className="text-[12px] text-muted-foreground"><SizeChange before={inputBytes} after={result.sizeBytes} /></p>
        </div>
      </div>
      <MediaBody file={result} />
    </section>
  );
}
