import fs from "fs";
import path from "path";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

async function main() {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const page = doc.addPage([595.28, 841.89]);
  page.drawText("Antigravity Verification Report", { x: 50, y: 790, size: 20, font: bold, color: rgb(0.1, 0.1, 0.1) });
  page.drawText("Automated End-to-End System Benchmark", { x: 50, y: 765, size: 12, font, color: rgb(0.4, 0.4, 0.4) });

  page.drawText("Quarterly Metrics Table", { x: 50, y: 720, size: 14, font: bold, color: rgb(0.1, 0.1, 0.1) });
  page.drawText("Metric                 Q1          Q2          Target", { x: 50, y: 690, size: 11, font: bold, color: rgb(0.2, 0.2, 0.2) });
  page.drawText("Throughput             99.9%       99.99%      100%", { x: 50, y: 670, size: 11, font, color: rgb(0.3, 0.3, 0.3) });
  page.drawText("Client Latency         42ms        18ms        <50ms", { x: 50, y: 650, size: 11, font, color: rgb(0.3, 0.3, 0.3) });

  const bytes = await doc.save();
  const outPath = path.resolve("public/test-sample.pdf");
  fs.writeFileSync(outPath, Buffer.from(bytes));
  console.log("Successfully wrote", bytes.length, "bytes to", outPath);
}

main().catch(console.error);
