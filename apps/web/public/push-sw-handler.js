// Push notification handler — Workbox tarafından generate edilen SW'e importScripts ile eklenir.
// Bu dosya ES module değildir; global SW scope'unda çalışır.

/* eslint-disable */

self.addEventListener('push', function (event) {
  if (!event.data) return;

  var data;
  try {
    data = event.data.json();
  } catch (e) {
    data = { title: 'Masraf', body: event.data.text() };
  }

  var title = data.title || 'Masraf';
  var options = {
    body: data.body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-96.png',
    tag: 'masraf-' + (data.timestamp || Date.now()),
    data: { url: data.url || '/' },
    requireInteraction: false,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  var targetUrl = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clients) {
      for (var i = 0; i < clients.length; i++) {
        var client = clients[i];
        if ('navigate' in client) {
          return client.navigate(targetUrl).then(function (c) {
            return c && c.focus ? c.focus() : null;
          });
        }
      }
      return self.clients.openWindow(targetUrl);
    }),
  );
});
