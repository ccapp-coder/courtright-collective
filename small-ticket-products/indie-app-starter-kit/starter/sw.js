/* ============================================================
   Starter, service worker.

   Strategy:
   - App shell files are precached on install, so the app opens
     with no network at all.
   - Navigations use network-first with a cache fallback, so you
     never serve a stale HTML shell after a deploy.
   - Everything else is cache-first, because static assets are
     versioned by the cache name below.

   IMPORTANT: bump CACHE_VERSION on every deploy. That single
   string is what makes an update actually reach your users.
   ============================================================ */

const CACHE_VERSION = 'starter-v1';
const SHELL = [
  '/',
  '/index.html',
  '/app.css',
  '/app.js',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Never cache anything but GET.
  if (request.method !== 'GET') return;

  // Never cache API calls. Stale data is worse than no data.
  if (new URL(request.url).pathname.startsWith('/api/')) return;

  // Navigations: network first, fall back to the cached shell.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((c) => c.put(request, copy));
          return res;
        })
        .catch(() => caches.match(request).then((r) => r || caches.match('/index.html')))
    );
    return;
  }

  // Everything else: cache first, then network, and cache what comes back.
  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request).then((res) => {
      if (res.ok && res.type === 'basic') {
        const copy = res.clone();
        caches.open(CACHE_VERSION).then((c) => c.put(request, copy));
      }
      return res;
    }).catch(() => cached))
  );
});
