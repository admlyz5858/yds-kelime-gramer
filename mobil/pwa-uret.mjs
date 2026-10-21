// mobil/pwa-uret.mjs — Uygulamanın PWA (iPhone "Ana Ekrana Ekle" + tarayıcı) sürümünü docs/app/ altına üretir.
// GitHub Pages docs/ klasörünü yayınladığı için çıktı https://<kullanıcı>.github.io/<depo>/app/ adresinde açılır.
//   - app/ kopyalanır (test/geliştirme dosyaları elenir), kelime havuzu yeniden üretilir
//   - index.html: SW silme betiği yerine SW kaydı; iOS ana ekran meta'ları; güvenli alan CSS'i
//   - manifest.webmanifest: id/scope/apple ikon; icon-180.png üretilir
//   - sw.js: tüm dosyaları içerik karmasıyla sürümlenmiş önbelleğe alır (çevrimdışı çalışır; yeni dağıtımda yenilenir)
// Kullanım: node mobil/pwa-uret.mjs   → docs/app/
import { cpSync, rmSync, mkdirSync, existsSync, readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { havuzYaz } from './kelime-havuz.mjs';

const buGun = dirname(fileURLToPath(import.meta.url));
const kok = join(buGun, '..');
const kaynak = join(kok, 'app');
const hedef = join(kok, 'docs', 'app');

rmSync(hedef, { recursive: true, force: true });
mkdirSync(hedef, { recursive: true });
cpSync(kaynak, hedef, { recursive: true });
for (const f of readdirSync(join(hedef, 'js'))) if (/\.test\.js$/.test(f)) rmSync(join(hedef, 'js', f), { force: true });
for (const f of ['sunucu.py', 'baslat.sh']) rmSync(join(hedef, f), { force: true });
rmSync(join(hedef, 'data', 'frames'), { recursive: true, force: true });
havuzYaz(join(hedef, 'data', 'uniteler'), join(hedef, 'data', 'kelime-havuz.json'));

// --- apple-touch-icon (180×180) ---
try {
  const sharp = (await import('sharp')).default;
  await sharp(join(hedef, 'icon-512.png')).resize(180, 180).png().toFile(join(hedef, 'icon-180.png'));
} catch { cpSync(join(hedef, 'icon-192.png'), join(hedef, 'icon-180.png')); }

// --- manifest ---
const manifest = JSON.parse(readFileSync(join(hedef, 'manifest.webmanifest'), 'utf8'));
Object.assign(manifest, {
  id: './', start_url: './index.html', scope: './', display: 'standalone', orientation: 'portrait',
  lang: 'tr', description: 'YDS · YÖKDİL kelime ve gramer: 2100+ kelime kartı, 13 gramer ünitesi, soru bankası, eşleştirme oyunu, aralıklı tekrar.',
  icons: [
    { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
  ],
});
writeFileSync(join(hedef, 'manifest.webmanifest'), JSON.stringify(manifest, null, 2) + '\n');

// --- index.html ---
let html = readFileSync(join(hedef, 'index.html'), 'utf8');
html = html.replace(/<script>\s*\/\* Önbellek[\s\S]*?<\/script>/, `<script>
    /* PWA: çevrimdışı önbellek (sürümlü service worker) */
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
    }
  </script>`);
html = html.replace('<meta name="viewport" content="width=device-width, initial-scale=1.0">',
  '<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">');
html = html.replace('<link rel="manifest" href="manifest.webmanifest">', `<link rel="manifest" href="manifest.webmanifest">
  <link rel="apple-touch-icon" href="icon-180.png">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="default">
  <meta name="apple-mobile-web-app-title" content="Kelimetre">
  <style>
    /* iOS ana ekran: alt güvenli alan (home çubuğu) */
    #sekme-bar { bottom: calc(12px + env(safe-area-inset-bottom)); }
    main { padding-bottom: calc(96px + env(safe-area-inset-bottom)); }
    .akis { bottom: env(safe-area-inset-bottom); }
    .akis-rail { bottom: calc(64px + env(safe-area-inset-bottom)); }
  </style>`);
// Önbellek kırıcı: içerik karması css/js sürüm paramı olur
const dosyalar = [];
(function gez(d) { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) gez(p); else dosyalar.push(p); } })(hedef);
const karma = createHash('sha1');
for (const p of dosyalar.sort()) if (!/index\.html$|sw\.js$/.test(p)) karma.update(relative(hedef, p)).update(readFileSync(p));
const surum = karma.digest('hex').slice(0, 10);
html = html.replace(/css\/style\.css\?v=\d+/, `css/style.css?v=${surum}`).replace(/js\/app\.js\?v=\d+/, `js/app.js?v=${surum}`);
writeFileSync(join(hedef, 'index.html'), html);

// --- service worker ---
const liste = dosyalar.map(p => './' + relative(hedef, p).split('\\').join('/')).filter(p => !/\/sw\.js$/.test(p));
liste.push('./');
const sw = `// Kelimetre PWA service worker — sürüm ${surum} (pwa-uret.mjs üretir)
const SURUM = 'kelimetre-${surum}';
const DOSYALAR = ${JSON.stringify(liste)};
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
`;
writeFileSync(join(hedef, 'sw.js'), sw);
console.log('PWA hazır → docs/app/ ·', dosyalar.length, 'dosya · sürüm', surum);
