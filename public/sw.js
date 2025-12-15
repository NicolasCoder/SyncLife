const CACHE_NAME = 'synclife-v3';

// ✅ Cache APENAS arquivos locais essenciais
// Nunca incluir CDNs externos aqui (Tailwind, Google Fonts, etc)
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
];

// 1. Install: Cache conservador
self.addEventListener('install', (event) => {
  console.log('[SW] Instalando...');
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Cacheando arquivos essenciais');
        // Adiciona arquivos um por um para não quebrar se algum falhar
        return Promise.allSettled(
          PRECACHE_ASSETS.map(url => 
            cache.add(url).catch(err => {
              console.warn(`[SW] Falha ao cachear ${url}:`, err);
            })
          )
        );
      })
      .then(() => console.log('[SW] Instalação completa'))
      .catch((err) => console.error('[SW] Erro na instalação:', err))
  );
});

// 2. Activate: Limpeza de caches antigos
self.addEventListener('activate', (event) => {
  console.log('[SW] Ativando...');
  
  event.waitUntil(
    caches.keys()
      .then((keys) => {
        return Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) {
              console.log('[SW] Removendo cache antigo:', key);
              return caches.delete(key);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] Ativado e assumindo controle');
        return self.clients.claim();
      })
  );
});

// 3. Fetch: Estratégia inteligente
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // ❌ Ignorar protocolos não-HTTP
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // ❌ Não cachear APIs externas
  const isExternalAPI = 
    url.hostname.includes('supabase.co') ||
    url.hostname.includes('googleapis.com') && !url.pathname.includes('/css') ||
    url.hostname.includes('generativelanguage.googleapis.com');

  if (isExternalAPI) {
    // Para APIs, apenas tenta a rede
    event.respondWith(
      fetch(event.request).catch(() => {
        // Se offline, retorna resposta vazia
        return new Response(
          JSON.stringify({ error: 'offline', message: 'Sem conexão' }), 
          { 
            headers: { 'Content-Type': 'application/json' },
            status: 503 
          }
        );
      })
    );
    return;
  }

  // ✅ Para recursos locais e CDNs públicos (Tailwind, Fonts)
  // Estratégia: Cache First com Network Fallback
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          // Retorna do cache E atualiza em background
          fetch(event.request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.ok) {
                caches.open(CACHE_NAME).then((cache) => {
                  cache.put(event.request, networkResponse.clone());
                });
              }
            })
            .catch(() => {}); // Silenciosamente falha se offline
          
          return cachedResponse;
        }

        // Se não tem cache, busca da rede
        return fetch(event.request)
          .then((networkResponse) => {
            // Cacheia se for bem-sucedido
            if (networkResponse && networkResponse.ok) {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, responseToCache);
              });
            }
            return networkResponse;
          })
          .catch((err) => {
            console.warn('[SW] Falha na busca:', url.pathname, err);
            
            // Fallback para navegação (SPA)
            if (event.request.mode === 'navigate') {
              return caches.match('/index.html');
            }
            
            // Retorna erro 503 para outros
            return new Response('Offline', { status: 503 });
          });
      })
  );
});