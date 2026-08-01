/// <reference lib="webworker" />
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';
import { NavigationRoute, Route, registerRoute } from 'workbox-routing';
import { NetworkFirst, NetworkOnly, StaleWhileRevalidate } from 'workbox-strategies';

declare const self: ServiceWorkerGlobalScope;

// Workbox precache manifest — VitePWA tarafından inject edilir
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// Navigasyon fallback
registerRoute(
  new NavigationRoute(new NetworkFirst({ cacheName: 'masraf-navigation' }), {
    denylist: [/^\/api\//],
  }),
);

// API çağrıları asla cache edilmez
registerRoute(new Route(({ url }) => url.pathname.startsWith('/api/'), new NetworkOnly()));

// Statik varlıklar — StaleWhileRevalidate
registerRoute(
  ({ request }) => ['style', 'script', 'worker', 'image', 'font'].includes(request.destination),
  new StaleWhileRevalidate({
    cacheName: 'masraf-static',
    plugins: [],
  }),
);

// ─── Web Push ───────────────────────────────────────────────────────────────

self.addEventListener('push', (event: PushEvent) => {
  if (!event.data) return;

  let data: { title?: string; body?: string; url?: string; timestamp?: number };
  try {
    data = event.data.json() as typeof data;
  } catch {
    data = { title: 'Masraf', body: event.data.text() };
  }

  const title = data.title ?? 'Masraf';
  const options: NotificationOptions = {
    body: data.body ?? '',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-96.png',
    tag: `masraf-${data.timestamp ?? Date.now()}`,
    data: { url: data.url ?? '/' },
    vibrate: [200, 100, 200],
    requireInteraction: false,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();

  const targetUrl: string = (event.notification.data as { url?: string }).url ?? '/';

  event.waitUntil(
    (async () => {
      const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of clients) {
        if ('focus' in client) {
          await (client as WindowClient).navigate(targetUrl);
          await (client as WindowClient).focus();
          return;
        }
      }
      await self.clients.openWindow(targetUrl);
    })(),
  );
});

// Hemen devral — yeni SW'nin aktif olmasını beklemeden kontrol alması
self.addEventListener('message', (event: ExtendableMessageEvent) => {
  if ((event.data as { type?: string }).type === 'SKIP_WAITING') {
    void self.skipWaiting();
  }
});
