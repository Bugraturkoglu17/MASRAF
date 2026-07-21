/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const buildVersion =
  process.env.VITE_APP_VERSION ??
  process.env.GIT_COMMIT_SHA ??
  `0.1.0-${new Date().toISOString().replace(/[-:.TZ]/g, '')}`;

const iconSizes = [48, 72, 96, 128, 144, 152, 180, 192, 384, 512];

// Kök .env dosyası kullanılır (monorepo genelinde tek kaynak).
export default defineConfig({
  envDir: '../../',
  define: {
    __APP_VERSION__: JSON.stringify(buildVersion),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: 'auto',
      includeAssets: [
        'offline.html',
        'robots.txt',
        'icons/icon-16.png',
        'icons/icon-32.png',
        ...iconSizes.map((size) => `icons/icon-${size}.png`),
        'icons/icon-maskable-192.png',
        'icons/icon-maskable-384.png',
        'icons/icon-maskable-512.png',
      ],
      manifest: {
        id: '/',
        name: 'Masraf Uygulaması',
        short_name: 'Masraf',
        description: 'Şirket masraflarını oluşturma, onaylama ve takip etme uygulaması.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait-primary',
        background_color: '#0f172a',
        theme_color: '#2563eb',
        lang: 'tr-TR',
        dir: 'ltr',
        categories: ['business', 'finance', 'productivity'],
        icons: [
          ...iconSizes.map((size) => ({
            src: `icons/icon-${size}.png`,
            sizes: `${size}x${size}`,
            type: 'image/png' as const,
            purpose: 'any' as const,
          })),
          {
            src: 'icons/icon-maskable-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: 'icons/icon-maskable-384.png',
            sizes: '384x384',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: 'icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
        shortcuts: [
          {
            name: 'Masraf Yükle',
            short_name: 'Masraf Yükle',
            url: '/expenses/new?source=pwa-shortcut',
            icons: [{ src: 'icons/icon-96.png', sizes: '96x96' }],
          },
          {
            name: 'Taslaklarım',
            short_name: 'Taslaklar',
            url: '/expenses?status=DRAFT&source=pwa-shortcut',
            icons: [{ src: 'icons/icon-96.png', sizes: '96x96' }],
          },
          {
            name: 'Onay Bekleyenler',
            short_name: 'Bekleyenler',
            url: '/manager/pending?source=pwa-shortcut',
            icons: [{ src: 'icons/icon-96.png', sizes: '96x96' }],
          },
          {
            name: 'Kullanıcılar',
            short_name: 'Kullanıcılar',
            url: '/admin/users?source=pwa-shortcut',
            icons: [{ src: 'icons/icon-96.png', sizes: '96x96' }],
          },
        ],
      },
      workbox: {
        cacheId: `masraf-${buildVersion}`,
        cleanupOutdatedCaches: true,
        clientsClaim: false,
        skipWaiting: false,
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        runtimeCaching: [
          {
            // Yalnızca aynı origin'deki statik uygulama varlıkları cache edilir.
            urlPattern: ({ request, url }) =>
              url.origin === location.origin &&
              ['style', 'script', 'worker', 'image', 'font'].includes(request.destination),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: `masraf-static-${buildVersion}`,
              expiration: { maxEntries: 80, maxAgeSeconds: 30 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Login, profil, masraf, rapor, signed URL ve tüm diğer API cevapları asla cache edilmez.
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
  optimizeDeps: {
    include: ['@masraf/shared-validation', '@masraf/shared-types'],
  },
  build: {
    commonjsOptions: {
      // packages/shared-* pnpm workspace symlinkleri gerçek yol çözümünde
      // node_modules dışında kalır; Rollup'ın varsayılan commonjs eklentisi
      // bu yüzden onları CJS olarak tanımayıp named export'ları statik
      // çözemez ("X is not exported" hatası). Burada açıkça dahil ediyoruz.
      include: [/packages\/shared-.*\/dist/, /node_modules/],
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: true,
  },
});
