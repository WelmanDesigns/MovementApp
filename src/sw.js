const CACHE_NAME = 'movement-app-v__BUILD_HASH__';
const ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './js/images.js',
  './js/icons.js',
  './js/data.js',
  './js/bjj-data.js',
  './js/timer.js',
  './js/progress.js',
  './js/rules-data.js',
  './js/rules-progress.js',
  './js/rules-quiz.js',
  './js/rules-ui.js',
  './js/gameplan-seed-data.js',
  './js/gameplan-data.js',
  './js/gameplan-store.js',
  './js/gameplan-canvas.js',
  './js/gameplan-ui.js',
  './js/belt-seed-generated.js',
  './js/belt-data.js',
  './js/belt-store.js',
  './js/belt-ui.js',
  './js/diary-store.js',
  './js/diary-ui.js',
  './js/backup.js',
  './js/ui.js',
  './js/app.js',
  './manifest.json'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
