import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      build: {
        minify: 'esbuild',
      },
      esbuild: {
        pure: mode === 'production' ? ['console.log', 'console.warn'] : [],
      },
      plugins: [
        tailwindcss(),
        react(),
        VitePWA({
          registerType: 'prompt',
          injectRegister: 'inline',
          manifest: false,
          workbox: {
            globPatterns: ['**/*.{js,css,html,ico,svg,woff2,webp,png}'],
            maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
            cleanupOutdatedCaches: true,
            clientsClaim: true,
            navigationPreload: true,
            navigateFallbackDenylist: [
              /^\/sitemap\.xml$/,
              /^\/feed\.xml$/,
              /^\/robots\.txt$/,
              /^\/manifest\.json$/,
              /^\/downloads\//,
              /^\/\.well-known\//,
              /^\/save-password/,
            ],
            runtimeCaching: [
              // Supabase Auth — never cache; tokens must always be live.
              {
                urlPattern: ({ url }) =>
                  url.host.endsWith('.supabase.co') && /^\/auth\/v1\//.test(url.pathname),
                handler: 'NetworkOnly',
              },
              // Supabase Realtime websocket / SSE — never cache.
              {
                urlPattern: ({ url }) =>
                  url.host.endsWith('.supabase.co') && /^\/realtime\/v1\//.test(url.pathname),
                handler: 'NetworkOnly',
              },
              // Supabase Edge Functions — never cache (mutations + custom logic).
              {
                urlPattern: ({ url }) =>
                  url.host.endsWith('.supabase.co') && /^\/functions\/v1\//.test(url.pathname),
                handler: 'NetworkOnly',
              },
              // Supabase Storage (public buckets — avatars, org logos, blog covers).
              {
                urlPattern: ({ url, request }) =>
                  request.method === 'GET' &&
                  url.host.endsWith('.supabase.co') &&
                  /^\/storage\/v1\/object\/public\//.test(url.pathname),
                handler: 'CacheFirst',
                options: {
                  cacheName: 'supabase-storage-v1',
                  expiration: { maxEntries: 500, maxAgeSeconds: 60 * 60 * 24 * 30 },
                  cacheableResponse: { statuses: [200] },
                },
              },
              // Supabase REST (PostgREST). NetworkFirst with a generous timeout
              // for iOS LTE; the cache is a short-lived fallback only.
              {
                urlPattern: ({ url, request }) =>
                  request.method === 'GET' &&
                  url.host.endsWith('.supabase.co') &&
                  /^\/rest\/v1\//.test(url.pathname),
                handler: 'NetworkFirst',
                options: {
                  cacheName: 'supabase-rest-v1',
                  networkTimeoutSeconds: 5,
                  expiration: { maxEntries: 200, maxAgeSeconds: 60 * 5 },
                  cacheableResponse: { statuses: [200] },
                },
              },
              {
                urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
                handler: 'StaleWhileRevalidate',
                options: {
                  cacheName: 'google-fonts-stylesheets',
                },
              },
              {
                urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
                handler: 'CacheFirst',
                options: {
                  cacheName: 'google-fonts-webfonts',
                  expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
                },
              },
              {
                urlPattern: /^https:\/\/esm\.sh\/.*/i,
                handler: 'CacheFirst',
                options: {
                  cacheName: 'esm-modules',
                  expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 },
                },
              },
              {
                urlPattern: /\/img\//,
                handler: 'CacheFirst',
                options: {
                  cacheName: 'images',
                  expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 },
                },
              },
            ],
          },
        }),
      ],
      resolve: {
        alias: {
          '@': path.resolve(process.cwd(), './src'),
        }
      }
    };
});