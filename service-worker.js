// Service Worker do Gerador de Carnês
// Estratégia: cache-first para o app shell + bibliotecas, com atualização em segundo plano.
// Suba a versão do CACHE_NAME sempre que publicar uma alteração no index.html.
const CACHE_NAME = 'carnes-app-v6';

const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable.png'
];

const LIBS = [
  'https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.29.4/moment.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll([...APP_SHELL, ...LIBS]))
      .then(() => self.skipWaiting())
      .catch((err) => console.warn('[SW] Falha ao pré-cachear:', err))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      // Atualiza o cache em segundo plano (stale-while-revalidate) quando online
      const networkFetch = fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => null);

      if (cached) return cached;

      return networkFetch.then((response) => {
        if (response) return response;
        // Sem cache e sem rede: se for navegação, cai no shell do app
        if (event.request.mode === 'navigate') return caches.match('./index.html');
        return new Response('', { status: 408, statusText: 'Offline e sem cache' });
      });
    })
  );
});
