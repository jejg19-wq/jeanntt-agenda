/* ============================================================
   Jeanntt Agenda — Service Worker
   Cachea el "cascarón" (HTML/CSS/JS/iconos) para que la app
   abra al instante y funcione sin conexión. Los datos NO se
   cachean: en la Fase 2 las llamadas al backend (otro origen,
   y los métodos POST/PUT/DELETE) pasan directo a la red.
   Sube CACHE_VERSION cuando cambies archivos del cascarón.
   ============================================================ */
const CACHE_VERSION = 'jeanntt-agenda-v3';

const SHELL = [
  './',
  './index.html',
  './css/styles.css',
  './js/config.js',
  './js/api.js',
  './js/app.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-180.png',
  './icons/icon-maskable-512.png',
  './icons/favicon-32.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return; // POST/PUT/DELETE (API Fase 2) -> directo a la red

  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  const isFonts = /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);

  // Navegaciones: red primero; si no hay conexión, el index cacheado.
  if (req.mode === 'navigate') {
    event.respondWith(fetch(req).catch(() => caches.match('./index.html')));
    return;
  }

  // Cascarón propio + tipografías: responde de caché y revalida en segundo plano.
  if (sameOrigin || isFonts) {
    event.respondWith(
      caches.match(req).then((cached) => {
        const network = fetch(req).then((res) => {
          if (res && res.status === 200 && (res.type === 'basic' || res.type === 'cors')) {
            const copy = res.clone();
            caches.open(CACHE_VERSION).then((c) => c.put(req, copy));
          }
          return res;
        }).catch(() => cached);
        return cached || network;
      })
    );
    return;
  }

  // Todo lo demás (p. ej. el backend en otro origen) pasa directo a la red.
});
