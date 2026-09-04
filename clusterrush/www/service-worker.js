// Service Worker — Cache-first for game assets
// Enables offline play after first visit

const CACHE_NAME = 'clusterrush-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/index.js',
  '/index.wasm',
  '/index.pck',
  '/index.apple-touch-icon.png',
  '/index.icon.png',
  '/index.png',
  '/index.audio.worklet.js',
  '/index.audio.position.worklet.js'
];

// Install event — pre-cache all game assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Cluster Rush service worker');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).catch((err) => {
      console.error('[SW] Cache failed:', err);
    })
  );
  self.skipWaiting();
});

// Activate event — clean old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Cluster Rush service worker');
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Fetch event — cache-first, network fallback
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;
  
  // For game assets (WASM, PCK, JS), use cache-first
  const isGameAsset = event.request.url.match(/\.(wasm|pck|js|html)$/);
  
  if (isGameAsset) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        
        // Network fallback
        return fetch(event.request).then((response) => {
          // Clone response to cache it
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, clone);
            });
          }
          return response;
        }).catch(() => {
          // Offline fallback to index.html
          return caches.match('/index.html');
        });
      })
    );
  } else {
    // For other resources, use network-first
    event.respondWith(
      fetch(event.request).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clone);
          });
        }
        return response;
      }).catch(() => {
        return caches.match(event.request);
      })
    );
  }
});

// Handle messages from the game
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});
