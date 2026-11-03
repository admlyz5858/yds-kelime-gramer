const BASE = process.env.BASE || 'http://localhost:8905/';
// Faz 0 regresyon testi: bulut güvenli modu (otomatik yazım kapalı), açılış döngüsü, ilk giriş çakışması, silinmiş yedek
const { chromium } = await import(new URL('../mobil/node_modules/playwright/index.mjs', import.meta.url));
const hata = [];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const sonuc = [];
const T = (ad, kosul) => { sonuc.push(!!kosul); console.log(kosul ? '✓' : '✗ FAIL', ad); };
const bekle = (ms) => new Promise(r => setTimeout(r, ms));

function kurulum(sunucu) {
  return async (ctx) => {
    await ctx.route('https://thftjeecotladgnuqwhd.supabase.co/**', async (route) => {
      const r = route.request(); const u = new URL(r.url()); const g = r.postDataJSON?.() || null;
      const j = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
      if (u.pathname === '/auth/v1/verify') { return j({ access_token: 'e', refresh_token: 'y', expires_in: 3600, user: { id: 'u-1', email: 'a@b.co' } }); }
      if (u.pathname === '/auth/v1/token') { sunucu.yenile++; return j({ access_token: 'e2', refresh_token: 'y2', expires_in: 3600 }); }
      if (u.pathname === '/auth/v1/logout') return route.fulfill({ status: 204, body: '' });
      if (u.pathname === '/rest/v1/yedekler' && r.method() === 'GET') return j(sunucu.yedek ? [sunucu.yedek] : []);
      if (u.pathname === '/rest/v1/yedekler' && r.method() === 'POST') { sunucu.yazim++; sunucu.yedek = { veri: g.veri, guncelleme: g.guncelleme, cihaz: g.cihaz }; return route.fulfill({ status: 201, body: '' }); }
      return route.fulfill({ status: 404, body: '{}' });
    });
  };
}
const yeniSayfa = async (ctx) => { const s = await ctx.newPage(); s.on('pageerror', e => hata.push('SAYFA: ' + e.message)); return s; };
const AYAR = { girisGoruldu: true, kayitSoruldu: true, ipucuGoruldu: { bugun: 1, kelimeler: 1, mufredat: 1, oyun: 1, ben: 1 } };

// ---- A) Boş hesapta açılış döngüsü: bulutta veri var, yerel boş → tek indirme, sonra durur
{
  const sunucu = { yedek: null, yazim: 0, yenile: 0 };
  const ctx = await b.newContext({ viewport: { width: 412, height: 860 } }); await kurulum(sunucu)(ctx);
  const s = await yeniSayfa(ctx);
  await s.goto(BASE, { waitUntil: 'networkidle' });
  await s.evaluate((a) => { localStorage.clear(); localStorage.setItem('yds-ayar-v1', JSON.stringify(a)); localStorage.setItem('yds-hesap-v1', JSON.stringify({ eposta: 'a@b.co', kullanici: 'u-1', erisim: 'e', yenileme: 'y', bitis: Date.now() + 3e6, sonSenkron: 0 })); }, AYAR);
  sunucu.yedek = { veri: { uygulama: 'kelimetre', surum: 1, veri: { 'yds-ayar-v1': { ...AYAR, xp: 300, toplamAktivite: 40 }, 'yds-defter-v1': { zeal: { en: 'zeal', tr: 'şevk' } } } }, guncelleme: new Date(Date.now() + 60000).toISOString(), cihaz: 'ios-pwa' };
  let nav = 0; s.on('load', () => nav++);
  await s.reload({ waitUntil: 'networkidle' }); nav = 0;
  await bekle(12000);
  T('A: boş cihazda açılış döngüsü yok (12 sn içinde en fazla 1 yeniden yükleme)', nav <= 1);
  T('A: bulut verisi indirildi (defter zeal)', (await s.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('yds-defter-v1') || '{}')))).includes('zeal'));
  await ctx.close();
}

// ---- B) İlk giriş, iki taraf dolu → sorulur, sessizce ezilmez
{
  const sunucu = { yedek: null, yazim: 0, yenile: 0 };
  const ctx = await b.newContext({ viewport: { width: 412, height: 860 } }); await kurulum(sunucu)(ctx);
  const s = await yeniSayfa(ctx);
  await s.goto(BASE, { waitUntil: 'networkidle' });
  await s.evaluate((a) => { localStorage.clear(); localStorage.setItem('yds-ayar-v1', JSON.stringify({ ...a, xp: 900, toplamAktivite: 60 })); localStorage.setItem('yds-defter-v1', JSON.stringify({ abandon: { en: 'abandon', tr: 'terk etmek' } })); localStorage.setItem('yds-hesap-v1', JSON.stringify({ eposta: 'a@b.co', kullanici: 'u-1', erisim: 'e', yenileme: 'y', bitis: Date.now() + 3e6, sonSenkron: 0 })); }, AYAR);
  sunucu.yedek = { veri: { uygulama: 'kelimetre', surum: 1, veri: { 'yds-ayar-v1': { ...AYAR, xp: 10 } } }, guncelleme: new Date(Date.now() - 3 * 86400000).toISOString(), cihaz: 'web' };
  await s.reload({ waitUntil: 'networkidle' }); await bekle(2500);
  const xp = await s.evaluate(() => JSON.parse(localStorage.getItem('yds-ayar-v1')).xp);
  T('B: çakışma sorusu açıldı (bulut yedeği sessizce yüklenmedi)', (await s.locator('#bsIndir').count()) === 1 && (await s.locator('#bsYukle').count()) === 1);
  T('B: yerel XP (900) korunuyor', xp === 900);
  await s.locator('#bsYukle').click(); await bekle(1200);
  T('B: "Bu cihazdakini kullan" buluta yazdı', sunucu.yazim === 1 && sunucu.yedek.veri.veri['yds-ayar-v1'].xp === 900);
  await ctx.close();
}

// ---- C) Çakışma penceresi kapatılınca 20 sn içinde bulut ezilmez
{
  const sunucu = { yedek: null, yazim: 0, yenile: 0 };
  const ctx = await b.newContext({ viewport: { width: 412, height: 860 } }); await kurulum(sunucu)(ctx);
  const s = await yeniSayfa(ctx);
  await s.goto(BASE, { waitUntil: 'networkidle' });
  await s.evaluate((a) => { localStorage.clear(); localStorage.setItem('yds-ayar-v1', JSON.stringify({ ...a, xp: 500 })); localStorage.setItem('yds-hesap-v1', JSON.stringify({ eposta: 'a@b.co', kullanici: 'u-1', erisim: 'e', yenileme: 'y', bitis: Date.now() + 3e6, sonSenkron: 1000, bekleyen: true })); }, AYAR);
  sunucu.yedek = { veri: { uygulama: 'kelimetre', surum: 1, veri: { 'yds-ayar-v1': { ...AYAR, xp: 77 } } }, guncelleme: new Date(Date.now() + 120000).toISOString(), cihaz: 'ios-pwa' };
  await s.reload({ waitUntil: 'networkidle' }); await bekle(2000);
  await s.mouse.click(5, 400); await bekle(300);   // perdeye tıkla: kapat
  await bekle(22000);
  T('C: kapatılan çakışmadan sonra 22 sn içinde buluta yazım yok', sunucu.yazim === 0 && sunucu.yedek.veri.veri['yds-ayar-v1'].xp === 77);
  await ctx.close();
}

// ---- D) Silinmiş yedek (bu cihaz daha önce eşitlemişti): oturum kapanır, yedek yeniden yazılmaz
{
  const sunucu = { yedek: null, yazim: 0, yenile: 0 };
  const ctx = await b.newContext({ viewport: { width: 412, height: 860 } }); await kurulum(sunucu)(ctx);
  const s = await yeniSayfa(ctx);
  await s.goto(BASE, { waitUntil: 'networkidle' });
  await s.evaluate((a) => { localStorage.clear(); localStorage.setItem('yds-ayar-v1', JSON.stringify({ ...a, xp: 200 })); localStorage.setItem('yds-hesap-v1', JSON.stringify({ eposta: 'a@b.co', kullanici: 'u-1', erisim: 'e', yenileme: 'y', bitis: Date.now() + 3e6, sonSenkron: 5000 })); }, AYAR);
  await s.reload({ waitUntil: 'networkidle' }); await bekle(2000);
  T('D: bulutta yedek yoksa oturum kapatıldı', await s.evaluate(() => localStorage.getItem('yds-hesap-v1') === null));
  T('D: silinen hesapta yerel veri kaldı, yedek yazılmadı', sunucu.yazim === 0 && (await s.evaluate(() => JSON.parse(localStorage.getItem('yds-ayar-v1')).xp)) === 200);
  await ctx.close();
}

// ---- E) Bozulmamış oturum açılışta sahte "bekleyen" işareti üretmez
{
  const sunucu = { yedek: null, yazim: 0, yenile: 0 };
  const ctx = await b.newContext({ viewport: { width: 412, height: 860 } }); await kurulum(sunucu)(ctx);
  const s = await yeniSayfa(ctx);
  await s.goto(BASE, { waitUntil: 'networkidle' });
  await s.evaluate((a) => { localStorage.clear(); localStorage.setItem('yds-ayar-v1', JSON.stringify(a)); localStorage.setItem('yds-hesap-v1', JSON.stringify({ eposta: 'a@b.co', kullanici: 'u-1', erisim: 'e', yenileme: 'y', bitis: Date.now() + 3e6, sonSenkron: Date.now() })); }, AYAR);
  sunucu.yedek = { veri: { uygulama: 'kelimetre', surum: 1, veri: { 'yds-ayar-v1': { ...AYAR, xp: 1 } } }, guncelleme: new Date(Date.now() - 60000).toISOString(), cihaz: 'web' };
  await s.reload({ waitUntil: 'networkidle' }); await bekle(2500);
  const h = await s.evaluate(() => JSON.parse(localStorage.getItem('yds-hesap-v1')));
  T('E: değişiklik yokken açılış "bekleyen" işaretlemiyor', !h.bekleyen);
  await ctx.close();
}

// ---- F) Erişim belirteci yenilemesi: yenileme sırasında eski kopya yazılmaz (sekmeler arası)
{
  const sunucu = { yedek: null, yazim: 0, yenile: 0 };
  const ctx = await b.newContext({ viewport: { width: 412, height: 860 } }); await kurulum(sunucu)(ctx);
  const s = await yeniSayfa(ctx);
  await s.goto(BASE, { waitUntil: 'networkidle' });
  await s.evaluate((a) => { localStorage.clear(); localStorage.setItem('yds-ayar-v1', JSON.stringify(a)); localStorage.setItem('yds-hesap-v1', JSON.stringify({ eposta: 'a@b.co', kullanici: 'u-1', erisim: 'eski', yenileme: 'y', bitis: Date.now() - 1000, sonSenkron: Date.now() })); }, AYAR);
  sunucu.yedek = { veri: { uygulama: 'kelimetre', surum: 1, veri: { 'yds-ayar-v1': { ...AYAR, xp: 1 } } }, guncelleme: new Date(Date.now() - 60000).toISOString(), cihaz: 'web' };
  await s.reload({ waitUntil: 'networkidle' }); await bekle(1500);
  await s.evaluate(() => { localStorage.setItem('yds-ayar-v1', JSON.stringify({ girisGoruldu: true, xp: 42 })); });
  await s.evaluate(() => window.__bulut.hemenYaz());
  await bekle(800);
  const h = await s.evaluate(() => JSON.parse(localStorage.getItem('yds-hesap-v1')));
  T('F: süresi dolmuş belirteç yenilenmiş (yenile isteği ≥ 1)', sunucu.yenile >= 1);
  T('F: yenilenen belirteç saklanmış (eski belirteç geri yazılmamış)', h.erisim === 'e2' && h.yenileme === 'y2');
  await ctx.close();
}

console.log('\nSONUÇ:', sonuc.filter(Boolean).length + '/' + sonuc.length, 'geçti');
console.log('HATALAR:', hata.length ? hata : 'yok');
await b.close();
