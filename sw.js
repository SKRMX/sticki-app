/* Service Worker for MyStocki PWA Installation */
const CACHE_NAME = 'mystocki-v1';
const urlsToCache = [
  './',
  './index.html',
  './css/styles.css',
  './js/app.js',
  './js/store.js',
  './js/cp_lookup.js',
  './js/catalog_data.js',
  './assets/logo.png',
  './assets/icon.png',
  './manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});
