"use client";

/**
 * Instant tools that work on typed text or the microphone instead of an
 * uploaded file. Each renders its own panel inside the tool dialog; nothing
 * leaves the browser.
 */

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import Button from "@/components/_ui/button";

/* ------------------------------------------------------------------ */
/* Shared bits                                                          */
/* ------------------------------------------------------------------ */

const field =
  "w-full rounded-lg border border-input bg-background px-3 py-2 text-[13px] text-foreground outline-none focus:ring-2 focus:ring-primary/40";
const mono = `${field} font-mono text-[12.5px] leading-relaxed`;

function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <Button
      size="xs"
      variant="secondary"
      disabled={!text}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1200);
        } catch {
          /* clipboard blocked */
        }
      }}
    >
      {done ? "Copied" : label}
    </Button>
  );
}

function download(text: string, name: string, type = "text/plain;charset=utf-8") {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function Label({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="text-[12px] font-medium text-muted-foreground">
      {children}
    </label>
  );
}

function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col rounded-lg border border-border bg-background px-3 py-2">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span className="text-[18px] font-semibold tabular-nums text-foreground">{value}</span>
    </div>
  );
}

function ErrorText({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="text-[12px] text-destructive">
      {children}
    </p>
  );
}

/* ------------------------------------------------------------------ */
/* Word counter                                                        */
/* ------------------------------------------------------------------ */

function fmtMinutes(min: number) {
  if (min < 1) return `${Math.max(1, Math.round(min * 60))} sec`;
  return `${Math.round(min)} min`;
}

function WordCounter() {
  const [text, setText] = useState("");
  const s = useMemo(() => {
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    return {
      words,
      chars: [...text].length,
      noSpaces: [...text.replace(/\s/g, "")].length,
      sentences: (text.match(/[^.!?\n]+[.!?]+/g) ?? []).length || (text.trim() ? 1 : 0),
      paragraphs: text.split(/\n\s*\n/).filter((p) => p.trim()).length,
      reading: fmtMinutes(words / 238),
      speaking: fmtMinutes(words / 150),
    };
  }, [text]);
  return (
    <div className="flex flex-col gap-3">
      <Label htmlFor="wc-text">Your text</Label>
      <textarea id="wc-text" value={text} onChange={(e) => setText(e.target.value)} rows={9} placeholder="Paste or type…" className={field} />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Words" value={s.words} />
        <Stat label="Characters" value={s.chars} />
        <Stat label="No spaces" value={s.noSpaces} />
        <Stat label="Sentences" value={s.sentences} />
        <Stat label="Paragraphs" value={s.paragraphs} />
        <Stat label="Reading time" value={s.reading} />
        <Stat label="Speaking time" value={s.speaking} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Case converter                                                      */
/* ------------------------------------------------------------------ */

const splitWords = (t: string) =>
  t
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_\-./]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

const CASES: Array<{ id: string; label: string; fn: (t: string) => string }> = [
  { id: "upper", label: "UPPER CASE", fn: (t) => t.toUpperCase() },
  { id: "lower", label: "lower case", fn: (t) => t.toLowerCase() },
  { id: "title", label: "Title Case", fn: (t) => t.toLowerCase().replace(/\b\p{L}/gu, (c) => c.toUpperCase()) },
  {
    id: "sentence",
    label: "Sentence case",
    fn: (t) => t.toLowerCase().replace(/(^\s*\p{L}|[.!?]\s+\p{L})/gu, (c) => c.toUpperCase()),
  },
  {
    id: "camel",
    label: "camelCase",
    fn: (t) => splitWords(t).map((w, i) => (i ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w.toLowerCase())).join(""),
  },
  { id: "pascal", label: "PascalCase", fn: (t) => splitWords(t).map((w) => w[0].toUpperCase() + w.slice(1).toLowerCase()).join("") },
  { id: "snake", label: "snake_case", fn: (t) => splitWords(t).map((w) => w.toLowerCase()).join("_") },
  { id: "kebab", label: "kebab-case", fn: (t) => splitWords(t).map((w) => w.toLowerCase()).join("-") },
  {
    id: "slug",
    label: "url-slug",
    fn: (t) =>
      t
        .normalize("NFKD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, ""),
  },
];

function CaseConverter() {
  const [text, setText] = useState("");
  const [mode, setMode] = useState("title");
  const out = (CASES.find((c) => c.id === mode) ?? CASES[0]).fn(text);
  return (
    <div className="flex flex-col gap-3">
      <Label htmlFor="cc-in">Text</Label>
      <textarea id="cc-in" value={text} onChange={(e) => setText(e.target.value)} rows={5} placeholder="Type something to convert" className={field} />
      <div role="radiogroup" aria-label="Case" className="flex flex-wrap gap-1.5">
        {CASES.map((c) => (
          <Button key={c.id} role="radio" aria-checked={mode === c.id} size="xs" variant={mode === c.id ? "primary" : "secondary"} onClick={() => setMode(c.id)}>
            {c.label}
          </Button>
        ))}
      </div>
      <div className="flex items-center justify-between">
        <Label htmlFor="cc-out">Result</Label>
        <CopyButton text={out} />
      </div>
      <textarea id="cc-out" readOnly value={out} rows={5} className={field} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* JSON formatter                                                      */
/* ------------------------------------------------------------------ */

/** Finds where JSON breaks. Browsers word (and position) parse errors differently, so scan it ourselves. */
function locateJsonError(src: string): { pos: number; what: string } {
  let i = 0;
  const ws = () => { while (i < src.length && " \t\n\r".includes(src[i])) i++; };
  const fail = (what: string): never => { throw { pos: i, what }; };
  const value = (): void => {
    ws();
    const c = src[i];
    if (c === "{") {
      i++; ws();
      if (src[i] === "}") { i++; return; }
      for (;;) {
        ws(); if (src[i] !== '"') fail("Expected a quoted key"); str(); ws();
        if (src[i] !== ":") fail("Expected ':' after key"); i++; value(); ws();
        if (src[i] === ",") { i++; continue; }
        if (src[i] === "}") { i++; return; }
        fail("Expected ',' or '}'");
      }
    } else if (c === "[") {
      i++; ws();
      if (src[i] === "]") { i++; return; }
      for (;;) {
        value(); ws();
        if (src[i] === ",") { i++; continue; }
        if (src[i] === "]") { i++; return; }
        fail("Expected ',' or ']'");
      }
    } else if (c === '"') str();
    else if (/[-0-9]/.test(c ?? "")) { const m = /^-?(0|[1-9]\d*)(\.\d+)?([eE][+-]?\d+)?/.exec(src.slice(i)); if (!m) fail("Invalid number"); i += m![0].length; }
    else if (src.startsWith("true", i)) i += 4;
    else if (src.startsWith("false", i)) i += 5;
    else if (src.startsWith("null", i)) i += 4;
    else fail(c === undefined ? "Unexpected end of input" : `Unexpected '${c}'`);
  };
  const str = () => {
    i++;
    while (i < src.length && src[i] !== '"') { if (src[i] === "\\") i++; else if (src[i] === "\n") fail("Unescaped line break in string"); i++; }
    if (src[i] !== '"') fail("Unterminated string");
    i++;
  };
  try {
    value(); ws();
    if (i < src.length) fail("Unexpected text after the JSON value");
  } catch (e) {
    return e as { pos: number; what: string };
  }
  return { pos: -1, what: "" };
}

function jsonError(text: string, e: unknown) {
  const { pos, what } = locateJsonError(text);
  if (pos < 0) return e instanceof Error ? e.message : String(e);
  const before = text.slice(0, pos);
  const line = before.split("\n").length;
  const col = pos - before.lastIndexOf("\n");
  return `${what} — line ${line}, column ${col}`;
}

function JsonFormatter() {
  const [text, setText] = useState("");
  const [indent, setIndent] = useState<"2" | "4" | "tab" | "min">("2");
  const [sortKeys, setSortKeys] = useState(false);
  const { out, error } = useMemo(() => {
    if (!text.trim()) return { out: "", error: "" };
    try {
      let v = JSON.parse(text);
      if (sortKeys) {
        const sort = (x: unknown): unknown =>
          Array.isArray(x)
            ? x.map(sort)
            : x && typeof x === "object"
              ? Object.fromEntries(Object.keys(x as object).sort().map((k) => [k, sort((x as Record<string, unknown>)[k])]))
              : x;
        v = sort(v);
      }
      const space = indent === "min" ? undefined : indent === "tab" ? "\t" : Number(indent);
      return { out: JSON.stringify(v, null, space), error: "" };
    } catch (e) {
      return { out: "", error: jsonError(text, e) };
    }
  }, [text, indent, sortKeys]);
  return (
    <div className="flex flex-col gap-3">
      <Label htmlFor="json-in">JSON</Label>
      <textarea id="json-in" value={text} onChange={(e) => setText(e.target.value)} rows={8} spellCheck={false} placeholder='{"paste": "JSON here"}' className={mono} />
      <div className="flex flex-wrap items-center gap-1.5">
        {(["2", "4", "tab", "min"] as const).map((v) => (
          <Button key={v} size="xs" variant={indent === v ? "primary" : "secondary"} aria-pressed={indent === v} onClick={() => setIndent(v)}>
            {v === "min" ? "Minify" : v === "tab" ? "Tabs" : `${v} spaces`}
          </Button>
        ))}
        <Button size="xs" variant={sortKeys ? "primary" : "secondary"} aria-pressed={sortKeys} onClick={() => setSortKeys(!sortKeys)}>
          Sort keys
        </Button>
      </div>
      {error ? (
        <ErrorText>Invalid JSON: {error}</ErrorText>
      ) : out ? (
        <p className="text-[12px] text-success">Valid JSON</p>
      ) : null}
      <div className="flex items-center justify-between">
        <Label htmlFor="json-out">Result</Label>
        <div className="flex gap-1.5">
          <CopyButton text={out} />
          <Button size="xs" variant="secondary" disabled={!out} onClick={() => download(out, "formatted.json", "application/json")}>
            Download
          </Button>
        </div>
      </div>
      <textarea id="json-out" readOnly value={out} rows={8} spellCheck={false} className={mono} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Base64                                                              */
/* ------------------------------------------------------------------ */

const toB64 = (s: string) => {
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin);
};
const fromB64 = (s: string) => {
  const clean = s.trim().replace(/^data:[^,]*,/, "").replace(/-/g, "+").replace(/_/g, "/").replace(/\s/g, "");
  const bin = atob(clean + "===".slice((clean.length + 3) % 4));
  return new TextDecoder("utf-8", { fatal: true }).decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
};

function Base64Tool() {
  const [mode, setMode] = useState<"encode" | "decode">("encode");
  const [text, setText] = useState("");
  const [urlSafe, setUrlSafe] = useState(false);
  const [fileUrl, setFileUrl] = useState("");
  const { out, error } = useMemo(() => {
    if (!text) return { out: "", error: "" };
    try {
      if (mode === "encode") {
        const b = toB64(text);
        return { out: urlSafe ? b.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "") : b, error: "" };
      }
      return { out: fromB64(text), error: "" };
    } catch {
      return { out: "", error: mode === "decode" ? "That isn't valid Base64 text." : "Could not encode." };
    }
  }, [text, mode, urlSafe]);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-1.5">
        {(["encode", "decode"] as const).map((m) => (
          <Button key={m} size="xs" variant={mode === m ? "primary" : "secondary"} aria-pressed={mode === m} onClick={() => setMode(m)}>
            {m === "encode" ? "Encode" : "Decode"}
          </Button>
        ))}
        {mode === "encode" && (
          <Button size="xs" variant={urlSafe ? "primary" : "secondary"} aria-pressed={urlSafe} onClick={() => setUrlSafe(!urlSafe)}>
            URL-safe
          </Button>
        )}
      </div>
      <Label htmlFor="b64-in">{mode === "encode" ? "Text" : "Base64"}</Label>
      <textarea id="b64-in" value={text} onChange={(e) => setText(e.target.value)} rows={5} spellCheck={false} className={mono} />
      {error && <ErrorText>{error}</ErrorText>}
      <div className="flex items-center justify-between">
        <Label htmlFor="b64-out">Result</Label>
        <CopyButton text={out} />
      </div>
      <textarea id="b64-out" readOnly value={out} rows={5} spellCheck={false} className={mono} />
      <div className="flex flex-col gap-1.5 border-t border-border pt-3">
        <Label htmlFor="b64-file">Or turn a file into a data URL</Label>
        <input
          id="b64-file"
          type="file"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            const r = new FileReader();
            r.onload = () => setFileUrl(String(r.result));
            r.readAsDataURL(f);
          }}
          className="text-[12px] text-muted-foreground file:mr-3 file:rounded-md file:border file:border-border file:bg-secondary file:px-2.5 file:py-1 file:text-foreground"
        />
        {fileUrl && (
          <div className="flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded bg-muted px-2 py-1 text-[11px]">{fileUrl.slice(0, 120)}…</code>
            <CopyButton text={fileUrl} />
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* URL encode / decode + parser                                        */
/* ------------------------------------------------------------------ */

function UrlTool() {
  const [mode, setMode] = useState<"encode" | "decode">("encode");
  const [text, setText] = useState("");
  const { out, error } = useMemo(() => {
    if (!text) return { out: "", error: "" };
    try {
      return { out: mode === "encode" ? encodeURIComponent(text) : decodeURIComponent(text.replace(/\+/g, " ")), error: "" };
    } catch {
      return { out: "", error: "That text has a broken % escape." };
    }
  }, [text, mode]);
  const parsed = useMemo(() => {
    const candidate = mode === "decode" ? out : text;
    try {
      const u = new URL(candidate.trim());
      return { u, params: [...u.searchParams.entries()] };
    } catch {
      return null;
    }
  }, [text, out, mode]);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-1.5">
        {(["encode", "decode"] as const).map((m) => (
          <Button key={m} size="xs" variant={mode === m ? "primary" : "secondary"} aria-pressed={mode === m} onClick={() => setMode(m)}>
            {m === "encode" ? "Encode" : "Decode"}
          </Button>
        ))}
      </div>
      <Label htmlFor="url-in">Input</Label>
      <textarea id="url-in" value={text} onChange={(e) => setText(e.target.value)} rows={4} spellCheck={false} className={mono} />
      {error && <ErrorText>{error}</ErrorText>}
      <div className="flex items-center justify-between">
        <Label htmlFor="url-out">Result</Label>
        <CopyButton text={out} />
      </div>
      <textarea id="url-out" readOnly value={out} rows={4} spellCheck={false} className={mono} />
      {parsed && (
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-left text-[12px]">
            <tbody>
              {[
                ["Protocol", parsed.u.protocol],
                ["Host", parsed.u.host],
                ["Path", parsed.u.pathname],
                ["Hash", parsed.u.hash || "—"],
                ...parsed.params.map(([k, v]) => [`?${k}`, v]),
              ].map(([k, v], i) => (
                <tr key={i} className="border-b border-border last:border-0">
                  <th scope="row" className="w-28 bg-muted/50 px-3 py-1.5 font-medium text-muted-foreground">{k}</th>
                  <td className="break-all px-3 py-1.5 font-mono text-foreground">{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* UUID + password generator                                           */
/* ------------------------------------------------------------------ */

const SETS = {
  lower: "abcdefghijkmnopqrstuvwxyz",
  upper: "ABCDEFGHJKLMNPQRSTUVWXYZ",
  digits: "23456789",
  symbols: "!@#$%^&*()-_=+[]{};:,.?",
};

function randomInt(max: number) {
  // Rejection sampling: unbiased.
  const limit = Math.floor(0xffffffff / max) * max;
  const buf = new Uint32Array(1);
  do crypto.getRandomValues(buf);
  while (buf[0] >= limit);
  return buf[0] % max;
}

function makePassword(len: number, opts: Record<keyof typeof SETS, boolean>) {
  const pools = (Object.keys(SETS) as Array<keyof typeof SETS>).filter((k) => opts[k]).map((k) => SETS[k]);
  if (!pools.length) return "";
  const all = pools.join("");
  const chars = pools.map((p) => p[randomInt(p.length)]); // at least one from each set
  while (chars.length < len) chars.push(all[randomInt(all.length)]);
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.slice(0, len).join("");
}

function Generators() {
  // Panels only render client-side inside the dialog, so lazy init is safe.
  const [uuids, setUuids] = useState<string[]>(() => Array.from({ length: 5 }, () => crypto.randomUUID()));
  const [count, setCount] = useState(5);
  const [len, setLen] = useState(20);
  const [opts, setOpts] = useState({ lower: true, upper: true, digits: true, symbols: true });
  const [pw, setPw] = useState(() => makePassword(20, { lower: true, upper: true, digits: true, symbols: true }));
  const pool = (Object.keys(SETS) as Array<keyof typeof SETS>).filter((k) => opts[k]).reduce((n, k) => n + SETS[k].length, 0);
  const bits = pool ? Math.round(len * Math.log2(pool)) : 0;
  const strength = bits >= 100 ? "Very strong" : bits >= 70 ? "Strong" : bits >= 50 ? "Fair" : "Weak";
  return (
    <div className="flex flex-col gap-5">
      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h3 className="text-[13px] font-semibold">Password</h3>
          <span className="text-[12px] tabular-nums text-muted-foreground">
            {strength} · {bits} bits
          </span>
        </div>
        <div className="flex items-center gap-2">
          <code className="min-w-0 flex-1 break-all rounded-lg border border-border bg-background px-3 py-2 font-mono text-[14px]">{pw}</code>
          <CopyButton text={pw} />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <label className="flex items-center gap-2 text-[12px] text-muted-foreground">
            Length
            <input type="range" min={8} max={64} value={len} onChange={(e) => setLen(Number(e.target.value))} className="accent-[var(--primary)]" />
            <span className="w-6 tabular-nums text-foreground">{len}</span>
          </label>
          {(Object.keys(SETS) as Array<keyof typeof SETS>).map((k) => (
            <Button key={k} size="xs" variant={opts[k] ? "primary" : "secondary"} aria-pressed={opts[k]} onClick={() => setOpts({ ...opts, [k]: !opts[k] })}>
              {k === "lower" ? "a–z" : k === "upper" ? "A–Z" : k === "digits" ? "0–9" : "!@#"}
            </Button>
          ))}
          <Button size="xs" onClick={() => setPw(makePassword(len, opts))}>
            Generate
          </Button>
        </div>
      </section>
      <section className="flex flex-col gap-2 border-t border-border pt-4">
        <div className="flex items-center justify-between">
          <h3 className="text-[13px] font-semibold">UUID v4</h3>
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              aria-label="How many UUIDs"
              min={1}
              max={500}
              value={count}
              onChange={(e) => setCount(Math.min(500, Math.max(1, Number(e.target.value) || 1)))}
              className="h-7 w-16 rounded-md border border-input bg-background px-2 text-[12px] tabular-nums"
            />
            <Button size="xs" onClick={() => setUuids(Array.from({ length: count }, () => crypto.randomUUID()))}>
              Generate
            </Button>
            <CopyButton text={uuids.join("\n")} label="Copy all" />
          </div>
        </div>
        <textarea readOnly value={uuids.join("\n")} rows={Math.min(8, Math.max(3, uuids.length))} className={mono} aria-label="Generated UUIDs" />
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Timestamp converter                                                 */
/* ------------------------------------------------------------------ */

function parseWhen(input: string): Date | null {
  const t = input.trim();
  if (!t) return null;
  if (/^-?\d+(\.\d+)?$/.test(t)) {
    const n = Number(t);
    // 13+ digits → milliseconds, otherwise seconds
    return new Date(Math.abs(n) >= 1e12 ? n : n * 1000);
  }
  const d = new Date(t);
  return Number.isNaN(d.getTime()) ? null : d;
}

function relative(d: Date) {
  const diff = (d.getTime() - Date.now()) / 1000;
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["year", 31536000],
    ["month", 2592000],
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
    ["second", 1],
  ];
  for (const [u, s] of units) if (Math.abs(diff) >= s || u === "second") return rtf.format(Math.round(diff / s), u);
  return "";
}

function TimestampTool() {
  const [now, setNow] = useState(() => Date.now());
  const [input, setInput] = useState("");
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const d = parseWhen(input);
  const rows: Array<[string, string]> = d
    ? [
        ["Unix (seconds)", String(Math.floor(d.getTime() / 1000))],
        ["Unix (milliseconds)", String(d.getTime())],
        ["ISO 8601 (UTC)", d.toISOString()],
        ["Local time", d.toLocaleString(undefined, { dateStyle: "full", timeStyle: "long" })],
        ["Relative", relative(d)],
      ]
    : [];
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2">
        <span className="text-[12px] text-muted-foreground">Now (Unix seconds)</span>
        <span className="flex items-center gap-2">
          <code className="font-mono text-[15px] tabular-nums">{now ? Math.floor(now / 1000) : "—"}</code>
          <CopyButton text={now ? String(Math.floor(now / 1000)) : ""} />
        </span>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="ts-in">Timestamp or date</Label>
        <input
          id="ts-in"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="1732262400, 1732262400000 or 2026-11-22 10:30"
          className={`${field} font-mono`}
        />
        {input && !d && <ErrorText>Couldn&apos;t read that as a date or Unix timestamp.</ErrorText>}
      </div>
      {d && (
        <ul className="flex flex-col divide-y divide-border overflow-hidden rounded-lg border border-border">
          {rows.map(([k, v]) => (
            <li key={k} className="flex items-center justify-between gap-3 px-3 py-2">
              <span className="text-[12px] text-muted-foreground">{k}</span>
              <span className="flex min-w-0 items-center gap-2">
                <code className="truncate font-mono text-[12.5px]">{v}</code>
                <CopyButton text={v} />
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Text diff                                                           */
/* ------------------------------------------------------------------ */

function TextDiff() {
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [mode, setMode] = useState<"lines" | "words">("lines");
  const [parts, setParts] = useState<Array<{ value: string; added?: boolean; removed?: boolean }>>([]);
  useEffect(() => {
    let live = true;
    import("diff").then((d) => {
      if (!live) return;
      // A missing final newline would mark an unchanged last line as changed.
      const nl = (s: string) => (s && !s.endsWith("\n") ? s + "\n" : s);
      setParts(mode === "lines" ? d.diffLines(nl(a), nl(b)) : d.diffWordsWithSpace(a, b));
    });
    return () => {
      live = false;
    };
  }, [a, b, mode]);
  const added = parts.filter((p) => p.added).reduce((n, p) => n + (mode === "lines" ? p.value.split("\n").filter(Boolean).length : 1), 0);
  const removed = parts.filter((p) => p.removed).reduce((n, p) => n + (mode === "lines" ? p.value.split("\n").filter(Boolean).length : 1), 0);
  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="diff-a">Original</Label>
          <textarea id="diff-a" value={a} onChange={(e) => setA(e.target.value)} rows={7} spellCheck={false} className={mono} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="diff-b">Changed</Label>
          <textarea id="diff-b" value={b} onChange={(e) => setB(e.target.value)} rows={7} spellCheck={false} className={mono} />
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1.5">
          {(["lines", "words"] as const).map((m) => (
            <Button key={m} size="xs" variant={mode === m ? "primary" : "secondary"} aria-pressed={mode === m} onClick={() => setMode(m)}>
              Compare {m}
            </Button>
          ))}
        </div>
        <span className="text-[12px] tabular-nums text-muted-foreground">
          <span className="text-success">+{added}</span> · <span className="text-destructive">−{removed}</span>
        </span>
      </div>
      <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-border bg-background p-3 font-mono text-[12.5px] leading-relaxed">
        {(a || b) && mode === "lines" ? (
          parts.flatMap((p, i) =>
            p.value
              .replace(/\n$/, "")
              .split("\n")
              .map((line, j) => (
                <div
                  key={`${i}-${j}`}
                  className={p.added ? "bg-success/15 text-success" : p.removed ? "bg-destructive/15 text-destructive" : "text-foreground"}
                >
                  <span aria-hidden="true" className="mr-2 inline-block w-3 select-none opacity-70">
                    {p.added ? "+" : p.removed ? "−" : " "}
                  </span>
                  {line || " "}
                </div>
              ))
          )
        ) : a || b ? (
          parts.map((p, i) => (
            <span
              key={i}
              className={
                p.added
                  ? "bg-success/15 text-success"
                  : p.removed
                    ? "bg-destructive/15 text-destructive line-through decoration-destructive/50"
                    : "text-foreground"
              }
            >
              {p.value}
            </span>
          ))
        ) : (
          <span className="text-muted-foreground">Differences appear here.</span>
        )}
      </pre>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Voice recorder                                                      */
/* ------------------------------------------------------------------ */

function VoiceRecorder() {
  const [state, setState] = useState<"idle" | "recording" | "done" | "error">("idle");
  const [secs, setSecs] = useState(0);
  const [level, setLevel] = useState(0);
  const [url, setUrl] = useState("");
  const [blob, setBlob] = useState<Blob | null>(null);
  const [converting, setConverting] = useState(false);
  const [err, setErr] = useState("");
  const rec = useRef<{ mr: MediaRecorder; stream: MediaStream; ctx: AudioContext; raf: number; timer: number } | null>(null);

  useEffect(() => () => {
    const r = rec.current;
    if (r) {
      r.stream.getTracks().forEach((t) => t.stop());
      cancelAnimationFrame(r.raf);
      clearInterval(r.timer);
      r.ctx.close().catch(() => {});
    }
  }, []);
  useEffect(() => () => {
    if (url) URL.revokeObjectURL(url);
  }, [url]);

  const start = async () => {
    setErr("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      const type = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"].find((t) => MediaRecorder.isTypeSupported(t)) ?? "";
      const mr = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
      const chunks: Blob[] = [];
      mr.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      mr.onstop = () => {
        const b = new Blob(chunks, { type: mr.mimeType || "audio/webm" });
        setBlob(b);
        setUrl(URL.createObjectURL(b));
        setState("done");
      };
      const ctx = new AudioContext();
      const an = ctx.createAnalyser();
      an.fftSize = 256;
      ctx.createMediaStreamSource(stream).connect(an);
      const data = new Uint8Array(an.frequencyBinCount);
      const tick = () => {
        an.getByteTimeDomainData(data);
        let peak = 0;
        for (const v of data) peak = Math.max(peak, Math.abs(v - 128));
        setLevel(peak / 128);
        if (rec.current) rec.current.raf = requestAnimationFrame(tick);
      };
      const begun = Date.now();
      rec.current = { mr, stream, ctx, raf: requestAnimationFrame(tick), timer: window.setInterval(() => setSecs(Math.floor((Date.now() - begun) / 1000)), 250) };
      setSecs(0);
      setUrl("");
      setBlob(null);
      mr.start(250);
      setState("recording");
    } catch {
      setState("error");
      setErr("Microphone access was blocked. Allow it in your browser's site settings and try again.");
    }
  };

  const stop = () => {
    const r = rec.current;
    if (!r) return;
    r.mr.stop();
    r.stream.getTracks().forEach((t) => t.stop());
    cancelAnimationFrame(r.raf);
    clearInterval(r.timer);
    r.ctx.close().catch(() => {});
    rec.current = null;
    setLevel(0);
  };

  const ext = blob?.type.includes("mp4") ? "m4a" : blob?.type.includes("ogg") ? "ogg" : "webm";
  const save = async (asMp3: boolean) => {
    if (!blob) return;
    const stamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, "-");
    if (!asMp3) {
      const a = document.createElement("a");
      a.href = url;
      a.download = `recording-${stamp}.${ext}`;
      a.click();
      return;
    }
    setConverting(true);
    try {
      const { convertAudio } = await import("@/engines/media/media-engine");
      const res = await convertAudio(new File([blob], `recording.${ext}`, { type: blob.type }), { format: "mp3", bitrate: 160 });
      const u = URL.createObjectURL(res.data as Blob);
      const a = document.createElement("a");
      a.href = u;
      a.download = `recording-${stamp}.mp3`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(u), 3000);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "MP3 conversion failed.");
    } finally {
      setConverting(false);
    }
  };

  const mm = String(Math.floor(secs / 60)).padStart(2, "0");
  const ss = String(secs % 60).padStart(2, "0");
  return (
    <div className="flex flex-col items-center gap-4 py-2">
      <div className="text-[40px] font-semibold tabular-nums tracking-tight" aria-live="polite">
        {mm}:{ss}
      </div>
      <div className="h-2 w-full max-w-xs overflow-hidden rounded-full bg-muted" aria-hidden="true">
        <div className="h-full w-full origin-left rounded-full bg-primary transition-transform duration-75" style={{ transform: `scaleX(${Math.min(1, level * 1.6)})` }} />
      </div>
      {state === "recording" ? (
        <Button variant="danger" onClick={stop}>
          Stop recording
        </Button>
      ) : (
        <Button variant="primary" onClick={start}>
          {state === "done" ? "Record again" : "Start recording"}
        </Button>
      )}
      {url && (
        <div className="flex w-full flex-col items-center gap-3">
          <audio controls src={url} className="w-full max-w-sm" />
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => save(false)}>
              Save .{ext}
            </Button>
            <Button variant="secondary" size="sm" onClick={() => save(true)} disabled={converting}>
              {converting ? "Converting…" : "Save as MP3"}
            </Button>
          </div>
        </div>
      )}
      {err && <ErrorText>{err}</ErrorText>}
      <p className="text-[12px] text-muted-foreground">Recorded and saved on your device. Nothing is uploaded.</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */

// Fonts + shaders for the card maker load only when it's opened.
const QuoteCard = dynamic(() => import("./quote/quote-card"), {
  ssr: false,
  loading: () => <div className="h-[420px] animate-pulse rounded-xl bg-muted" />,
});

/** Panels that need a wider dialog. */
export const WIDE_TOOLS = new Set(["text-to-image", "pdf-organize"]);

export const PANEL_TOOLS: Record<string, React.ComponentType> = {
  "text-to-image": QuoteCard,
  "word-counter": WordCounter,
  "case-converter": CaseConverter,
  "json-formatter": JsonFormatter,
  "base64-tool": Base64Tool,
  "url-encoder": UrlTool,
  "uuid-password": Generators,
  "timestamp-converter": TimestampTool,
  "text-diff": TextDiff,
  "voice-recorder": VoiceRecorder,
};
