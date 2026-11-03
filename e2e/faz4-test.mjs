const BASE = process.env.BASE || 'http://localhost:8905/';   // uygulama adresi (ör. BASE=http://localhost:8901/ npm)
const { chromium } = await import(new URL('../mobil/node_modules/playwright/index.mjs', import.meta.url));
const SCRATCH = process.env.SHOT_DIR || '/tmp';   // ekran görüntüleri
const hata = [];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const s = await b.newPage({ viewport: { width: 412, height: 860 }, deviceScaleFactor: 2 });
s.on('pageerror', e => hata.push('SAYFA: ' + e.message));
s.on('console', m => { if (m.type() === 'error' && !m.text().includes('404')) hata.push('KONSOL: ' + m.text()); });
const bekle = (ms) => s.waitForTimeout(ms);
const T = async (ad, kosul) => console.log((kosul ? '✓' : '✗ FAIL'), ad);
const sek = async (ad) => { await s.locator(`#sekme-bar button[data-sekme="${ad}"]`).click(); await bekle(700); };
const baslik = () => s.locator('#baslik').textContent();
await s.goto('' + BASE + '', { waitUntil: 'networkidle' });
await s.evaluate(() => { localStorage.clear(); localStorage.setItem('yds-ayar-v1', JSON.stringify({ girisGoruldu: true, kayitSoruldu: true, ipucuGoruldu: { bugun: 1, kelimeler: 1, mufredat: 1, oyun: 1, ben: 1 } })); });
await s.reload({ waitUntil: 'networkidle' }); await bekle(900);
await sek('mufredat');
const kart = await s.locator('#mfBanka').innerText(); console.log('   banka kartı:', kart.replace(/\n/g, ' '));
T('Müfredatta Soru Bankası kartı', /1406 soru · 9 konu/.test(kart));
await s.locator('#mfBanka').click(); await bekle(900);
T('banka konu listesi', (await baslik()) === 'Soru Bankası' && (await s.locator('.bk-konu').count()) === 9);
await s.screenshot({ path: SCRATCH + '/f4-banka.png' });
await s.locator('.bk-konu[data-konu="modal"]').click(); await bekle(500);
const altlar = await s.locator('.bk-alt').count(); console.log('   modal alt konu:', altlar, (await s.locator('.bk-alt .mf-bas').allTextContents()).join(' | '));
T('alt konular', altlar === 7 && (await baslik()) === 'Modallar');
await s.screenshot({ path: SCRATCH + '/f4-altlar.png' });
await s.locator('.bk-alt[data-alt="cikarim"]').click(); await bekle(500);
const tl = await s.locator('.test-link').count(); console.log('   cikarim test sayısı:', tl, '| ilk:', (await s.locator('.test-link').first().innerText()).replace(/\n/g, ' '));
T('alt konu → test listesi (121 soru → 13 test, sıradaki Test 1)', tl === 13 && (await s.locator('.test-link.siradaki .baslik').textContent()) === 'Test 1');
const sayilar = await s.evaluate(() => [...document.querySelectorAll('.test-link .alt-bilgi')].map(e => parseInt(e.textContent)));
T('her test ≤ 10 soru, son test 1', sayilar.every(n => n <= 10) && sayilar[12] === 1);
await s.screenshot({ path: SCRATCH + '/f4-testler.png' });
await s.locator('.test-link').first().click(); await bekle(500);
T('oturum başladı', (await s.locator('.q-secenek').count()) >= 3 && (await s.locator('.kart-sayac').textContent()).includes('Modallar › Geçmiş çıkarım'));
await s.screenshot({ path: SCRATCH + '/f4-soru.png' });
// 10 soru çöz: ilk 6 doğru, kalan yanlış
for (let i = 0; i < 10; i++) {
  const dogru = await s.evaluate(() => { const b = [...document.querySelectorAll('.q-secenek')]; return b.map(x => x.dataset.o); });
  const cevap = await s.evaluate(() => document.querySelector('.q-bosluk')?.textContent || '');
  // doğru şıkkı bilmiyoruz; i<6 için "ilk şık" seçip sonucu kaydet
  await s.locator('.q-secenek').nth(i < 6 ? 0 : 1).click(); await bekle(250);
  await s.locator('#bkDevam').click(); await bekle(250);
}
T('oturum bitişi (sonraki test var)', (await s.locator('#bkYeni').count()) === 1 && (await s.locator('#bkSonraki').count()) === 1);
const ist = await s.evaluate(() => JSON.parse(localStorage.getItem('yds-banka-v1')));
console.log('   istat:', JSON.stringify(ist['modal/cikarim']).slice(0, 120));
T('istatistik kaydı (10 cevap)', ist['modal/cikarim'] && ist['modal/cikarim'].yapilan === 10 && ist['modal/cikarim'].cozulen.length === 10);
T('test skoru kaydı', ist['modal/cikarim'].testler && ist['modal/cikarim'].testler.t0 && ist['modal/cikarim'].testler.t0.toplam === 10);
await s.locator('#bkSonraki').click(); await bekle(500);
T('sonraki test → Test 2', (await baslik()).endsWith('Test 2'));
await s.locator('#geri').click(); await bekle(400);
T('geri → test listesi, Test 1 skorlu, sıradaki Test 2', (await s.locator('.test-link.biten').count()) === 1 && (await s.locator('.test-link.siradaki .baslik').textContent()) === 'Test 2');
await s.locator('#geri').click(); await bekle(400);
const yanlis = await s.evaluate(() => JSON.parse(localStorage.getItem('yds-yanlis-v1') || '[]'));
console.log('   yanlış sayısı:', yanlis.length, '| beklenen ≤', 10 - ist['modal/cikarim'].dogru, '| etiket:', yanlis[0]?.unite);
T('yanlışlar Yanlışlarım\'a eklendi', yanlis.length >= 1 && yanlis.length <= 10 - ist['modal/cikarim'].dogru && yanlis[0].unite.startsWith('Soru Bankası'));
await s.screenshot({ path: SCRATCH + '/f4-bitis.png' });
T('alt konular (oran + 1/13 çözüldü)', (await s.locator('.bk-alt[data-alt="cikarim"] .bk-oran').textContent()).startsWith('%') && (await s.locator('.bk-alt[data-alt="cikarim"] .mf-alt').textContent()).includes('1/13 çözüldü'));
await s.locator('#geri').click(); await bekle(400);
T('alt → konular', (await baslik()) === 'Soru Bankası');
await s.locator('#geri').click(); await bekle(500);
T('konular → Müfredat', (await s.evaluate(() => document.querySelector('#sekme-bar button.aktif')?.dataset.sekme)) === 'mufredat');
// ünite içi konuya göre
await s.locator('.mf-kart[data-id="7"]').click(); await bekle(900);
await s.locator('.segment button[data-seg="test"]').click(); await bekle(500);
T('test görünümü çipleri', (await s.locator('.bk-gorunum .sz-cip').count()) === 2);
await s.locator('.bk-gorunum .sz-cip[data-g="konular"]').click(); await bekle(600);
const uk = await s.locator('.bk-konu').count(); console.log('   ünite 7 konuları:', uk, (await s.locator('.bk-konu .mf-bas').allTextContents()).join(' | '));
T('ünite içi konu listesi (segment korunur)', uk >= 2 && (await s.locator('.segment button.aktif').getAttribute('data-seg')) === 'test' && (await baslik()) === 'Modallar');
await s.screenshot({ path: SCRATCH + '/f4-unite-konular.png' });
await s.locator('.bk-konu[data-konu="modal"]').click(); await bekle(500);
T('ünite süzgeçli alt konular', (await s.locator('.bk-alt').count()) >= 3);
await s.locator('.bk-alt').first().click(); await bekle(500);
T('ünite süzgeçli test listesi', (await s.locator('.test-link').count()) >= 1);
await s.locator('.test-link').first().click(); await bekle(500);
T('ünite oturumu', (await s.locator('.q-secenek').count()) >= 3);
await s.locator('#geri').click(); await bekle(400);
await s.locator('#geri').click(); await bekle(400);
await s.locator('#geri').click(); await bekle(600);
T('geri → ünite test (konular görünümü)', (await baslik()) === 'Modallar' && (await s.locator('.bk-gorunum').count()) === 1 && (await s.locator('.bk-konu').count()) >= 2);
await s.locator('.bk-gorunum .sz-cip[data-g="testler"]').click(); await bekle(400);
T('testler görünümüne dönüş', (await s.locator('.test-link').count()) >= 5);
// Bugün: zayıf konu (cikarim %≤60 ise)
const oran = ist['modal/cikarim'].dogru / 10;
await s.locator('#geri').click(); await bekle(500);
await sek('bugun');
console.log('   cikarim oranı', oran, '| zayıf kartı:', await s.locator('#pZayif').count());
T('Bugün zayıf konu kartı tutarlı', (oran < 0.6) === ((await s.locator('#pZayif').count()) === 1));
if (await s.locator('#pZayif').count()) { await s.locator('#pZayif').click(); await bekle(500); T('zayıf konu → oturum', (await s.locator('.q-secenek').count()) >= 3); await s.locator('#geri').click(); await bekle(500); T('geri → Bugün', (await baslik()) === 'Kelimetre'); }
await s.screenshot({ path: SCRATCH + '/f4-bugun.png' });
console.log('\nHATALAR:', hata.length ? hata : 'yok');
await b.close();
