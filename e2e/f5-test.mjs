const BASE = process.env.BASE || 'http://localhost:8905/';   // uygulama adresi (ör. BASE=http://localhost:8901/ npm)
const { chromium } = await import(new URL('../mobil/node_modules/playwright/index.mjs', import.meta.url));
const SCRATCH = process.env.SHOT_DIR || '/tmp';   // ekran görüntüleri
const hata = [];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await b.newContext({ viewport: { width: 412, height: 860 }, deviceScaleFactor: 2, acceptDownloads: true });
const s = await ctx.newPage();
s.on('pageerror', e => hata.push('SAYFA: ' + e.message));
s.on('console', m => { if (m.type() === 'error' && !m.text().includes('404')) hata.push('KONSOL: ' + m.text()); });
s.on('dialog', d => d.accept());
const bekle = (ms) => s.waitForTimeout(ms);
const T = async (ad, kosul) => console.log((kosul ? '✓' : '✗ FAIL'), ad);
const sek = async (ad) => { await s.locator(`#sekme-bar button[data-sekme="${ad}"]`).click(); await bekle(700); };
const baslik = () => s.locator('#baslik').textContent();
await s.goto('' + BASE + '', { waitUntil: 'networkidle' });
await s.evaluate(() => { localStorage.clear(); localStorage.setItem('yds-ayar-v1', JSON.stringify({ girisGoruldu: true, kayitSoruldu: true, ipucuGoruldu: { bugun: 1, kelimeler: 1, mufredat: 1, oyun: 1, ben: 1 } })); });
await s.reload({ waitUntil: 'networkidle' }); await bekle(900);

// ---- 4) özel kelime + hafıza ipucu
await sek('kelimeler'); await s.locator('.segment button[data-seg="defter"]').click(); await bekle(500);
T('Defterim: kendi kelimeni ekle kartı', (await s.locator('#ozelEkleBtn').count()) === 1);
await s.locator('#ozelEkleBtn').click(); await bekle(400);
await s.locator('#ozEn').fill('resilient'); await s.locator('#ozTr').fill('dirençli, çabuk toparlanan'); await s.locator('#ozTur').selectOption('Sıfat');
await s.locator('#ozOrnek').fill('Children are remarkably resilient after setbacks.'); await s.locator('#ozOrnekTr').fill('Çocuklar aksiliklerden sonra şaşırtıcı derecede çabuk toparlanır.'); await s.locator('#ozNot').fill('re-silient → yaylanıp geri gelen');
await s.locator('#ozKaydet').click(); await bekle(600);
T('özel kelime defterde listelendi', (await s.locator('.sz-satir b', { hasText: 'resilient' }).count()) === 1 && (await s.locator('.sz-satir .sz-sv.s0').count()) >= 1);
await s.locator('.sz-satir', { hasText: 'resilient' }).click(); await bekle(500);
const detay = await s.locator('#icerik').innerText();
T('detay: Özel kelime rozeti, ipucu, örnek vurgulu, sil düğmesi', detay.includes('Özel kelime') && detay.includes('yaylanıp') && (await s.locator('.tok-vurgu').first().textContent()) === 'resilient' && (await s.locator('#szSil').count()) === 1);
await s.screenshot({ path: SCRATCH + '/f5-ozel.png', fullPage: true });
await s.locator('#szNot').click(); await bekle(300); await s.locator('#notMetin').fill('RESIST + ient'); await s.locator('#notKaydetBtn').click(); await bekle(400);
T('ipucu güncellendi', (await s.locator('.kart-not').textContent()).includes('RESIST'));
await s.locator('#geri').click(); await bekle(400);
await s.locator('.segment button[data-seg="liste"]').click(); await bekle(500);
await s.locator('#szAra').fill('resilient'); await bekle(400);
T('özel kelime sözlükte de aranıyor', (await s.locator('.sz-satir').count()) === 1);
// öğren oturumunda ipucu görünür
await s.locator('.sz-satir').first().click(); await bekle(300); await s.locator('#szCalisTek').click(); await bekle(700); await s.locator('#ogrGoster').click(); await bekle(300);
T('öğren kartında ipucu', (await s.locator('.ogr-kart-arka .kart-not').count()) === 1);
await s.locator('#geri').click(); await bekle(500);
// sil
await s.locator('.segment button[data-seg="defter"]').click(); await bekle(400); await s.locator('.sz-satir', { hasText: 'resilient' }).click(); await bekle(400);
await s.locator('#szSil').click(); await bekle(300); await s.locator('#onayEvet').click(); await bekle(500);
T('özel kelime silindi', (await s.locator('.sz-satir', { hasText: 'resilient' }).count()) === 0 && (await s.evaluate(() => JSON.parse(localStorage.getItem('yds-ozel-v1')).length)) === 0);

// ---- 3) metin tarayıcı
await s.locator('.segment button[data-seg="tara"]').click(); await bekle(500);
T('tarayıcı ekranı', (await s.locator('#trMetin').count()) === 1);
await s.locator('#trMetin').fill('Many scientists were reluctant to accept the new theory. The committee abandoned the proposal, which had been accepted earlier. Researchers have begun to investigate resilient ecosystems.');
await s.locator('#trTara').click(); await bekle(600);
const say = await s.locator('.mf-ozet b').allTextContents(); console.log('   tarama:', say.join(' / '));
T('tarama: sözcük sayıldı, havuzda eşleşme var, yeni kelimeler listelendi', Number(say[0]) >= 20 && Number(say[1]) >= 10 && (await s.locator('.tr-satir').count()) >= 5);
T('"accepted" ve "begun" köke eşlendi', (await s.locator('.tr-tok[data-en="accept"]').count()) === 2 && (await s.locator('.tr-tok[data-en="begin"]').count()) === 1);
await s.locator('.tr-tok[data-en="abandon"]').first().click(); await bekle(300);
T('dokununca balon', (await s.locator('.balon').count()) === 1 && (await s.locator('.balon-tr').textContent()).includes('terk'));
await s.locator('.balon-ogren').click(); await bekle(300);
T('balondan deftere eklendi', (await s.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('yds-defter-v1'))).includes('abandon'))));
await s.screenshot({ path: SCRATCH + '/f5-tara.png', fullPage: true });
const yeniSay = await s.locator('.tr-satir').count();
await s.locator('#trDefter').click(); await bekle(500);
T('hepsini deftere ekle', (await s.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('yds-defter-v1'))).length)) >= yeniSay);
await s.locator('#trCalis').click(); await bekle(800);
T('bilinmeyenleri çalış → oturum', (await s.locator('.kart-sayac').count()) === 1);
await s.locator('#geri').click(); await bekle(500);

// ---- 2) mini deneme
await sek('mufredat'); await s.locator('#mfBanka').click(); await bekle(900);
T('bankada deneme kartı', (await s.locator('#bkDeneme').count()) === 1);
await s.locator('#bkDeneme').click(); await bekle(500);
T('deneme giriş', (await baslik()) === 'Mini Deneme' && (await s.locator('#dnBasla').count()) === 1);
await s.locator('#dnBasla').click(); await bekle(800);
T('20 soru, süre sayacı', (await s.locator('.dn-n').count()) === 20 && /^2[45]:\d\d$/.test(await s.locator('#dnSure').textContent()));
await s.screenshot({ path: SCRATCH + '/f5-deneme.png' });
for (let i = 0; i < 20; i++) { await s.locator('.q-secenek').first().click(); await bekle(120); }
T('tüm sorular cevaplandı, bitir düğmesi', (await s.locator('.dn-n.dolu').count()) === 20 && (await s.locator('#dnBitir').count()) === 1);
await s.locator('.dn-n[data-k="4"]').click(); await bekle(200);
T('soru 5\'e gidildi, seçili şık korunuyor', (await s.locator('.q-secenek.secili').count()) === 1);
await s.locator('.dn-n[data-k="19"]').click(); await bekle(200); await s.locator('#dnBitir').click(); await bekle(800);
const sonuc = await s.locator('#icerik').innerText();
T('sonuç: puan, kırılım, en zayıf konu', /deneme puanı/.test(sonuc) && (await s.locator('.dn-kir-satir').count()) >= 5);
await s.screenshot({ path: SCRATCH + '/f5-deneme-sonuc.png', fullPage: true });
const dn = await s.evaluate(() => JSON.parse(localStorage.getItem('yds-deneme-v1')));
T('deneme geçmişe kaydedildi', dn.length === 1 && dn[0].dogru + dn[0].yanlis + dn[0].bos === 20);
await s.locator('#dnIncele').click(); await bekle(500);
T('inceleme: 20 soru', (await s.locator('.dn-inc').count()) === 20);
await s.locator('#dnGeri').click(); await bekle(400);
T('deneme girişinde geçmiş satırı', (await s.locator('.dn-gecmis-satir').count()) === 1);
await s.locator('#geri').click(); await bekle(400);
T('geri → banka', (await baslik()) === 'Soru Bankası');
await s.locator('#geri').click(); await bekle(400);
await sek('bugun');
T('Bugün: deneme çözüldüğü için öneri kartı yok', (await s.locator('#pDeneme').count()) === 0);

// ---- 1) bulut yedek (manuel yedek satırları kaldırıldı)
await sek('ben');
T('manuel yedek satırları yok, giriş satırı var', (await s.locator('.ayar-sat[data-is="yedekal"]').count()) === 0 && (await s.locator('.ayar-sat[data-is="yedekyukle"]').count()) === 0 && (await s.locator('.ayar-sat[data-is="giris-yap"]').count()) === 1);
console.log('\nHATALAR:', hata.length ? hata : 'yok');
await b.close();
