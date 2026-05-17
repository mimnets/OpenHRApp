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
          strategies: 'injectManifest',
          srcDir: 'src',
          filename: 'sw.ts',
          injectManifest: {
            globPatterns: ['**/*.{js,css,html,ico,svg,woff2,webp,png}'],
            maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
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