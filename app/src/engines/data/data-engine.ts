// ============================================================================
// Data Engine — Archives, File Hash, Diff, QR Code, WebRTC P2P
// ============================================================================

import type {
  TaskResult,
  BatchTaskResult,
  ArchiveExtractOptions,
  FileHashOptions,
  QrCodeOptions,
  WebRtcTransferOptions,
} from "@/lib/types";

// ============================================================================
// 1. In-Browser Archive Manager (fflate-based)
// ============================================================================

/** Metadata about a file inside an archive. */
export interface ArchiveEntry {
  path: string;
  size: number;
  compressedSize: number;
  isDirectory: boolean;
}

/** List files inside a ZIP archive without extracting. */
export async function listArchive(buffer: ArrayBuffer): Promise<ArchiveEntry[]> {
  const fflate = await import("fflate");
  const data = new Uint8Array(buffer);

  return new Promise((resolve, reject) => {
    const entries: ArchiveEntry[] = [];

    fflate.unzip(data, {}, (err, result) => {
      if (err) {
        reject(new Error(`Failed to read archive: ${err.message}`));
        return;
      }

      for (const [path, content] of Object.entries(result)) {
        entries.push({
          path,
          size: content.byteLength,
          compressedSize: content.byteLength, // fflate doesn't expose compressed sizes easily
          isDirectory: path.endsWith("/"),
        });
      }

      resolve(entries);
    });
  });
}

/** Extract files from a ZIP archive. */
export async function extractArchive(
  buffer: ArrayBuffer,
  filename: string,
  options: ArchiveExtractOptions = {}
): Promise<BatchTaskResult> {
  const t = performance.now();
  const fflate = await import("fflate");
  const data = new Uint8Array(buffer);

  return new Promise((resolve, reject) => {
    fflate.unzip(data, {}, (err, result) => {
      if (err) {
        reject(new Error(`Failed to extract archive: ${err.message}`));
        return;
      }

      const files: TaskResult[] = [];
      const filterSet = options.filterPaths
        ? new Set(options.filterPaths)
        : null;

      for (const [path, content] of Object.entries(result)) {
        if (path.endsWith("/")) continue; // skip directories
        if (filterSet && !filterSet.has(path)) continue;

        const ext = path.split(".").pop()?.toLowerCase() ?? "";
        const mimeMap: Record<string, string> = {
          txt: "text/plain", json: "application/json", html: "text/html",
          css: "text/css", js: "text/javascript", png: "image/png",
          jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif",
          svg: "image/svg+xml", pdf: "application/pdf", mp4: "video/mp4",
          mp3: "audio/mpeg", zip: "application/zip",
        };

        const blob = new Blob([content], {
          type: mimeMap[ext] ?? "application/octet-stream",
        });

        files.push({
          data: blob,
          filename: path.split("/").pop() ?? path,
          mimeType: blob.type,
          durationMs: 0,
          sizeBytes: content.byteLength,
        });
      }

      resolve({
        files,
        totalDurationMs: performance.now() - t,
      });
    });
  });
}

/** Compress files into a ZIP archive. */
export async function createArchive(
  files: File[],
  archiveName = "archive.zip"
): Promise<TaskResult> {
  const t = performance.now();
  const fflate = await import("fflate");

  const zipData: Record<string, Uint8Array> = {};

  for (const file of files) {
    const buffer = await file.arrayBuffer();
    zipData[file.name] = new Uint8Array(buffer);
  }

  return new Promise((resolve, reject) => {
    fflate.zip(zipData, { level: 6 }, (err, data) => {
      if (err) {
        reject(new Error(`Failed to create archive: ${err.message}`));
        return;
      }

      const blob = new Blob([data], { type: "application/zip" });
      resolve({
        data: blob,
        filename: archiveName,
        mimeType: "application/zip",
        durationMs: performance.now() - t,
        sizeBytes: data.byteLength,
      });
    });
  });
}

// ============================================================================
// 2. File Hash Engine (SHA-256, SHA-1, MD5 via Web Crypto)
// ============================================================================

export interface FileHashResult {
  filename: string;
  fileSize: number;
  hashes: Record<string, string>;
  durationMs: number;
}

/**
 * Compute checksums of a file using Web Crypto API.
 * Note: MD5 is not supported by Web Crypto, so we use a simple JS implementation.
 */
export async function computeFileHashes(
  file: File,
  options: FileHashOptions
): Promise<FileHashResult> {
  const t = performance.now();
  const buffer = await file.arrayBuffer();
  const hashes: Record<string, string> = {};

  for (const algo of options.algorithms) {
    if (algo === "md5") {
      // MD5 via simple implementation (Web Crypto doesn't support MD5)
      hashes["md5"] = await computeMd5(buffer);
    } else {
      const algoMap: Record<string, string> = {
        "sha-256": "SHA-256",
        "sha-1": "SHA-1",
      };

      const hashBuffer = await crypto.subtle.digest(
        algoMap[algo] ?? "SHA-256",
        buffer
      );
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      hashes[algo] = hashArray
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    }
  }

  return {
    filename: file.name,
    fileSize: file.size,
    hashes,
    durationMs: performance.now() - t,
  };
}

/** Simple MD5 implementation for browser (not crypto-secure, for checksums only). */
async function computeMd5(buffer: ArrayBuffer): Promise<string> {
  // Use a lightweight MD5 computation
  const data = new Uint8Array(buffer);
  const md5 = (await import("./md5")).md5;
  return md5(data);
}

// ============================================================================
// 3. Text/JSON Diff Engine
// ============================================================================

export interface DiffResult {
  /** Unified diff string. */
  diff: string;
  /** Whether files are identical. */
  identical: boolean;
  /** Number of additions. */
  additions: number;
  /** Number of deletions. */
  deletions: number;
}

export async function diffTexts(
  textA: string,
  textB: string,
  labelA = "file-a",
  labelB = "file-b"
): Promise<DiffResult> {
  const { createTwoFilesPatch } = await import("diff");

  const patch = createTwoFilesPatch(labelA, labelB, textA, textB);

  let additions = 0;
  let deletions = 0;
  for (const line of patch.split("\n")) {
    if (line.startsWith("+") && !line.startsWith("+++")) additions++;
    if (line.startsWith("-") && !line.startsWith("---")) deletions++;
  }

  return {
    diff: patch,
    identical: additions === 0 && deletions === 0,
    additions,
    deletions,
  };
}

export async function diffFiles(fileA: File, fileB: File): Promise<DiffResult> {
  const textA = await fileA.text();
  const textB = await fileB.text();
  return diffTexts(textA, textB, fileA.name, fileB.name);
}

// ============================================================================
// 4. QR Code Generator
// ============================================================================

export async function generateQrCode(
  options: QrCodeOptions
): Promise<TaskResult> {
  const t = performance.now();
  const QRCode = await import("qrcode");

  const qrOptions = {
    errorCorrectionLevel: options.errorCorrection ?? "M",
    margin: 2,
    width: options.size ?? 512,
  };

  if (options.format === "svg") {
    const svg = await QRCode.toString(options.content, {
      ...qrOptions,
      type: "svg",
    });
    const blob = new Blob([svg], { type: "image/svg+xml" });
    return {
      data: blob,
      filename: "qrcode.svg",
      mimeType: "image/svg+xml",
      durationMs: performance.now() - t,
      sizeBytes: blob.size,
    };
  } else {
    // PNG via canvas
    const dataUrl = await QRCode.toDataURL(options.content, qrOptions);
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    return {
      data: blob,
      filename: "qrcode.png",
      mimeType: "image/png",
      durationMs: performance.now() - t,
      sizeBytes: blob.size,
    };
  }
}

/** Generate a Wi-Fi config QR code. */
export async function generateWifiQr(
  ssid: string,
  password: string,
  encryption: "WPA" | "WEP" | "nopass" = "WPA",
  hidden = false
): Promise<TaskResult> {
  const content = `WIFI:T:${encryption};S:${ssid};P:${password};H:${hidden ? "true" : "false"};;`;
  return generateQrCode({ content, format: "png", size: 512 });
}

/** Generate a UPI payment QR code. */
export async function generateUpiQr(
  upiId: string,
  payeeName: string,
  amount?: number,
  note?: string
): Promise<TaskResult> {
  let content = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(payeeName)}`;
  if (amount) content += `&am=${amount}`;
  if (note) content += `&tn=${encodeURIComponent(note)}`;
  return generateQrCode({ content, format: "png", size: 512 });
}

/** Generate a vCard QR code. */
export async function generateVcardQr(vcard: {
  firstName: string;
  lastName: string;
  phone?: string;
  email?: string;
  org?: string;
  title?: string;
  url?: string;
}): Promise<TaskResult> {
  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `N:${vcard.lastName};${vcard.firstName}`,
    `FN:${vcard.firstName} ${vcard.lastName}`,
  ];
  if (vcard.phone) lines.push(`TEL:${vcard.phone}`);
  if (vcard.email) lines.push(`EMAIL:${vcard.email}`);
  if (vcard.org) lines.push(`ORG:${vcard.org}`);
  if (vcard.title) lines.push(`TITLE:${vcard.title}`);
  if (vcard.url) lines.push(`URL:${vcard.url}`);
  lines.push("END:VCARD");

  return generateQrCode({ content: lines.join("\n"), format: "png", size: 512 });
}

// ============================================================================
// 5. WebRTC P2P File Transfer (serverless data channel)
// ============================================================================

export interface P2PTransferEvents {
  onOffer?: (offer: string) => void;
  onConnected?: () => void;
  onProgress?: (percent: number, bytesTransferred: number) => void;
  onComplete?: (file: Blob, filename: string) => void;
  onError?: (error: Error) => void;
}

/**
 * P2P file transfer using WebRTC data channels.
 * Uses chunked ArrayBuffer streaming for large files.
 *
 * Flow:
 * 1. Sender creates offer → shares with receiver (e.g., via QR code)
 * 2. Receiver creates answer → shares back
 * 3. Data channel streams file in chunks
 */
export class P2PTransfer {
  private pc: RTCPeerConnection;
  private dataChannel: RTCDataChannel | null = null;
  private events: P2PTransferEvents;
  private chunkSize: number;

  constructor(
    events: P2PTransferEvents,
    options: WebRtcTransferOptions = {}
  ) {
    this.events = events;
    this.chunkSize = options.chunkSize ?? 65536; // 64KB chunks

    this.pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
      ],
    });

    this.pc.onicecandidate = (e) => {
      if (!e.candidate) {
        // ICE gathering complete, emit final offer/answer
        const desc = this.pc.localDescription;
        if (desc) {
          this.events.onOffer?.(JSON.stringify(desc));
        }
      }
    };
  }

  /** Sender: create an offer with a data channel. */
  async createOffer(file: File): Promise<string> {
    this.dataChannel = this.pc.createDataChannel("file-transfer", {
      ordered: true,
    });
    this.dataChannel.binaryType = "arraybuffer";

    this.dataChannel.onopen = async () => {
      this.events.onConnected?.();

      // Send metadata first
      const metadata = JSON.stringify({
        filename: file.name,
        size: file.size,
        type: file.type,
      });
      this.dataChannel!.send(metadata);

      // Stream file in chunks
      const buffer = await file.arrayBuffer();
      const totalChunks = Math.ceil(buffer.byteLength / this.chunkSize);
      let sent = 0;

      for (let i = 0; i < totalChunks; i++) {
        const start = i * this.chunkSize;
        const end = Math.min(start + this.chunkSize, buffer.byteLength);
        const chunk = buffer.slice(start, end);

        // Wait for buffer to drain if needed
        while (
          this.dataChannel!.bufferedAmount >
          this.chunkSize * 4
        ) {
          await new Promise((r) => setTimeout(r, 10));
        }

        this.dataChannel!.send(chunk);
        sent += chunk.byteLength;
        this.events.onProgress?.(
          Math.round((sent / buffer.byteLength) * 100),
          sent
        );
      }

      // Send end marker
      this.dataChannel!.send("__EOF__");
    };

    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);

    // Wait for ICE gathering
    return new Promise((resolve) => {
      if (this.pc.iceGatheringState === "complete") {
        resolve(JSON.stringify(this.pc.localDescription));
      } else {
        this.pc.onicegatheringstatechange = () => {
          if (this.pc.iceGatheringState === "complete") {
            resolve(JSON.stringify(this.pc.localDescription));
          }
        };
      }
    });
  }

  /** Receiver: accept an offer. */
  async acceptOffer(offerJson: string): Promise<string> {
    const offer = JSON.parse(offerJson);
    await this.pc.setRemoteDescription(offer);

    // Listen for incoming data channel
    this.pc.ondatachannel = (e) => {
      this.dataChannel = e.channel;
      this.dataChannel.binaryType = "arraybuffer";

      let metadata: { filename: string; size: number; type: string } | null =
        null;
      const chunks: ArrayBuffer[] = [];
      let received = 0;

      this.dataChannel.onopen = () => {
        this.events.onConnected?.();
      };

      this.dataChannel.onmessage = (msg) => {
        if (typeof msg.data === "string") {
          if (msg.data === "__EOF__") {
            // File transfer complete
            const blob = new Blob(chunks, {
              type: metadata?.type ?? "application/octet-stream",
            });
            this.events.onComplete?.(
              blob,
              metadata?.filename ?? "received_file"
            );
            return;
          }
          // First string message is metadata
          metadata = JSON.parse(msg.data);
          return;
        }

        // ArrayBuffer chunk
        chunks.push(msg.data);
        received += msg.data.byteLength;
        if (metadata) {
          this.events.onProgress?.(
            Math.round((received / metadata.size) * 100),
            received
          );
        }
      };
    };

    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);

    return new Promise((resolve) => {
      if (this.pc.iceGatheringState === "complete") {
        resolve(JSON.stringify(this.pc.localDescription));
      } else {
        this.pc.onicegatheringstatechange = () => {
          if (this.pc.iceGatheringState === "complete") {
            resolve(JSON.stringify(this.pc.localDescription));
          }
        };
      }
    });
  }

  /** Apply the remote answer (sender side). */
  async applyAnswer(answerJson: string): Promise<void> {
    const answer = JSON.parse(answerJson);
    await this.pc.setRemoteDescription(answer);
  }

  /** Close the connection and clean up. */
  close(): void {
    this.dataChannel?.close();
    this.pc.close();
  }
}

// ============================================================================
// 5. Data Format Converter (JSON ↔ CSV ↔ XLSX)
// ============================================================================

export async function convertData(
  file: File,
  options: { to: "json" | "csv" | "xlsx" }
): Promise<TaskResult> {
  const t = performance.now();
  const XLSX = await import("xlsx");
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];

  let outBlob: Blob;
  let filename: string;
  let mimeType: string;
  const baseName = file.name.replace(/\.[^/.]+$/, "");

  if (options.to === "json") {
    const json = XLSX.utils.sheet_to_json(firstSheet);
    const text = JSON.stringify(json, null, 2);
    outBlob = new Blob([text], { type: "application/json" });
    filename = `${baseName}.json`;
    mimeType = "application/json";
  } else if (options.to === "csv") {
    const csv = XLSX.utils.sheet_to_csv(firstSheet);
    outBlob = new Blob([csv], { type: "text/csv" });
    filename = `${baseName}.csv`;
    mimeType = "text/csv";
  } else {
    const outBuf = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    outBlob = new Blob([outBuf as unknown as BlobPart], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    filename = `${baseName}.xlsx`;
    mimeType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  }

  return {
    data: outBlob,
    filename,
    mimeType,
    durationMs: performance.now() - t,
    sizeBytes: outBlob.size,
  };
}

// ============================================================================
// Barrel export
// ============================================================================

export const dataEngine = {
  listArchive,
  extractArchive,
  createArchive,
  computeFileHashes,
  diffTexts,
  diffFiles,
  generateQrCode,
  generateWifiQr,
  generateUpiQr,
  generateVcardQr,
  P2PTransfer,
} as const;

export type DataEngine = typeof dataEngine;
