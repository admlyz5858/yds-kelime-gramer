// app/sw.js — network-first (çevrimiçi hep güncel, çevrimdışı önbellek)
const CACHE = 'yds-v2';
const ASSETS = [
  './', './index.html', './css/style.css',
  './js/app.js', './js/logic.js', './js/storage.js',
  './manifest.webmanifest',
  './data/manifest.json', './data/lessons/ders-001.json'
];
self.addEventListener('install', e =>
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(
  caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim())
));
self.addEventListener('fetch', e => {
  e.respondWith(
    fetch(e.request)
      .then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return r; })
      .catch(() => caches.match(e.request))
  );
});
