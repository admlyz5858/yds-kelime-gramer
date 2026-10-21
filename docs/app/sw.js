// Kelimetre PWA service worker — sürüm 32ccad1d92 (pwa-uret.mjs üretir)
const SURUM = 'kelimetre-32ccad1d92';
const DOSYALAR = ["./css/style.css","./data/gunun.json","./data/kelime-havuz.json","./data/manifest.json","./data/sorular.json","./data/uniteler/unite-01.json","./data/uniteler/unite-02.json","./data/uniteler/unite-03.json","./data/uniteler/unite-04.json","./data/uniteler/unite-05.json","./data/uniteler/unite-06.json","./data/uniteler/unite-07.json","./data/uniteler/unite-08.json","./data/uniteler/unite-09.json","./data/uniteler/unite-10.json","./data/uniteler/unite-11.json","./data/uniteler/unite-12.json","./data/uniteler/unite-13.json","./data/uniteler/unite-14.json","./fonts/fraunces.woff2","./fonts/hanken.woff2","./icon-180.png","./icon-192.png","./icon-512.png","./index.html","./js/akis.js","./js/alistirma.js","./js/app.js","./js/banka.js","./js/bildirim.js","./js/durum.js","./js/efekt.js","./js/eslestir.js","./js/kart.js","./js/lig.js","./js/logic.js","./js/ogren.js","./js/sozluk.js","./js/storage.js","./manifest.webmanifest","./"];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(SURUM).then(async (c) => {
    // Büyük veri dosyaları tek tek alınır; biri başarısız olsa da kurulum sürer
    await Promise.all(DOSYALAR.map(u => c.add(u).catch(() => {})));
    await self.skipWaiting();
  }));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== SURUM).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;   // Supabase vb. ağa gider
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(r => r || fetch(e.request).then(res => {
    if (res.ok) { const kopya = res.clone(); caches.open(SURUM).then(c => c.put(e.request, kopya)); }
    return res;
  }).catch(() => caches.match('./index.html'))));
});
