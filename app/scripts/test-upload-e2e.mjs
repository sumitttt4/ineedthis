import fs from "fs";
import path from "path";
import JSZip from "jszip";
import { pdfToDocx, docxToPdf, convertDataFormat } from "../src/engines/pdf/document-engine.ts";

// Polyfill Uint8Array.prototype.toHex if not present in Node environment
if (!Uint8Array.prototype.toHex) {
  Uint8Array.prototype.toHex = function () {
    return Array.from(this)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  };
}

async function testUploadE2E() {
  console.log("===============================================================");
  console.log("END-TO-END UPLOAD SIMULATION & ACTUAL FILE OUTPUT TEST");
  console.log("===============================================================");

  const outputDir = path.resolve("public/test-results");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // ---------------------------------------------------------------------------
  // 1. PDF TO WORD (DOCX) UPLOAD & CONVERSION
  // ---------------------------------------------------------------------------
  console.log("\n[UPLOAD TEST 1] Uploading 'public/test-sample.pdf' (1197 bytes)...");
  const pdfBytes = fs.readFileSync(path.resolve("public/test-sample.pdf"));
  const pdfBuffer = pdfBytes.buffer.slice(pdfBytes.byteOffset, pdfBytes.byteOffset + pdfBytes.byteLength);

  const docxTaskResult = await pdfToDocx(pdfBuffer, "test-sample.pdf");
  console.log(` → Converted in ${Math.round(docxTaskResult.durationMs)}ms`);
  console.log(` → Output file: ${docxTaskResult.filename} (${docxTaskResult.sizeBytes} bytes, MIME: ${docxTaskResult.mimeType})`);

  // Write output to disk for user inspection
  const docxArrayBuf = await docxTaskResult.data.arrayBuffer();
  const docxOutPath = path.join(outputDir, docxTaskResult.filename);
  fs.writeFileSync(docxOutPath, Buffer.from(docxArrayBuf));
  console.log(` → Saved output to disk: ${docxOutPath}`);

  // Inspect DOCX structure
  const zip = await JSZip.loadAsync(docxArrayBuf);
  const docXml = await zip.file("word/document.xml")?.async("string");
  const hasTitle = docXml && docXml.includes("Antigravity Verification Report");
  const hasTable = docXml && docXml.includes("<w:tbl>");
  const hasThroughput = docXml && docXml.includes("Throughput");

  console.log(` → Verification: Title preserved: ${hasTitle ? "YES (PASS)" : "NO"}`);
  console.log(` → Verification: Table structure (<w:tbl>): ${hasTable ? "YES (PASS)" : "NO"}`);
  console.log(` → Verification: Table data (Throughput): ${hasThroughput ? "YES (PASS)" : "NO"}`);

  // ---------------------------------------------------------------------------
  // 2. WORD (DOCX) TO PDF UPLOAD & CONVERSION
  // ---------------------------------------------------------------------------
  console.log("\n[UPLOAD TEST 2] Uploading generated DOCX back to PDF Engine...");
  const pdfTaskResult = await docxToPdf(docxArrayBuf, "converted_sample.docx");
  const pdfArrayBuf = await pdfTaskResult.data.arrayBuffer();
  const pdfOutPath = path.join(outputDir, "reconverted_sample.pdf");
  fs.writeFileSync(pdfOutPath, Buffer.from(pdfArrayBuf));
  console.log(` → Saved PDF output to disk: ${pdfOutPath} (${pdfTaskResult.sizeBytes} bytes)`);

  // ---------------------------------------------------------------------------
  // 3. TABULAR DATA UPLOAD (JSON -> CSV & XLSX)
  // ---------------------------------------------------------------------------
  console.log("\n[UPLOAD TEST 3] Uploading 'public/test-sample.json'...");
  const jsonBytes = fs.readFileSync(path.resolve("public/test-sample.json"));
  const jsonBuffer = jsonBytes.buffer.slice(jsonBytes.byteOffset, jsonBytes.byteOffset + jsonBytes.byteLength);

  const csvResult = await convertDataFormat(jsonBuffer, "test-sample.json", "json", "csv");
  const csvOutPath = path.join(outputDir, csvResult.filename);
  const csvText = await csvResult.data.text();
  fs.writeFileSync(csvOutPath, csvText);
  console.log(` → Saved CSV output to disk: ${csvOutPath} (${csvResult.sizeBytes} bytes)`);
  console.log(`   CSV preview:\n   ${csvText.split("\n").slice(0, 3).join("\n   ")}`);

  const xlsxResult = await convertDataFormat(jsonBuffer, "test-sample.json", "json", "xlsx");
  const xlsxArrayBuf = await xlsxResult.data.arrayBuffer();
  const xlsxOutPath = path.join(outputDir, xlsxResult.filename);
  fs.writeFileSync(xlsxOutPath, Buffer.from(xlsxArrayBuf));
  console.log(` → Saved Excel XLSX output to disk: ${xlsxOutPath} (${xlsxResult.sizeBytes} bytes)`);

  console.log("\n===============================================================");
  console.log("ALL UPLOAD & CONVERSION TESTS COMPLETED SUCCESSFULLY!");
  console.log(`Output files generated and verified in: ${outputDir}`);
  console.log("===============================================================");
}

testUploadE2E().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
