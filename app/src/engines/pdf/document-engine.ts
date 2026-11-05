// ============================================================================
// Document Converter Engine — DOCX, XLSX, CSV, Markdown, PPTX ↔ PDF
// ============================================================================

import type { TaskResult, BatchTaskResult } from "@/lib/types";
import { loadPdfJs } from "@/lib/pdfjs";

// ============================================================================
// DOCX → PDF (using mammoth for HTML extraction, then canvas/pdf-lib)
// ============================================================================

export async function docxToPdf(
  buffer: ArrayBuffer,
  filename: string
): Promise<TaskResult> {
  const t = performance.now();
  const mammoth = await import("mammoth");
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");

  const isNode = typeof Buffer !== "undefined";
  const mammothOptions = isNode
    ? { buffer: Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer) }
    : ({ arrayBuffer: buffer } as any);

  const result = await mammoth.convertToHtml(mammothOptions);
  const html = result.value;

  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontSize = 11;
  const lineHeight = fontSize * 1.4;
  const pageWidth = 595.28; // A4
  const pageHeight = 841.89;
  const margin = 50;
  const maxWidth = pageWidth - margin * 2;

  let currentPage = doc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  const writeText = (
    text: string,
    currentFont = font,
    size = fontSize
  ): void => {
    const words = text.split(/\s+/);
    let line = "";

    for (const word of words) {
      const testLine = line ? `${line} ${word}` : word;
      const testWidth = currentFont.widthOfTextAtSize(testLine, size);

      if (testWidth > maxWidth && line) {
        if (y < margin + lineHeight) {
          currentPage = doc.addPage([pageWidth, pageHeight]);
          y = pageHeight - margin;
        }
        currentPage.drawText(line, {
          x: margin,
          y,
          size,
          font: currentFont,
          color: rgb(0, 0, 0),
        });
        y -= lineHeight;
        line = word;
      } else {
        line = testLine;
      }
    }

    if (line) {
      if (y < margin + lineHeight) {
        currentPage = doc.addPage([pageWidth, pageHeight]);
        y = pageHeight - margin;
      }
      currentPage.drawText(line, {
        x: margin,
        y,
        size,
        font: currentFont,
        color: rgb(0, 0, 0),
      });
      y -= lineHeight;
    }
  };

  // Walk DOM nodes
  const walk = (node: Node): void => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent?.trim();
      if (text) writeText(text);
      return;
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      const tag = el.tagName.toLowerCase();

      // Add spacing for block elements
      if (["p", "div", "h1", "h2", "h3", "h4", "h5", "h6", "li", "tr"].includes(tag)) {
        y -= lineHeight * 0.3;
      }

      if (tag.startsWith("h")) {
        const level = parseInt(tag[1]) || 3;
        const headerSize = Math.max(12, 24 - level * 3);
        writeText(el.textContent?.trim() ?? "", boldFont, headerSize);
        y -= lineHeight * 0.5;
        return;
      }

      for (const child of Array.from(node.childNodes)) {
        walk(child);
      }

      if (["p", "div", "li", "tr"].includes(tag)) {
        y -= lineHeight * 0.3;
      }
    }
  };

  if (typeof DOMParser !== "undefined") {
    const parser = new DOMParser();
    const htmlDoc = parser.parseFromString(html, "text/html");
    walk(htmlDoc.body);
  } else {
    const paragraphs = html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .split(/<\/p>|<\/div>|<\/h[1-6]>|<\/tr>|<\/li>/gi);
    for (const p of paragraphs) {
      const clean = p
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .trim();
      if (clean) writeText(clean);
    }
  }

  const bytes = await doc.save();
  const baseName = filename.replace(/\.docx?$/i, "");
  return {
    data: new Blob([bytes as unknown as BlobPart], { type: "application/pdf" }),
    filename: `${baseName}.pdf`,
    mimeType: "application/pdf",
    durationMs: performance.now() - t,
    sizeBytes: bytes.byteLength,
  };
}

// ============================================================================
// XLSX / CSV → PDF (tabular rendering)
// ============================================================================

export async function spreadsheetToPdf(
  buffer: ArrayBuffer,
  filename: string
): Promise<TaskResult> {
  const t = performance.now();
  const XLSX = await import("xlsx");
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");

  const workbook = XLSX.read(buffer, { type: "array" });
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontSize = 9;
  const cellPadding = 4;
  const rowHeight = fontSize + cellPadding * 2;
  const pageWidth = 841.89; // A4 landscape
  const pageHeight = 595.28;
  const margin = 30;

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const data: string[][] = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      raw: false,
    }) as string[][];

    if (data.length === 0) continue;

    const maxCols = Math.max(...data.map((r) => r.length));
    const colWidth = (pageWidth - margin * 2) / Math.max(maxCols, 1);

    let currentPage = doc.addPage([pageWidth, pageHeight]);
    let y = pageHeight - margin;

    for (let rowIdx = 0; rowIdx < data.length; rowIdx++) {
      if (y < margin + rowHeight) {
        currentPage = doc.addPage([pageWidth, pageHeight]);
        y = pageHeight - margin;
      }

      const row = data[rowIdx];
      const isHeader = rowIdx === 0;

      // Draw row background for header
      if (isHeader) {
        currentPage.drawRectangle({
          x: margin,
          y: y - rowHeight + cellPadding,
          width: pageWidth - margin * 2,
          height: rowHeight,
          color: rgb(0.9, 0.9, 0.9),
        });
      }

      for (let colIdx = 0; colIdx < maxCols; colIdx++) {
        const cellText = String(row[colIdx] ?? "").substring(0, 40); // truncate long cells
        const x = margin + colIdx * colWidth + cellPadding;

        currentPage.drawText(cellText, {
          x,
          y: y - cellPadding,
          size: fontSize,
          font: isHeader ? boldFont : font,
          color: rgb(0, 0, 0),
          maxWidth: colWidth - cellPadding * 2,
        });
      }

      // Draw horizontal line
      currentPage.drawLine({
        start: { x: margin, y: y - rowHeight + cellPadding },
        end: { x: pageWidth - margin, y: y - rowHeight + cellPadding },
        thickness: 0.5,
        color: rgb(0.7, 0.7, 0.7),
      });

      y -= rowHeight;
    }
  }

  const bytes = await doc.save();
  const baseName = filename.replace(/\.(xlsx?|csv)$/i, "");
  return {
    data: new Blob([bytes as unknown as BlobPart], { type: "application/pdf" }),
    filename: `${baseName}.pdf`,
    mimeType: "application/pdf",
    durationMs: performance.now() - t,
    sizeBytes: bytes.byteLength,
  };
}

// ============================================================================
// Markdown → PDF
// ============================================================================

export async function markdownToPdf(
  text: string,
  filename: string
): Promise<TaskResult> {
  const t = performance.now();
  const { marked } = await import("marked");
  const html = await marked(text);

  // Reuse the DOCX→PDF text renderer by creating a temporary buffer
  const encoder = new TextEncoder();
  const htmlBlob = new Blob(
    [`<html><body>${html}</body></html>`],
    { type: "text/html" }
  );

  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontSize = 11;
  const lineHeight = fontSize * 1.4;
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const margin = 50;
  const maxWidth = pageWidth - margin * 2;

  let currentPage = doc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  // Parse HTML to extract text
  const parser = new DOMParser();
  const htmlDoc = parser.parseFromString(await htmlBlob.text(), "text/html");

  const writeText = (
    textContent: string,
    currentFont = font,
    size = fontSize
  ): void => {
    const lh = size * 1.4;
    const words = textContent.split(/\s+/).filter(Boolean);
    let line = "";

    for (const word of words) {
      const testLine = line ? `${line} ${word}` : word;
      const testWidth = currentFont.widthOfTextAtSize(testLine, size);

      if (testWidth > maxWidth && line) {
        if (y < margin + lh) {
          currentPage = doc.addPage([pageWidth, pageHeight]);
          y = pageHeight - margin;
        }
        currentPage.drawText(line, {
          x: margin, y, size, font: currentFont, color: rgb(0, 0, 0),
        });
        y -= lh;
        line = word;
      } else {
        line = testLine;
      }
    }

    if (line) {
      if (y < margin + lh) {
        currentPage = doc.addPage([pageWidth, pageHeight]);
        y = pageHeight - margin;
      }
      currentPage.drawText(line, {
        x: margin, y, size, font: currentFont, color: rgb(0, 0, 0),
      });
      y -= lh;
    }
  };

  const walk = (node: Node): void => {
    if (node.nodeType === Node.TEXT_NODE) {
      const t = node.textContent?.trim();
      if (t) writeText(t);
      return;
    }
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      const tag = el.tagName.toLowerCase();
      if (tag.startsWith("h")) {
        const level = parseInt(tag[1]) || 3;
        const headerSize = Math.max(12, 24 - level * 3);
        writeText(el.textContent?.trim() ?? "", boldFont, headerSize);
        y -= lineHeight * 0.5;
        return;
      }
      if (["p", "li"].includes(tag)) y -= lineHeight * 0.3;
      for (const child of Array.from(node.childNodes)) walk(child);
      if (["p", "li"].includes(tag)) y -= lineHeight * 0.3;
    }
  };

  walk(htmlDoc.body);

  const bytes = await doc.save();
  const baseName = filename.replace(/\.md$/i, "");
  return {
    data: new Blob([bytes as unknown as BlobPart], { type: "application/pdf" }),
    filename: `${baseName}.pdf`,
    mimeType: "application/pdf",
    durationMs: performance.now() - t,
    sizeBytes: bytes.byteLength,
  };
}

// ============================================================================
// PPTX → PDF (parse slide XML → render to PDF pages)
// ============================================================================

export async function pptxToPdf(
  buffer: ArrayBuffer,
  filename: string
): Promise<TaskResult> {
  const t = performance.now();
  const JSZip = (await import("jszip")).default;
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");

  const zip = await JSZip.loadAsync(buffer);
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);

  // Standard slide dimensions (inches → points: 1 inch = 72 points)
  const slideW = 720; // 10 inches
  const slideH = 540; // 7.5 inches

  // Find slide files
  const slideFiles: string[] = [];
  zip.forEach((relativePath) => {
    if (/^ppt\/slides\/slide\d+\.xml$/i.test(relativePath)) {
      slideFiles.push(relativePath);
    }
  });

  // Sort by slide number
  slideFiles.sort((a, b) => {
    const numA = parseInt(a.match(/slide(\d+)/)?.[1] ?? "0");
    const numB = parseInt(b.match(/slide(\d+)/)?.[1] ?? "0");
    return numA - numB;
  });

  const emuToPoints = (emu: number) => emu / 12700; // EMU → points (approximate)

  for (const slidePath of slideFiles) {
    const xmlStr = await zip.file(slidePath)?.async("string");
    if (!xmlStr) continue;

    const page = doc.addPage([slideW, slideH]);
    // White background
    page.drawRectangle({
      x: 0, y: 0, width: slideW, height: slideH,
      color: rgb(1, 1, 1),
    });

    // Parse XML for text runs
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlStr, "application/xml");

    // Extract all <a:t> text elements with position info from <p:sp> shapes
    const shapes = xmlDoc.querySelectorAll("sp");
    let textY = slideH - 40; // Fallback vertical position

    for (const shape of shapes) {
      // Try to get position from <a:off> and <a:ext>
      const offset = shape.querySelector("off");
      const extent = shape.querySelector("ext");

      let x = 40;
      let y = textY;

      if (offset) {
        const xAttr = offset.getAttribute("x");
        const yAttr = offset.getAttribute("y");
        if (xAttr) x = emuToPoints(parseInt(xAttr));
        if (yAttr) y = slideH - emuToPoints(parseInt(yAttr));
      }

      // Get all text runs in this shape
      const textElements = shape.querySelectorAll("t");
      let lineOffset = 0;

      for (const textEl of textElements) {
        const text = textEl.textContent?.trim();
        if (!text) continue;

        // Check if parent run has bold
        const runProps = textEl.closest("r")?.querySelector("rPr");
        const isBold = runProps?.getAttribute("b") === "1";
        const sizeAttr = runProps?.getAttribute("sz");
        const textSize = sizeAttr ? parseInt(sizeAttr) / 100 : 14;

        const currentFont = isBold ? boldFont : font;

        page.drawText(text, {
          x: Math.max(10, Math.min(x, slideW - 50)),
          y: Math.max(10, Math.min(y - lineOffset, slideH - 10)),
          size: Math.min(textSize, 48),
          font: currentFont,
          color: rgb(0, 0, 0),
          maxWidth: slideW - x - 20,
        });

        lineOffset += textSize * 1.4;
      }

      textY -= 30; // Fallback spacing
    }
  }

  const bytes = await doc.save();
  const baseName = filename.replace(/\.pptx?$/i, "");
  return {
    data: new Blob([bytes as unknown as BlobPart], { type: "application/pdf" }),
    filename: `${baseName}.pdf`,
    mimeType: "application/pdf",
    durationMs: performance.now() - t,
    sizeBytes: bytes.byteLength,
  };
}

// ============================================================================
// PDF → PPTX (render pages as slide backgrounds + overlay text)
// ============================================================================

export async function pdfToPptx(
  buffer: ArrayBuffer,
  filename: string
): Promise<TaskResult> {
  const t = performance.now();
  const PptxGenJS = (await import("pptxgenjs")).default;
  const pdfjsLib = await loadPdfJs();

  const pdfDoc = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;
  const pptx = new PptxGenJS();

  for (let i = 1; i <= pdfDoc.numPages; i++) {
    const pdfPage = await pdfDoc.getPage(i);
    const scale = 2; // 2x for quality
    const viewport = pdfPage.getViewport({ scale });

    // Render to canvas
    let canvas: OffscreenCanvas | HTMLCanvasElement;
    let ctx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D | null;

    if (typeof OffscreenCanvas !== "undefined") {
      canvas = new OffscreenCanvas(viewport.width, viewport.height);
      ctx = canvas.getContext("2d");
    } else {
      canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      ctx = canvas.getContext("2d");
    }

    if (!ctx) continue;

    await (pdfPage.render as any)({
      canvasContext: ctx,
      viewport,
      canvas,
    }).promise;

    // Convert to base64 PNG
    let pngBlob: Blob;
    if (canvas instanceof OffscreenCanvas) {
      pngBlob = await canvas.convertToBlob({ type: "image/png" });
    } else {
      pngBlob = await new Promise<Blob>((resolve) =>
        canvas.toBlob!((b) => resolve(b!), "image/png")
      );
    }

    const pngBuffer = await pngBlob.arrayBuffer();
    const base64 = btoa(
      new Uint8Array(pngBuffer).reduce(
        (data, byte) => data + String.fromCharCode(byte),
        ""
      )
    );

    const slide = pptx.addSlide();
    slide.addImage({
      data: `data:image/png;base64,${base64}`,
      x: 0,
      y: 0,
      w: "100%",
      h: "100%",
    });

    // Also extract text and overlay it (invisible but selectable)
    const textContent = await pdfPage.getTextContent();
    for (const item of textContent.items) {
      if (!("str" in item) || !item.str.trim()) continue;
      const textItem = item as { str: string; transform: number[]; width: number; height: number };
      const origViewport = pdfPage.getViewport({ scale: 1 });

      // Convert PDF coordinates to PPTX inches
      const xInch = (textItem.transform[4] / origViewport.width) * 10;
      const yInch = ((origViewport.height - textItem.transform[5]) / origViewport.height) * 7.5;

      slide.addText(textItem.str, {
        x: xInch,
        y: yInch,
        fontSize: 10,
        color: "000000",
        transparency: 100, // Invisible but selectable
      });
    }
  }

  (pdfDoc as any).destroy?.();
  const pptxBlob = (await pptx.write({ outputType: "blob" })) as Blob;
  const baseName = filename.replace(/\.pdf$/i, "");
  return {
    data: pptxBlob,
    filename: `${baseName}.pptx`,
    mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    durationMs: performance.now() - t,
    sizeBytes: pptxBlob.size,
  };
}

// ============================================================================
// Data format conversions: JSON ↔ CSV ↔ XLSX
// ============================================================================

export async function convertDataFormat(
  buffer: ArrayBuffer | ArrayBufferView,
  filename: string,
  fromFormat: "json" | "csv" | "xlsx",
  toFormat: "json" | "csv" | "xlsx"
): Promise<TaskResult> {
  const t = performance.now();
  const XLSX = await import("xlsx");

  let workbook: ReturnType<typeof XLSX.read>;

  const uint8 = ArrayBuffer.isView(buffer)
    ? new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength)
    : new Uint8Array(buffer);

  // Parse input
  switch (fromFormat) {
    case "json": {
      const text = new TextDecoder().decode(uint8);
      const jsonData = JSON.parse(text);
      const data = Array.isArray(jsonData) ? jsonData : [jsonData];
      const sheet = XLSX.utils.json_to_sheet(data);
      workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, sheet, "Sheet1");
      break;
    }
    case "csv": {
      const text = new TextDecoder().decode(uint8);
      workbook = XLSX.read(text, { type: "string" });
      break;
    }
    case "xlsx": {
      workbook = XLSX.read(uint8, { type: "array" });
      break;
    }
  }

  // Generate output
  let outputBlob: Blob;
  let ext: string;
  let mimeType: string;

  switch (toFormat) {
    case "json": {
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(sheet);
      const json = JSON.stringify(data, null, 2);
      outputBlob = new Blob([json], { type: "application/json" });
      ext = "json";
      mimeType = "application/json";
      break;
    }
    case "csv": {
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const csv = XLSX.utils.sheet_to_csv(sheet);
      outputBlob = new Blob([csv], { type: "text/csv" });
      ext = "csv";
      mimeType = "text/csv";
      break;
    }
    case "xlsx": {
      const xlsxBuffer = XLSX.write(workbook, {
        bookType: "xlsx",
        type: "array",
      });
      outputBlob = new Blob([xlsxBuffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      ext = "xlsx";
      mimeType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      break;
    }
  }

  const baseName = filename.replace(/\.(json|csv|xlsx?)$/i, "");
  return {
    data: outputBlob!,
    filename: `${baseName}.${ext!}`,
    mimeType: mimeType!,
    durationMs: performance.now() - t,
    sizeBytes: outputBlob!.size,
  };
}

// ============================================================================
// PDF → Word (DOCX) — Exact Structure, Layout, Typography & Table Preservation
// ============================================================================

export async function pdfToDocx(
  buffer: ArrayBuffer,
  filename: string
): Promise<TaskResult> {
  const t = performance.now();
  // Ensure toHex polyfill for pdfjs-dist in environments without ECMAScript 2025 toHex
  if (typeof Uint8Array !== "undefined" && !(Uint8Array.prototype as any).toHex) {
    (Uint8Array.prototype as any).toHex = function () {
      return Array.from(this)
        .map((b: any) => b.toString(16).padStart(2, "0"))
        .join("");
    };
  }
  if (typeof ArrayBuffer !== "undefined" && !(ArrayBuffer.prototype as any).toHex) {
    (ArrayBuffer.prototype as any).toHex = function () {
      return Array.from(new Uint8Array(this))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    };
  }

  const pdfjsLib = await loadPdfJs();

  const pdfDoc = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();

  const escapeXml = (str: string): string => {
    return str
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  };

  const cleanFont = (fontName: string, family?: string) => {
    const isBold =
      /bold|black|heavy|w[7-9]00|medium/i.test(fontName) ||
      /bold|black/i.test(family || "");
    const isItalic =
      /italic|oblique/i.test(fontName) || /italic|oblique/i.test(family || "");
    const cleaned = (family || fontName)
      .replace(/^[A-Z0-9]{6}\+/, "")
      .replace(/[-,_](Bold|Regular|Italic|Oblique|MT|PSMT|Medium)$/i, "")
      .trim();

    let resolved = "Calibri";
    if (/times|roman/i.test(cleaned)) resolved = "Times New Roman";
    else if (/arial/i.test(cleaned)) resolved = "Arial";
    else if (/courier|mono/i.test(cleaned)) resolved = "Courier New";
    else if (/georgia/i.test(cleaned)) resolved = "Georgia";
    else if (/geist/i.test(cleaned)) resolved = "Geist";
    else if (cleaned.length > 2) resolved = cleaned;

    return { name: resolved, isBold, isItalic };
  };

  let imageCounter = 1;
  const imageRels: Array<{ id: string; filename: string }> = [];
  let docXmlBody = "";
  let lastViewport = { width: 595.28, height: 841.89 };

  for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
    const pdfPage = await pdfDoc.getPage(pageNum);
    const viewport = pdfPage.getViewport({ scale: 1.0 });
    lastViewport = viewport;

    const textContent = await pdfPage.getTextContent({
      includeMarkedContent: false,
    });
    const rawItems = textContent.items.filter(
      (item: any) => typeof item.str === "string" && item.str.length > 0
    );

    // If page is an image or scanned document with no text layer, render it to canvas
    if (rawItems.length === 0) {
      const scale = 2;
      const renderViewport = pdfPage.getViewport({ scale });
      let canvas: OffscreenCanvas | HTMLCanvasElement;
      let ctx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D | null;

      if (typeof OffscreenCanvas !== "undefined") {
        canvas = new OffscreenCanvas(renderViewport.width, renderViewport.height);
        ctx = canvas.getContext("2d");
      } else {
        canvas = document.createElement("canvas");
        canvas.width = renderViewport.width;
        canvas.height = renderViewport.height;
        ctx = canvas.getContext("2d");
      }

      if (ctx) {
        await (pdfPage.render as any)({
          canvasContext: ctx,
          viewport: renderViewport,
          canvas,
        }).promise;

        let pngBlob: Blob;
        if (canvas instanceof OffscreenCanvas) {
          pngBlob = await canvas.convertToBlob({ type: "image/png" });
        } else {
          pngBlob = await new Promise<Blob>((resolve) =>
            canvas.toBlob!((b) => resolve(b!), "image/png")
          );
        }

        const pngBuffer = await pngBlob.arrayBuffer();
        const imgName = `image_${imageCounter}.png`;
        const relId = `rId${imageCounter + 10}`;
        imageCounter++;

        zip.file(`word/media/${imgName}`, pngBuffer);
        imageRels.push({ id: relId, filename: imgName });

        const cx = Math.round(viewport.width * 12700);
        const cy = Math.round(viewport.height * 12700);

        docXmlBody += `
        <w:p>
          <w:pPr><w:jc w:val="center"/></w:pPr>
          <w:r>
            <w:drawing>
              <wp:inline distT="0" distB="0" distL="0" distR="0">
                <wp:extent cx="${cx}" cy="${cy}"/>
                <wp:docPr id="${imageCounter}" name="Page ${pageNum}"/>
                <a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
                  <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
                    <pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
                      <pic:nvPicPr>
                        <pic:cNvPr id="${imageCounter}" name="Page ${pageNum}"/>
                        <pic:cNvPicPr/>
                      </pic:nvPicPr>
                      <pic:blipFill>
                        <a:blip r:embed="${relId}"/>
                        <a:stretch><a:fillRect/></a:stretch>
                      </pic:blipFill>
                      <pic:spPr>
                        <a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm>
                        <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
                      </pic:spPr>
                    </pic:pic>
                  </a:graphicData>
                </a:graphic>
              </wp:inline>
            </w:drawing>
          </w:r>
        </w:p>`;
      }
    } else {
      // Structured text extraction
      const parsedItems = rawItems.map((item: any) => {
        const x = item.transform[4];
        const y = item.transform[5];
        const top = viewport.height - y;
        const height = Math.abs(item.transform[3]) || item.height || 11;
        const width = item.width || 0;
        const fontSize = Math.max(7, Math.min(60, Math.round(height)));
        const style = (textContent.styles as any)?.[item.fontName];
        const { name: fontFamily, isBold, isItalic } = cleanFont(
          item.fontName,
          style?.fontFamily
        );

        return {
          str: item.str,
          x,
          top,
          width,
          height,
          fontSize,
          fontFamily,
          isBold,
          isItalic,
        };
      });

      // Cluster items into lines
      parsedItems.sort((a: any, b: any) => a.top - b.top);
      interface LineCluster {
        top: number;
        bottom: number;
        items: typeof parsedItems;
      }
      const lines: LineCluster[] = [];

      for (const item of parsedItems) {
        let placed = false;
        for (const line of lines) {
          if (
            Math.abs(item.top - line.top) <=
            Math.max(3.5, item.fontSize * 0.35)
          ) {
            line.items.push(item);
            line.top =
              (line.top * (line.items.length - 1) + item.top) /
              line.items.length;
            line.bottom = Math.max(line.bottom, item.top + item.height);
            placed = true;
            break;
          }
        }
        if (!placed) {
          lines.push({
            top: item.top,
            bottom: item.top + item.height,
            items: [item],
          });
        }
      }

      // Sort lines top to bottom
      lines.sort((a, b) => a.top - b.top);

      // Process each line into column chunks or text
      interface FormattedLine {
        top: number;
        left: number;
        right: number;
        width: number;
        fontSize: number;
        fontFamily: string;
        isBold: boolean;
        isItalic: boolean;
        isHeading: boolean;
        segments: Array<{
          x: number;
          width: number;
          text: string;
          fontSize: number;
          fontFamily: string;
          isBold: boolean;
          isItalic: boolean;
        }>;
      }

      const formattedLines: FormattedLine[] = lines
        .map((line) => {
          // Filter out empty or whitespace-only items so they don't swallow column gaps
          const validItems = line.items.filter(
            (it: any) => typeof it.str === "string" && it.str.trim().length > 0
          );
          if (validItems.length === 0) return null;

          validItems.sort((a: any, b: any) => a.x - b.x);

          const segments: FormattedLine["segments"] = [];
          let currentSegment = {
            x: validItems[0].x,
            width: validItems[0].width,
            text: validItems[0].str,
            fontSize: validItems[0].fontSize,
            fontFamily: validItems[0].fontFamily,
            isBold: validItems[0].isBold,
            isItalic: validItems[0].isItalic,
          };

          for (let idx = 1; idx < validItems.length; idx++) {
            const prev = validItems[idx - 1];
            const curr = validItems[idx];
            const gap = curr.x - (prev.x + prev.width);

            // If there's a horizontal gap >= 22pt (or >= 1.8x font size), split into separate columns (table/tab)
            if (gap >= Math.max(22, prev.fontSize * 1.8)) {
              segments.push(currentSegment);
              currentSegment = {
                x: curr.x,
                width: curr.width,
                text: curr.str,
                fontSize: curr.fontSize,
                fontFamily: curr.fontFamily,
                isBold: curr.isBold,
                isItalic: curr.isItalic,
              };
            } else {
              // Normal word or character continuation
              const needsSpace =
                gap > 1.5 &&
                !currentSegment.text.endsWith(" ") &&
                !curr.str.startsWith(" ");
              currentSegment.text += (needsSpace ? " " : "") + curr.str;
              currentSegment.width = curr.x + curr.width - currentSegment.x;
              if (curr.fontSize > currentSegment.fontSize) {
                currentSegment.fontSize = curr.fontSize;
              }
              if (curr.isBold) currentSegment.isBold = true;
            }
          }
          segments.push(currentSegment);

          const left = validItems[0].x;
          const last = validItems[validItems.length - 1];
          const right = last.x + last.width;
          const maxFontSize = Math.max(...validItems.map((it: any) => it.fontSize));
          const dominantFont = validItems[0].fontFamily;
          const anyBold = validItems.some((it: any) => it.isBold);
          const fullText = segments.map((s) => s.text).join(" ");
          const isHeading =
            (maxFontSize >= 15 || (maxFontSize >= 13 && anyBold)) &&
            fullText.length < 90 &&
            segments.length === 1;

          return {
            top: line.top,
            left,
            right,
            width: right - left,
            fontSize: maxFontSize,
            fontFamily: dominantFont,
            isBold: anyBold,
            isItalic: validItems[0].isItalic,
            isHeading,
            segments,
          };
        })
        .filter((l): l is FormattedLine => l !== null);

      // Detect table sequences vs regular paragraphs
      let lineIdx = 0;
      let prevBottom = 0;

      while (lineIdx < formattedLines.length) {
        const line = formattedLines[lineIdx];

        // Check for table structure: 2 or more consecutive lines with multi-column segments
        const isTableCandidate = (l: FormattedLine) => l.segments.length >= 2;

        if (
          isTableCandidate(line) &&
          lineIdx + 1 < formattedLines.length &&
          isTableCandidate(formattedLines[lineIdx + 1])
        ) {
          // Collect all rows in this table
          const tableRows: FormattedLine[] = [];
          while (
            lineIdx < formattedLines.length &&
            isTableCandidate(formattedLines[lineIdx])
          ) {
            tableRows.push(formattedLines[lineIdx]);
            lineIdx++;
          }

          // Compute column boundaries from all rows
          const maxCols = Math.max(...tableRows.map((r) => r.segments.length));
          const colWidthsTwips: number[] = [];
          const availWidthTwips = Math.round((viewport.width - 80) * 20);
          const colDefaultTwips = Math.round(availWidthTwips / maxCols);

          for (let c = 0; c < maxCols; c++) {
            colWidthsTwips.push(colDefaultTwips);
          }

          // Build Word Table
          docXmlBody += `
          <w:tbl>
            <w:tblPr>
              <w:tblW w:w="0" w:type="auto"/>
              <w:tblBorders>
                <w:top w:val="single" w:sz="4" w:space="0" w:color="D4D4D8"/>
                <w:bottom w:val="single" w:sz="4" w:space="0" w:color="D4D4D8"/>
                <w:insideH w:val="single" w:sz="4" w:space="0" w:color="E4E4E7"/>
                <w:left w:val="none"/>
                <w:right w:val="none"/>
                <w:insideV w:val="none"/>
              </w:tblBorders>
              <w:tblCellMar>
                <w:top w:w="120" w:type="dxa"/>
                <w:bottom w:w="120" w:type="dxa"/>
                <w:left w:w="160" w:type="dxa"/>
                <w:right w:w="160" w:type="dxa"/>
              </w:tblCellMar>
            </w:tblPr>
            <w:tblGrid>
              ${colWidthsTwips.map((w) => `<w:gridCol w:w="${w}"/>`).join("")}
            </w:tblGrid>
            ${tableRows
              .map(
                (row) => `
              <w:tr>
                ${row.segments
                  .map(
                    (seg, cIdx) => `
                  <w:tc>
                    <w:tcPr>
                      <w:tcW w:w="${colWidthsTwips[cIdx] || colDefaultTwips}" w:type="dxa"/>
                    </w:tcPr>
                    <w:p>
                      <w:pPr>
                        <w:spacing w:before="60" w:after="60" w:line="240" w:lineRule="auto"/>
                      </w:pPr>
                      <w:r>
                        <w:rPr>
                          <w:rFonts w:ascii="${seg.fontFamily}" w:hAnsi="${seg.fontFamily}"/>
                          <w:sz w:val="${seg.fontSize * 2}"/>
                          <w:szCs w:val="${seg.fontSize * 2}"/>
                          ${seg.isBold ? "<w:b/>" : ""}
                          ${seg.isItalic ? "<w:i/>" : ""}
                        </w:rPr>
                        <w:t xml:space="preserve">${escapeXml(seg.text)}</w:t>
                      </w:r>
                    </w:p>
                  </w:tc>
                `
                  )
                  .join("")}
              </w:tr>
            `
              )
              .join("")}
          </w:tbl>`;

          prevBottom = tableRows[tableRows.length - 1].top;
          continue;
        }

        // Standard Paragraph or Heading
        const midX = line.left + line.width / 2;
        const isCentered = Math.abs(midX - viewport.width / 2) < 35;
        const isRight = Math.abs(viewport.width - line.right - 50) < 25;
        const align = isCentered ? "center" : isRight ? "right" : "left";

        const indentTwips =
          !isCentered && !isRight && line.left > 65
            ? Math.round((line.left - 50) * 20)
            : 0;

        const spacingBefore =
          prevBottom > 0
            ? Math.min(480, Math.max(0, Math.round((line.top - prevBottom) * 20)))
            : 0;

        const pStyle = line.isHeading
          ? line.fontSize >= 18
            ? "Heading1"
            : "Heading2"
          : null;

        docXmlBody += `
        <w:p>
          <w:pPr>
            ${pStyle ? `<w:pStyle w:val="${pStyle}"/>` : ""}
            <w:jc w:val="${align}"/>
            <w:spacing w:before="${line.isHeading ? 200 : spacingBefore}" w:after="${line.isHeading ? 100 : 80}" w:line="240" w:lineRule="auto"/>
            ${indentTwips > 80 ? `<w:ind w:left="${indentTwips}"/>` : ""}
          </w:pPr>
          ${line.segments
            .map(
              (seg) => `
            <w:r>
              <w:rPr>
                <w:rFonts w:ascii="${seg.fontFamily}" w:hAnsi="${seg.fontFamily}"/>
                <w:sz w:val="${seg.fontSize * 2}"/>
                <w:szCs w:val="${seg.fontSize * 2}"/>
                ${seg.isBold ? "<w:b/>" : ""}
                ${seg.isItalic ? "<w:i/>" : ""}
              </w:rPr>
              <w:t xml:space="preserve">${escapeXml(seg.text)}</w:t>
            </w:r>
          `
            )
            .join("")}
        </w:p>`;

        prevBottom = line.top + line.fontSize;
        lineIdx++;
      }
    }

    // Page break between pages (except the last page)
    if (pageNum < pdfDoc.numPages) {
      docXmlBody += `
      <w:p>
        <w:r><w:br w:type="page"/></w:r>
      </w:p>`;
    }
  }

  // Final section properties with exact page size
  const pageW = Math.round(lastViewport.width * 20);
  const pageH = Math.round(lastViewport.height * 20);
  const isLandscape = lastViewport.width > lastViewport.height;

  docXmlBody += `
    <w:sectPr>
      <w:pgSz w:w="${pageW}" w:h="${pageH}" ${isLandscape ? 'w:orient="landscape"' : ""}/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/>
    </w:sectPr>`;

  (pdfDoc as any).destroy?.();

  // OpenXML Package Files
  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="png" ContentType="image/png"/>
  <Default Extension="jpeg" ContentType="image/jpeg"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`
  );

  zip.file(
    "_rels/.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`
  );

  let docRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>`;

  for (const rel of imageRels) {
    docRelsXml += `
  <Relationship Id="${rel.id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${rel.filename}"/>`;
  }
  docRelsXml += `\n</Relationships>`;
  zip.file("word/_rels/document.xml.rels", docRelsXml);

  zip.file(
    "word/styles.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/>
        <w:sz w:val="22"/>
        <w:szCs w:val="22"/>
        <w:lang w:val="en-US"/>
      </w:rPr>
    </w:rPrDefault>
    <w:pPrDefault>
      <w:pPr>
        <w:spacing w:after="120" w:line="240" w:lineRule="auto"/>
      </w:pPr>
    </w:pPrDefault>
  </w:docDefaults>
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
    <w:name w:val="Normal"/>
    <w:qFormat/>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading1">
    <w:name w:val="heading 1"/>
    <w:basedOn w:val="Normal"/>
    <w:next w:val="Normal"/>
    <w:qFormat/>
    <w:pPr><w:spacing w:before="240" w:after="120"/></w:pPr>
    <w:rPr><w:b/><w:sz w:val="32"/><w:szCs w:val="32"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading2">
    <w:name w:val="heading 2"/>
    <w:basedOn w:val="Normal"/>
    <w:next w:val="Normal"/>
    <w:qFormat/>
    <w:pPr><w:spacing w:before="180" w:after="80"/></w:pPr>
    <w:rPr><w:b/><w:sz w:val="26"/><w:szCs w:val="26"/></w:rPr>
  </w:style>
</w:styles>`
  );

  zip.file(
    "word/document.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
            xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
            xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
            xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
            xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
  <w:body>
    ${docXmlBody}
  </w:body>
</w:document>`
  );

  const docxBlob = await zip.generateAsync({
    type: "blob",
    mimeType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });

  const baseName = filename.replace(/\.pdf$/i, "");
  return {
    data: docxBlob,
    filename: `${baseName}.docx`,
    mimeType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    durationMs: performance.now() - t,
    sizeBytes: docxBlob.size,
  };
}

// ============================================================================
// Barrel export
// ============================================================================

export const documentEngine = {
  docxToPdf,
  pdfToDocx,
  spreadsheetToPdf,
  markdownToPdf,
  pptxToPdf,
  pdfToPptx,
  convertDataFormat,
} as const;

export type DocumentEngine = typeof documentEngine;
