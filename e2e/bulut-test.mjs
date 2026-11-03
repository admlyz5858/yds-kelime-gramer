const BASE = process.env.BASE || 'http://localhost:8905/';   // uygulama adresi (ör. BASE=http://localhost:8901/ npm)
// Bulut yedek e2e — Supabase uçları sahte sunucuyla (page.route) taklit edilir
const { chromium } = await import(new URL('../mobil/node_modules/playwright/index.mjs', import.meta.url));
const SCRATCH = process.env.SHOT_DIR || '/tmp';   // ekran görüntüleri
const hata = [];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await b.newContext({ viewport: { width: 412, height: 860 }, deviceScaleFactor: 2 });
const s = await ctx.newPage();
s.on('pageerror', e => hata.push('SAYFA: ' + e.message));
s.on('console', m => { if (m.type() === 'error' && !m.text().includes('404') && !m.text().includes('vibrate')) hata.push('KONSOL: ' + m.text()); });
const bekle = (ms) => s.waitForTimeout(ms);
const T = async (ad, kosul) => console.log((kosul ? '✓' : '✗ FAIL'), ad);
const sek = async (ad) => { await s.locator(`#sekme-bar button[data-sekme="${ad}"]`).click(); await bekle(700); };
// ---- sahte Supabase
const sunucu = { otp: [], verify: [], yedek: null, yazim: 0 };
await ctx.route('https://thftjeecotladgnuqwhd.supabase.co/**', async (route) => {
  const r = route.request(); const u = new URL(r.url()); const govde = r.postDataJSON?.() || null;
  if (u.pathname === '/auth/v1/otp') { sunucu.otp.push(govde.email); return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }); }
  if (u.pathname === '/auth/v1/verify') { sunucu.verify.push(govde.token); if (govde.token !== '123456') return route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ error_code: 'otp_expired', msg: 'Token has expired or is invalid' }) }); return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ access_token: 'erisim', refresh_token: 'yenile', expires_in: 3600, user: { id: 'u-1', email: govde.email } }) }); }
  if (u.pathname === '/auth/v1/authorize') { sunucu.authorize = u.searchParams.get('redirect_to'); return route.fulfill({ status: 302, headers: { Location: sunucu.authorize + '#access_token=g-erisim&expires_in=3600&refresh_token=g-yenile&token_type=bearer' } }); }
  if (u.pathname === '/auth/v1/user') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 'u-g', email: 'google@example.com' }) });
  if (u.pathname === '/auth/v1/logout') return route.fulfill({ status: 204, body: '' });
  if (u.pathname === '/rest/v1/yedekler' && r.method() === 'GET') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(sunucu.yedek ? [sunucu.yedek] : []) });
  if (u.pathname === '/rest/v1/yedekler' && r.method() === 'POST') { sunucu.yazim++; sunucu.yedek = { veri: govde.veri, guncelleme: govde.guncelleme, cihaz: govde.cihaz }; return route.fulfill({ status: 201, body: '' }); }
  if (u.pathname === '/rest/v1/rpc/hesabimi_sil') { sunucu.yedek = null; return route.fulfill({ status: 204, body: '' }); }
  return route.fulfill({ status: 404, body: '{}' });
});
await s.goto('' + BASE + '', { waitUntil: 'networkidle' });
await s.evaluate(() => { localStorage.clear(); localStorage.setItem('yds-ayar-v1', JSON.stringify({ girisGoruldu: true, toplamAktivite: 40, xp: 300, ipucuGoruldu: { bugun: 1, kelimeler: 1, mufredat: 1, oyun: 1, ben: 1 } })); localStorage.setItem('yds-defter-v1', JSON.stringify({ abandon: { en: 'abandon', tr: 'terk etmek' } })); });
await s.reload({ waitUntil: 'networkidle' }); await bekle(900);
T('Bugün: kaydet önerisi (girişsiz, aktivite ≥ 1)', (await s.locator('#pBulut').count()) === 1);
// --- ilk oturum bitince tek seferlik kayıt önerisi (banka testi çöz)
await s.evaluate(() => { const a = JSON.parse(localStorage.getItem('yds-ayar-v1')); a.toplamAktivite = 4; a.kayitSoruldu = false; localStorage.setItem('yds-ayar-v1', JSON.stringify(a)); });
await s.reload({ waitUntil: 'networkidle' }); await bekle(800);
await sek('mufredat'); await s.locator('#mfBanka').click(); await bekle(800); await s.locator('.bk-konu[data-konu="modal"]').click(); await bekle(400); await s.locator('.bk-alt[data-alt="cikarim"]').click(); await bekle(400); await s.locator('.test-link').first().click(); await bekle(500);
for (let i = 0; i < 10; i++) { await s.locator('.q-secenek').first().click(); await bekle(150); await s.locator('#bkDevam').click(); await bekle(150); }
await bekle(1800);
T('ilk oturum bitince kayıt önerisi penceresi (Google + e-posta + geç)', (await s.locator('#hsGoogle').count()) === 1 && (await s.locator('#hsGec').count()) === 1 && (await s.locator('#hsEposta').count()) === 1);
await s.screenshot({ path: SCRATCH + '/bulut-oner.png' });
await s.locator('#hsGec').click(); await bekle(300);
T('geç → bir daha sorulmaz bayrağı', (await s.evaluate(() => JSON.parse(localStorage.getItem('yds-ayar-v1')).kayitSoruldu)) === true && (await s.locator('.modal-katman').count()) === 0);
// --- Google ile giriş (web akışı: yönlendirme → #token ile dönüş)
for (let k = 0; k < 4 && (await s.locator('#geri:visible').count()); k++) { await s.locator('#geri').click(); await bekle(400); }
console.log('   geri sonrası baslik:', await s.locator('#baslik').textContent(), '| geri görünür:', await s.locator('#geri:visible').count());
await sek('ben'); console.log('   ben: giris-yap satırı:', await s.locator('.ayar-sat[data-is="giris-yap"]').count(), '| hesap-sat:', await s.locator('.hesap-sat').count(), '| ayar-sat:', await s.locator('.ayar-sat').count(), '| baslik:', await s.locator('#baslik').textContent()); await s.locator('.ayar-sat[data-is="giris-yap"]').click({ timeout: 5000 }).catch(e => console.log('   tıklama hatası:', e.message.slice(0, 120))); await bekle(300);
await Promise.all([s.waitForURL(/localhost:8905/, { waitUntil: 'networkidle' }), s.locator('#hsGoogle').click()]); await bekle(2500);
const hg = await s.evaluate(() => JSON.parse(localStorage.getItem('yds-hesap-v1')));
console.log('   google debug:', s.url(), JSON.stringify(hg), 'authorize→', sunucu.authorize, '| baslik:', await s.locator('#baslik').textContent(), '| hatalar:', JSON.stringify(hata));
await s.screenshot({ path: SCRATCH + '/bulut-google-dbg.png' });
console.log('   hesap-sat sayısı:', await s.locator('.hesap-sat').count(), '| giris-yap:', await s.locator('.ayar-sat[data-is="giris-yap"]').count(), '| icerik:', (await s.locator('#icerik').innerText()).slice(0, 200).replace(/\n/g, ' / '));
T('Google dönüşü: oturum kuruldu, adres temizlendi, Ben açıldı', hg && hg.saglayici === 'google' && hg.eposta === 'google@example.com' && hg.kullanici === 'u-g' && !s.url().includes('access_token') && (await s.locator('.hesap-sat').textContent()).includes('Google hesabı'));
T('Google girişi sonrası ilk yedek yazıldı', sunucu.yazim === 1 && sunucu.yedek.veri.veri['yds-defter-v1'].abandon);
await s.screenshot({ path: SCRATCH + '/bulut-google.png', fullPage: true });
await s.locator('.ayar-sat[data-is="cikis-yap"]').click(); await bekle(300); await s.locator('#onayEvet').click(); await bekle(600);
sunucu.yedek = null; sunucu.yazim = 0;
await sek('bugun');
await sek('ben');
T('Ben: giriş satırı', (await s.locator('.ayar-sat[data-is="giris-yap"]').count()) === 1 && (await s.locator('.ayar-sat[data-is="yedekal"]').count()) === 0);
await s.locator('.ayar-sat[data-is="giris-yap"]').click(); await bekle(400);
await s.locator('#hsEposta').fill('kullanici@example.com'); await s.locator('#hsGonder').click(); await bekle(500);
T('kod gönderildi, kod alanı açıldı', sunucu.otp[0] === 'kullanici@example.com' && !(await s.locator('#hsKodAlan').isHidden()));
await s.locator('#hsKod').fill('000000'); await s.locator('#hsDogrula').click(); await bekle(500);
T('yanlış kod mesajı', (await s.locator('#hsMsg').textContent()).includes('hatalı'));
await s.locator('#hsKod').fill('123456'); await s.locator('#hsDogrula').click(); await bekle(1500);
const h = await s.evaluate(() => JSON.parse(localStorage.getItem('yds-hesap-v1')));
T('oturum kaydedildi ve ilk yedek buluta yazıldı (yerel dolu, bulut boş → yükle)', h && h.eposta === 'kullanici@example.com' && sunucu.yazim === 1 && sunucu.yedek.veri.veri['yds-defter-v1'].abandon);
T('yedekte oturum anahtarı yok', !('yds-hesap-v1' in sunucu.yedek.veri.veri));
T('Ben: hesap satırı e-posta ile', (await s.locator('.hesap-sat').textContent()).includes('kullanici@example.com'));
await s.screenshot({ path: SCRATCH + '/bulut-ben.png', fullPage: true });
// yerel değişiklik → gecikmeli otomatik yazım (zamanlayıcıyı test için kısaltamayız; hemenYaz ile tetikle)
await s.evaluate(() => { const d = JSON.parse(localStorage.getItem('yds-defter-v1')); d.ability = { en: 'ability', tr: 'yetenek' }; localStorage.setItem('yds-defter-v1', JSON.stringify(d)); });
await sek('kelimeler'); await s.locator('.segment button[data-seg="defter"]').click(); await bekle(300);
// gerçek bir kayıt işlemi: deftere ekle (balon yerine özel kelime)
await s.locator('#ozelEkleBtn').click(); await bekle(300); await s.locator('#ozEn').fill('bulutword'); await s.locator('#ozTr').fill('deneme'); await s.locator('#ozKaydet').click(); await bekle(400);
const dbg = await s.evaluate(() => ({ d: window.__bulut.durum(), ozel: JSON.parse(localStorage.getItem('yds-ozel-v1') || '[]').length, h: JSON.parse(localStorage.getItem('yds-hesap-v1')) }));
console.log('   debug:', JSON.stringify(dbg).slice(0, 300));
T('kayıt sonrası kirli bayrağı', dbg.d.kirli === true && dbg.h.bekleyen === true);
await s.evaluate(() => window.__bulut.hemenYaz()); await bekle(500);
T('hemen eşitle → buluta yazıldı, kirli temizlendi', sunucu.yazim === 2 && sunucu.yedek.veri.veri['yds-ozel-v1'].length === 1 && (await s.evaluate(() => window.__bulut.durum().kirli)) === false);
// başka cihazda daha yeni yedek → açılışta indir
sunucu.yedek = { veri: { uygulama: 'kelimetre', surum: 1, veri: { 'yds-defter-v1': { zeal: { en: 'zeal', tr: 'şevk' } }, 'yds-ayar-v1': { girisGoruldu: true, xp: 999, ipucuGoruldu: { bugun: 1, kelimeler: 1, mufredat: 1, oyun: 1, ben: 1 } } } }, guncelleme: new Date(Date.now() + 60000).toISOString(), cihaz: 'ios-pwa' };
await s.reload({ waitUntil: 'networkidle' }); await bekle(3500);
const df = await s.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('yds-defter-v1') || '{}')));
T('bulut daha yeni → cihaza indirildi (zeal var, abandon yok)', df.includes('zeal') && !df.includes('abandon'));
// çakışma: çevrimdışı yapılmış (bekleyen) yerel değişiklik + başka cihazdan daha yeni bulut → açılışta sor
await s.evaluate(() => { const h = JSON.parse(localStorage.getItem('yds-hesap-v1')); h.bekleyen = true; localStorage.setItem('yds-hesap-v1', JSON.stringify(h)); localStorage.setItem('yds-ozel-v1', JSON.stringify([{ en: 'conflictword', tr: 'çakışma', tur: 'İsim', t: 1 }])); });
sunucu.yedek.guncelleme = new Date(Date.now() + 120000).toISOString();
await s.reload({ waitUntil: 'networkidle' }); await bekle(2500);
T('çakışma sorusu açıldı', (await s.locator('#bsIndir').count()) === 1 && (await s.locator('#bsYukle').count()) === 1);
await s.screenshot({ path: SCRATCH + '/bulut-sor.png' });
await s.locator('#bsYukle').click(); await bekle(800);
T('"bu cihaz" seçimi → buluta yazıldı', sunucu.yedek.veri.veri['yds-ozel-v1'] && sunucu.yedek.veri.veri['yds-ozel-v1'][0].en === 'conflictword');
await sek('ben');
// çıkış
await s.locator('.ayar-sat[data-is="cikis-yap"]').click(); await bekle(300); await s.locator('#onayEvet').click(); await bekle(600);
T('çıkış: hesap yok, yerel veri duruyor', (await s.evaluate(() => localStorage.getItem('yds-hesap-v1'))) === null && (await s.evaluate(() => JSON.parse(localStorage.getItem('yds-ozel-v1')).length)) === 1 && (await s.locator('.ayar-sat[data-is="giris-yap"]').count()) === 1);
console.log('\nHATALAR:', hata.length ? hata : 'yok');
await b.close();
