/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// Kök .env dosyası kullanılır (monorepo genelinde tek kaynak).
export default defineConfig({
  envDir: '../../',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['icons/icon-32.png', 'icons/icon-180.png'],
      manifest: {
        id: '/',
        name: 'Masraf Yönetim Sistemi',
        short_name: 'Masraf',
        description: 'Şirket masraflarını oluşturma, onaylama ve takip etme uygulaması.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#0f172a',
        theme_color: '#2563eb',
        lang: 'tr',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          {
            src: 'icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        navigateFallback: '/offline.html',
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            // Uygulama kabuğu (statik varlıklar): stale-while-revalidate güvenli önbellekleme.
            urlPattern: ({ request }) =>
              ['style', 'script', 'worker', 'image', 'font'].includes(request.destination),
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'app-shell' },
          },
          {
            // API çağrıları önbelleğe alınmaz: masraf gibi kritik veride bayat/kayıp veri riskini önler.
            urlPattern: /\/api\//,
            handler: 'NetworkOnly',
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: Number(process.env.WEB_PORT ?? 3000),
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: true,
  },
});
