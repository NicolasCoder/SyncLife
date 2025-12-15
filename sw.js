const CACHE_NAME = 'synclife-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  'https://cdn.tailwindcss.com?plugins=forms,container-queries',
  'https://fonts.googleapis.com/css2?family=Inter:wght@200;300;400;500;600;700;800&display=swap',
  'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap'
];

// 1. Install Event: Cache core static assets
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Tenta cachear, mas não falha se um arquivo externo der erro
      return cache.addAll(STATIC_ASSETS).catch(err => console.warn('Falha ao cachear assets iniciais:', err));
    })
  );
});

// 2. Activate Event: Clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Fetch Event: Stale-While-Revalidate strategy
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Ignore non-http requests (extensions, etc)
  if (!url.protocol.startsWith('http')) return;

  // Supabase & APIs: Network First, no cache fallback logic needed yet (handled by app)
  if (url.hostname.includes('supabase.co') || url.hostname.includes('googleapis.com')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        // Opcional: retornar JSON de erro se offline
        return new Response(JSON.stringify({ error: 'offline' }), { 
          headers: { 'Content-Type': 'application/json' } 
        });
      })
    );
    return;
  }

  // Static Assets (Scripts, CSS, Images): Stale-While-Revalidate
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        // Update cache if valid response
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // If network fails, return nothing (cachedResponse will be used)
      });

      return cachedResponse || fetchPromise;
    }).catch(() => {
      // Fallback for navigation (SPA offline support)
      if (event.request.mode === 'navigate') {
        return caches.match('/index.html');
      }
    })
  );
});