// mobil/store/ekran-goruntu.mjs — gerçek uygulamadan telefon ekran görüntüleri çeker.
// Playwright (chromium) ile http://localhost:8100 (www/ statik sunucu) gezilir.
// Çıktı: cikti/01-karsilama.png ... savunmacı: bir adım patlarsa atlar.
import { chromium, devices } from 'playwright';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, 'cikti');
mkdirSync(out, { recursive: true });
const BASE = process.env.BASE_URL || 'http://localhost:8100';

const browser = await chromium.launch();
const context = await browser.newContext({ ...devices['Pixel 5'] });
const page = await context.newPage();

const cek = async (ad) => { await page.screenshot({ path: join(out, ad) }); console.log('çekildi:', ad); };
const bekle = (ms) => page.waitForTimeout(ms);
const guvenli = async (etiket, fn) => { try { await fn(); } catch (e) { console.log('ATLANDI', etiket, '-', e.message); } };

await page.goto(BASE, { waitUntil: 'networkidle' });
await bekle(1200);

// 1) Karşılama (giriş) ekranı
await guvenli('karsilama', async () => {
  await page.waitForSelector('.giris-katman', { timeout: 4000 });
  await cek('01-karsilama.png');
});

// 2) Ana sayfa (giriş kapanır)
await guvenli('ana', async () => {
  const btn = page.locator('#girisBasla');
  if (await btn.count()) { await btn.click(); await bekle(900); }
  await cek('02-ana-sayfa.png');
});

// 3) Müfredat çekmecesi (premium kilitler görünür)
await guvenli('cekmece', async () => {
  await page.locator('#menuBtn').click();
  await page.waitForSelector('.cek-ders', { timeout: 4000 });
  await bekle(700);
  await cek('03-uniteler-premium.png');
});

// 4) Ünite 1 — kelime kartı
await guvenli('kelime', async () => {
  await page.locator('.cek-ders[data-id="1"]').click();
  await bekle(1300);
  await cek('04-kelime-kart.png');
});

// 5) Test ekranı
await guvenli('quiz', async () => {
  const q = page.locator('#alt-menu button[data-ekran="quiz"]');
  if (await q.count()) { await q.click(); await bekle(1100); await cek('05-test.png'); }
});

// 6) Oku / konu ekranı
await guvenli('oku', async () => {
  const o = page.locator('#alt-menu button[data-ekran="oku"]');
  if (await o.count()) { await o.click(); await bekle(1100); await cek('06-oku.png'); }
});

await browser.close();
console.log('Ekran görüntüleri tamam.');
