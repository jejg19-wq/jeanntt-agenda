/* ============================================================
   Jeanntt Agenda — Service Worker
   Cachea el "cascarón" (HTML/CSS/JS/iconos) para que la app
   abra al instante y funcione sin conexión. Los datos NO se
   cachean: en la Fase 2 las llamadas al backend (otro origen,
   y los métodos POST/PUT/DELETE) pasan directo a la red.
   También recibe los AVISOS PUSH de citas (10/20/30 min antes)
   y los muestra como notificación. Sube CACHE_VERSION cuando
   cambies archivos del cascarón.
   ============================================================ */
const CACHE_VERSION = 'jeanntt-agenda-v4';

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

/* ============================================================
   AVISOS PUSH
   El backend manda un JSON { title, body, tag, data:{ url } }
   a TODAS las suscripciones 10/20/30 min antes de cada cita.
   Aquí lo mostramos como notificación del sistema.
   ============================================================ */
self.addEventListener('push', (event) => {
  let payload = {};
  if (event.data) {
    // El backend manda JSON; si llegara texto plano, lo usamos como cuerpo.
    try { payload = event.data.json(); }
    catch (e) { payload = { body: event.data.text() }; }
  }

  const title = payload.title || 'Jeanntt Agenda';
  const tag = payload.tag || undefined;
  const options = {
    body: payload.body || 'Tienes una cita próxima.',
    tag: tag,
    data: payload.data || {},
    icon: './icons/icon-192.png',
    badge: './icons/icon-192.png',
    // Con la misma etiqueta (p. ej. la cita), el aviso de 20 y 30 min
    // vuelve a sonar en vez de reemplazar en silencio al anterior.
    renotify: !!tag
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

/* Al tocar la notificación: abre la app (data.url o la raíz). Si ya hay
   una ventana de la PWA abierta, la reutiliza en vez de abrir otra. */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const target = data.url || './';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
      for (const w of wins) {
        if ('focus' in w) {
          if ('navigate' in w && target && target !== './') {
            return w.navigate(target).then((c) => (c || w).focus()).catch(() => w.focus());
          }
          return w.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(target);
    })
  );
});
