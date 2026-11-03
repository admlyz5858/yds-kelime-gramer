const BASE = process.env.BASE || 'http://localhost:8905/';   // uygulama adresi (ör. BASE=http://localhost:8901/ npm)
const { chromium } = await import(new URL('../mobil/node_modules/playwright/index.mjs', import.meta.url));
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const s = await (await b.newContext({ viewport: { width: 412, height: 860 } })).newPage();
const hata = []; s.on('pageerror', e => hata.push(e.message));
await s.goto('' + BASE + '', { waitUntil: 'networkidle' });
await s.evaluate(() => { localStorage.clear(); localStorage.setItem('yds-ayar-v1', JSON.stringify({ girisGoruldu: true, kayitSoruldu: true, toplamAktivite: 40, ipucuGoruldu: { bugun:1,kelimeler:1,mufredat:1,oyun:1,ben:1 } })); });
await s.reload({ waitUntil: 'networkidle' }); await s.waitForTimeout(600);
const kapat = s.locator('#pBulutKapat');
console.log('bulut kartı kapat düğmesi:', await kapat.count());
if (await kapat.count()) { await kapat.click(); await s.waitForTimeout(500); }
console.log('kart kapandı:', (await s.locator('#pBulut').count()) === 0, '| hata:', hata.length ? hata : 'yok');
await b.close();
