const BASE = process.env.BASE || 'http://localhost:8905/';   // uygulama adresi (ör. BASE=http://localhost:8901/ npm)
const { chromium } = await import(new URL('../mobil/node_modules/playwright/index.mjs', import.meta.url));
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await b.newContext({ viewport: { width: 412, height: 860 }, timezoneId: 'Europe/Istanbul', colorScheme: 'dark' });
const s = await ctx.newPage(); const hata = []; s.on('pageerror', e => hata.push(e.message));
await s.clock.setFixedTime(new Date('2026-11-03T02:30:00+03:00'));
await s.goto('' + BASE + '', { waitUntil: 'networkidle' });
await s.evaluate(() => { localStorage.clear(); localStorage.setItem('yds-ayar-v1', JSON.stringify({ girisGoruldu: true, kayitSoruldu: true, ipucuGoruldu: { bugun:1,kelimeler:1,mufredat:1,oyun:1,ben:1 }, sonGunKelime: '' })); });
await s.reload({ waitUntil: 'networkidle' }); await s.waitForTimeout(600);
// A) SRS: Kart modunda Kolay → vade yerel yarın olmalı
await s.locator('#sekme-bar button[data-sekme="kelimeler"]').click(); await s.waitForTimeout(600);
await s.locator('.segment button[data-seg="ogren"]').click(); await s.waitForTimeout(400);
await s.locator('.ogr-mod-cip', { hasText: 'Kart' }).click(); await s.waitForTimeout(300);
await s.locator('#ogrBasla').click(); await s.waitForTimeout(800);
await s.locator('#ogrGoster').click().catch(()=>{}); await s.waitForTimeout(300);
await s.locator('.ogr-d-btn.kolay').click(); await s.waitForTimeout(400);
for (let k = 0; k < 5 && (await s.locator('#geri:visible').count()); k++) { await s.locator('#geri').click(); await s.waitForTimeout(400); }
const fark = await s.evaluate(() => {
  const k = JSON.parse(localStorage.getItem('yds-srs-v1')).kartlar; const c = Object.values(k)[0];
  const d = new Date(); const bugun = Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
  return { vade: c.d - bugun, aralik: c.i };
});
console.log('A) Kolay sonrası vade (yerel gün farkı):', fark, fark.vade === fark.aralik ? '✓' : '✗');
// B) gün detayı açmak sıradaki günü değiştirmez
await s.locator('#sekme-bar button[data-sekme="kelimeler"]').click(); await s.waitForTimeout(500);
await s.locator('.segment button[data-seg="gunler"]').click(); await s.waitForTimeout(700);
const once = await s.evaluate(() => JSON.parse(localStorage.getItem('yds-ayar-v1')).sonGunKelime || '');
const tile = s.locator('button.gp-kart[data-g="50"]');
console.log('   gün 50 düğmesi sayısı:', await tile.count());
if (await tile.count()) { await tile.click(); await s.waitForTimeout(700); }
for (let k = 0; k < 4 && (await s.locator('#geri:visible').count()); k++) { await s.locator('#geri').click(); await s.waitForTimeout(400); }
const sonra = await s.evaluate(() => JSON.parse(localStorage.getItem('yds-ayar-v1')).sonGunKelime || '');
console.log('B) gün 50 açıldı, sonGun değişmedi:', once === sonra, '| değer:', JSON.stringify(sonra));
// C) koyu tema düğme kontrastı
await s.locator('#sekme-bar button[data-sekme="bugun"]').click(); await s.waitForTimeout(500);
await s.locator('.segment button[data-seg="gunler"]').click().catch(()=>{}); await s.waitForTimeout(300);
const renk = await s.evaluate(() => { const b = document.querySelector('button.aksiyon, button.gp-hero-btn, button.gp-hero-govde'); return b ? getComputedStyle(b).color : 'buton yok'; });
const kart = await s.evaluate(() => { const b = document.createElement('button'); b.className='aksiyon'; document.body.appendChild(b); const c = getComputedStyle(b).color; b.remove(); return c; });
console.log('C) koyu tema aksiyon yazı rengi:', kart, '| örnek düğme:', renk);
await s.locator('#sekme-bar button[data-sekme="bugun"]').click().catch(()=>{}); await s.waitForTimeout(500);
console.log('B2) Bugün sıradaki gün:', (await s.locator('.gp-hero-bas').first().textContent().catch(()=>'hero yok')));
for (const sel of ['.gp-hero-btn', '#ogrBasla', '.ogr-basla']) { const n = await s.locator(sel).count(); if (n) console.log('  ', sel, await s.evaluate((q) => { const e = document.querySelector(q); return getComputedStyle(e).color + ' / ' + getComputedStyle(e).backgroundColor; }, sel)); }
console.log('HATALAR:', hata.length ? hata : 'yok');
await b.close();
