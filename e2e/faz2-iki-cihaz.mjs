const BASE = process.env.BASE || 'http://localhost:8905/';   // uygulama adresi (ör. BASE=http://localhost:8901/ npm)
const { chromium } = await import(new URL('../mobil/node_modules/playwright/index.mjs', import.meta.url));
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const sunucu = { yedek: null, yazim: 0 };
const AYAR = JSON.stringify({ girisGoruldu: true, kayitSoruldu: true, ipucuGoruldu: { bugun:1,kelimeler:1,mufredat:1,oyun:1,ben:1 }, xp: 0 });
async function cihaz(ad, olaylar) {
  const ctx = await b.newContext({ viewport: { width: 412, height: 860 } });
  await ctx.route('https://thftjeecotladgnuqwhd.supabase.co/**', async (route) => {
    const r = route.request(); const u = new URL(r.url()); const g = r.postDataJSON?.() || null;
    const j = (body) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
    if (u.pathname === '/auth/v1/token') return j({ access_token: 'e2', refresh_token: 'y2', expires_in: 3600 });
    if (u.pathname === '/rest/v1/yedekler' && r.method() === 'GET') return j(sunucu.yedek ? [sunucu.yedek] : []);
    if (u.pathname === '/rest/v1/yedekler' && r.method() === 'POST') { sunucu.yazim++; sunucu.yedek = { veri: g.veri, guncelleme: g.guncelleme, cihaz: g.cihaz }; return route.fulfill({ status: 201, body: '' }); }
    return route.fulfill({ status: 404, body: '{}' });
  });
  const s = await ctx.newPage(); const hata = []; s.on('pageerror', e => hata.push(e.message));
  await s.goto('' + BASE + '', { waitUntil: 'networkidle' });
  await s.evaluate(({ ayar, olaylar }) => { localStorage.clear(); localStorage.setItem('yds-ayar-v1', ayar); localStorage.setItem('yds-olay-v1', JSON.stringify(olaylar)); localStorage.setItem('yds-hesap-v1', JSON.stringify({ eposta: 'a@b.co', kullanici: 'u-1', erisim: 'e', yenileme: 'y', bitis: Date.now() + 3e6, sonSenkron: 0 })); }, { ayar: AYAR, olaylar });
  await s.reload({ waitUntil: 'networkidle' }); await s.waitForTimeout(800);
  const sonuc = await s.evaluate(() => window.__bulut.esitle());
  const yerelOlay = await s.evaluate(() => JSON.parse(localStorage.getItem('yds-olay-v1') || '[]').length);
  console.log(ad, '→ sonuç:', sonuc, '| yerel olay:', yerelOlay, '| hata:', hata.length ? hata : 'yok');
  await ctx.close();
}
const o = (sid, n, t) => Array.from({ length: n }, (_, i) => ({ id: `${sid}:${i}`, t: t + i, en: 'w' + sid + i, q: 2 }));
await cihaz('A (ilk yükleme)', o('a', 2, 1000));
console.log('bulut olay sayısı (A sonrası):', sunucu.yedek.veri.veri['yds-olay-v1'].length);
await cihaz('B (kendi 3 cevabı, boş cihaz)', o('b', 3, 5000));
const son = sunucu.yedek.veri.veri['yds-olay-v1'];
console.log('bulut olay sayısı (B sonrası):', son.length, '| benzersiz:', new Set(son.map(x => x.id)).size);
await b.close();
