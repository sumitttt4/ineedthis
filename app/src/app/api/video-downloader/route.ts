import { NextRequest, NextResponse } from "next/server";
import {
  GuardError,
  assertPublicUrl,
  clientKey,
  contentDisposition,
  rateLimit,
  safeFetch,
} from "./guard";

export const runtime = "nodejs";

const ALLOWED_QUALITIES = new Set(["144", "240", "360", "480", "720", "1080", "1440", "2160", "max"]);

interface VideoResult {
  success: boolean;
  title: string;
  url: string;
  thumbnail?: string;
  author?: string;
  platform: string;
  format?: string;
  duration?: number | string;
  variants?: Array<{
    quality: string;
    url: string;
  }>;
  error?: string;
}

const COBALT_INSTANCES = [
  "https://api.cobalt.tools",
  "https://cobalt-api.kwiatekm.pl",
  "https://apicobalt.girlskissing.top",
  "https://cobalt.clxxped.lol",
  "https://api.wuk.sh",
];

// Helper: Resolve Twitter / X videos directly
async function resolveTwitter(url: string): Promise<VideoResult | null> {
  const tweetMatch = url.match(/(?:twitter\.com|x\.com)\/(?:#!\/)?(\w+)\/status(?:es)?\/(\d+)/i);
  if (!tweetMatch) return null;

  const tweetId = tweetMatch[2];
  try {
    const res = await fetch(`https://api.fxtwitter.com/status/${tweetId}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; FileStudio/1.0)",
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) return null;
    const data = await res.json();
    const tweet = data?.tweet;
    if (!tweet) return null;

    const videos =
      tweet.media?.videos ||
      tweet.media?.all?.filter((m: { type: string }) => m.type === "video" || m.type === "gif") ||
      [];
    if (videos.length === 0) return null;

    const firstVideo = videos[0];
    const variants = (firstVideo.variants || [])
      .filter((v: { content_type?: string; url?: string }) => v.content_type === "video/mp4" && v.url)
      .sort((a: { bitrate?: number }, b: { bitrate?: number }) => (b.bitrate || 0) - (a.bitrate || 0));

    const bestUrl = variants[0]?.url || firstVideo.url;
    if (!bestUrl) return null;

    return {
      success: true,
      title: tweet.text ? tweet.text.slice(0, 80).replace(/[\r\n]+/g, " ") : `X Video by @${tweet.author?.screen_name}`,
      url: bestUrl,
      thumbnail: firstVideo.thumbnail_url || tweet.author?.avatar_url,
      author: tweet.author?.name ? `${tweet.author.name} (@${tweet.author.screen_name})` : "X / Twitter",
      platform: "X / Twitter",
      duration: firstVideo.duration,
      variants: variants.map((v: { bitrate?: number; url: string }, idx: number) => ({
        quality: v.bitrate ? `${Math.round(v.bitrate / 1000)}k` : `Option ${idx + 1}`,
        url: v.url,
      })),
    };
  } catch {
    return null;
  }
}

// Helper: Resolve TikTok videos watermark-free
async function resolveTikTok(url: string): Promise<VideoResult | null> {
  if (!/(?:tiktok\.com)/i.test(url)) return null;

  try {
    const res = await fetch(`https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) return null;
    const data = await res.json();
    if (data.code !== 0 || !data.data) return null;

    const item = data.data;
    const videoUrl = item.play || item.wmplay;
    if (!videoUrl) return null;

    return {
      success: true,
      title: item.title || "TikTok Video",
      url: videoUrl,
      thumbnail: item.cover,
      author: item.author?.nickname ? `${item.author.nickname} (@${item.author.unique_id})` : "TikTok",
      platform: "TikTok",
      duration: item.duration,
      variants: [
        { quality: "No Watermark HD", url: item.play || videoUrl },
        ...(item.music ? [{ quality: "Audio Only (MP3)", url: item.music }] : []),
      ],
    };
  } catch {
    return null;
  }
}

// Helper: Resolve via Cobalt multi-instance fallback (YouTube, Reddit, Instagram, etc.)
async function resolveCobalt(
  url: string,
  quality: string = "1080",
  audioOnly: boolean = false
): Promise<VideoResult | null> {
  const payload = {
    url,
    vQuality: quality,
    isAudioOnly: audioOnly,
    aFormat: "mp3",
    filenameStyle: "pretty",
    downloadMode: audioOnly ? "audio" : "auto",
  };

  for (const instance of COBALT_INSTANCES) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 7000);

      const res = await fetch(`${instance}`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "User-Agent": "FileStudio/1.0",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) continue;
      const data = await res.json();

      if (data.status === "redirect" || data.status === "tunnel") {
        let platform = "Web Video";
        if (url.includes("youtube.com") || url.includes("youtu.be")) platform = "YouTube";
        else if (url.includes("instagram.com")) platform = "Instagram";
        else if (url.includes("reddit.com")) platform = "Reddit";
        else if (url.includes("vimeo.com")) platform = "Vimeo";

        return {
          success: true,
          title: data.filename ? data.filename.replace(/\.[^/.]+$/, "") : `${platform} Download`,
          url: data.url,
          platform,
          format: audioOnly ? "mp3" : "mp4",
        };
      }

      if (data.status === "picker" && Array.isArray(data.picker) && data.picker.length > 0) {
        const item = data.picker[0];
        return {
          success: true,
          title: "Extracted Media",
          url: item.url,
          thumbnail: item.thumb,
          platform: "Web Video",
          variants: data.picker.map((p: { type?: string; url: string; thumb?: string }, i: number) => ({
            quality: `${p.type || "Item"} ${i + 1}`,
            url: p.url,
          })),
        };
      }
    } catch {
      continue;
    }
  }

  return null;
}

// POST: Resolve video metadata & direct download link
export async function POST(req: NextRequest) {
  if (!rateLimit(`post:${clientKey(req.headers)}`, 20, 60_000)) {
    return NextResponse.json(
      { success: false, error: "Too many requests. Please wait a minute and try again." },
      { status: 429, headers: { "Retry-After": "60" } }
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { url, quality: rawQuality = "1080", isAudioOnly: rawAudio = false } = body ?? {};

    if (!url || typeof url !== "string" || url.length > 2048) {
      return NextResponse.json(
        { success: false, error: "Please enter a valid video link." },
        { status: 400 }
      );
    }

    const quality = ALLOWED_QUALITIES.has(String(rawQuality)) ? String(rawQuality) : "1080";
    const isAudioOnly = rawAudio === true;
    const trimmedUrl = (await assertPublicUrl(url.trim())).toString();

    // 1. Direct Video / Media URL
    if (/\.(mp4|webm|mov|mkv|m4v|mp3|wav|ogg)(\?.*)?$/i.test(trimmedUrl)) {
      const filename = trimmedUrl.split("/").pop()?.split("?")[0] || "video.mp4";
      return NextResponse.json({
        success: true,
        title: decodeURIComponent(filename),
        url: trimmedUrl,
        platform: "Direct Video",
        format: trimmedUrl.endsWith(".mp3") ? "mp3" : "mp4",
      });
    }

    // 2. Twitter / X
    if (/(?:twitter\.com|x\.com)/i.test(trimmedUrl)) {
      const twitterResult = await resolveTwitter(trimmedUrl);
      if (twitterResult) {
        return NextResponse.json(twitterResult);
      }
    }

    // 3. TikTok
    if (/tiktok\.com/i.test(trimmedUrl)) {
      const tiktokResult = await resolveTikTok(trimmedUrl);
      if (tiktokResult) {
        return NextResponse.json(tiktokResult);
      }
    }

    // 4. Cobalt Multi-Provider (YouTube, Instagram, Reddit, Vimeo, SoundCloud, etc.)
    const cobaltResult = await resolveCobalt(trimmedUrl, quality, isAudioOnly);
    if (cobaltResult) {
      return NextResponse.json(cobaltResult);
    }

    return NextResponse.json(
      {
        success: false,
        error:
          "Unable to extract video stream from this URL. Please verify the link is public or try a direct MP4 URL.",
      },
      { status: 422 }
    );
  } catch (err) {
    if (err instanceof GuardError) {
      return NextResponse.json({ success: false, error: err.message }, { status: err.status });
    }
    console.error("[video-downloader] resolve failed", err);
    return NextResponse.json(
      { success: false, error: "Something went wrong resolving this link. Please try again." },
      { status: 500 }
    );
  }
}

// GET: Stream proxy for instant one-tap attachment download
const ALLOWED_MEDIA_TYPE = /^(video|audio)\/|^application\/(octet-stream|mp4|x-mpegurl|vnd\.apple\.mpegurl)/i;

export async function GET(req: NextRequest) {
  if (!rateLimit(`get:${clientKey(req.headers)}`, 30, 60_000)) {
    return new NextResponse("Too many requests", { status: 429, headers: { "Retry-After": "60" } });
  }

  const searchParams = req.nextUrl.searchParams;
  const targetUrl = searchParams.get("url");
  const filename = searchParams.get("filename") || "download.mp4";

  if (!targetUrl || targetUrl.length > 4096) {
    return new NextResponse("Missing url parameter", { status: 400 });
  }

  try {
    const upstreamRes = await safeFetch(targetUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      timeoutMs: 30_000,
    });

    if (!upstreamRes.ok || !upstreamRes.body) {
      return new NextResponse("The media host refused the download.", {
        status: upstreamRes.status >= 400 ? upstreamRes.status : 502,
      });
    }

    const contentType = upstreamRes.headers.get("content-type") || "application/octet-stream";
    if (!ALLOWED_MEDIA_TYPE.test(contentType)) {
      upstreamRes.body.cancel().catch(() => {});
      return new NextResponse("That link is not a downloadable media file.", { status: 415 });
    }

    const headers = new Headers();
    headers.set("Content-Type", contentType);
    headers.set("Content-Disposition", contentDisposition(filename));
    headers.set("X-Content-Type-Options", "nosniff");
    headers.set("Cache-Control", "no-store");
    const contentLength = upstreamRes.headers.get("content-length");
    if (contentLength) headers.set("Content-Length", contentLength);

    return new NextResponse(upstreamRes.body as unknown as BodyInit, { status: 200, headers });
  } catch (err) {
    if (err instanceof GuardError) {
      return new NextResponse(err.message, { status: err.status });
    }
    return new NextResponse("Could not reach the media host.", { status: 502 });
  }
}
