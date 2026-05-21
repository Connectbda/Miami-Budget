// Trip Money - Service Worker
// Cache version - bump this string to force a full refresh
const CACHE_VERSION = 'triptracker-v1.6.0';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-180.png'
];

// Install: cache the app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
      .catch(() => {}) // never fail install
  );
});

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch: cache-first with network fallback, gracefully handles failure
self.addEventListener('fetch', (event) => {
  // Only handle GETs from our own origin
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Font requests (Google Fonts) - try cache, fall back to network, store result
  if (url.hostname.includes('fonts.googleapis.com') || url.hostname.includes('fonts.gstatic.com')) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response && response.ok) {
            const clone = response.clone();
            caches.open(CACHE_VERSION).then((cache) => {
              cache.put(event.request, clone).catch(() => {});
            }).catch(() => {});
          }
          return response;
        }).catch(() => {
          // Offline and not cached - return empty response so layout doesn't break
          return new Response('', { status: 200, headers: { 'Content-Type': 'text/css' } });
        });
      })
    );
    return;
  }

  // Own-origin: cache-first
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response && response.ok) {
            const clone = response.clone();
            caches.open(CACHE_VERSION).then((cache) => {
              cache.put(event.request, clone).catch(() => {});
            }).catch(() => {});
          }
          return response;
        }).catch(() => caches.match('./index.html'));
      })
    );
  }
});
