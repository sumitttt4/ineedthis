import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/legal-page";
import { TOOLS } from "@/components/tools/tools-registry";

export const metadata: Metadata = {
  title: "About",
  description: "Why INeedThis exists, how it keeps your files private, and the open-source projects it's built on.",
  alternates: { canonical: "/about" },
};

const CREDITS: Array<[string, string, string]> = [
  ["Next.js, React", "MIT", "https://github.com/vercel/next.js"],
  ["Glaze UI", "Apache-2.0", "https://github.com/sumitttt4/glazeui"],
  ["Paper Shaders", "Apache-2.0", "https://github.com/paper-design/shaders"],
  ["ffmpeg.wasm (wrapper)", "MIT", "https://github.com/ffmpegwasm/ffmpeg.wasm"],
  ["FFmpeg core inside ffmpeg.wasm (incl. x264)", "LGPL / GPL — source at the link", "https://github.com/ffmpegwasm/ffmpeg.wasm"],
  ["PDF.js", "Apache-2.0", "https://github.com/mozilla/pdf.js"],
  ["pdf-lib", "MIT", "https://github.com/Hopding/pdf-lib"],
  ["qpdf (WebAssembly build)", "Apache-2.0 / ISC", "https://github.com/neslinesli93/qpdf-wasm"],
  ["SheetJS", "Apache-2.0", "https://sheetjs.com"],
  ["mammoth", "BSD-2-Clause", "https://github.com/mwilliamson/mammoth.js"],
  ["PptxGenJS", "MIT", "https://github.com/gitbrent/PptxGenJS"],
  ["libheif-js", "LGPL-3.0", "https://github.com/catdad-experiments/libheif-js"],
  ["Transformers.js, ONNX Runtime Web", "Apache-2.0 / MIT", "https://github.com/huggingface/transformers.js"],
  ["MODNet model (background removal)", "Apache-2.0", "https://huggingface.co/Xenova/modnet"],
  ["Whisper models (speech to text)", "MIT", "https://github.com/openai/whisper"],
  ["JSZip, fflate, qrcode, marked, diff, piexifjs", "MIT / BSD", "https://github.com/sumitttt4/ineedthis/blob/main/app/package.json"],
  ["Manrope, Geist Mono, card fonts", "SIL Open Font License", "https://fonts.google.com"],
];

export default function AboutPage() {
  return (
    <LegalPage
      title="About INeedThis"
      intro={`INeedThis is ${TOOLS.length} free tools for the everyday jobs everyone runs into — compressing a PDF, converting an iPhone photo, cutting a ringtone, transcribing a voice note — without uploading your files to someone else's server.`}
    >
      <h2>Why</h2>
      <p>
        Most online converters upload your files to a server you know nothing about. Your browser is powerful enough to do the work
        itself, so here it does: PDFs, images, video, audio and even AI models run on your device. It&apos;s faster for small files,
        works offline once loaded, and your documents stay yours.
      </p>

      <h2>Free and open source</h2>
      <p>
        Every tool is free, with no sign-up, watermark or limit on use. The code is public under the MIT License on{" "}
        <a href="https://github.com/sumitttt4/ineedthis" target="_blank" rel="noopener noreferrer">GitHub</a> — read it, run it
        yourself, or contribute a tool.
      </p>

      <h2>Who made it</h2>
      <p>
        Built by <a href="https://sumitsharma.pro" target="_blank" rel="noopener noreferrer">Sumit Sharma</a>. Say hi on{" "}
        <a href="https://x.com/sumitthq" target="_blank" rel="noopener noreferrer">X (@sumitthq)</a>, or report a bug on{" "}
        <a href="https://github.com/sumitttt4/ineedthis/issues" target="_blank" rel="noopener noreferrer">GitHub Issues</a>.
      </p>

      <h2>Built on open source</h2>
      <p>INeedThis stands on these projects. Each keeps its own license.</p>
      <table>
        <thead>
          <tr>
            <th scope="col">Project</th>
            <th scope="col">License</th>
          </tr>
        </thead>
        <tbody>
          {CREDITS.map(([name, license, url]) => (
            <tr key={name}>
              <td>
                <a href={url} target="_blank" rel="noopener noreferrer">{name}</a>
              </td>
              <td>{license}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </LegalPage>
  );
}
