// Goutreine PWA Service Worker v5.0
// Estratégia: Network-first para tudo exceto CDNs imutáveis
// VERSÃO: 2026-03-29-b (mudar este valor força reinstalação do SW)

const SW_VERSION = '5.0';
const CACHE_NAME = 'goutreine-v5-cache-v1';
const DATA_CACHE_NAME = 'goutreine-v5-data-v1';

// Assets essenciais pré-cacheados
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
];

// ============================================
// INSTALL — skipWaiting imediato
// ============================================
self.addEventListener('install', (event) => {
  console.log(`[SW] Installing v${SW_VERSION}...`);
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => {
        console.log('[SW] Precache complete');
        return self.skipWaiting();
      })
  );
});

// ============================================
// ACTIVATE — Limpar TODOS os caches antigos + tomar controle
// ============================================
self.addEventListener('activate', (event) => {
  console.log(`[SW] Activating v${SW_VERSION}...`);
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== DATA_CACHE_NAME)
          .map((name) => {
            console.log(`[SW] Deleting old cache: ${name}`);
            return caches.delete(name);
          })
      );
    }).then(() => {
      console.log('[SW] Claiming all clients');
      return self.clients.claim();
    })
  );
});

// ============================================
// FETCH — Estratégias por tipo de recurso
// ============================================
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorar requests não-GET
  if (request.method !== 'GET') return;

  // --- Supabase API: Network-only (nunca cachear) ---
  if (url.hostname.includes('supabase.co')) {
    // Don't intercept Supabase calls — let them go directly to network
    // This prevents stale cached responses from masking errors
    return;
  }

  // --- CDN assets: Cache-first (imutáveis por URL) ---
  if (url.hostname.includes('unpkg.com') ||
      url.hostname.includes('cdn.jsdelivr.net') ||
      url.hostname.includes('cdn.tailwindcss.com') ||
      url.hostname.includes('cdnjs.cloudflare.com')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const cloned = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, cloned));
          }
          return response;
        });
      })
    );
    return;
  }

  // --- Vite hashed assets (*.js, *.css with hash in filename): Network-first ---
  // These have content hashes so URLs change on each build
  if (url.origin === self.location.origin &&
      url.pathname.startsWith('/assets/') &&
      /\.[a-f0-9]{8,}\.(js|css)$/i.test(url.pathname)) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const cloned = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, cloned));
          return response;
        })
        .catch(() => {
          return caches.match(request).then((cached) => {
            return cached || new Response('Offline', { status: 503 });
          });
        })
    );
    return;
  }

  // --- Navegação (HTML): NETWORK-FIRST ---
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const cloned = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, cloned));
          return response;
        })
        .catch(() => {
          return caches.match(request).then((cached) => {
            return cached || caches.match('/index.html');
          });
        })
    );
    return;
  }

  // --- Outros assets locais (imagens, manifest): Network-first com cache fallback ---
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok && url.origin === self.location.origin) {
          const cloned = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, cloned));
        }
        return response;
      })
      .catch(() => {
        return caches.match(request).then((cached) => {
          return cached || new Response('Offline', { status: 503 });
        });
      })
  );
});

// ============================================
// MESSAGE — Comunicação com o app
// ============================================
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
  if (event.data === 'clearCache') {
    caches.keys().then((names) => {
      names.forEach((name) => caches.delete(name));
    });
  }
  if (event.data === 'getVersion') {
    event.source.postMessage({ type: 'SW_VERSION', version: SW_VERSION });
  }
});
