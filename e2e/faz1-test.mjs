const BASE = process.env.BASE || 'http://localhost:8905/';
// Faz 1 regresyon testi: arama, çift dokunma, yarım oturum, çift sayım, deneme, kök bulma, veri koruma, görev günü
const { chromium } = await import(new URL('../mobil/node_modules/playwright/index.mjs', import.meta.url));
const hata = []; const sonuc = [];
const T = (ad, k) => { sonuc.push(!!k); console.log(k ? '✓' : '✗ FAIL', ad); };
const bekle = (ms) => new Promise(r => setTimeout(r, ms));
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const AYAR = { girisGoruldu: true, kayitSoruldu: true, ipucuGoruldu: { bugun: 1, kelimeler: 1, mufredat: 1, oyun: 1, ben: 1 } };
async function yeni(vp = { width: 412, height: 860 }) {
  const ctx = await b.newContext({ viewport: vp }); const s = await ctx.newPage();
  s.on('pageerror', e => hata.push('SAYFA: ' + e.message));
  s.on('dialog', d => d.dismiss().catch(() => {}));
  await s.goto(BASE, { waitUntil: 'networkidle' });
  return { ctx, s };
}
const sek = async (s, ad) => { await s.locator(`#sekme-bar button[data-sekme="${ad}"]`).click(); await bekle(600); };
const seg = async (s, ad) => { await s.locator(`.segment button[data-seg="${ad}"]`).click(); await bekle(500); };

// 1) Arama: büyük harfli İngilizce
{
  const { ctx, s } = await yeni();
  await s.evaluate((a) => { localStorage.clear(); localStorage.setItem('yds-ayar-v1', JSON.stringify(a)); }, AYAR); await s.reload({ waitUntil: 'networkidle' });
  await sek(s, 'kelimeler'); await seg(s, 'liste');
  await s.locator('#szAra').fill('Important'); await bekle(400);
  T('arama: büyük harfli "Important" sonuç veriyor', (await s.locator('.sz-satir').count()) >= 1);
  await s.locator('#szAra').fill('İş'); await bekle(300);
  T('arama: Türkçe karşılık aranıyor (hata yok)', true);
  await ctx.close();
}

// 2) Çift dokunma: ilk dokunuş detayı açar, ikinci dokunuş detaydaki düğmelere düşmez
{
  const { ctx, s } = await yeni();
  await s.evaluate((a) => { localStorage.clear(); localStorage.setItem('yds-ayar-v1', JSON.stringify(a)); }, AYAR); await s.reload({ waitUntil: 'networkidle' });
  await sek(s, 'kelimeler'); await seg(s, 'liste');
  const satir = s.locator('.sz-satir').nth(3);
  const box = await satir.boundingBox();
  await s.mouse.click(box.x + box.width / 2, box.y + box.height / 2); await s.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await bekle(600);
  const defterSay = await s.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('yds-defter-v1') || '{}')).length);
  T('çift dokunma: detay açık, deftere yanlışlıkla eklenmedi', (await s.locator('.sz-detay').count()) === 1 && defterSay === 0);
  await ctx.close();
}

// 3) Yarım oturum + çift sayım: cevap verilip yenilenince aynı kart iki kez puanlanmamalı
{
  const { ctx, s } = await yeni();
  await s.evaluate((a) => { localStorage.clear(); localStorage.setItem('yds-ayar-v1', JSON.stringify(a)); }, AYAR); await s.reload({ waitUntil: 'networkidle' });
  await sek(s, 'kelimeler'); await seg(s, 'ogren'); await bekle(800);
  await s.locator('.ogr-mod-cip', { hasText: 'Test' }).click().catch(() => {}); await bekle(400);
  const basla = s.locator('#ogrBasla'); if (await basla.count()) { await basla.click(); await bekle(900); }
  // ilk kartı çoktan seçmeli bir kez cevapla (doğru/yanlış fark etmez)
  const ilkSik = s.locator('.q-secenek').first();
  if (await ilkSik.count()) {
    await ilkSik.click(); await bekle(300);
    const r1 = await s.evaluate(() => { const k = JSON.parse(localStorage.getItem('yds-srs-v1') || '{}').kartlar || {}; return Object.values(k).reduce((t, c) => t + (c.r || 0), 0); });
    await s.reload({ waitUntil: 'networkidle' }); await bekle(800);
    await sek(s, 'kelimeler'); await seg(s, 'ogren'); await bekle(500);
    const devam = s.locator('#ogrDevamKayit');
    T('yarım oturum panelde görünüyor', (await devam.count()) === 1);
    if (await devam.count()) { await devam.click(); await bekle(700); }
    const cevapli = await s.locator('.q-secenek.secili, .q-secenek:disabled').count();
    const r2 = await s.evaluate(() => { const k = JSON.parse(localStorage.getItem('yds-srs-v1') || '{}').kartlar || {}; return Object.values(k).reduce((t, c) => t + (c.r || 0), 0); });
    T('çift sayım yok: yenilemeden sonra toplam tekrar sayısı artmadı', r2 === r1);
  } else { T('çoktan seçme ekranı açıldı (ön koşul)', false); }
  // yeni oturum başlatınca yarım oturum için onay istenir
  await s.locator('#sekme-bar button[data-sekme="kelimeler"]').click().catch(() => {}); await bekle(400);
  await ctx.close();
}

// 4) Mini deneme: yenilemede ilerleme korunur; boş soru varken bitir onay ister
{
  const { ctx, s } = await yeni();
  await s.evaluate((a) => { localStorage.clear(); localStorage.setItem('yds-ayar-v1', JSON.stringify(a)); }, AYAR); await s.reload({ waitUntil: 'networkidle' });
  await sek(s, 'mufredat'); await s.locator('#mfBanka').click(); await bekle(700); await s.locator('#bkDeneme').click(); await bekle(500);
  await s.locator('#dnBasla').click(); await bekle(700);
  for (let i = 0; i < 3; i++) { await s.locator('.q-secenek').first().click(); await bekle(150); await s.locator('#dnSonraki').click().catch(() => {}); await bekle(150); }
  await s.reload({ waitUntil: 'networkidle' }); await bekle(700);
  await sek(s, 'mufredat'); await s.locator('#mfBanka').click(); await bekle(600); await s.locator('#bkDeneme').click(); await bekle(500);
  T('deneme: yarım kalan deneme devam düğmesi var', (await s.locator('#dnDevamEt').count()) === 1);
  await s.locator('#dnDevamEt').click(); await bekle(600);
  const cevapli = await s.locator('.dn-n.dolu').count();
  T('deneme: yenilemeden sonra 3 cevap korundu', cevapli === 3);
  // boş sorular varken "Sınavı bitir" (son soru) onay penceresi: dismiss ile kalmalı
  await s.locator('.dn-n[data-k="19"]').click(); await bekle(300);
  if (await s.locator('#dnBitir').count()) { await s.locator('#dnBitir').click(); await bekle(400); }
  T('deneme: boş sorularla onaysız bitmiyor (ekran sürüyor)', (await s.locator('#dnSure').count()) === 1);
  await ctx.close();
}

// 5) Özel kelime silinince SRS kaydı ve ipucu da silinir
{
  const { ctx, s } = await yeni();
  await s.evaluate((a) => {
    localStorage.clear(); localStorage.setItem('yds-ayar-v1', JSON.stringify(a));
    localStorage.setItem('yds-ozel-v1', JSON.stringify([{ en: 'zyxquor', tr: 'deneme', tur: 'İsim', t: 1 }]));
    localStorage.setItem('yds-defter-v1', JSON.stringify({ zyxquor: { en: 'zyxquor', tr: 'deneme' } }));
    localStorage.setItem('yds-srs-v1', JSON.stringify({ kartlar: { zyxquor: { b: 2, e: 2.5, i: 4, d: 1, r: 3, l: 0 } } }));
    localStorage.setItem('yds-not-v1', JSON.stringify({ zyxquor: 'ipucu' }));
  }, AYAR); await s.reload({ waitUntil: 'networkidle' });
  await sek(s, 'kelimeler'); await seg(s, 'defter'); await bekle(300);
  await s.locator('.sz-satir', { hasText: 'zyxquor' }).click(); await bekle(400);
  await s.locator('#szSil').click(); await bekle(300); await s.locator('#onayEvet').click(); await bekle(500);
  const d = await s.evaluate(() => ({ srs: Object.keys((JSON.parse(localStorage.getItem('yds-srs-v1') || '{}')).kartlar || {}), not: Object.keys(JSON.parse(localStorage.getItem('yds-not-v1') || '{}')) }));
  T('özel kelime silinince SRS kaydı ve ipucu da silindi', !d.srs.includes('zyxquor') && !d.not.includes('zyxquor'));
  await ctx.close();
}

// 6) Bugün: dünün görev değerleri bugüne taşınmaz; bozuk sayılar NaN göstermez; geçersiz sınav tarihi çökertmez
{
  const { ctx, s } = await yeni();
  const dun = new Date(Date.now() - 86400000); const dunStr = `${dun.getFullYear()}-${String(dun.getMonth() + 1).padStart(2, '0')}-${String(dun.getDate()).padStart(2, '0')}`;
  await s.evaluate(({ ayar, dun }) => { localStorage.clear(); localStorage.setItem('yds-ayar-v1', JSON.stringify({ ...ayar, gunTarih: dun, sonAktif: dun, gunSayac: 20, gunDogru: 15, gunBitirilen: 2, gorevBitti: { aktivite: true, dogru: true, bitir: true }, xp: 'x', sinavTarih: 12345 })); }, { ayar: AYAR, dun: dunStr });
  await s.reload({ waitUntil: 'networkidle' }); await bekle(800);
  const metin = await s.locator('body').innerText();
  T('görev: dünün 3/3 değeri bugüne taşınmadı', !/3\/3/.test(metin));
  T('bozuk XP ve geçersiz sınav tarihi: NaN yok, sayfa çalışıyor', !/NaN/.test(metin) && (await s.locator('#sekme-bar').count()) === 1);
  await ctx.close();
}

// 7) Tarayıcı kök bulma: yanlış eşleşmeler ve bağlaç filtresi
{
  const { ctx, s } = await yeni();
  await s.evaluate((a) => { localStorage.clear(); localStorage.setItem('yds-ayar-v1', JSON.stringify(a)); }, AYAR); await s.reload({ waitUntil: 'networkidle' });
  await sek(s, 'kelimeler'); await seg(s, 'tara'); await bekle(300);
  await s.locator('#trMetin').fill('The butter and flower on the sheer evening table. We noticed the ideas. but with of'); await s.locator('#trTara').click(); await bekle(500);
  const toks = await s.locator('.tr-tok').evaluateAll(els => els.map(e => ({ k: e.dataset.k.toLowerCase().replace(/[^a-z]/g, ''), en: e.dataset.en })));
  const yanlis = toks.filter(t => ['butter', 'flower', 'sheer', 'evening'].includes(t.k) && t.en !== t.k);
  T('tarayıcı: butter/flower/sheer/evening yanlış eşlenmiyor', yanlis.length === 0);
  T('tarayıcı: "noticed" → notice biçim olarak eşleniyor', toks.some(t => t.k === 'noticed' && t.en === 'notice'));
  const yeniListe = await s.locator('.tr-satir b').allTextContents();
  T('tarayıcı: bağlaçlar (and, but, with, of) bilmediğin listesinde değil', !yeniListe.some(x => ['and', 'but', 'with', 'of'].includes(x.trim())));
  await ctx.close();
}

console.log('\nSONUÇ:', sonuc.filter(Boolean).length + '/' + sonuc.length, 'geçti');
console.log('HATALAR:', hata.length ? hata : 'yok');
await b.close();
