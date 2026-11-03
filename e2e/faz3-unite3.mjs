const BASE = process.env.BASE || 'http://localhost:8905/';   // uygulama adresi (ör. BASE=http://localhost:8901/ npm)
const { chromium } = await import(new URL('../mobil/node_modules/playwright/index.mjs', import.meta.url));
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const s = await (await b.newContext({ viewport: { width: 412, height: 860 } })).newPage();
const hata = []; s.on('pageerror', e => hata.push(e.message));
await s.goto('' + BASE + '', { waitUntil: 'networkidle' });
await s.evaluate(() => { localStorage.clear(); localStorage.setItem('yds-ayar-v1', JSON.stringify({ girisGoruldu: true, kayitSoruldu: true, ipucuGoruldu: { bugun:1,kelimeler:1,mufredat:1,oyun:1,ben:1 } })); });
await s.reload({ waitUntil: 'networkidle' }); await s.waitForTimeout(500);
await s.locator('#sekme-bar button[data-sekme="mufredat"]').click(); await s.waitForTimeout(600);
const u3 = s.locator('text=Present Tenses').first();
console.log('Ünite 3 kartı:', await u3.count());
await u3.click(); await s.waitForTimeout(700);
console.log('alt metin:', (await s.locator('#icerik').innerText()).slice(0, 180).replace(/\n/g,' | '));
await s.locator('button', { hasText: 'Test' }).filter({ hasText: '🧠' }).first().click(); await s.waitForTimeout(600);
const testBtn = s.locator('.test-link').first();
console.log('test sayısı:', await s.locator('.test-link').count());
if (await testBtn.count()) { await testBtn.click(); await s.waitForTimeout(600); }
for (let i = 0; i < 3; i++) { const sik = s.locator('.q-secenek').first(); if (await sik.count()) { await sik.click(); await s.waitForTimeout(250); const d = s.locator('.btn-satir button').filter({ hasText: /Devam|Sonraki|Sonuç/ }).first(); if (await d.count()) { await d.click(); await s.waitForTimeout(300); } } }
const cevapsiz = await s.locator('.q-secenek').count();
console.log('soru ekranı şık sayısı:', cevapsiz, '| sayfa hatası:', hata.length ? hata : 'yok');
await b.close();
