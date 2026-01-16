const CACHE_NAME = 'openhr-v2.5.3';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  'https://cdn.tailwindcss.com'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
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
  // Only handle http/https requests. 
  // Browser extensions often trigger other protocols (chrome-extension://) 
  // which will cause 'Failed to fetch' errors if handled by the SW.
  if (!event.request.url.startsWith('http')) {
    return;
  }

  const url = new URL(event.request.url);

  // Avoid intercepting API calls or dynamic ESM modules directly 
  // to prevent 403/CORS issues on mobile browsers.
  if (url.hostname.includes('pocketbase') || url.hostname.includes('esm.sh')) {
    return; 
  }

  // Navigation requests: Network-first with cache fallback
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(async () => {
        try {
          const cache = await caches.open(CACHE_NAME);
          const cachedResponse = await cache.match('./index.html');
          return cachedResponse || new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
        } catch (e) {
          return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
        }
      })
    );
    return;
  }

  // For static assets: Cache-first
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).catch(() => {
        // Return a silent 404 for missing non-essential assets instead of throwing
        return new Response(null, { status: 404 });
      });
    })
  );
});