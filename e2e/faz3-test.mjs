const BASE = process.env.BASE || 'http://localhost:8905/';   // uygulama adresi (ör. BASE=http://localhost:8901/ npm)
const { chromium } = await import(new URL('../mobil/node_modules/playwright/index.mjs', import.meta.url));
const SCRATCH = process.env.SHOT_DIR || '/tmp';   // ekran görüntüleri
const hata = [];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await b.newContext({ viewport: { width: 412, height: 860 }, deviceScaleFactor: 2, hasTouch: true, colorScheme: 'dark' });
const s = await ctx.newPage();
s.on('pageerror', e => hata.push('SAYFA: ' + e.message));
s.on('console', m => { if (m.type() === 'error' && !m.text().includes('404')) hata.push('KONSOL: ' + m.text()); });
const bekle = (ms) => s.waitForTimeout(ms);
const T = async (ad, kosul) => console.log((kosul ? '✓' : '✗ FAIL'), ad);
const sek = async (ad) => { await s.locator(`#sekme-bar button[data-sekme="${ad}"]`).click(); await bekle(700); if (ad === 'kelimeler') { await s.locator('.segment button[data-seg="liste"]').click().catch(()=>{}); await bekle(400); } };
const tema = () => s.evaluate(() => document.documentElement.dataset.tema);
await s.goto('' + BASE + '', { waitUntil: 'networkidle' });
await s.evaluate(() => { localStorage.clear(); localStorage.setItem('yds-ayar-v1', JSON.stringify({ girisGoruldu: true, kayitSoruldu: true })); });
await s.reload({ waitUntil: 'networkidle' }); await bekle(900);
// tema: sistem (koyu emülasyonu)
T('sistem teması cihazı izliyor (koyu)', (await tema()) === 'koyu');
T('Bugün ipucu görünür', (await s.locator('.ipucu[data-sekme="bugun"]').count()) === 1);
await s.locator('.ipucu-kapat').click(); await bekle(200);
await sek('kelimeler'); await sek('bugun');
T('ipucu kapatılınca bir daha gelmez', (await s.locator('.ipucu[data-sekme="bugun"]').count()) === 0);
await sek('kelimeler');
T('Kelimeler ipucu var', (await s.locator('.ipucu[data-sekme="kelimeler"]').count()) === 1);
await s.locator('.ipucu-kapat').click(); await bekle(200);
await s.locator('.sz-cip[data-sv="2"]').click(); await bekle(400);
T('filtre sonrası ipucu geri gelmiyor', (await s.locator('.ipucu').count()) === 0);
// Ben: tema döngüsü
await sek('ben');
await s.locator('.ayar-sat[data-is="tema"]').click(); await bekle(300);
T('tema → açık', (await tema()) === 'acik' && (await s.locator('.ayar-sat[data-is="tema"] b').textContent()).includes('Açık'));
await s.locator('.ayar-sat[data-is="tema"]').click(); await bekle(300);
T('tema → koyu', (await tema()) === 'koyu');
await s.locator('.ayar-sat[data-is="tema"]').click(); await bekle(300);
T('tema → sistem', (await s.locator('.ayar-sat[data-is="tema"] b').textContent()).includes('Sistem'));
// test konu etiketleri
await sek('mufredat'); await s.locator('.mf-kart[data-id="2"]').click(); await bekle(900);
await s.locator('.segment button[data-seg="test"]').click(); await bekle(500);
const konular = await s.locator('.test-konu').allTextContents(); console.log('   edat test etiketleri:', konular.slice(0, 4).join(' | '));
T('test konu etiketleri var', konular.length === 10 && konular.every(k => k.length > 0));
await s.locator('#geri').click(); await bekle(500);
await s.locator('.mf-kart[data-id="7"]').click(); await bekle(900);
await s.locator('.segment button[data-seg="test"]').click(); await bekle(500);
console.log('   modal test etiketleri:', (await s.locator('.test-konu').allTextContents()).slice(0, 4).join(' | '));
await s.locator('#geri').click(); await bekle(500);
// Öğren oturumu: üst Geri, kaydırma, devam kaydı
await sek('kelimeler'); await s.locator('.segment button[data-seg="ogren"]').click(); await bekle(900);
await s.evaluate(() => { const srs = JSON.parse(localStorage.getItem('yds-srs-v1') || '{}'); srs.ayar = Object.assign(srs.ayar || {}, { mod: 'kart' }); localStorage.setItem('yds-srs-v1', JSON.stringify(srs)); });
await s.reload({ waitUntil: 'networkidle' }); await bekle(900); await sek('kelimeler'); await s.locator('.segment button[data-seg="ogren"]').click(); await bekle(900);
await s.locator('#ogrBasla').click(); await bekle(600);
T('oturumda "Panele dön" yok, üst Geri var', (await s.locator('#ogrCik').count()) === 0 && (await s.evaluate(() => !document.getElementById('geri').hidden)));
await s.locator('#ogrGoster').click(); await bekle(300);
T('kaydırma etiketleri var', (await s.locator('.ogr-kaydir-et').count()) === 2);
const kart = await s.locator('.ogr-calisma-kart').boundingBox();
const cx = kart.x + kart.width / 2, cy = kart.y + kart.height / 2;
await s.touchscreen.tap(cx, cy); // dokunuş (zararsız)
// sağa kaydır → Kolay
const cdp = await ctx.newCDPSession(s);
const swipe = async (dx) => {
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: cx, y: cy }] });
  for (let i = 1; i <= 6; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: cx + dx * i / 6, y: cy }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
};
await swipe(140); await bekle(500);
const sayac1 = await s.locator('.kart-sayac').textContent(); console.log('   sayaç:', sayac1);
T('sağa kaydırma → kolay → sonraki kart', /2 \/ \d+ · ✓ 1/.test(sayac1));
const devam = await s.evaluate(() => JSON.parse(localStorage.getItem('yds-srs-v1')).devam);
T('oturum kaydı yazıldı', devam && devam.i === 1 && Array.isArray(devam.kuyruk));
await s.locator('#geri').click(); await bekle(600);
T('panelde devam düğmesi', (await s.locator('#ogrDevamKayit').count()) === 1);
await sek('bugun');
T('Bugün yarım oturumu öneriyor', (await s.locator('#pOgren').innerText()).includes('Yarım kalan'));
await s.locator('#pOgren').click(); await bekle(700);
console.log('   devam sayaç:', await s.locator('.kart-sayac').textContent());
T('devam → 2. karttan sürüyor', /2 \/ \d+/.test(await s.locator('.kart-sayac').textContent()));
await s.locator('#ogrGoster').click(); await bekle(200); await swipe(-140); await bekle(500);
T('sola kaydırma → tekrar', /3 \/ \d+ · ✓ 1 ✕ 1/.test(await s.locator('.kart-sayac').textContent()));
await s.screenshot({ path: SCRATCH + '/f3-oturum.png' });
// bildirim metni (fonksiyon mevcut, native yok → sessiz)
await s.evaluate(() => window.__geriYonet()); await bekle(400);
T('donanım geri oturumdan panele', (await s.locator('.ogr-hero').count()) === 1);
console.log('\nHATALAR:', hata.length ? hata : 'yok');
await b.close();
