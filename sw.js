// Service Worker para Gestor de Postes PWA
const CACHE_NAME = 'gestor-postes-v1.0.0';
const urlsToCache = [
  '/postes/',
  '/postes/index.html',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  'https://cdn.sheetjs.com/xlsx-0.20.2/package/dist/xlsx.full.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js',
  'https://cdn.jsdelivr.net/npm/@turf/turf@6/turf.min.js',
  'https://cdn.jsdelivr.net/npm/localforage@1.10.0/dist/localforage.min.js'
];

// Instalación del Service Worker
self.addEventListener('install', event => {
  console.log('Service Worker instalado');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Archivos cacheados');
        return cache.addAll(urlsToCache);
      })
      .catch(err => console.error('Error al cachear:', err))
  );
  self.skipWaiting();
});

// Activación del Service Worker
self.addEventListener('activate', event => {
  console.log('Service Worker activado');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('Cache antiguo eliminado:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Estrategia de caché: Network First (primero red, luego caché)
self.addEventListener('fetch', event => {
  const requestUrl = new URL(event.request.url);
  
  // Evitar cachear llamadas a APIs externas no necesarias
  if (requestUrl.origin === 'https://a.basemaps.cartocdn.com' ||
      requestUrl.origin === 'https://server.arcgisonline.com') {
    // Para tiles del mapa, usar caché primero
    event.respondWith(
      caches.match(event.request)
        .then(response => {
          if (response) {
            return response;
          }
          return fetch(event.request).then(response => {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseClone);
            });
            return response;
          });
        })
        .catch(() => {
          // Si offline, devolver un mensaje amigable
          return new Response('Mapa no disponible offline. Descarga el área primero.', {
            status: 503,
            statusText: 'Offline'
          });
        })
    );
    return;
  }
  
  // Para otros recursos, usar Network First
  event.respondWith(
    fetch(event.request)
      .then(response => {
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseClone);
        });
        return response;
      })
      .catch(() => {
        return caches.match(event.request)
          .then(response => {
            if (response) {
              return response;
            }
            // Si es una navegación, devolver index.html
            if (event.request.mode === 'navigate') {
              return caches.match('/postes/index.html');
            }
            return new Response('Recurso no disponible offline', {
              status: 404,
              statusText: 'Not Found'
            });
          });
      })
  );
});
