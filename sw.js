// Goutreine PWA Service Worker v4.1
// Estratégia: Network-first para HTML, Cache-first para CDNs, Network-first para API
// VERSÃO: 2026-03-23-a (mudar este valor força reinstalação do SW)

const CACHE_NAME = 'goutreine-v4-cache-v5';
const DATA_CACHE_NAME = 'goutreine-v4-data-v2';

// Assets essenciais pré-cacheados
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/public/icons/icon-192x192.png',
  '/public/icons/icon-512x512.png',
];

// ============================================
// INSTALL — skipWaiting imediato
// ============================================
self.addEventListener('install', (event) => {
  console.log('[SW] Installing v4.1...');
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
  console.log('[SW] Activating v4.1...');
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

  // --- Supabase API: Network-first com fallback ao cache ---
  if (url.hostname.includes('supabase.co')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const cloned = response.clone();
          caches.open(DATA_CACHE_NAME).then((cache) => {
            cache.put(request, cloned);
          });
          return response;
        })
        .catch(() => {
          return caches.match(request).then((cached) => {
            if (cached) {
              console.log(`[SW] Serving Supabase from cache: ${url.pathname}`);
              return cached;
            }
            return new Response(
              JSON.stringify({ error: 'offline', message: 'Você está offline. Dados podem estar desatualizados.' }),
              { headers: { 'Content-Type': 'application/json' }, status: 503 }
            );
          });
        })
    );
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

  // --- Navegação (HTML): NETWORK-FIRST ---
  // Isso garante que o app sempre busca a versão mais recente do index.html
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cachear a versão nova para uso offline
          const cloned = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, cloned));
          return response;
        })
        .catch(() => {
          // Offline: servir do cache
          return caches.match(request).then((cached) => {
            return cached || caches.match('/index.html');
          });
        })
    );
    return;
  }

  // --- Outros assets locais (imagens, manifest): Cache-first ---
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response.ok && url.origin === self.location.origin) {
          const cloned = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, cloned));
        }
        return response;
      }).catch(() => {
        return new Response('Offline', { status: 503 });
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
});
