/* Grid Electric Services Service Worker
 * Handles caching, offline responses, and background sync messaging.
 */

const CACHE_NAMES = {
  static: 'grid-electric-static-v2',
  dynamic: 'grid-electric-dynamic-v2',
  images: 'grid-electric-images-v2',
  api: 'grid-electric-api-v2',
};

const STATIC_ASSETS = ['/', '/manifest.webmanifest', '/favicon.ico'];

const BACKGROUND_SYNC_TAG_TO_MESSAGE = {
  'sync-tickets': 'SYNC_TICKETS',
  'sync-time-entries': 'SYNC_TIME_ENTRIES',
  'sync-assessments': 'SYNC_ASSESSMENTS',
  'sync-expenses': 'SYNC_EXPENSES',
  'sync-photos': 'SYNC_PHOTOS',
};

const IS_LOCAL_DEV_HOST =
  self.location.hostname === 'localhost'
  || self.location.hostname === '127.0.0.1';

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAMES.static);
      await Promise.allSettled(
        STATIC_ASSETS.map(async (asset) => {
          const request = new Request(asset, { cache: 'reload' });
          await cache.add(request);
        }),
      );
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter(
            (key) =>
              key.startsWith('grid-electric-') && !Object.values(CACHE_NAMES).includes(key),
          )
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

function isStaticAsset(pathname) {
  return (
    pathname.startsWith('/_next/') ||
    pathname.endsWith('.js') ||
    pathname.endsWith('.css') ||
    pathname.endsWith('.ico') ||
    pathname.endsWith('.svg') ||
    pathname.endsWith('.png') ||
    pathname.endsWith('.jpg') ||
    pathname.endsWith('.jpeg') ||
    pathname.endsWith('.webp') ||
    pathname.endsWith('.woff') ||
    pathname.endsWith('.woff2')
  );
}

function isApiRequest(url) {
  return (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/rest/v1/') ||
    url.pathname.startsWith('/auth/v1/')
  );
}

function isImageRequest(request) {
  return (
    request.destination === 'image' || request.headers.get('accept')?.includes('image/') === true
  );
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) {
    return cached;
  }

  const response = await fetch(request);
  if (response.ok) {
    cache.put(request, response.clone());
  }
  return response;
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);

  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) {
      return cached;
    }
    throw new Error('Network unavailable and no cache entry.');
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const networkPromise = fetch(request)
    .then((response) => {
      if (response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);

  if (cached) {
    return cached;
  }

  const networkResponse = await networkPromise;
  if (networkResponse) {
    return networkResponse;
  }

  throw new Error('Unable to resolve request from cache or network.');
}

function offlineNavigationResponse() {
  return new Response(
    '<!doctype html><html><head><meta charset="utf-8"><title>Offline</title></head><body><h1>Offline</h1><p>Reconnect to continue syncing.</p></body></html>',
    {
      status: 503,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    },
  );
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') {
    return;
  }

  if (IS_LOCAL_DEV_HOST) {
    // Never cache app bundles in local development; stale caches mask current code.
    event.respondWith(fetch(request));
    return;
  }

  const url = new URL(request.url);
  const isSameOrigin = url.origin === self.location.origin;
  const isAllowedExternal = url.hostname.includes('supabase.co') || url.hostname.includes('mapbox.com');

  if (!isSameOrigin && !isAllowedExternal) {
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      networkFirst(request, CACHE_NAMES.dynamic).catch(async () => {
        const cache = await caches.open(CACHE_NAMES.static);
        return (await cache.match('/')) || offlineNavigationResponse();
      }),
    );
    return;
  }

  if (isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirst(request, CACHE_NAMES.static));
    return;
  }

  if (isApiRequest(url)) {
    event.respondWith(
      staleWhileRevalidate(request, CACHE_NAMES.api).catch(
        () =>
          new Response(JSON.stringify({ error: 'offline', queued: true }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' },
          }),
      ),
    );
    return;
  }

  if (isImageRequest(request)) {
    event.respondWith(cacheFirst(request, CACHE_NAMES.images));
    return;
  }

  event.respondWith(staleWhileRevalidate(request, CACHE_NAMES.dynamic));
});

async function postMessageToClients(messageType) {
  const clients = await self.clients.matchAll({
    type: 'window',
    includeUncontrolled: true,
  });

  await Promise.all(
    clients.map((client) =>
      client.postMessage({
        type: messageType,
        source: 'service-worker',
        timestamp: new Date().toISOString(),
      }),
    ),
  );
}

self.addEventListener('sync', (event) => {
  const messageType = BACKGROUND_SYNC_TAG_TO_MESSAGE[event.tag];
  if (!messageType) {
    return;
  }

  event.waitUntil(postMessageToClients(messageType));
});

self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {};
  const title = data.title ?? 'Grid Electric Services';
  const options = {
    body: data.body ?? 'New update available.',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    data: data.data ?? {},
    actions: data.actions ?? [],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const payload = event.notification.data ?? {};
  const targetUrl =
    typeof payload.url === 'string'
      ? payload.url
      : payload.ticketId
        ? `/tickets/${payload.ticketId}`
        : '/';

  event.waitUntil(self.clients.openWindow(targetUrl));
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data?.type === 'TRIGGER_SYNC' && typeof event.data.tag === 'string') {
    const messageType = BACKGROUND_SYNC_TAG_TO_MESSAGE[event.data.tag];
    if (messageType) {
      event.waitUntil(postMessageToClients(messageType));
    }
  }
});
