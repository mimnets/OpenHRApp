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
          injectRegister: false,
          manifest: false,
          workbox: {
            globPatterns: ['**/*.{js,css,html,ico,svg,woff2}'],
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
              {
                urlPattern: ({ url }) => /\/api\/realtime/.test(url.pathname),
                handler: 'NetworkOnly',
              },
              {
                urlPattern: ({ url }) => /\/api\/collections\/users\/auth-/.test(url.pathname),
                handler: 'NetworkOnly',
              },
              {
                urlPattern: ({ url, request }) =>
                  request.method === 'GET' && /\/api\/files\//.test(url.pathname),
                handler: 'CacheFirst',
                options: {
                  cacheName: 'pb-files',
                  expiration: { maxEntries: 500, maxAgeSeconds: 60 * 60 * 24 * 30 },
                  cacheableResponse: { statuses: [200] },
                },
              },
              {
                urlPattern: ({ url, request }) =>
                  request.method === 'GET' &&
                  /\/api\/openhr\/(blog|tutorials)\//.test(url.pathname),
                handler: 'StaleWhileRevalidate',
                options: {
                  cacheName: 'pb-public-content',
                  expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 7 },
                  cacheableResponse: { statuses: [200] },
                },
              },
              {
                urlPattern: ({ url, request }) =>
                  request.method === 'GET' && /\/api\//.test(url.pathname),
                handler: 'NetworkFirst',
                options: {
                  cacheName: 'api-cache',
                  networkTimeoutSeconds: 3,
                  expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 },
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