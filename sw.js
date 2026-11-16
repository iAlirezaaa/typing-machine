/* Typing Machine — offline-ready PWA shell.
 * All required assets are pre-cached before the worker activates. The shell
 * uses network-first navigation with a same-origin, scope-local offline copy.
 * Notes are never stored here: they remain in the browser's localStorage.
 */
const CACHE_PREFIX = "typing-machine-";
const CACHE = "typing-machine-v3";
const ASSETS = [
  "./", "./index.html", "./manifest.webmanifest",
  "./icons/icon.svg", "./icons/icon-192.png", "./icons/icon-512.png", "./icons/icon-maskable-512.png",
  "./fonts/fonts.css",
  "./fonts/CourierPrime-italic-400-latin-ext.woff2", "./fonts/CourierPrime-italic-400-latin.woff2",
  "./fonts/CourierPrime-italic-700-latin-ext.woff2", "./fonts/CourierPrime-italic-700-latin.woff2",
  "./fonts/CourierPrime-normal-400-latin-ext.woff2", "./fonts/CourierPrime-normal-400-latin.woff2",
  "./fonts/CourierPrime-normal-700-latin-ext.woff2", "./fonts/CourierPrime-normal-700-latin.woff2",
  "./fonts/SpecialElite-normal-400-latin-ext.woff2", "./fonts/SpecialElite-normal-400-latin.woff2",
  "./fonts/Vazirmatn-normal-300-700-arabic.woff2", "./fonts/Vazirmatn-normal-300-700-latin-ext.woff2",
  "./fonts/Vazirmatn-normal-300-700-latin.woff2"
];

const scoped = path => new URL(path, self.registration.scope).href;
const appPath = new URL(self.registration.scope).pathname;
const apiPath = new URL("api/", self.registration.scope).pathname;

async function missingAssets(cache) {
  const missing = [];
  for (const path of ASSETS) {
    if (!await cache.match(scoped(path))) missing.push(path);
  }
  return missing;
}

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // Updating the service worker downloads a fresh, complete app shell.
    // An installation failure leaves the previous active worker in place.
    await cache.addAll(ASSETS.map(path => new Request(scoped(path), { cache: "reload" })));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    // Never clear caches belonging to another app on the same origin.
    await Promise.all(keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE)
      .map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

// The UI uses this request to confirm that every file is present before
// saying "offline ready". Missing/evicted assets are repaired while online.
self.addEventListener("message", event => {
  if (!event.data || event.data.type !== "CHECK_OFFLINE" || !event.ports || !event.ports[0]) return;
  const port = event.ports[0];
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    let missing = await missingAssets(cache);
    if (missing.length) {
      try {
        await cache.addAll(missing.map(path => new Request(scoped(path), { cache: "reload" })));
      } catch (err) {
        // Keep reporting partial availability; a later online check can retry.
      }
      missing = await missingAssets(cache);
    }
    port.postMessage({ type: "OFFLINE_STATUS", ready: missing.length === 0, missing: missing.length });
  })().catch(() => {
    port.postMessage({ type: "OFFLINE_STATUS", ready: false, missing: ASSETS.length });
  }));
});

self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin ||
      !url.pathname.startsWith(appPath) || url.pathname.startsWith(apiPath)) return;

  if (request.mode === "navigate" || url.pathname.endsWith(".html")) {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        // Do not replace the working offline shell with an error page.
        if (response.ok && (response.headers.get("content-type") || "").includes("text/html")) {
          try {
            const cache = await caches.open(CACHE);
            await cache.put(scoped("./index.html"), response.clone());
          } catch (err) {
            // Network use still works if storage is full or was disabled.
          }
        }
        return response;
      } catch (err) {
        const cache = await caches.open(CACHE);
        const cached = await cache.match(scoped("./index.html"));
        return cached || new Response("Offline files are not ready. Reopen Typing Machine online once.", {
          status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" }
        });
      }
    })());
    return;
  }

  // Fonts, icons and the manifest continue to load without a connection.
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(request);
    if (cached) return cached;
    const response = await fetch(request);
    if (response.ok) {
      try { await cache.put(request, response.clone()); } catch (err) { /* quota */ }
    }
    return response;
  })());
});
