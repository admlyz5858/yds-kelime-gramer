const BASE = process.env.BASE || 'http://localhost:8905/';   // uygulama adresi (ör. BASE=http://localhost:8901/ npm)
const { chromium } = await import(new URL('../mobil/node_modules/playwright/index.mjs', import.meta.url));
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const s = await (await b.newContext({ viewport: { width: 412, height: 860 } })).newPage();
const hata = []; s.on('pageerror', e => hata.push(e.message)); s.on('dialog', d => d.accept());
await s.goto('' + BASE + '', { waitUntil: 'networkidle' });
await s.evaluate(() => { localStorage.clear();
  localStorage.setItem('yds-ayar-v1', JSON.stringify({ girisGoruldu: true, kayitSoruldu: true, tema: 'koyu', hedef: 30, seri: 5, gunlog: { '2026-01-01': 4 }, xp: 300, ipucuGoruldu: { bugun: 1 } }));
  localStorage.setItem('yds-defter-v1', JSON.stringify({ abandon: { en: 'abandon', tr: 'terk etmek' } }));
  localStorage.setItem('yds-ozel-v1', JSON.stringify([{ en: 'zyxq', tr: 'deneme', tur: 'İsim', t: 1 }]));
  localStorage.setItem('yds-not-v1', JSON.stringify({ zyxq: 'ipucu' }));
  localStorage.setItem('yds-srs-v1', JSON.stringify({ surum: 1, kartlar: { abandon: { b: 3, e: 2.5, i: 25, d: 1, r: 4, l: 0 } }, gun: {}, gec: [], ayar: {} })); });
await s.reload({ waitUntil: 'networkidle' }); await s.waitForTimeout(500);
await s.locator('#sekme-bar button[data-sekme="ben"]').click(); await s.waitForTimeout(500);
await s.locator('.ayar-sat[data-is="hepsi"]').click(); await s.waitForTimeout(300);
await s.locator('#onayEvet').click(); await s.waitForTimeout(2000);
const d = await s.evaluate(() => ({
  defter: Object.keys(JSON.parse(localStorage.getItem('yds-defter-v1') || '{}')).length,
  srs: Object.keys((JSON.parse(localStorage.getItem('yds-srs-v1') || '{}')).kartlar || {}).length,
  ayar: JSON.parse(localStorage.getItem('yds-ayar-v1')),
  ozel: JSON.parse(localStorage.getItem('yds-ozel-v1') || '[]').length,
  not: Object.keys(JSON.parse(localStorage.getItem('yds-not-v1') || '{}')).length }));
console.log('defter:', d.defter, '(0 beklenir) | srs kartları:', d.srs, '(0) | seri:', d.ayar.seri, '(yok) | xp:', d.ayar.xp, '(yok) | tema:', d.ayar.tema, '(koyu) | hedef:', d.ayar.hedef, '(30) | özel:', d.ozel, '(1) | not:', d.not, '(1)');
console.log('HATALAR:', hata.length ? hata : 'yok');
await b.close();
