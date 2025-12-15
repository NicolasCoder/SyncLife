// Minimal Service Worker to satisfy PWA installability requirements
self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  return self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  // Pass through requests directly to network
  e.respondWith(fetch(e.request));
});