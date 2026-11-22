import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

/**
 * Network guards for the server-assisted video downloader.
 *
 * The downloader fetches user-supplied URLs on the server, which makes it an
 * SSRF target. Every outbound request goes through `safeFetch`, which:
 *  - only allows http(s) on default ports,
 *  - resolves DNS and rejects private, loopback, link-local and metadata IPs,
 *  - follows redirects manually and re-validates every hop,
 *  - enforces a timeout.
 */

export class GuardError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

function ipv4ToInt(ip: string): number {
  return ip.split(".").reduce((acc, oct) => (acc << 8) + Number(oct), 0) >>> 0;
}

const BLOCKED_V4: Array<[string, number]> = [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
];

export function isPrivateAddress(ip: string): boolean {
  const version = isIP(ip);
  if (version === 4) {
    const n = ipv4ToInt(ip);
    return BLOCKED_V4.some(([base, bits]) => {
      const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
      return (n & mask) === (ipv4ToInt(base) & mask);
    });
  }
  if (version === 6) {
    const lower = ip.toLowerCase();
    if (lower === "::" || lower === "::1") return true;
    const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPrivateAddress(mapped[1]);
    return (
      lower.startsWith("fc") ||
      lower.startsWith("fd") ||
      lower.startsWith("fe8") ||
      lower.startsWith("fe9") ||
      lower.startsWith("fea") ||
      lower.startsWith("feb") ||
      lower.startsWith("ff")
    );
  }
  return true;
}

export async function assertPublicUrl(raw: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new GuardError("That doesn't look like a valid link.");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new GuardError("Only http and https links are supported.");
  }
  if (url.username || url.password) {
    throw new GuardError("Links with embedded credentials are not supported.");
  }
  if (url.port && url.port !== "80" && url.port !== "443") {
    throw new GuardError("Links on non-standard ports are not supported.");
  }
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".internal") || host.endsWith(".local")) {
    throw new GuardError("Private network addresses are not allowed.");
  }
  const addresses = isIP(host)
    ? [{ address: host }]
    : await lookup(host, { all: true }).catch(() => {
        throw new GuardError("Could not resolve that host.", 422);
      });
  if (addresses.length === 0 || addresses.some((a) => isPrivateAddress(a.address))) {
    throw new GuardError("Private network addresses are not allowed.");
  }
  return url;
}

export async function safeFetch(
  raw: string,
  init: RequestInit & { timeoutMs?: number } = {},
  maxRedirects = 5
): Promise<Response> {
  const { timeoutMs = 15000, ...rest } = init;
  let current = raw;
  for (let hop = 0; hop <= maxRedirects; hop++) {
    const url = await assertPublicUrl(current);
    const res = await fetch(url, {
      ...rest,
      redirect: "manual",
      signal: rest.signal ?? AbortSignal.timeout(timeoutMs),
    });
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      if (!location) return res;
      current = new URL(location, url).toString();
      continue;
    }
    return res;
  }
  throw new GuardError("Too many redirects.", 502);
}

/* ------------------------------------------------------------------ */
/* Rate limiting (per-instance, in-memory fixed window)                */
/* ------------------------------------------------------------------ */

const buckets = new Map<string, { count: number; reset: number }>();

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) if (v.reset < now) buckets.delete(k);
  }
  const bucket = buckets.get(key);
  if (!bucket || bucket.reset < now) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    return true;
  }
  bucket.count++;
  return bucket.count <= limit;
}

export function clientKey(headers: Headers): string {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    "anonymous"
  );
}

export function contentDisposition(filename: string): string {
  const cleaned = filename.replace(/[\r\n"\\/?%*:|<>]/g, "_").slice(0, 180) || "download.mp4";
  const ascii = cleaned.replace(/[^\x20-\x7e]/g, "_");
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(cleaned)}`;
}
