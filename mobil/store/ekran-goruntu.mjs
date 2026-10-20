// mobil/store/ekran-goruntu.mjs — gerçek uygulamadan telefon ekran görüntüleri çeker (Play: 1080×2160, oran 2:1).
// Playwright (chromium) ile BASE_URL (www/ statik sunucu) gezilir. Çıktı: cikti/01-*.png … bir adım patlarsa atlanır.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, 'cikti');
mkdirSync(out, { recursive: true });
const BASE = process.env.BASE_URL || 'http://localhost:8100';

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const context = await browser.newContext({ viewport: { width: 400, height: 800 }, deviceScaleFactor: 2.7, isMobile: true, hasTouch: true });
const page = await context.newPage();

const cek = async (ad) => { await page.screenshot({ path: join(out, ad) }); console.log('çekildi:', ad); };
const bekle = (ms) => page.waitForTimeout(ms);
const guvenli = async (etiket, fn) => { try { await fn(); } catch (e) { console.log('ATLANDI', etiket, '-', e.message); } };
const anaSayfa = async () => { for (let i = 0; i < 3 && await page.locator('#geri:not([hidden])').count(); i++) { await page.locator('#geri').click(); await bekle(350); } };
const eslestirHepsi = async (yanlisIlk) => {
  const n = await page.locator('.es-en').count();
  if (yanlisIlk) { await page.locator('.es-en[data-i="0"]').click(); await page.locator('.es-tr[data-i="1"]').click(); await bekle(500); }
  for (let i = 0; i < n; i++) { await page.locator(`.es-en[data-i="${i}"]`).click(); await page.locator(`.es-tr[data-i="${i}"]`).click(); await bekle(60); }
};

await page.goto(BASE, { waitUntil: 'networkidle' });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: 'networkidle' });
await bekle(900);

// 1) Karşılama
await guvenli('karsilama', async () => { await page.waitForSelector('.giris-katman', { timeout: 4000 }); await cek('01-karsilama.png'); });

// Biraz "yaşanmış" bir ana sayfa için küçük ilerleme üret (seri, XP, öğrenilen)
await guvenli('ana', async () => {
  const btn = page.locator('#girisBasla'); if (await btn.count()) { await btn.click(); await bekle(900); }
  await page.evaluate(() => {
    const a = JSON.parse(localStorage.getItem('yds-ayar-v1') || '{}');
    const bugun = new Date(); const iso = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    const log = {}; for (let i = 0; i < 40; i++) { const d = new Date(bugun); d.setDate(d.getDate() - i); if (i % 3 !== 2) log[iso(d)] = 8 + (i * 7) % 30; }
    Object.assign(a, { seri: 6, sonAktif: iso(bugun), gunTarih: iso(bugun), gunSayac: 14, gunDogru: 9, xp: 760, gunlog: log, hedef: 20, sinavTarih: '2027-03-21' });
    localStorage.setItem('yds-ayar-v1', JSON.stringify(a));
  });
  await page.reload({ waitUntil: 'networkidle' }); await bekle(900);
  await cek('02-bugun.png');
});

const sekme = async (ad) => { await page.locator(`#sekme-bar button[data-sekme="${ad}"]`).click(); await bekle(800); };

// 3) Kelimeler — tek sözlük, seviye/tür çipleri
await guvenli('kelimeler', async () => {
  await sekme('kelimeler');
  await page.locator('.sz-cip[data-sv="2"]').click(); await bekle(500);
  await cek('03-kelimeler.png');
  await page.locator('.sz-satir').nth(2).click(); await bekle(600);
  await cek('04-kelime-detay.png');
  await page.locator('#geri').click(); await bekle(400);
});

// 5) Kelime Akışı (Reels tarzı) — anlam açık
await guvenli('akis', async () => {
  await sekme('bugun');
  await page.locator('#pAkis').click(); await bekle(1200);
  const k = page.locator('#akisKaris'); if (await k.count()) { await k.click(); await bekle(900); }
  await page.locator('.akis-kart').first().locator('.akis-govde').click(); await bekle(400);
  await cek('05-kelime-akisi.png');
  await page.locator('#geri').click(); await bekle(500);
});

// 6) Eşleştirme oyunu — süreli seviye, birkaç eşleşme yapılmış
await guvenli('eslestirme', async () => {
  await sekme('oyun');
  await page.locator('.es-bolum[data-k="0"]').click(); await bekle(500);
  await eslestirHepsi(false); await bekle(500);                 // S1
  await page.locator('#esDevamSv').click(); await bekle(400);
  await eslestirHepsi(false); await bekle(500);                 // S2
  await page.locator('#esDevamSv').click(); await bekle(500);   // S3 (60 sn)
  for (let i = 0; i < 4; i++) { await page.locator(`.es-en[data-i="${i}"]`).click(); await page.locator(`.es-tr[data-i="${i}"]`).click(); await bekle(80); }
  await page.locator('.es-en[data-i="6"]').click(); await bekle(200);
  await cek('06-eslestirme.png');
  for (let i = 4; i < 10; i++) { await page.locator(`.es-en[data-i="${i}"]`).click(); await page.locator(`.es-tr[data-i="${i}"]`).click(); await bekle(60); }
  await bekle(500); await cek('07-eslestirme-sonuc.png');
  await page.locator('#esCik').click(); await bekle(400);
});

// 8) Kelime Öğren (aralıklı tekrar) paneli
await guvenli('ogren', async () => {
  await sekme('kelimeler');
  await page.locator('.segment button[data-seg="ogren"]').click(); await bekle(1200);
  await cek('08-kelime-ogren.png');
});

// 9) Müfredat, 10) Oku (edat kartı), 11) Alıştırma, 12) Test
await guvenli('unite', async () => {
  await sekme('mufredat');
  await cek('09-mufredat.png');
  await page.locator('.mf-kart[data-id="2"]').click(); await bekle(1200);
  const b = page.locator('.bolum-link').nth(1); if (await b.count()) { await b.click(); await bekle(800); }
  await cek('10-oku-edat.png');
  await page.locator('#bolumGeri').click(); await bekle(400);
  await page.locator('.segment button[data-seg="alistirma"]').click(); await bekle(800);
  await page.locator('.al-tur').first().click(); await bekle(600);
  await page.locator('.q-secenek').first().click(); await bekle(500);
  await cek('11-alistirma.png');
  await page.locator('#alGeri').click(); await bekle(400);
  await page.locator('.segment button[data-seg="test"]').click(); await bekle(900);
  const t = page.locator('.test-link').first(); if (await t.count()) { await t.click(); await bekle(700); }
  await cek('12-test.png');
});

// 13) Ben — ilerleme
await guvenli('ben', async () => { const g = page.locator('#geri:not([hidden])'); if (await g.count()) { await g.click(); await bekle(500); } await sekme('ben'); await cek('13-ben.png'); });

await browser.close();
console.log('Ekran görüntüleri tamam.');
