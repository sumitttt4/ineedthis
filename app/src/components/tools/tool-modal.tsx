"use client";

import { useState, useRef, useEffect } from "react";
import Dialog from "@/components/_ui/dialog";
import Button from "@/components/_ui/button";
import { toast } from "@/components/_ui/toaster";
import { formatBytes, formatDuration } from "@/lib/utils";
import type { ToolDefinition } from "./tools-registry";
import {
  UploadCloudIcon,
  DownloadIcon,
  CheckCircleIcon,
  RefreshCwIcon,
  PlayIcon,
  CopyIcon,
  VideoIcon,
  ShieldCheckIcon,
} from "@/components/_ui/icons";
import type { TaskResult, BatchTaskResult, TaskProgress } from "@/lib/types";

// Engine imports
import {
  mergePdfs,
  splitPdf,
  compressPdf,
  pdfToImages,
  addWatermark,
  redactPdf,
} from "@/engines/pdf/pdf-engine";
import {
  docxToPdf,
  pdfToDocx,
  spreadsheetToPdf,
  markdownToPdf,
  pdfToPptx,
} from "@/engines/pdf/document-engine";
import {
  batchConvertImages,
  compressImageToSize,
  stripExif,
  generatePassportGrid,
  generateFaviconPack,
  resizeImage,
} from "@/engines/image/image-engine";
import {
  compressVideo,
  trimVideo,
  videoToGif,
  convertAudio,
  boostAudio,
} from "@/engines/media/media-engine";
import { ScreenRecorder } from "@/engines/media/screen-recorder";
import {
  extractArchive,
  createArchive,
  convertData,
  computeFileHashes,
  generateQrCode,
} from "@/engines/data/data-engine";

export interface ToolModalProps {
  tool: ToolDefinition | null;
  initialFiles?: File[];
  open: boolean;
  onClose: () => void;
}

export default function ToolModal({
  tool,
  initialFiles,
  open,
  onClose,
}: ToolModalProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<TaskProgress>({
    state: "idle",
    percent: 0,
    message: "Ready",
  });
  const [result, setResult] = useState<TaskResult | BatchTaskResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Tool specific options
  const [targetKb, setTargetKb] = useState<number>(200);
  const [targetMb, setTargetMb] = useState<number>(25);
  const [watermarkText, setWatermarkText] = useState("CONFIDENTIAL");
  const [qrText, setQrText] = useState("https://");
  const [qrFormat, setQrFormat] = useState<"png" | "svg">("png");
  const [dataTargetFormat, setDataTargetFormat] = useState<"json" | "csv" | "xlsx">("csv");
  const [imageFormat, setImageFormat] = useState<"webp" | "jpg" | "png">("webp");
  const [audioFormat, setAudioFormat] = useState<"mp3" | "wav" | "m4a">("mp3");
  const [hashesResult, setHashesResult] = useState<Record<string, string> | null>(null);
  const [qrPreviewUrl, setQrPreviewUrl] = useState<string | null>(null);

  // Video Downloader state
  const [videoUrl, setVideoUrl] = useState("");
  const [videoQuality, setVideoQuality] = useState<"1080" | "720" | "480">("1080");
  const [videoFormat, setVideoFormat] = useState<"mp4" | "mp3">("mp4");
  const [isResolvingVideo, setIsResolvingVideo] = useState(false);
  const [videoData, setVideoData] = useState<{
    title: string;
    url: string;
    thumbnail?: string;
    author?: string;
    platform: string;
    duration?: number | string;
    variants?: Array<{ quality: string; url: string }>;
  } | null>(null);

  const handleResolveVideo = async (urlToFetch?: string) => {
    const target = (urlToFetch ?? videoUrl).trim();
    if (!target) {
      setErrorMsg("Please enter or paste a valid video URL.");
      return;
    }
    setErrorMsg(null);
    setIsResolvingVideo(true);
    setVideoData(null);

    try {
      const res = await fetch("/api/video-downloader", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: target,
          quality: videoQuality,
          isAudioOnly: videoFormat === "mp3",
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to resolve video stream.");
      }

      setVideoData(data);
      toast(`Video ready: ${data.title.slice(0, 30)}...`, { type: "success" });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Error resolving video.");
    } finally {
      setIsResolvingVideo(false);
    }
  };

  const handleDownloadVideo = (selectedUrl?: string, customTitle?: string) => {
    const downloadTarget = selectedUrl || videoData?.url;
    if (!downloadTarget) return;

    const ext = videoFormat === "mp3" ? "mp3" : "mp4";
    const rawTitle = customTitle || videoData?.title || "video";
    const filename = `${rawTitle.replace(/[/\\?%*:|"<>]/g, "_")}.${ext}`;

    const proxyUrl = `/api/video-downloader?url=${encodeURIComponent(downloadTarget)}&filename=${encodeURIComponent(filename)}`;

    const a = document.createElement("a");
    a.href = proxyUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    toast(`Downloading ${filename}`, { type: "success" });
  };

  const handleResolveAndDownload = async (urlOverride?: string) => {
    const target = (urlOverride || videoUrl).trim();
    if (!target) return;

    setIsResolvingVideo(true);
    setErrorMsg(null);
    setProgress({ state: "processing", percent: 30, message: "Resolving media stream..." });

    try {
      const res = await fetch("/api/video-downloader", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: target,
          quality: videoQuality,
          isAudioOnly: videoFormat === "mp3",
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to resolve video stream.");
      }

      setVideoData(data);
      toast(`1-Tap: Downloading ${data.title.slice(0, 28)}...`, { type: "success" });
      handleDownloadVideo(data.url, data.title);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Error resolving video.");
      toast("Download error", { description: String(err), type: "error" });
    } finally {
      setIsResolvingVideo(false);
    }
  };

  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text && text.startsWith("http")) {
        const trimmed = text.trim();
        setVideoUrl(trimmed);
        toast("Pasted link — starting 1-tap download!");
        handleResolveAndDownload(trimmed);
      } else {
        toast("Clipboard does not contain a URL", { type: "info" });
      }
    } catch {
      toast("Please paste your video link into the box.", { type: "info" });
    }
  };

  // Screen recorder ref
  const recorderRef = useRef<ScreenRecorder | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [micEnabled, setMicEnabled] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const downloadFile = (taskResult: TaskResult) => {
    const blob = taskResult.data as Blob;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = taskResult.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    toast(`Downloaded ${taskResult.filename}`);
  };

  const executeTool = async (overrideFiles?: File[]) => {
    if (!tool) return;
    if (tool.id === "universal-video-downloader") {
      await handleResolveAndDownload();
      return;
    }

    const activeFiles = overrideFiles || files;
    if (tool.id !== "screen-recorder" && tool.id !== "qr-studio" && activeFiles.length === 0) {
      setErrorMsg("Please select at least one file to process.");
      return;
    }

    setIsProcessing(true);
    setErrorMsg(null);
    setProgress({ state: "processing", percent: 15, message: "Processing with zero uploads..." });

    try {
      let res: TaskResult | BatchTaskResult | null = null;

      switch (tool.id) {
        case "pdf-to-docx": {
          const buf = await activeFiles[0].arrayBuffer();
          res = await pdfToDocx(buf, activeFiles[0].name);
          break;
        }
        case "pdf-merge": {
          const buffers = await Promise.all(activeFiles.map((f) => f.arrayBuffer()));
          const names = activeFiles.map((f) => f.name);
          res = await mergePdfs(buffers, names);
          break;
        }
        case "pdf-split": {
          const buf = await activeFiles[0].arrayBuffer();
          res = await splitPdf(buf, activeFiles[0].name, { mode: "individual" });
          break;
        }
        case "pdf-compress": {
          const buf = await activeFiles[0].arrayBuffer();
          res = await compressPdf(buf, activeFiles[0].name, { targetDpi: 150, imageQuality: 0.65 });
          break;
        }
        case "pdf-to-img": {
          const buf = await activeFiles[0].arrayBuffer();
          res = await pdfToImages(buf, activeFiles[0].name, 300, "png");
          break;
        }
        case "docx-to-pdf": {
          const buf = await activeFiles[0].arrayBuffer();
          res = await docxToPdf(buf, activeFiles[0].name);
          break;
        }
        case "xlsx-to-pdf": {
          const buf = await activeFiles[0].arrayBuffer();
          res = await spreadsheetToPdf(buf, activeFiles[0].name);
          break;
        }
        case "md-to-pdf": {
          const text = await activeFiles[0].text();
          res = await markdownToPdf(text, activeFiles[0].name);
          break;
        }
        case "pdf-to-pptx": {
          const buf = await activeFiles[0].arrayBuffer();
          res = await pdfToPptx(buf, activeFiles[0].name);
          break;
        }
        case "pdf-watermark": {
          const buf = await activeFiles[0].arrayBuffer();
          res = await addWatermark(buf, activeFiles[0].name, { text: watermarkText });
          break;
        }
        case "pdf-redact": {
          const buf = await activeFiles[0].arrayBuffer();
          res = await redactPdf(buf, activeFiles[0].name, { patterns: [], useBuiltInPatterns: true });
          break;
        }
        case "image-convert": {
          res = await batchConvertImages(activeFiles, { format: imageFormat, quality: 0.85 });
          break;
        }
        case "image-compress-kb": {
          res = await compressImageToSize(activeFiles[0], {
            maxSizeBytes: targetKb * 1024,
            minQuality: 0.1,
          });
          break;
        }
        case "image-exif": {
          res = await stripExif(activeFiles[0]);
          break;
        }
        case "image-passport": {
          res = await generatePassportGrid(activeFiles[0], {
            size: "35x45mm",
            copies: 6,
            sheetSize: "4x6",
          });
          break;
        }
        case "image-favicon": {
          res = await generateFaviconPack(activeFiles[0]);
          break;
        }
        case "image-resize": {
          res = await resizeImage(activeFiles[0], { width: 1200, maintainAspectRatio: true });
          break;
        }
        case "video-compress-mb": {
          res = await compressVideo(
            activeFiles[0],
            { targetSizeBytes: targetMb * 1024 * 1024 },
            (p) => setProgress(p)
          );
          break;
        }
        case "video-trim": {
          res = await trimVideo(
            activeFiles[0],
            { startTime: 0, endTime: 10, frameAccurate: false },
            (p) => setProgress(p)
          );
          break;
        }
        case "video-to-gif": {
          res = await videoToGif(
            activeFiles[0],
            { fps: 15, width: 480 },
            (p) => setProgress(p)
          );
          break;
        }
        case "audio-extract-convert": {
          res = await convertAudio(
            activeFiles[0],
            { format: audioFormat, bitrate: 192 },
            (p) => setProgress(p)
          );
          break;
        }
        case "audio-booster": {
          res = await boostAudio(
            activeFiles[0],
            { gainDb: 6, normalize: true },
            (p) => setProgress(p)
          );
          break;
        }
        case "archive-zip": {
          if (activeFiles[0].name.toLowerCase().endsWith(".zip")) {
            const buf = await activeFiles[0].arrayBuffer();
            res = await extractArchive(buf, activeFiles[0].name);
          } else {
            res = await createArchive(activeFiles, "archive.zip");
          }
          break;
        }
        case "data-convert": {
          res = await convertData(activeFiles[0], { to: dataTargetFormat });
          break;
        }
        case "file-hash": {
          const hashRes = await computeFileHashes(activeFiles[0], {
            algorithms: ["sha-256", "sha-1", "md5"],
          });
          setHashesResult(hashRes.hashes);
          res = {
            data: new Blob([JSON.stringify(hashRes.hashes, null, 2)], {
              type: "application/json",
            }),
            filename: `${activeFiles[0].name}_checksums.json`,
            mimeType: "application/json",
            durationMs: hashRes.durationMs,
            sizeBytes: 150,
          };
          break;
        }
        case "qr-studio": {
          const qrRes = await generateQrCode({
            content: qrText || "https://example.com",
            format: qrFormat,
            size: 512,
          });
          res = qrRes;
          setQrPreviewUrl(URL.createObjectURL(qrRes.data as Blob));
          break;
        }
        default: {
          throw new Error(`Tool "${tool.id}" is ready and executing in Web Worker.`);
        }
      }

      setResult(res);
      setProgress({ state: "completed", percent: 100, message: "1-Tap Complete! File downloaded." });
      toast("1-Tap Complete! File downloaded.", { type: "success" });

      // Auto-download in 1 tap!
      if (res && "data" in res && (res as TaskResult).data) {
        downloadFile(res as TaskResult);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "An unexpected error occurred.";
      setErrorMsg(msg);
      setProgress({ state: "error", percent: 0, message: msg });
      toast("Processing failed", { description: msg, type: "error" });
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    if (open) {
      const init = initialFiles ?? [];
      setFiles(init);
      setResult(null);
      setErrorMsg(null);
      setHashesResult(null);
      setQrPreviewUrl(null);
      setVideoData(null);
      setVideoUrl("");
      setProgress({ state: "idle", percent: 0, message: "Ready" });
      setIsProcessing(false);

      if (
        init.length > 0 &&
        tool &&
        tool.id !== "screen-recorder" &&
        tool.id !== "qr-studio" &&
        tool.id !== "universal-video-downloader"
      ) {
        executeTool(init);
      }
    }
  }, [open, initialFiles]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selected = Array.from(e.target.files);
      setFiles(selected);
      setResult(null);
      setErrorMsg(null);
      executeTool(selected);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const dropped = Array.from(e.dataTransfer.files);
      setFiles(dropped);
      setResult(null);
      setErrorMsg(null);
      executeTool(dropped);
    }
  };

  const startScreenRecording = async () => {
    try {
      recorderRef.current = new ScreenRecorder();
      await recorderRef.current.start({
        includeMic: micEnabled,
        includeSystemAudio: true,
      });
      setIsRecording(true);
      toast("Screen recording started", { description: "Capturing browser/display media" });
    } catch (err) {
      toast("Could not start recording", {
        description: err instanceof Error ? err.message : "Permission denied",
        type: "error",
      });
    }
  };

  const stopScreenRecording = async () => {
    if (!recorderRef.current) return;
    try {
      setIsProcessing(true);
      setProgress({ state: "processing", percent: 50, message: "Encoding recorded stream..." });
      const recordResult = await recorderRef.current.stop();
      setResult(recordResult);
      setIsRecording(false);
      setProgress({ state: "completed", percent: 100, message: "Recording saved!" });
      toast("Screen recording saved & downloaded!", { type: "success" });
      downloadFile(recordResult);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to save recording");
    } finally {
      setIsProcessing(false);
    }
  };

  if (!tool) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={tool.name}
      description={tool.description}
      footer={
        <div className="flex w-full items-center justify-between gap-3">
          <div className="text-[12px] text-muted-foreground">
            <span className="text-[11px] opacity-75">
              Private & Instant
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={onClose} disabled={isProcessing}>
              Close
            </Button>

            {tool.id === "universal-video-downloader" ? (
              <Button
                variant="primary"
                onClick={() => handleResolveAndDownload()}
                disabled={isResolvingVideo || !videoUrl.trim()}
              >
                {isResolvingVideo ? (
                  <>
                    <RefreshCwIcon className="size-3.5 animate-spin" />
                    Downloading...
                  </>
                ) : (
                  <>
                    <DownloadIcon className="size-3.5" />
                    1-Tap Download
                  </>
                )}
              </Button>
            ) : tool.id === "screen-recorder" ? (
              isRecording ? (
                <Button variant="danger" onClick={stopScreenRecording}>
                  Stop & Save Recording
                </Button>
              ) : (
                <Button variant="primary" onClick={startScreenRecording}>
                  Start Screen Recording
                </Button>
              )
            ) : result ? (
              <Button
                variant="primary"
                onClick={() => {
                  if ("files" in result) {
                    result.files.forEach(downloadFile);
                  } else {
                    downloadFile(result);
                  }
                }}
              >
                <DownloadIcon className="size-4" />
                Download Again
              </Button>
            ) : (
              <Button
                variant="primary"
                onClick={() => executeTool()}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <RefreshCwIcon className="size-3.5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <DownloadIcon className="size-3.5" />
                    1-Tap Process & Download
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        {/* File Dropzone or Input Area */}
        {tool.id !== "screen-recorder" && tool.id !== "qr-studio" && tool.id !== "universal-video-downloader" && (
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="border-border hover:border-primary/50 bg-secondary/40 hover:bg-secondary/70 flex flex-col items-center justify-center gap-2.5 rounded-xl border-2 border-dashed p-6 text-center cursor-pointer transition-colors"
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple={tool.id === "pdf-merge" || tool.id === "image-convert" || tool.id === "archive-zip"}
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-full">
              <UploadCloudIcon className="size-5" />
            </div>
            <div>
              <p className="text-[14px] font-semibold">
                Click or drag & drop files here
              </p>
              <p className="text-muted-foreground mt-0.5 text-[12px]">
                Supported: {tool.formats.join(", ")} • Zero server uploads
              </p>
            </div>
            {files.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5 justify-center">
                {files.map((f, i) => (
                  <span
                    key={i}
                    className="bg-card text-foreground border border-border inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium"
                  >
                    {f.name} ({formatBytes(f.size)})
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Dynamic Tool Options */}
        {tool.id === "image-compress-kb" && (
          <div className="border-border bg-card flex flex-col gap-2 rounded-xl border p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <label className="text-[13px] font-medium">Target File Size Limit</label>
              <span className="text-[13px] font-semibold text-primary tabular-nums">
                {targetKb} KB
              </span>
            </div>
            <input
              type="range"
              min="20"
              max="1024"
              step="10"
              value={targetKb}
              onChange={(e) => setTargetKb(Number(e.target.value))}
              className="accent-primary w-full cursor-pointer"
            />
            <div className="flex justify-between text-[11px] text-muted-foreground">
              <span>20 KB (Thumbnail/Avatar)</span>
              <span>200 KB (Govt Portals)</span>
              <span>1000 KB (Web Photo)</span>
            </div>
          </div>
        )}

        {tool.id === "video-compress-mb" && (
          <div className="border-border bg-card flex flex-col gap-2 rounded-xl border p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <label className="text-[13px] font-medium">Target Video Size</label>
              <span className="text-[13px] font-semibold text-primary tabular-nums">
                {targetMb} MB
              </span>
            </div>
            <input
              type="range"
              min="4"
              max="100"
              step="2"
              value={targetMb}
              onChange={(e) => setTargetMb(Number(e.target.value))}
              className="accent-primary w-full cursor-pointer"
            />
            <div className="flex justify-between text-[11px] text-muted-foreground">
              <span>8 MB (Discord Free)</span>
              <span>25 MB (Email Attachment)</span>
              <span>100 MB</span>
            </div>
          </div>
        )}

        {tool.id === "pdf-watermark" && (
          <div className="border-border bg-card flex flex-col gap-2 rounded-xl border p-4 shadow-sm">
            <label className="text-[13px] font-medium">Watermark Stamp Text</label>
            <input
              type="text"
              value={watermarkText}
              onChange={(e) => setWatermarkText(e.target.value)}
              placeholder="e.g. CONFIDENTIAL / DRAFT"
              className="border-input bg-background rounded-lg border px-3 py-2 text-[13px] outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        )}

        {tool.id === "qr-studio" && (
          <div className="border-border bg-card flex flex-col gap-3 rounded-xl border p-4 shadow-sm">
            <label className="text-[13px] font-medium">QR Code Content</label>
            <input
              type="text"
              value={qrText}
              onChange={(e) => setQrText(e.target.value)}
              placeholder="URL, WiFi config, UPI ID, or plain text"
              className="border-input bg-background rounded-lg border px-3 py-2 text-[13px] outline-none focus:ring-2 focus:ring-primary/50"
            />
            <div className="flex items-center gap-3">
              <label className="text-[12px] text-muted-foreground">Output Format:</label>
              <div className="flex gap-1.5">
                {(["png", "svg"] as const).map((fmt) => (
                  <Button
                    key={fmt}
                    variant={qrFormat === fmt ? "primary" : "secondary"}
                    size="xs"
                    onClick={() => setQrFormat(fmt)}
                  >
                    {fmt.toUpperCase()}
                  </Button>
                ))}
              </div>
            </div>
            {qrPreviewUrl && (
              <div className="flex flex-col items-center gap-2 p-2">
                <img
                  src={qrPreviewUrl}
                  alt="Generated QR"
                  className="size-48 rounded-lg border border-border p-2 bg-white"
                />
              </div>
            )}
          </div>
        )}

        {tool.id === "data-convert" && (
          <div className="border-border bg-card flex flex-col gap-2 rounded-xl border p-4 shadow-sm">
            <label className="text-[13px] font-medium">Convert Tabular Data To:</label>
            <div className="flex gap-2">
              {(["csv", "json", "xlsx"] as const).map((fmt) => (
                <Button
                  key={fmt}
                  variant={dataTargetFormat === fmt ? "primary" : "secondary"}
                  size="sm"
                  onClick={() => setDataTargetFormat(fmt)}
                >
                  {fmt.toUpperCase()}
                </Button>
              ))}
            </div>
          </div>
        )}

        {tool.id === "image-convert" && (
          <div className="border-border bg-card flex flex-col gap-2 rounded-xl border p-4 shadow-sm">
            <label className="text-[13px] font-medium">Target Image Format:</label>
            <div className="flex gap-2">
              {(["webp", "png", "jpg"] as const).map((fmt) => (
                <Button
                  key={fmt}
                  variant={imageFormat === fmt ? "primary" : "secondary"}
                  size="sm"
                  onClick={() => setImageFormat(fmt)}
                >
                  {fmt.toUpperCase()}
                </Button>
              ))}
            </div>
          </div>
        )}

        {tool.id === "screen-recorder" && (
          <div className="border-border bg-card flex flex-col gap-3 rounded-xl border p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[13px] font-medium">Include Microphone Audio</p>
                <p className="text-[12px] text-muted-foreground">
                  Mix microphone commentary with tab or system audio
                </p>
              </div>
              <input
                type="checkbox"
                checked={micEnabled}
                onChange={(e) => setMicEnabled(e.target.checked)}
                className="size-4 accent-primary cursor-pointer"
              />
            </div>
          </div>
        )}

        {/* Universal Video Downloader UI */}
        {tool.id === "universal-video-downloader" && (
          <div className="flex flex-col gap-4">
            {/* Supported platforms banner */}
            <div className="flex items-center justify-between flex-wrap gap-2 rounded-xl bg-secondary/50 p-3 border border-border text-[12px] text-muted-foreground">
              <span className="font-medium text-foreground">Supported Platforms:</span>
              <div className="flex flex-wrap items-center gap-1.5">
                {["YouTube", "X / Twitter", "TikTok", "Instagram", "Reddit", "Direct URL"].map((p) => (
                  <span
                    key={p}
                    className="rounded-md bg-card px-2 py-0.5 text-[11px] font-medium text-foreground border border-border"
                  >
                    {p}
                  </span>
                ))}
              </div>
            </div>

            {/* URL input bar with paste button */}
            <div className="flex flex-col gap-2">
              <label className="text-[13px] font-medium text-foreground">
                Paste Video Link
              </label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type="url"
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleResolveAndDownload();
                      }
                    }}
                    placeholder="Paste link from YouTube, X/Twitter, TikTok, Instagram, Reddit, or MP4 URL..."
                    className="w-full rounded-xl border border-input bg-card px-3.5 py-2.5 text-[13px] outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                  {videoUrl && (
                    <button
                      type="button"
                      onClick={() => setVideoUrl("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-[12px] cursor-pointer"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <Button
                  variant="secondary"
                  size="md"
                  type="button"
                  onClick={handlePasteClipboard}
                  title="Paste link from clipboard and download in 1-tap"
                >
                  <CopyIcon className="size-3.5" />
                  Paste
                </Button>

                <Button
                  variant="primary"
                  size="md"
                  type="button"
                  onClick={() => handleResolveAndDownload()}
                  disabled={isResolvingVideo || !videoUrl.trim()}
                >
                  {isResolvingVideo ? (
                    <>
                      <RefreshCwIcon className="size-3.5 animate-spin" />
                      Downloading...
                    </>
                  ) : (
                    <>
                      <DownloadIcon className="size-3.5" />
                      1-Tap Download
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Format & Quality selectors */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-y border-border py-3">
              <div className="flex items-center gap-2">
                <span className="text-[12px] text-muted-foreground font-medium">Download Type:</span>
                <div className="flex gap-1">
                  <Button
                    variant={videoFormat === "mp4" ? "primary" : "secondary"}
                    size="xs"
                    onClick={() => setVideoFormat("mp4")}
                  >
                    MP4 Video
                  </Button>
                  <Button
                    variant={videoFormat === "mp3" ? "primary" : "secondary"}
                    size="xs"
                    onClick={() => setVideoFormat("mp3")}
                  >
                    MP3 Audio
                  </Button>
                </div>
              </div>

              {videoFormat === "mp4" && (
                <div className="flex items-center gap-2">
                  <span className="text-[12px] text-muted-foreground font-medium">Quality:</span>
                  <div className="flex gap-1">
                    {(["1080", "720", "480"] as const).map((q) => (
                      <Button
                        key={q}
                        variant={videoQuality === q ? "primary" : "secondary"}
                        size="xs"
                        onClick={() => setVideoQuality(q)}
                      >
                        {q}p
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Resolved Video Card Preview */}
            {videoData && (
              <div className="flex flex-col sm:flex-row items-start gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm animate-in fade-in duration-200">
                {videoData.thumbnail && (
                  <div className="relative size-28 shrink-0 overflow-hidden rounded-xl border border-border bg-black/40">
                    <img
                      src={videoData.thumbnail}
                      alt={videoData.title}
                      className="size-full object-cover"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                      <div className="size-8 rounded-full bg-white/90 text-black flex items-center justify-center shadow-md">
                        <PlayIcon className="size-4 ml-0.5" />
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex min-w-0 flex-1 flex-col justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-primary/10 border border-primary/20 px-2 py-0.5 text-[10px] font-semibold text-primary uppercase">
                        {videoData.platform}
                      </span>
                      {videoData.duration && (
                        <span className="text-[11px] text-muted-foreground">
                          {typeof videoData.duration === "number"
                            ? formatDuration(videoData.duration)
                            : videoData.duration}
                        </span>
                      )}
                    </div>
                    <h3 className="mt-1 text-[14px] font-semibold text-foreground line-clamp-2">
                      {videoData.title}
                    </h3>
                    {videoData.author && (
                      <p className="mt-0.5 text-[12px] text-muted-foreground">
                        {videoData.author}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleDownloadVideo()}
                      className="gap-2 shadow-sm font-semibold"
                    >
                      <DownloadIcon className="size-4" />
                      Download {videoFormat === "mp3" ? "Audio (MP3)" : "Video (MP4)"}
                    </Button>

                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(videoData.url);
                        toast("Direct stream link copied to clipboard!");
                      }}
                      title="Copy Direct Video Link"
                    >
                      <CopyIcon className="size-3.5" />
                      Copy Link
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Additional Variants if multiple streams extracted */}
            {videoData?.variants && videoData.variants.length > 1 && (
              <div className="flex flex-col gap-1.5 rounded-xl border border-border bg-secondary/30 p-3">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Available Streams & Resolutions
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {videoData.variants.map((v, i) => (
                    <Button
                      key={i}
                      variant="secondary"
                      size="xs"
                      onClick={() => handleDownloadVideo(v.url, `${videoData.title} - ${v.quality}`)}
                    >
                      <DownloadIcon className="size-3" />
                      {v.quality}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Clean Ad-Free Guarantee */}
            <div className="flex items-center justify-center gap-2 pt-1 text-[12px] text-muted-foreground">
              <ShieldCheckIcon className="size-4 text-emerald-500 shrink-0" />
              <span>100% Ad-Free • No Popups • Direct High-Speed Download</span>
            </div>
          </div>
        )}

        {/* Progress Bar & Status */}
        {isProcessing && (
          <div className="border-border bg-secondary/50 flex flex-col gap-2 rounded-xl border p-4">
            <div className="flex items-center justify-between text-[12px]">
              <span className="font-medium text-foreground flex items-center gap-1.5">
                <RefreshCwIcon className="size-3.5 animate-spin text-primary" />
                {progress.message}
              </span>
              {progress.percent >= 0 && (
                <span className="tabular-nums text-muted-foreground">
                  {Math.round(progress.percent)}%
                </span>
              )}
            </div>
            <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
              <div
                className="bg-primary h-full transition-all duration-200"
                style={{
                  width: progress.percent < 0 ? "100%" : `${Math.max(5, progress.percent)}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Checksum Hashes Result Display */}
        {hashesResult && (
          <div className="border-border bg-card flex flex-col gap-2 rounded-xl border p-4 text-[12px]">
            <p className="font-semibold text-foreground">Computed File Hashes:</p>
            {Object.entries(hashesResult).map(([algo, hash]) => (
              <div key={algo} className="flex flex-col gap-0.5 border-b border-border/50 pb-2">
                <span className="text-[11px] uppercase text-muted-foreground font-semibold">
                  {algo}:
                </span>
                <span className="text-primary break-all select-all font-medium">{hash}</span>
              </div>
            ))}
          </div>
        )}

        {/* Error message */}
        {errorMsg && (
          <div className="border-destructive/40 bg-destructive/10 text-destructive rounded-xl border p-3 text-[13px]">
            {errorMsg}
          </div>
        )}

        {/* Completed Task Summary */}
        {result && (
          <div className="border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 rounded-xl border p-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <CheckCircleIcon className="size-5 text-emerald-500 shrink-0" />
              <div>
                <p className="text-[13px] font-semibold">Ready for download!</p>
                <p className="text-[12px] opacity-80">
                  {"files" in result
                    ? `${result.files.length} output files (${formatDuration(result.totalDurationMs)})`
                    : `${result.filename} (${formatBytes(result.sizeBytes)} • ${formatDuration(result.durationMs)})`}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </Dialog>
  );
}
