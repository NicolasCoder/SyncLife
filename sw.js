// Minimal Service Worker to satisfy PWA installability requirements
self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  return self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  // Only handle http/https requests to avoid errors with chrome-extension:// or other schemes
  if (!e.request.url.startsWith('http')) return;
  
  // Pass through requests directly to network with basic error handling
  e.respondWith(
    fetch(e.request).catch(() => {
        return new Response("Offline", { status: 503, statusText: "Offline" });
    })
  );
});