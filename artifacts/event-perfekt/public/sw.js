const CACHE_NAME = 'event-perfekt-v5';
const APP_SHELL = [
  '/',
  '/planner-dashboard',
  '/manifest.json',
  '/assets/3d Logo (1)_1754249114645.jpg'
];

// Install: cache app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(APP_SHELL).catch(() => {});
    })
  );
  self.skipWaiting();
});

// Activate: clear old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: network-first for API, cache-first for assets, stale-while-revalidate for pages
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET and cross-origin
  if (event.request.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;

  // API calls — always network, no cache
  if (url.pathname.startsWith('/api/')) return;

  // Static assets (js/css/images) — network first, then cache
  // Skip cache-busted URLs (query params) to avoid stale broken images
  if (url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|gif|woff2?|ico)$/)) {
    if (url.search) {
      // URLs with query params (e.g. ?v=5) — always fetch fresh, never cache
      return;
    }
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request).then((cached) => cached || new Response('Not found', { status: 404 })))
    );
    return;
  }

  // HTML pages — network first, fall back to cache
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match('/')))
  );
});
