import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const { chromium } = await import(new URL('../mobil/node_modules/playwright/index.mjs', import.meta.url));
const AXE = process.env.AXE;
const BASE = process.env.BASE || 'http://localhost:8905/';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] }).catch(() => chromium.launch());
const sonuc = {};
for (const tema of ['light', 'dark']) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, colorScheme: tema === 'dark' ? 'dark' : 'light' });
  const s = await ctx.newPage();
  await s.goto(BASE, { waitUntil: 'networkidle' });
  await s.evaluate((t) => {
    localStorage.clear();
    localStorage.setItem('yds-ayar-v1', JSON.stringify({ girisGoruldu: true, tema: t === 'dark' ? 'koyu' : 'acik', ipucuGoruldu: { bugun: 1, kelimeler: 1, mufredat: 1, oyun: 1, ben: 1 }, hedef: 20 }));
  }, tema);
  await s.reload({ waitUntil: 'networkidle' }); await s.waitForTimeout(800);
  await s.addScriptTag({ content: readFileSync(AXE, 'utf8') });
  const ekranlar = ['Bugün', 'Kelimeler', 'Müfredat', 'Oyun', 'Ben'];
  for (const e of ekranlar) {
    const btn = s.locator('button', { hasText: e }).first();
    if (await btn.count()) { await btn.click().catch(() => {}); await s.waitForTimeout(700); }
    const r = await s.evaluate(async () => {
      const x = await window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'best-practice'] });
      return x.violations.map(v => ({ id: v.id, impact: v.impact, n: v.nodes.length, ornek: (v.nodes[0]?.target || []).join(' ').slice(0, 80), html: (v.nodes[0]?.html || '').slice(0, 100) }));
    });
    for (const v of r) { const k = v.id; sonuc[k] = sonuc[k] || { impact: v.impact, ekranlar: {} }; sonuc[k].ekranlar[`${tema}:${e}`] = v.n; sonuc[k].ornek = sonuc[k].ornek || v.html; }
  }
  await ctx.close();
}
console.log(JSON.stringify(sonuc, null, 1));
await b.close();
