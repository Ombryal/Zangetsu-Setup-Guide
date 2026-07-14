const CACHE_NAME = "zangetsu-v1";
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/assets/styles.css",
  "/assets/app.js",
  "/android/index.html",
  "/ios/index.html",
  "/tv/index.html",
  "/windows/index.html",
  "/404.html",
  "/changelog/index.html",
  "/changelog.json"  // if present
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      return cachedResponse || fetch(event.request).catch(() => caches.match("/404.html"));
    })
  );
});
