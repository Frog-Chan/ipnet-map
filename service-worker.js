const CACHE_NAME = 'ipnet-map-v1';
const TILE_CACHE_NAME = 'ipnet-tiles-v1';

const STATIC_ASSETS = [
  '/ipnet-map/',
  '/ipnet-map/index.html',
  '/ipnet-map/manifest.json',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  'https://unpkg.com/leaflet-polylinedecorator/dist/leaflet.polylineDecorator.css',
  'https://unpkg.com/leaflet-polylinedecorator/dist/leaflet.polylineDecorator.js',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
  'https://cdn.jsdelivr.net/npm/localforage@1.10.0/dist/localforage.min.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME && key !== TILE_CACHE_NAME)
            .map(key => caches.delete(key))
      );
    })
  );
});

self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  if (
    url.includes('arcgisonline.com') ||
    url.includes('cartocdn.com') ||
    url.includes('tile.openstreetmap.org')
  ) {
    event.respondWith(
      caches.open(TILE_CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((cached) => {
          const fetchPromise = fetch(event.request).then((response) => {
            if (response && response.status === 200) {
              cache.put(event.request, response.clone());
            }
            return response;
          }).catch(() => cached);
          return cached || fetchPromise;
        });
      })
    );
  } else {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        return cached || fetch(event.request).catch(() => {
          // Якщо це HTML-сторінка – повертаємо закешований index.html (для SPA)
          if (event.request.mode === 'navigate') {
            return caches.match('/ipnet-map/');
          }
          return new Response('', { status: 504 });
        });
      })
    );
  }
});
