/**
 * qpdf (WebAssembly) for real PDF decryption, encryption and lossless
 * optimisation — things pdf-lib cannot do. Runs entirely in the browser.
 * The ~1.3 MB wasm is fetched once from /qpdf/qpdf.wasm and reused.
 */

let wasmBinary: Promise<ArrayBuffer> | null = null;

function loadWasm(): Promise<ArrayBuffer> {
  if (!wasmBinary) {
    wasmBinary = fetch("/qpdf/qpdf.wasm").then((r) => {
      if (!r.ok) throw new Error("Could not load the PDF engine (qpdf).");
      return r.arrayBuffer();
    });
    wasmBinary.catch(() => (wasmBinary = null));
  }
  return wasmBinary;
}

export class QpdfError extends Error {
  code: number;
  constructor(message: string, code: number) {
    super(message);
    this.code = code;
  }
}

/** Runs qpdf on one input PDF and returns /out.pdf. Each call gets a fresh instance. */
export async function runQpdf(input: ArrayBuffer | Uint8Array, args: string[]): Promise<Uint8Array> {
  const [{ default: createModule }, binary] = await Promise.all([
    import("@neslinesli93/qpdf-wasm"),
    loadWasm(),
  ]);
  const log: string[] = [];
  // This build binds console.* when the module is created and writes qpdf's
  // messages there (not to print/printErr), so capture the console from
  // creation until the run finishes.
  const original = { log: console.log, warn: console.warn, error: console.error };
  const capture = (...parts: unknown[]) => log.push(parts.map(String).join(" "));
  console.log = console.warn = console.error = capture;
  try {
    return await runCaptured(input, args, binary, createModule, log);
  } finally {
    Object.assign(console, original);
  }
}

async function runCaptured(
  input: ArrayBuffer | Uint8Array,
  args: string[],
  binary: ArrayBuffer,
  createModule: unknown,
  log: string[]
): Promise<Uint8Array> {
  const mod: any = await (createModule as any)({
    wasmBinary: binary.slice(0),
    // The module may still resolve the wasm itself; point it at our copy.
    locateFile: (path: string) => (path.endsWith(".wasm") ? "/qpdf/qpdf.wasm" : path),
    noInitialRun: true,
    thisProgram: "qpdf",
    print: (t: string) => log.push(t),
    printErr: (t: string) => log.push(t),
  });
  mod.FS.writeFile("/in.pdf", input instanceof Uint8Array ? input : new Uint8Array(input));

  let code = 0;
  try {
    code = mod.callMain([...args.map((a) => a.replace("{in}", "/in.pdf").replace("{out}", "/out.pdf"))]);
  } catch (e) {
    code = (e as { status?: number }).status ?? 1;
  }

  // qpdf exit 3 = success with warnings
  if (code !== 0 && code !== 3) {
    const msg = log.join(" ");
    if (/invalid password/i.test(msg)) throw new QpdfError("That password is incorrect.", code);
    throw new QpdfError(`PDF engine failed: ${msg.replace(/(qpdf|this\.program):\s*/g, "").replace(/\/in\.pdf:\s*/g, "").slice(0, 160) || `exit ${code}`}`, code);
  }
  try {
    return mod.FS.readFile("/out.pdf") as Uint8Array;
  } catch {
    throw new QpdfError("PDF engine produced no output.", code);
  }
}
