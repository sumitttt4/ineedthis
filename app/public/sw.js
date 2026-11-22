// INeedThis service worker.
// Cache name is versioned by the build id passed in the registration URL
// (/sw.js?v=<build>), so every deploy gets a fresh cache and old ones are purged.
const VERSION = new URL(self.location.href).searchParams.get("v") || "dev";
const CACHE = `ineedthis-${VERSION}`;
const SHELL = ["/", "/manifest.webmanifest", "/icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .catch(() => {})
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith("ineedthis-") || k.startsWith("file-studio-"))
            .filter((k) => k !== CACHE)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

async function putInCache(request, response) {
  if (response && response.ok && response.type === "basic") {
    const cache = await caches.open(CACHE);
    await cache.put(request, response.clone());
  }
  return response;
}

// Network first: HTML navigations, so new deploys show up immediately.
async function networkFirst(request) {
  try {
    return await putInCache(request, await fetch(request));
  } catch {
    return (await caches.match(request)) || (await caches.match("/")) || Response.error();
  }
}

// Cache first: content-hashed bundles and the heavy WASM / worker runtimes.
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  return putInCache(request, await fetch(request));
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request));
    return;
  }

  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/ffmpeg/") ||
    url.pathname === "/pdf.worker.min.mjs" ||
    url.pathname.endsWith(".wasm")
  ) {
    event.respondWith(cacheFirst(request));
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((res) => putInCache(request, res))
        .catch(() => cached);
      return cached || network;
    })
  );
});
