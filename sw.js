/* Typing Machine service worker: keeps the app and its fonts available offline.
   Pages are fetched fresh when online (so updates show up) and fall back to the cache offline. */
const CACHE = "typing-machine-v2";
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

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener("fetch", e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin || url.pathname.startsWith(new URL("api/", self.registration.scope).pathname)) return;
  if (req.mode === "navigate" || url.href === self.registration.scope || url.pathname.endsWith(".html")) {
    // network first: always the newest version of the app when the server is running
    e.respondWith(fetch(req).then(res => {
      const copy = res.clone(); caches.open(CACHE).then(c => c.put("./index.html", copy));
      return res;
    }).catch(() => caches.match("./index.html")));
    return;
  }
  // fonts, icons, manifest: cache first
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
    return res;
  })));
});
