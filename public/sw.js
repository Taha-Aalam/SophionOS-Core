/**
 * LifeOS Core Service Worker
 * Conservative PWA: caches only static assets (no authenticated data).
 * Provides offline shell and install prompt support.
 */

const CACHE_NAME = "lifeos-v1";
const ASSETS_TO_CACHE = [
  "/",
  "/favicon.ico",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/apple-touch-icon.png",
  // Add other static assets as needed
];

// Install: cache core assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }),
  );
});

// Fetch: serve cached assets when offline, but always go to network first
// for API routes and authenticated content (no stale private data)
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Never cache API routes or authenticated endpoints
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/_next/")) {
    return;
  }

  // For static assets, try network first, fall back to cache
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request).then((response) => {
        return response || caches.match("/");
      });
    }),
  );
});

// Activate: clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name)),
      );
    }),
  );
});
