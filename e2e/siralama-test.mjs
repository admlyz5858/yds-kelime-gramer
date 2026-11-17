// Misafir sıralaması — Supabase RPC'leri sahte sunucuyla (ctx.route) taklit edilir
const BASE = process.env.BASE || 'http://localhost:8905/';   // uygulama adresi
const { chromium } = await import(new URL('../mobil/node_modules/playwright/index.mjs', import.meta.url));
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
const ctx = await b.newContext({ viewport: { width: 360, height: 780 } });
const s = await ctx.newPage();
const hata = []; s.on('pageerror', e => hata.push(e.message));
let say = 0, bas = 0;
const T = (ad, ok) => { say++; if (!ok) bas++; console.log((ok ? '✓ ' : '✗ FAIL ') + ad); };
const bekle = (ms) => s.waitForTimeout(ms);
const sek = async (ad) => { await s.locator(`#sekme-bar button[data-sekme="${ad}"]`).click(); await bekle(700); };

// ---- sahte sunucu: oyuncular ve skorlar bellekte
const sunucu = { oyuncu: null, ad: 'Çevik Tilki 42', skorlar: [], cevrimdisi: false, cikti: 0, kayit: 0 };
await ctx.route('https://thftjeecotladgnuqwhd.supabase.co/**', async (route) => {
  const r = route.request(), u = new URL(r.url());
  if (sunucu.cevrimdisi) return route.abort('internetdisconnected');
  const g = r.postData() ? JSON.parse(r.postData()) : {};
  const j = (v) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(v) });
  switch (u.pathname) {
    case '/rest/v1/rpc/oyuncu_kaydet': sunucu.kayit++; sunucu.oyuncu = g.p_anahtar; return j(sunucu.ad);
    case '/rest/v1/rpc/ad_yenile': sunucu.ad = 'Zeki Yunus 70'; return j(sunucu.ad);
    case '/rest/v1/rpc/skor_gonder': if (g.p_anahtar !== sunucu.oyuncu) return j(false); sunucu.skorlar.push([g.p_oyun, g.p_puan]); return j(true);
    case '/rest/v1/rpc/siralama': {
      const ben = sunucu.skorlar.filter(([o]) => g.p_donem === 'hafta' || o === 'gunluk').reduce((t, [, p]) => t + p, 0);
      const satir = [{ sira: 1, ad: 'Sakin Panda 17', puan: 9999, ben: false }];
      const var_mi = sunucu.skorlar.some(([o]) => g.p_donem === 'hafta' || o === 'gunluk');   // gerçek sunucu gibi 0 puan da sayılır
      if (g.p_anahtar && g.p_anahtar === sunucu.oyuncu && var_mi) satir.push({ sira: 2, ad: sunucu.ad, puan: ben, ben: true });
      return j(satir.map(x => ({ ...x, toplam: satir.length })));
    }
    case '/rest/v1/rpc/siralamadan_cik': sunucu.cikti++; sunucu.oyuncu = null; sunucu.skorlar = []; return j(null);
    default: return route.fulfill({ status: 404, body: '' });
  }
});

await s.goto(BASE, { waitUntil: 'networkidle' });
await s.evaluate(() => { localStorage.clear(); localStorage.setItem('yds-ayar-v1', JSON.stringify({ girisGoruldu: true, kayitSoruldu: true, ipucuGoruldu: { bugun: 1, kelimeler: 1, mufredat: 1, oyun: 1, ben: 1 } })); });
await s.reload({ waitUntil: 'networkidle' }); await bekle(3000);
T('oyun oynamayan kullanıcı sunucuya kaydedilmez', sunucu.kayit === 0);

// ---- Oyun sekmesinde Sıralama segmenti (360 px'te taşmadan)
await sek('oyun');
const seg = await s.locator('.segment[data-alan="oyun"] button').allInnerTexts();
T('Oyun: 4 segment, sonuncusu Sıralama', seg.length === 4 && /Sıralama/.test(seg[3]));
const tasma = await s.evaluate(() => { const e = document.querySelector('.segment[data-alan="oyun"]'); return e.scrollWidth > e.clientWidth + 1 || document.documentElement.scrollWidth > window.innerWidth + 1; });
T('360 px genişlikte segment çubuğu taşmıyor', !tasma);

// ---- Harf Avı turu → skor gönderilir
await s.locator('.segment[data-alan="oyun"] button[data-seg="av"]').click(); await bekle(800);
await s.locator('.og-sev[data-sev="kolay"]').click(); await bekle(300);
for (let k = 0; k < 5; k++) {
  for (const h of 'etaoinsrhldcumfpgwybvkxjqz') { if (await s.locator('.og-sonuc').count()) break; const t = s.locator(`.og-tus[data-h="${h}"]:not([disabled])`); if (await t.count()) { await t.click(); await bekle(30); } }
  await s.locator('#ogSonraki').click(); await bekle(200);
}
await bekle(800);
const puan = await s.evaluate(() => JSON.parse(localStorage.getItem('yds-oyunlar-v1')).av.kolay.en);
T('tur bitince kayıt ve skor gönderildi (oyun av, doğru puan)', sunucu.kayit === 1 && sunucu.skorlar.length === 1 && sunucu.skorlar[0][0] === 'av' && sunucu.skorlar[0][1] === puan);
T('anahtar cihazda saklandı, ad alındı, kuyruk boş', await s.evaluate(() => { const d = JSON.parse(localStorage.getItem('yds-siralama-v1')); return /^[0-9a-f]{48}$/.test(d.anahtar) && d.ad === 'Çevik Tilki 42' && d.bekleyen.length === 0; }));

// ---- Sıralama ekranı
await s.locator('#ogSira').click(); await bekle(900);
T('sonuç ekranından sıralamaya geçildi; misafir adı görünüyor', (await s.locator('#srAd').innerText()) === 'Çevik Tilki 42');
T('Bugün: yalnızca Günün Eşleştirmesi sayılır (henüz oynanmadı → kendi satırı yok)', (await s.locator('.sr-satir').count()) === 1 && (await s.locator('.sr-satir.ben').count()) === 0);
await s.locator('.sr-donem .sz-cip[data-d="hafta"]').click(); await bekle(800);
T('Bu hafta: kendi satırı vurgulu ve puanı doğru', (await s.locator('.sr-satir.ben').count()) === 1 && (await s.locator('.sr-satir.ben b').innerText()) === String(puan));
T('ilk üçte madalya', (await s.locator('.sr-satir .sr-sira').first().innerText()) === '🥇');
await s.locator('#srAdYenile').click(); await bekle(800);
T('yeni ad çekildi', (await s.locator('#srAd').innerText()) === 'Zeki Yunus 70');

// ---- Çevrimdışı: skor kuyrukta bekler, açılışta gönderilir
sunucu.cevrimdisi = true;
await s.locator('.segment[data-alan="oyun"] button[data-seg="karisik"]').click(); await bekle(700);
await s.locator('.og-sev[data-sev="kolay"]').click(); await bekle(300);
for (let k = 0; k < 5; k++) { for (let n = 0; n < 12 && !(await s.locator('.og-sonuc').count()); n++) { await s.locator('#ogIpucu').click(); await bekle(30); } await s.locator('#ogSonraki').click(); await bekle(200); }
await bekle(600);
T('çevrimdışı: oyun bitti, skor kuyrukta', (await s.locator('.es-sonuc').count()) === 1 && await s.evaluate(() => JSON.parse(localStorage.getItem('yds-siralama-v1')).bekleyen.length === 1));
sunucu.cevrimdisi = false;
await s.reload({ waitUntil: 'networkidle' }); await bekle(3500);
T('bağlantı gelince bekleyen skor gönderildi', sunucu.skorlar.length === 2 && sunucu.skorlar[1][0] === 'karisik' && await s.evaluate(() => JSON.parse(localStorage.getItem('yds-siralama-v1')).bekleyen.length === 0));

// ---- Ben › Sıralama: çık ve yeniden katıl
await sek('ben');
T('Ben: sıralama satırı misafir adını gösteriyor', /Zeki Yunus 70/.test(await s.locator('.ayar-sat[data-is="siralama"]').innerText()));
await s.locator('.ayar-sat[data-is="siralama"]').click(); await bekle(300);
await s.locator('#onayEvet').click(); await bekle(800);
T('çıkış: sunucuda silindi, yerelde kapalı', sunucu.cikti === 1 && await s.evaluate(() => JSON.parse(localStorage.getItem('yds-siralama-v1')).kapali === true));
await sek('oyun'); await s.locator('.segment[data-alan="oyun"] button[data-seg="sira"]').click(); await bekle(600);
T('kapalıyken Sıralama ekranı katılma düğmesi gösterir', (await s.locator('#srKatil').count()) === 1);
await s.locator('#srKatil').click(); await bekle(900);
T('yeniden katılınca yeni kayıt ve liste', sunucu.kayit === 2 && (await s.locator('#srAd').count()) === 1);

T('sayfa hatası yok', hata.length === 0);
if (hata.length) console.log(hata.join('\n'));
console.log(`SONUÇ: ${say - bas}/${say} geçti`);
console.log('HATALAR:', hata.length ? hata : 'yok');
await b.close();
process.exit(bas ? 1 : 0);
