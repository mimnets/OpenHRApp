const CACHE_NAME = 'openhr-v2.6.3';
const ASSETS_TO_PRECACHE = [
  './index.html',
  './manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_PRECACHE);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // CRITICAL: Immediately bypass everything that isn't a local resource to avoid CORS issues
  // We only care about caching the main app shell.
  if (!event.request.url.startsWith(self.location.origin) || 
      url.hostname.includes('tailwindcss.com') || 
      url.hostname.includes('pocketbase')) {
    return; // Let browser handle it normally
  }

  // Handle navigation requests
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Handle local assets (index.html, manifest, icons if local)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      return cachedResponse || fetch(event.request);
    })
  );
});