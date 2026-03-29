// Goutreine PWA Service Worker v6.0
// VERSÃO: 2026-03-29-c
// Strategy: Network-first for everything, cache only as offline fallback

const SW_VERSION = '6.0';
const CACHE_NAME = 'goutreine-v6';

// ============================================
// INSTALL — Immediately take over from any old SW
// ============================================
self.addEventListener('install', (event) => {
  console.log(`[SW] Installing v${SW_VERSION} — taking over immediately`);
  self.skipWaiting(); // Don't wait for old SW to release — activate NOW
});

// ============================================
// ACTIVATE — Nuke ALL old caches, claim all tabs
// ============================================
self.addEventListener('activate', (event) => {
  console.log(`[SW] Activating v${SW_VERSION} — purging all old caches`);
  event.waitUntil(
    caches.keys().then((names) => {
      return Promise.all(
        names.map((name) => {
          console.log(`[SW] Deleting cache: ${name}`);
          return caches.delete(name);
        })
      );
    }).then(() => {
      console.log('[SW] All caches purged, claiming clients');
      return self.clients.claim();
    }).then(() => {
      // Force reload all open tabs so they get fresh code
      return self.clients.matchAll({ type: 'window' }).then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: 'SW_UPDATED', version: SW_VERSION });
        });
      });
    })
  );
});

// ============================================
// FETCH — Network-first for everything
// ============================================
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Don't intercept non-GET
  if (request.method !== 'GET') return;

  // Don't intercept Supabase API calls at all
  if (url.hostname.includes('supabase.co')) return;

  // Don't intercept chrome-extension or other protocols
  if (!url.protocol.startsWith('http')) return;

  // Everything else: network-first with cache fallback for offline
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Cache successful responses for offline use
        if (response.ok && url.origin === self.location.origin) {
          const cloned = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, cloned));
        }
        return response;
      })
      .catch(() => {
        // Offline: try cache
        return caches.match(request).then((cached) => {
          if (cached) return cached;
          // For navigation, serve cached index.html
          if (request.mode === 'navigate') {
            return caches.match('/index.html');
          }
          return new Response('Offline', { status: 503 });
        });
      })
  );
});

// ============================================
// MESSAGE
// ============================================
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting' || event.data?.type === 'skipWaiting') {
    self.skipWaiting();
  }
  if (event.data === 'clearCache' || event.data?.type === 'clearCache') {
    caches.keys().then((names) => names.forEach((n) => caches.delete(n)));
  }
  if (event.data === 'getVersion' || event.data?.type === 'getVersion') {
    event.source?.postMessage({ type: 'SW_VERSION', version: SW_VERSION });
  }
});
