// Kelime oyunları (Harf Avı, Karışık Harfler) ve kaldırılan test özellikleri — uçtan uca kontrol
const BASE = process.env.BASE || 'http://localhost:8905/';   // uygulama adresi
const { chromium } = await import(new URL('../mobil/node_modules/playwright/index.mjs', import.meta.url));
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
const s = await (await b.newContext({ viewport: { width: 412, height: 860 } })).newPage();
const hata = []; s.on('pageerror', e => hata.push(e.message));
let say = 0, bas = 0;
const T = (ad, ok) => { say++; if (!ok) bas++; console.log((ok ? '✓ ' : '✗ FAIL ') + ad); };
const bekle = (ms) => s.waitForTimeout(ms);

await s.goto(BASE, { waitUntil: 'networkidle' });
await s.evaluate(() => {
  localStorage.clear();
  localStorage.setItem('yds-ayar-v1', JSON.stringify({ girisGoruldu: true, kayitSoruldu: true, ipucuGoruldu: { bugun: 1, kelimeler: 1, mufredat: 1, oyun: 1, ben: 1 } }));
  // Eski sürümlerden kalan test verisi açılışta silinmeli
  for (const k of ['yds-test-istat-v1', 'yds-yanlis-v1', 'yds-alistirma-v1', 'yds-banka-v1', 'yds-deneme-v1']) localStorage.setItem(k, '{}');
});
await s.reload({ waitUntil: 'networkidle' }); await bekle(900);
T('eski test verisi açılışta temizlendi', await s.evaluate(() => ['yds-test-istat-v1', 'yds-yanlis-v1', 'yds-alistirma-v1', 'yds-banka-v1', 'yds-deneme-v1'].every(k => localStorage.getItem(k) === null)));

// --- Kaldırılan özellikler görünmüyor
const govde = async () => (await s.locator('body').innerText());
T('Bugün: deneme ve zayıf konu kartı yok, oyun kartı var', !(await s.locator('#pDeneme, #pZayif').count()) && (await s.locator('#pOyun').count()) === 1);
await s.locator('button[data-sekme="mufredat"]').click(); await bekle(700);
const mf = await govde();
T('Müfredat: Soru Bankası, test ve yanlış sayaçları yok', !/Soru Bankası|test çözüldü|yanlış soru/i.test(mf) && (await s.locator('.mf-kart').count()) > 0);
await s.locator('.mf-kart').first().click(); await bekle(900);
const segs = await s.locator('.segment[data-alan="unite"] button').allInnerTexts();
T('Ünite: yalnızca Oku (ve varsa Çeviri); Alıştırma/Test yok', segs.length >= 1 && segs.length <= 2 && segs[0].includes('Oku') && !segs.some(t => /Alıştırma|Test/.test(t)));
await s.locator('#geri').click(); await bekle(500);
await s.locator('button[data-sekme="ben"]').click(); await bekle(700);
const ben = await govde();
T('Ben: Mini deneme ve Yanlışlarım satırı yok; yıldız ve oyun bölümü var', !/Mini deneme|Yanlışlarım/i.test(ben) && /yıldız/.test(ben));

// --- Oyun sekmesi: segment çubuğu
await s.locator('button[data-sekme="oyun"]').click(); await bekle(900);
const oyunSeg = await s.locator('.segment[data-alan="oyun"] button').allInnerTexts();
T('Oyun: Eşleştirme · Harf Avı · Karışık segmentleri', oyunSeg.length === 3 && /Eşleştirme/.test(oyunSeg[0]) && /Harf Avı/.test(oyunSeg[1]) && /Karışık/.test(oyunSeg[2]));
T('Oyun: Eşleştirme paneli açık', (await s.locator('.es-hero').count()) === 1);

// --- Harf Avı: tüm turu harf harf oyna
await s.locator('.segment[data-alan="oyun"] button[data-seg="av"]').click(); await bekle(900);
T('Harf Avı: üç seviye düğmesi', (await s.locator('.og-sev').count()) === 3);
await s.locator('.og-sev[data-sev="kolay"]').click(); await bekle(400);
T('Harf Avı: Türkçe anlam, maske ve klavye', (await s.locator('.og-tr b').innerText()).length > 0 && (await s.locator('.og-harf').count()) >= 4 && (await s.locator('.og-tus').count()) === 26);
for (let k = 0; k < 5; k++) {
  for (const h of 'etaoinsrhldcumfpgwybvkxjqz') {
    if (await s.locator('.og-sonuc').count()) break;
    const t = s.locator(`.og-tus[data-h="${h}"]:not([disabled])`);
    if (await t.count()) { await t.click(); await bekle(40); }
  }
  if (!(await s.locator('.og-sonuc').count())) { T(`Harf Avı: kelime ${k + 1} sonuçlandı`, false); break; }
  await s.locator('#ogSonraki').click(); await bekle(250);
}
T('Harf Avı: tur sonu ekranı (yıldız, puan, tekrar)', (await s.locator('.es-sonuc').count()) === 1 && (await s.locator('#ogTekrar').count()) === 1);
const kayit1 = await s.evaluate(() => JSON.parse(localStorage.getItem('yds-oyunlar-v1') || '{}'));
T('Harf Avı: en iyi puan ve tur sayısı kaydedildi', kayit1.av && kayit1.av.kolay && kayit1.av.kolay.tur === 1 && kayit1.av.kolay.en >= 0);
const olay1 = await s.evaluate(() => JSON.parse(localStorage.getItem('yds-olay-v1') || '[]'));
T('Harf Avı: 5 aktivite ve 1 oturum bitişi günlüğe yazıldı', olay1.filter(o => o.k === 'akt').reduce((t, o) => t + o.n, 0) === 5 && olay1.filter(o => o.k === 'bit').length === 1);

// --- Karışık Harfler: ipucuyla tüm turu çöz
await s.locator('#ogListe').click(); await bekle(500);
await s.locator('.segment[data-alan="oyun"] button[data-seg="karisik"]').click(); await bekle(700);
await s.locator('.og-sev[data-sev="kolay"]').click(); await bekle(400);
T('Karışık: harf karoları ve cevap kutuları', (await s.locator('.og-karo').count()) >= 4 && (await s.locator('.og-cevap .og-harf').count()) === (await s.locator('.og-karo').count()));
for (let k = 0; k < 5; k++) {
  for (let n = 0; n < 12 && !(await s.locator('.og-sonuc').count()); n++) { await s.locator('#ogIpucu').click(); await bekle(40); }
  const dogru = (await s.locator('.og-sonuc.dogru').count()) === 1;
  if (k === 0) T('Karışık: ipucuyla kelime tamamlanınca doğru sayılır', dogru);
  if (!(await s.locator('.og-sonuc').count())) { T(`Karışık: kelime ${k + 1} sonuçlandı`, false); break; }
  await s.locator('#ogSonraki').click(); await bekle(250);
}
T('Karışık: tur sonu ekranı', (await s.locator('.es-sonuc').count()) === 1);
const kayit2 = await s.evaluate(() => JSON.parse(localStorage.getItem('yds-oyunlar-v1') || '{}'));
T('Karışık: kayıt oluştu', kayit2.karisik && kayit2.karisik.kolay && kayit2.karisik.kolay.tur === 1);

T('sayfa hatası yok', hata.length === 0);
if (hata.length) console.log(hata.join('\n'));
console.log(`SONUÇ: ${say - bas}/${say} geçti`);
console.log('HATALAR:', hata.length ? hata : 'yok');
await b.close();
process.exit(bas ? 1 : 0);
