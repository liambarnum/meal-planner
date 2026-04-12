const CACHE_NAME = 'meal-planner-v14';
const ASSETS = [
  './',
  './index.html',
  './app.js?v=10',
  './meals.js?v=10',
  './nutrition.js?v=10',
  './styles.css?v=10',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// Install — cache all local assets, activate immediately
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Activate — clean up old caches, take control of all clients
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

const isLocalhost = self.location.hostname === 'localhost' ||
                    self.location.hostname === '127.0.0.1';

// Fetch — stale-while-revalidate for local assets
self.addEventListener('fetch', event => {
  // On localhost, bypass service worker so file changes are always visible
  if (isLocalhost) return;

  const url = new URL(event.request.url);

  // Never cache API calls
  if (url.hostname === 'api.anthropic.com') return;


  // Google Fonts — cache on first use
  if (url.hostname.includes('googleapis.com') || url.hostname.includes('gstatic.com')) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        });
      })
    );
    return;
  }

  // Local assets — stale-while-revalidate
  // Serve cached version immediately, fetch update in background
  event.respondWith(
    caches.open(CACHE_NAME).then(cache =>
      cache.match(event.request).then(cached => {
        const fetchPromise = fetch(event.request).then(response => {
          if (response.ok) cache.put(event.request, response.clone());
          return response;
        }).catch(() => cached);

        return cached || fetchPromise;
      })
    )
  );
});

// Listen for messages from the app
self.addEventListener('message', event => {
  if (event.data === 'skipWaiting') self.skipWaiting();
});
