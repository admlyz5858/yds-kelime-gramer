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
const sek = async (ad) => { await s.locator(`#sekme-bar button[data-sekme="${ad}"]`).click(); await bekle(700); if (ad === 'kelimeler') { await s.locator('.segment button[data-seg="liste"]').click().catch(()=>{}); await bekle(400); } };
await s.goto('' + BASE + '', { waitUntil: 'networkidle' });
await s.evaluate(() => localStorage.clear());
await s.reload({ waitUntil: 'networkidle' }); await bekle(900);
// onboarding
T('karşılama adım 1', (await s.locator('.giris-katman .giris-sat').count()) === 4);
await s.screenshot({ path: SCRATCH + '/f2-giris1.png' });
await s.locator('#girisIleri').click(); await bekle(300);
T('adım 2: hedef seçimi', (await s.locator('.giris-secim').count()) === 4 && (await s.locator('.giris-secim.aktif b').textContent()) === '20');
await s.locator('.giris-secim[data-n="30"]').click(); await bekle(200);
await s.screenshot({ path: SCRATCH + '/f2-giris2.png' });
await s.locator('#girisIleri').click(); await bekle(300);
T('adım 3: tarih', (await s.locator('#girisTarih').count()) === 1);
await s.locator('#girisTarih').fill('2027-03-21');
await s.screenshot({ path: SCRATCH + '/f2-giris3.png' });
await s.locator('#girisBasla').click(); await bekle(900);
const ay = await s.evaluate(() => JSON.parse(localStorage.getItem('yds-ayar-v1')));
T('karşılama kaydı: hedef 30, tarih, görüldü', ay.hedef === 30 && ay.sinavTarih === '2027-03-21' && ay.girisGoruldu === true);
T('Bugün: hedef halkası /30 ve sınav kartı', (await s.locator('.pano-ring-yazi').innerText()).includes('30') && (await s.locator('.mini-kart.sinav').innerText()).includes('gün'));
// müfredat halkaları
await sek('mufredat');
T('halkalar 13, grup oranı 5', (await s.locator('.mf-halka').count()) === 13 && (await s.locator('.mf-grup-oran').count()) === 5);
await s.locator('.mf-kart[data-id="14"]').click(); await bekle(900);
await s.locator('#tamamla').click(); await bekle(300);
await s.locator('#geri').click(); await bekle(600);
const halka = await s.locator('.mf-kart[data-id="14"] .mf-halka.var').count();
T('çalışıldı → halka doldu (grupta 2 üniteden 1 → %50)', halka === 1 && (await s.locator('.mf-grup').last().locator('.mf-grup-oran').textContent()) === '%50');
await s.screenshot({ path: SCRATCH + '/f2-mufredat.png' });
// oyun yol görünümü
await sek('oyun');
const sezon = await s.locator('.es-sezon').count(), aktif = await s.locator('.es-sezon.aktif').count(), kilit = await s.locator('.es-sezon.kilit').count();
console.log('   sezon', sezon, 'aktif', aktif, 'kilit', kilit, 'düğüm', await s.locator('.es-dugum').count());
T('sezon yolu: 1 aktif, kalanı kilitli, 6 düğüm', aktif === 1 && kilit === sezon - 1 && (await s.locator('.es-dugum').count()) === 6 && (await s.locator('.es-dugum.sirada').count()) === 1);
console.log('   sezon başlığı:', (await s.locator('.es-sezon.aktif .es-sezon-bas').innerText()).replace(/\n/g, ' '));
await s.screenshot({ path: SCRATCH + '/f2-oyun.png' });
await s.locator('.es-sezon.kilit').first().click(); await bekle(300);
T('kilitli sezon uyarısı', (await s.locator('.toast').count()) >= 1);
await s.locator('.es-dugum.sirada').click(); await bekle(800);
T('sıradaki düğüm → oyun', (await s.locator('.es-en').count()) === 5);
await s.locator('#geri').click(); await bekle(500);
// kelimeler: S bantları
await sek('kelimeler');
await s.locator('#szAra').fill('abandon'); await bekle(400);
console.log('   abandon:', await s.locator('.sz-satir .sz-sv').first().textContent());
await s.locator('#szAra').fill(''); await s.locator('.sz-cip[data-sv="5"]').click(); await bekle(400);
console.log('   S5:', await s.locator('#szSay').textContent(), '| ilk:', (await s.locator('.sz-satir b').allTextContents()).slice(0, 5).join(', '));
T('S5 artık 167 kelime', (await s.locator('#szSay').textContent()) === '167 kelime');
await s.locator('.sz-cip[data-sv="1"]').click(); await bekle(400);
console.log('   S1:', await s.locator('#szSay').textContent());
// tekrar tanıtım (Ben'den)
await sek('ben'); await s.locator('.ayar-sat[data-is="giris"]').click(); await bekle(400);
T('tanıtım tekrar açılıyor', (await s.locator('.giris-katman').count()) === 1);
await s.evaluate(() => window.__geriYonet()); await bekle(500);
T('donanım geri tanıtımı kapatır', (await s.locator('.giris-katman').count()) === 0);
console.log('\nHATALAR:', hata.length ? hata : 'yok');
await b.close();
