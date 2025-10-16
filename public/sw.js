const CACHE_NAME = 'dualchat-cache-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/favicon.ico',
  '/placeholder.svg',
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).catch(() => null)
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

// Simple runtime caching for same-origin GETs; offline fallback for navigations
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Only handle same-origin requests
  if (url.origin !== self.location.origin) return;

  // Offline fallback for navigations
  if (req.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req);
          const cache = await caches.open(CACHE_NAME);
          cache.put('/', fresh.clone());
          return fresh;
        } catch (err) {
          const cached = await caches.match('/');
          return cached || caches.match('/index.html');
        }
      })()
    );
    return;
  }

  // Cache-first for static assets
  if (req.method === 'GET') {
    event.respondWith(
      (async () => {
        const cached = await caches.match(req);
        if (cached) return cached;
        try {
          const resp = await fetch(req);
          const cache = await caches.open(CACHE_NAME);
          // Skip opaque or non-OK
          if (resp && resp.status === 200 && (resp.type === 'basic' || resp.type === 'default')) {
            cache.put(req, resp.clone());
          }
          return resp;
        } catch (err) {
          // Fallbacks for known assets
          if (req.destination === 'image') {
            return caches.match('/placeholder.svg');
          }
          throw err;
        }
      })()
    );
  }
});

// Handle Web Push messages and notification clicks
self.addEventListener('push', (event) => {
  let payload = { title: 'DualChat', body: 'New notification', data: {} };
  try {
    if (event.data) payload = JSON.parse(event.data.text());
  } catch {}
  const { title, body, data } = payload;
  event.waitUntil(
    self.registration.showNotification(title || 'DualChat', {
      body: body || '',
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      data: data || {},
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification && event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    (async () => {
      const allClients = await clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of allClients) {
        if ('focus' in client) {
          await client.focus();
          if ('navigate' in client && url) {
            try { await client.navigate(url); } catch {}
          }
          return;
        }
      }
      if (clients.openWindow) {
        await clients.openWindow(url);
      }
    })()
  );
});
