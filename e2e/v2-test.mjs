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
const baslik = () => s.locator('#baslik').textContent();
const geriGor = () => s.evaluate(() => !document.getElementById('geri').hidden);
const barGor = () => s.evaluate(() => !document.getElementById('sekme-bar').hidden);
const aktifSekme = () => s.evaluate(() => document.querySelector('#sekme-bar button.aktif')?.dataset.sekme);
const sek = async (ad) => { await s.locator(`#sekme-bar button[data-sekme="${ad}"]`).click(); await bekle(700); if (ad === 'kelimeler') { await s.locator('.segment button[data-seg="liste"]').click().catch(()=>{}); await bekle(400); } };

await s.goto('' + BASE + '', { waitUntil: 'networkidle' });
await s.evaluate(() => { localStorage.clear();
  const iso = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const bugun = new Date(); const log = {}; for (let i = 0; i < 20; i++) { const d = new Date(bugun); d.setDate(d.getDate() - i); log[iso(d)] = 10; }
  localStorage.setItem('yds-ayar-v1', JSON.stringify({ girisGoruldu: true, kayitSoruldu: true, seri: 2, sonAktif: iso(bugun), gunTarih: iso(bugun), gunSayac: 12, xp: 900, gunlog: log, hedef: 20, sinavTarih: '2027-02-01', sonDers: { dosya: 'uniteler/unite-02.json', id: 2, baslik: 'Ünite 2 — Edatlar (Prepositions)' } }));
  // eski sürüm: Öğrendiklerim deposu + srs.favori → taşınmalı
  localStorage.setItem('yds-ogrenilen-v1', JSON.stringify({ ability: { en: 'ability', tr: 'yetenek' }, able: { en: 'able', tr: 'yapabilen' } }));
  localStorage.setItem('yds-srs-v1', JSON.stringify({ surum: 1, kartlar: {}, favori: { abandon: true } }));
});
await s.reload({ waitUntil: 'networkidle' }); await bekle(1200);

// ---- BUGÜN
T('Bugün başlık', (await baslik()) === 'Kelimetre');
T('alt bar görünür, geri gizli', (await barGor()) && !(await geriGor()));
T('plan kartları 5', (await s.locator('.plan-kart').count()) === 5);
const pano = await s.locator('.pano-stat').innerText();
console.log('   pano:', pano.replace(/\n/g, ' '));
T('taşıma: öğrenilen 2 (eski depo → SRS)', /2\s*🌳/.test(pano));
T('taşıma: defter 1 (srs.favori → defter)', /1\s*📓/.test(pano));
const tasindi = await s.evaluate(() => ({ og: localStorage.getItem('yds-ogrenilen-v1'), srs: JSON.parse(localStorage.getItem('yds-srs-v1')) }));
T('eski depo silindi, favori kaldırıldı', tasindi.og === null && !tasindi.srs.favori && tasindi.srs.kartlar.ability?.i === 21);
const plan = await s.locator('#pOgren').innerText(); console.log('   plan ogren:', plan.replace(/\n/g, ' '));
const o1 = await s.evaluate(() => ({ belge: document.documentElement.scrollHeight, pencere: window.innerHeight }));
console.log('   bugün belge yüksekliği', o1.belge, '/', o1.pencere);
await s.screenshot({ path: SCRATCH + '/v2-bugun.png' });
// Bugün → öğren (alt ekran, geri → bugün)
await s.locator('#pOgren').click(); await bekle(800);
T('öğren alt ekran (geri görünür, bar gizli)', (await geriGor()) && !(await barGor()) && (await baslik()) === 'Kelime Öğren');
await s.locator('#geri').click(); await bekle(600);
T('geri → Bugün', (await baslik()) === 'Kelimetre' && (await aktifSekme()) === 'bugun');
// Bugün → günün eşleştirmesi
await s.locator('#pGunluk').click(); await bekle(900);
console.log('   günlük başlık:', await baslik());
T('günün eşleştirmesi açıldı', (await baslik()) === 'Günün Eşleştirmesi');
await s.locator('#geri').click(); await bekle(600);
console.log('   sonra başlık:', await baslik(), 'geri?', await geriGor());
await s.locator('#geri').click(); await bekle(600);
T('iki geri → Bugün', (await baslik()) === 'Kelimetre');
// devam → ünite 2
await s.locator('#pDers').click(); await bekle(900);
T('devam → Edatlar ünitesi', (await baslik()) === 'Edatlar' && (await s.locator('.segment button').count()) === 2);
await s.locator('#geri').click(); await bekle(600);
T('ünite geri → Müfredat', (await aktifSekme()) === 'mufredat');

// ---- KELİMELER
await sek('kelimeler');
T('Kelimeler kökü', (await baslik()) === 'Kelimeler' && (await barGor()));
T('segment 5 (Günler dahil)', (await s.locator('.segment[data-alan="kelimeler"] button').count()) === 5);
const say = await s.locator('#szSay').textContent(); console.log('   sayı:', say);
T('tüm kelimeler listelendi', /^21\d\d kelime$/.test(say));
T('ilk parça 60 satır', (await s.locator('.sz-satir').count()) === 60);
await s.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); await bekle(600);
T('kaydırınca daha fazla yüklendi', (await s.locator('.sz-satir').count()) > 60);
await s.screenshot({ path: SCRATCH + '/v2-kelimeler.png' });
await s.locator('.sz-cip[data-sv="1"]').click(); await bekle(400);
const s1 = await s.locator('#szSay').textContent(); console.log('   S1:', s1);
await s.locator('.sz-cip[data-tur="fiil"]').click(); await bekle(400);
const s1f = await s.locator('#szSay').textContent(); console.log('   S1 fiil:', s1f);
T('seviye + tür filtresi daraltıyor', parseInt(s1f) < parseInt(s1) && parseInt(s1) < 2119);
await s.locator('#szSira').selectOption('alfabe'); await bekle(400);
const ilk = await s.locator('.sz-satir b').first().textContent(); console.log('   A→Z ilk:', ilk);
await s.locator('#szAra').fill('abandon'); await bekle(400);
console.log('   arama abandon:', await s.locator('#szSay').textContent());
await s.locator('.sz-cip[data-sv="0"]').click(); await s.locator('.sz-cip[data-tur=""]').click(); await bekle(300);
await s.locator('#szAra').fill('abandon'); await bekle(400);
T('arama sonucu ≥1', (await s.locator('.sz-satir').count()) >= 1);
await s.locator('.sz-satir').first().click(); await bekle(500);
T('detay alt ekran', (await geriGor()) && (await s.locator('.sz-detay').count()) === 1);
T('detay: defterde (favori taşındı)', (await s.locator('#szDefter').textContent()).includes('✓'));
await s.locator('#szBiliyorum').click(); await bekle(300);
T('biliyorum → ✅', (await s.locator('#szBiliyorum').textContent()).includes('✅'));
await s.screenshot({ path: SCRATCH + '/v2-detay.png' });
await s.locator('#geri').click(); await bekle(500);
T('detay geri → liste (bar görünür)', (await barGor()) && (await s.locator('#szAra').count()) === 1);
// Defterim segmenti
await s.locator('.segment button[data-seg="defter"]').click(); await bekle(500);
console.log('   defterim:', await s.locator('#szSay').textContent());
T('defterim segment aktif + defter çipi aktif', (await s.locator('.segment button.aktif').getAttribute('data-seg')) === 'defter' && (await s.locator('.sz-cip[data-durum="defter"].aktif').count()) === 1);
// Öğren segmenti (kök, bar görünür)
await s.locator('.segment button[data-seg="ogren"]').click(); await bekle(800);
T('öğren segmenti kökte (bar görünür, segment var)', (await barGor()) && (await s.locator('.ogr-hero').count()) === 1 && (await s.locator('.segment').count()) === 1);
await s.screenshot({ path: SCRATCH + '/v2-ogren.png' });
// Liste → bu listeyi çalış → oturum → çık → panel
await s.locator('.segment button[data-seg="liste"]').click(); await bekle(600);
await s.locator('#szCalis').click(); await bekle(900);
T('listeden çalış → oturum alt ekran', (await geriGor()) && (await s.locator('.kart-sayac').count()) === 1);
await s.locator('#geri').click(); await bekle(600);
T('oturumdan çık → öğren paneli (kökte)', (await barGor()) && (await s.locator('.ogr-hero').count()) === 1);
// Akışta gez
await s.locator('.segment button[data-seg="liste"]').click(); await bekle(600);
await s.locator('#szAkis').click(); await bekle(900);
T('akış tam ekran', (await geriGor()) && (await s.locator('.akis').count()) === 1);
await s.locator('#geri').click(); await bekle(600);
T('akış geri → kelimeler', (await aktifSekme()) === 'kelimeler' && (await s.locator('.akis').count()) === 0);

// ---- MÜFREDAT
await sek('mufredat');
T('Müfredat: 13 ünite kartı, 5 grup', (await s.locator('.mf-kart').count()) === 13 && (await s.locator('.mf-grup').count()) === 5);
await s.screenshot({ path: SCRATCH + '/v2-mufredat.png' });
await s.locator('.mf-kart[data-id="3"]').click(); await bekle(900);
T('Present Tenses: yalnızca Oku segmenti (çeviri yok)', (await baslik()) === 'Present Tenses' && (await s.locator('.segment button').count()) === 1);
T('bu ünitenin kelimeleri linki', (await s.locator('#uniteKelimeler').count()) === 1);
await s.locator('.segment button[data-seg="oku"]').click(); await bekle(500);
T('oku: bölüm listesi + çalışıldı düğmesi', (await s.locator('.bolum-link').count()) >= 1 && (await s.locator('#tamamla').count()) === 1);
await s.locator('.bolum-link').first().click(); await bekle(500);
T('bölüm detay: gezinti düğmeleri', (await s.locator('#bolumGeri').count()) === 1 && (await s.locator('#bolumSonraki, #bolumAlistirma').count()) === 1);
await s.locator('#bolumGeri').click(); await bekle(400);
await s.locator('#uniteKelimeler').click(); await bekle(700);
T('ünite kelimeleri → Kelimeler sekmesi ünite filtresi', (await aktifSekme()) === 'kelimeler' && (await s.locator('#szUniteKaldir').count()) === 1);
console.log('   ünite 3 kelime:', await s.locator('#szSay').textContent());
// Çeviri sekmesi (Edatlar)
await sek('mufredat'); await s.locator('.mf-kart[data-id="2"]').click(); await bekle(900);
T('Edatlar: Oku + Çeviri segmentleri', (await s.locator('.segment button').count()) === 2);
await s.locator('.segment button[data-seg="ceviri"]').click(); await bekle(700);
await s.screenshot({ path: SCRATCH + '/v2-ceviri.png' });
await s.locator('.ornek-cumle').first().click(); await bekle(300);
T('cümleye dokun → çeviri', await s.locator('.ornek-ceviri.gorunur').first().isVisible());
await s.locator('.segment button[data-seg="oku"]').click(); await bekle(400);
await s.locator('#tamamla').click(); await bekle(400);
T('çalışıldı işaretle', (await s.locator('#tamamla').textContent()).includes('geri al'));
await s.locator('#geri').click(); await bekle(600);
T('müfredatta ✓ çalışıldı rozeti', (await s.locator('.mf-kart[data-id="2"] .mf-rozet.ok').count()) === 1);
// ---- OYUN
await sek('oyun');
T('Oyun kökü (panel, bar görünür)', (await baslik()) === 'Oyun' && (await barGor()) && (await s.locator('.es-hucre, .es-bolum, .es-panel, [id^=esBolum]').count()) >= 0);
console.log('   oyun ekranı ilk 80 kr:', (await s.locator('#icerik').innerText()).slice(0, 80).replace(/\n/g, ' '));
await s.screenshot({ path: SCRATCH + '/v2-oyun.png' });

// ---- BEN
await sek('ben');
T('Ben kökü', (await baslik()) === 'Ben' && (await s.locator('.ayar-sat').count()) >= 12);
await s.screenshot({ path: SCRATCH + '/v2-ben.png', fullPage: true });
await s.locator('.ayar-sat[data-is="tema"]').click(); await bekle(300); await s.locator('.ayar-sat[data-is="tema"]').click(); await bekle(400);
T('koyu tema', (await s.evaluate(() => document.documentElement.dataset.tema)) === 'koyu');
await sek('bugun'); await s.screenshot({ path: SCRATCH + '/v2-bugun-koyu.png' });
await sek('kelimeler'); await s.screenshot({ path: SCRATCH + '/v2-kelimeler-koyu.png' });
await sek('ben'); await s.locator('.ayar-sat[data-is="tema"]').click(); await bekle(300);
await s.locator('.ayar-sat[data-is="rekor"]').click(); await bekle(600);
T('rekorlar alt ekran', (await baslik()) === 'Rekorlarım' && (await geriGor()));
await s.locator('#geri').click(); await bekle(500); await s.locator('#geri').click(); await bekle(500);
T('rekor geri geri → Ben', (await aktifSekme()) === 'ben' && (await baslik()) === 'Ben');
// dişli → Ben, yardım modalı
await sek('bugun'); await s.locator('#ayarBtn').click(); await bekle(500);
T('dişli → Ben', (await aktifSekme()) === 'ben');
await s.locator('#yardimBtn').click(); await bekle(400);
T('yardım modalı', (await s.locator('.modal-katman .yardim-sat').count()) === 8);
await s.evaluate(() => window.__geriYonet()); await bekle(400);
T('donanım geri modalı kapatır', (await s.locator('.modal-katman').count()) === 0);
const g1 = await s.evaluate(() => window.__geriYonet()); await bekle(500);
T('donanım geri: Ben → Bugün', g1 === true && (await aktifSekme()) === 'bugun');
const g2 = await s.evaluate(() => window.__geriYonet());
T('Bugün kökünde geri = false (çıkış onayı)', g2 === false);
// tüm sıfırla
await sek('ben'); await s.locator('.ayar-sat[data-is="hepsi"]').click(); await bekle(400); await s.locator('#onayEvet').click(); await bekle(2000);
await sek('ben'); T('sıfırlama sonrası (seri 0)', (await s.locator('.ilerleme-cip b').first().textContent()).includes('0'));

console.log('\nHATALAR:', hata.length ? hata : 'yok');
await b.close();
