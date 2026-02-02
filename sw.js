
const CACHE_NAME = 'openhr-v2.8.1';
const STATIC_CACHE = 'openhr-static-assets-v2';

const ASSETS_TO_PRECACHE = [
  './index.html',
  './manifest.json',
  './img/logo.png',
  './img/mobile-logo.png'
];

// List of external CDNs we trust for caching
const EXTERNAL_ASSETS = [
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com',
  'https://fonts.gstatic.com'
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
          if (cacheName !== CACHE_NAME && cacheName !== STATIC_CACHE) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. Performance: Stale-While-Revalidate for critical UI CDNs
  const isExternalAsset = EXTERNAL_ASSETS.some(domain => event.request.url.startsWith(domain));
  if (isExternalAsset) {
    event.respondWith(
      caches.open(STATIC_CACHE).then((cache) => {
        return cache.match(event.request).then((cachedResponse) => {
          const fetchPromise = fetch(event.request).then((networkResponse) => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          });
          return cachedResponse || fetchPromise;
        });
      })
    );
    return;
  }

  // 2. Do not cache PocketBase API calls - let them be strictly network-based for accuracy
  if (url.hostname.includes('pocketbase') || event.request.url.includes('/api/')) {
    return;
  }

  // 3. App Shell Navigation handling
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('./index.html'))
    );
    return;
  }

  // 4. Default cache-first for local assets
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      return cachedResponse || fetch(event.request);
    })
  );
});
