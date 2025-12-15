const CACHE_NAME = 'synclife-v2';

// Cache apenas arquivos LOCAIS críticos na instalação.
// Isso evita que falhas em CDNs externos bloqueiem a instalação do SW.
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
];

// 1. Install: Cache apenas arquivos locais essenciais
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .catch((err) => console.error('SW Install Error:', err))
  );
});

// 2. Activate: Limpeza de caches antigos
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

// 3. Fetch: Estratégia Stale-While-Revalidate com Runtime Caching
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Ignorar requests não-http (ex: chrome-extension)
  if (!url.protocol.startsWith('http')) return;

  // Lógica de Exclusão/Inclusão de API
  // Não cachear Supabase ou Gemini API (exceto Fonts do Google)
  const isApi = url.hostname.includes('supabase.co') || 
                (url.hostname.includes('googleapis.com') && !url.hostname.includes('fonts'));

  // Se for API, apenas Network (com fallback JSON se offline)
  if (isApi) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response(JSON.stringify({ error: 'offline' }), { 
          headers: { 'Content-Type': 'application/json' } 
        });
      })
    );
    return;
  }

  // Para Assets (HTML, JS, CSS, Imagens, Fonts, Tailwind)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Faz o fetch em background para atualizar o cache (Stale-While-Revalidate)
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        // Verifica se a resposta é válida para cachear
        if (networkResponse && networkResponse.status === 200) {
          // Clona a resposta pois ela só pode ser consumida uma vez
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
             // Cacheia silenciosamente
             try {
                cache.put(event.request, responseToCache);
             } catch (err) {
                console.warn('Falha ao atualizar cache runtime:', err);
             }
          });
        }
        return networkResponse;
      }).catch((err) => {
        // Se falhar a rede (Offline)
        // Se for navegação (HTML), tenta retornar o index.html (SPA Fallback)
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
        // Se não tiver cache e rede falhar, retorna nada (browser trata erro)
      });

      // Retorna o cache se existir, senão espera a rede
      return cachedResponse || fetchPromise;
    })
  );
});