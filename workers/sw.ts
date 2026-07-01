// Central Command - Service Worker
// Handles offline caching, background sync, and push notifications

/// <reference lib="es2020" />
/// <reference lib="webworker" />

// Type definitions for Background Sync
interface SyncEvent extends Event {
  tag: string;
  waitUntil(fn: Promise<void>): void;
}

const sw = self as unknown as ServiceWorkerGlobalScope;

// Cache names with versioning
const CACHE_NAMES = {
  static: 'grid-electric-static-v1',
  dynamic: 'grid-electric-dynamic-v1',
  images: 'grid-electric-images-v1',
};

// Static assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/login',
  '/dashboard',
  '/tickets',
  '/time',
  '/expenses',
  '/profile',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

// Install event - cache static assets
sw.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAMES.static).then((cache) => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    }).catch((err) => {
      console.error('[SW] Failed to cache static assets:', err);
    })
  );
  
  // Skip waiting to activate immediately
  sw.skipWaiting();
});

// Activate event - clean old caches
sw.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => {
            // Delete caches that don't match current version
            return name.startsWith('grid-electric-') && 
                   !Object.values(CACHE_NAMES).includes(name);
          })
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    })
  );
  
  // Take control of all clients immediately
  sw.clients.claim();
});

// Helper: Check if URL is a static asset
function isStaticAsset(url: URL): boolean {
  return STATIC_ASSETS.includes(url.pathname) ||
         !!url.pathname.match(/\.(js|css|html|json|png|jpg|jpeg|svg|ico|woff2?)$/);
}

// Helper: Check if URL is an API request
function isAPIRequest(url: URL): boolean {
  return url.pathname.startsWith('/api/') ||
         url.pathname.startsWith('/rest/v1/');
}

// Helper: Check if request is for an image
function isImageRequest(request: Request): boolean {
  return request.destination === 'image' ||
         !!request.headers.get('accept')?.includes('image/');
}

// Cache strategies

// Cache First: Try cache, fall back to network
async function cacheFirst(request: Request, cacheName: string): Promise<Response> {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  
  if (cached) {
    return cached;
  }
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.error('[SW] Network fetch failed:', error);
    throw error;
  }
}

// Stale While Revalidate: Return cache immediately, update in background
async function staleWhileRevalidate(request: Request, cacheName: string): Promise<Response> {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  
  const networkFetch = fetch(request).then((networkResponse) => {
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  }).catch((error) => {
    console.error('[SW] Network fetch failed for SWR:', error);
    throw error;
  });
  
  if (cached) {
    return cached;
  }
  
  return networkFetch;
}

// Network First: Try network, fall back to cache
async function networkFirst(request: Request, cacheName: string): Promise<Response> {
  const cache = await caches.open(cacheName);
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', request.url);
    const cached = await cache.match(request);
    if (cached) {
      return cached;
    }
    throw error;
  }
}

// Fetch event - route to appropriate strategy
sw.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests for caching (but allow them to pass through)
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip cross-origin requests (except Supabase)
  if (url.origin !== sw.location.origin && 
      !url.hostname.includes('supabase.co') &&
      !url.hostname.includes('mapbox.com')) {
    return;
  }
  
  // Strategy: Cache First for static assets
  if (isStaticAsset(url)) {
    event.respondWith(
      cacheFirst(request, CACHE_NAMES.static).catch(() => {
        return new Response('Offline - Asset not cached', { status: 503 });
      })
    );
    return;
  }
  
  // Strategy: Stale While Revalidate for API calls
  if (isAPIRequest(url)) {
    event.respondWith(
      staleWhileRevalidate(request, CACHE_NAMES.dynamic).catch(() => {
        return new Response(
          JSON.stringify({ error: 'Offline', sync: true }), 
          { 
            status: 503, 
            headers: { 'Content-Type': 'application/json' } 
          }
        );
      })
    );
    return;
  }
  
  // Strategy: Cache First for images
  if (isImageRequest(request)) {
    event.respondWith(
      cacheFirst(request, CACHE_NAMES.images).catch(() => {
        // Return a placeholder image for offline
        return new Response('Image not available offline', { status: 503 });
      })
    );
    return;
  }
  
  // Default: Network First for everything else
  event.respondWith(
    networkFirst(request, CACHE_NAMES.dynamic).catch(() => {
      return new Response('Offline', { status: 503 });
    })
  );
});

// Background Sync for queued operations
sw.addEventListener('sync', ((event: SyncEvent) => {
  console.log('[SW] Background sync:', event.tag);
  
  if (event.tag === 'sync-time-entries') {
    event.waitUntil(syncTimeEntries());
  } else if (event.tag === 'sync-assessments') {
    event.waitUntil(syncAssessments());
  } else if (event.tag === 'sync-photos') {
    event.waitUntil(syncPhotos());
  } else if (event.tag === 'sync-expenses') {
    event.waitUntil(syncExpenses());
  }
}) as EventListener);

// Sync functions (will be called by background sync)
async function syncTimeEntries(): Promise<void> {
  console.log('[SW] Syncing time entries...');
  // The actual sync logic will be handled by the app
  // This just triggers the sync event
  const clients = await sw.clients.matchAll({ type: 'window' });
  clients.forEach(client => {
    client.postMessage({ type: 'SYNC_TIME_ENTRIES' });
  });
}

async function syncAssessments(): Promise<void> {
  console.log('[SW] Syncing assessments...');
  const clients = await sw.clients.matchAll({ type: 'window' });
  clients.forEach(client => {
    client.postMessage({ type: 'SYNC_ASSESSMENTS' });
  });
}

async function syncPhotos(): Promise<void> {
  console.log('[SW] Syncing photos...');
  const clients = await sw.clients.matchAll({ type: 'window' });
  clients.forEach(client => {
    client.postMessage({ type: 'SYNC_PHOTOS' });
  });
}

async function syncExpenses(): Promise<void> {
  console.log('[SW] Syncing expenses...');
  const clients = await sw.clients.matchAll({ type: 'window' });
  clients.forEach(client => {
    client.postMessage({ type: 'SYNC_EXPENSES' });
  });
}

// Push Notifications
sw.addEventListener('push', (event) => {
  console.log('[SW] Push received:', event);
  
  const data = event.data?.json() ?? {};
  const title = data.title ?? 'Central Command';
  const options: NotificationOptions = {
    body: data.body ?? 'New notification',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    data: data.data ?? {},
    actions: (data as any).actions ?? [],
    requireInteraction: data.requireInteraction ?? false,
  };
  
  event.waitUntil(
    sw.registration.showNotification(title, options)
  );
});

// Notification click handler
sw.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event);
  
  event.notification.close();
  
  const data = event.notification.data;
  let url = '/';
  
  if (data?.ticketId) {
    url = `/tickets/${data.ticketId}`;
  } else if (data?.type === 'TIME_APPROVED') {
    url = '/time';
  } else if (data?.type === 'EXPENSE_APPROVED') {
    url = '/expenses';
  }
  
  event.waitUntil(
    sw.clients.openWindow(url)
  );
});

// Message handler from main app
sw.addEventListener('message', (event) => {
  console.log('[SW] Message from app:', event.data);
  
  if (event.data.type === 'SKIP_WAITING') {
    sw.skipWaiting();
  } else if (event.data.type === 'CACHE_ASSETS') {
    // Pre-cache specific assets
    caches.open(CACHE_NAMES.static).then((cache) => {
      return cache.addAll(event.data.assets);
    });
  }
});

console.log('[SW] Service worker loaded');
