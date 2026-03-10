import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [
        react(),
        VitePWA({
          registerType: 'autoUpdate',
          injectRegister: 'auto',
          manifest: false,
          workbox: {
            globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
            cleanupOutdatedCaches: true,
            skipWaiting: true,
            clientsClaim: true,
            navigateFallbackDenylist: [
              /^\/sitemap\.xml$/,
              /^\/robots\.txt$/,
              /^\/manifest\.json$/,
              /^\/downloads\//,
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