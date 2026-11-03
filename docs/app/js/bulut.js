// app/js/bulut.js — Google ile giriş + bulut yedekleme (Supabase Auth OAuth + PostgREST, SDK'sız).
// Akış: Google ile giriş (OAuth yönlendirme) → oturum (yds-hesap-v1; yedeğe GİRMEZ). Oturum varken:
//   - yerel kayıtlar "kirli" bayrağı olarak işaretlenir; buluta YAZIM YALNIZCA kullanıcı "Şimdi eşitle" dediğinde
//     ya da girişte yapılır (OTOMATIK_YAZIM=false: çakışmada veri ezilmesin diye güvenli mod)
//   - bulut sürümü yerelden yeniyse ve yerelde değişiklik yoksa bulut cihaza indirilir
//   - ilk eşitlemede iki taraf da doluysa, ya da ikisi de değişmişse kullanıcıya sorulur (bulut mu, bu cihaz mı)
//   - bulutta yedek silinmişse (bu cihaz daha önce eşitlemişti) oturum kapatılır
import { yedekAl, yedekYukle, kayitDinle, loadOlay, olayYazSessiz } from './storage.js';
import { birlestir, kirp } from './olay.js';
const OLAY = 'yds-olay-v1';

const URL = 'https://thftjeecotladgnuqwhd.supabase.co';
const KEY = 'sb_publishable_Up8BuFFjwR-nNFlyyGpmzA_ns50xFAU';
const HKEY = 'yds-hesap-v1';
const BEKLEME_MS = 20000;
// Otomatik yazım kapalı: kayıtlar yalnızca elle eşitlemede ya da girişte buluta gider. Çok cihaz birleşimi (olay günlüğü) gelene kadar açılmaz.
const OTOMATIK_YAZIM = false;

let hesap = oku();
let kirli = !!(hesap && hesap.bekleyen), zamanlayici = null, dinleyiciler = [];
function oku() { try { return JSON.parse(localStorage.getItem(HKEY)) || null; } catch { return null; } }
function yaz(h) { hesap = h; if (h) localStorage.setItem(HKEY, JSON.stringify(h)); else localStorage.removeItem(HKEY); bildir(); }
// Başka sekme/cihaz oturumu değiştirdiyse bellekteki kopyayı tazele (eski belirteci geri yazmayı önler)
function tazele() { const g = oku(); if (g) hesap = g; return hesap; }
if (typeof window !== 'undefined') window.addEventListener('storage', (e) => { if (e.key === HKEY) { hesap = oku(); bildir(); } });
function bildir() { for (const f of dinleyiciler) { try { f(durum()); } catch {} } }
export function dinle(f) { dinleyiciler.push(f); }
export function durum() { return { girili: !!hesap, eposta: hesap?.eposta || '', saglayici: hesap?.saglayici || 'google', sonSenkron: hesap?.sonSenkron || 0, kirli, hata: hesap?.hata || '' }; }

async function istek(yol, { method = 'GET', govde, yetki, prefer } = {}) {
  const ac = new AbortController(); const z = setTimeout(() => ac.abort(), 12000);
  try {
    const h = { apikey: KEY, 'Content-Type': 'application/json', Authorization: 'Bearer ' + (yetki || KEY) };
    if (prefer) h.Prefer = prefer;
    const r = await fetch(URL + yol, { method, signal: ac.signal, headers: h, body: govde ? JSON.stringify(govde) : undefined });
    const metin = await r.text(); let veri = null; try { veri = metin ? JSON.parse(metin) : null; } catch { veri = metin; }
    if (!r.ok) { const e = new Error((veri && (veri.msg || veri.message || veri.error_description || veri.error)) || ('HTTP ' + r.status)); e.status = r.status; e.kod = veri && (veri.error_code || veri.code); throw e; }
    return veri;
  } finally { clearTimeout(z); }
}

// ---- Kimlik ----

// ---- Google ile giriş (Supabase OAuth, SDK'sız; tokenlar dönüş adresinin #parçasında gelir) ----
const DONUS_ANDROID = 'kelimetre://auth';
export const donusAdresi = () => (typeof window !== 'undefined' && window.Capacitor?.Plugins?.Browser) ? DONUS_ANDROID : (location.origin + location.pathname);
export const googleUrl = (donus) => `${URL}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(donus)}`;
// "#access_token=…&refresh_token=…" ya da "?error=…" → {erisim, yenileme, bitis} | {hata} | null
export function donusCoz(url) {
  const u = String(url || ''); const h = u.indexOf('#'); const q = u.indexOf('?');
  const parca = new URLSearchParams((h >= 0 ? u.slice(h + 1) : '') + '&' + (q >= 0 ? u.slice(q + 1, h >= 0 && h > q ? h : undefined) : ''));
  const hata = parca.get('error_description') || parca.get('error');
  if (hata) return { hata: String(hata).replace(/\+/g, ' ') };   // URLSearchParams zaten çözer (çift çözme '%' ile çökerdi)
  const erisim = parca.get('access_token'), yenileme = parca.get('refresh_token');
  if (!erisim || !yenileme) return null;
  return { erisim, yenileme, bitis: Date.now() + (Number(parca.get('expires_in')) || 3600) * 1000 };
}
async function oturumTamamla(t) {
  const k = await istek('/auth/v1/user', { yetki: t.erisim });
  if (!k || !k.id) throw new Error('Kullanıcı bilgisi alınamadı');
  yaz({ eposta: k.email || '', kullanici: k.id, erisim: t.erisim, yenileme: t.yenileme, bitis: t.bitis, sonSenkron: 0, saglayici: 'google' });
  return durum();
}
let googleBekleyen = null;
// Android: sistem tarayıcı sekmesi + kelimetre://auth derin bağlantısı · Web/PWA: aynı pencerede yönlendirme (dönüşte donusIsle)
// Bu cihazın başlattığı bir giriş beklendiğini işaretler. Dönüşte yalnızca bu işaret varsa adres çubuğundaki belirteç kabul edilir
// (kötü niyetli bir bağlantının oturumu değiştirmesini önler).
const BEKLE_KEY = 'yds-google-bekle';
const isaretle = (v) => { try { if (v) localStorage.setItem(BEKLE_KEY, '1'); else localStorage.removeItem(BEKLE_KEY); } catch {} };
const isaretVar = () => { try { return localStorage.getItem(BEKLE_KEY) === '1'; } catch { return false; } };
export async function googleIleGiris() {
  const B = typeof window !== 'undefined' && window.Capacitor?.Plugins?.Browser, A = typeof window !== 'undefined' && window.Capacitor?.Plugins?.App;
  const url = googleUrl(donusAdresi());
  isaretle(true);
  if (!B || !A) { location.href = url; return new Promise(() => {}); }
  return new Promise((coz, red) => {
    const id = {};   // bu denemenin kimliği: eski deneme yeni denemeyi silmesin
    let zaman = null;
    const temizle = () => { clearTimeout(zaman); if (googleBekleyen && googleBekleyen.id === id) googleBekleyen = null; try { B.close(); } catch {} };
    const bitir = async (gelen) => {
      const t = donusCoz(gelen); if (!t) return;   // başka bir derin bağlantı
      temizle(); isaretle(false);
      if (t.hata) { red(new Error(t.hata)); return; }
      try { coz(await oturumTamamla(t)); } catch (e) { red(e); }
    };
    bitir.id = id;
    googleBekleyen = bitir;
    zaman = setTimeout(() => { temizle(); isaretle(false); red(new Error('Zaman aşımı')); }, 5 * 60000);
    B.open({ url, presentationStyle: 'popover' }).catch(e => { temizle(); isaretle(false); red(e); });
  });
}
if (typeof window !== 'undefined' && window.Capacitor?.Plugins?.App?.addListener) {
  window.Capacitor.Plugins.App.addListener('appUrlOpen', ({ url }) => { if (googleBekleyen && String(url).startsWith(DONUS_ANDROID)) googleBekleyen(url); });
}
// Web/PWA açılışı: adres çubuğunda token varsa oturumu kur, adresi temizle. → Promise<true|false>, hata fırlatır
export async function donusIsle() {
  if (typeof location === 'undefined') return false;
  const t = donusCoz(location.href); if (!t) return false;
  try { history.replaceState(null, '', location.pathname); } catch {}
  if (!isaretVar()) return false;   // bu cihazdan başlatılmamış dönüş: belirteç kabul edilmez
  isaretle(false);
  if (t.hata) throw new Error(t.hata);
  await oturumTamamla(t); return true;
}
async function erisimAl() {
  tazele();
  if (!hesap) throw new Error('Oturum yok');
  if (Date.now() < (hesap.bitis || 0) - 60000) return hesap.erisim;
  const r = await istek('/auth/v1/token?grant_type=refresh_token', { method: 'POST', govde: { refresh_token: hesap.yenileme } });
  if (!r || !r.access_token) throw new Error('Oturum yenilenemedi');
  yaz({ ...hesap, erisim: r.access_token, yenileme: r.refresh_token || hesap.yenileme, bitis: Date.now() + (r.expires_in || 3600) * 1000 });
  return hesap.erisim;
}
export async function hesabiSil() {
  const y = await erisimAl();
  try { await istek('/rest/v1/rpc/hesabimi_sil', { method: 'POST', yetki: y, govde: {} }); yaz(null); return 'tam'; }
  catch (e) {
    if (e.status !== 404) throw e;
    // RPC kurulmamışsa: yedek satırını sil, oturumu kapat (hesap kaydı dashboard'dan silinir)
    await istek(`/rest/v1/yedekler?kullanici=eq.${hesap.kullanici}`, { method: 'DELETE', yetki: y, prefer: 'return=minimal' });
    await cikis(); return 'yedek';
  }
}
export async function cikis() {
  try { if (hesap) await istek('/auth/v1/logout', { method: 'POST', yetki: await erisimAl() }); } catch {}
  yaz(null);
}

// ---- Yedek ----
const paket = () => { const y = yedekAl(); delete y.veri[HKEY]; return y; };
const ozetCikar = (veri) => ({ kart: Object.keys((veri['yds-srs-v1'] || {}).kartlar || {}).length, defter: Object.keys(veri['yds-defter-v1'] || {}).length, test: Object.keys(veri['yds-test-istat-v1'] || {}).length, xp: (veri['yds-ayar-v1'] || {}).xp || 0 });

export async function bulutOku() {
  const y = await erisimAl();
  const r = await istek(`/rest/v1/yedekler?select=veri,guncelleme,cihaz&kullanici=eq.${hesap.kullanici}`, { yetki: y });
  const satir = Array.isArray(r) ? r[0] : null;
  if (!satir) return null;
  return { veri: satir.veri, guncelleme: new Date(satir.guncelleme).getTime(), cihaz: satir.cihaz, ozet: ozetCikar(satir.veri.veri || {}) };
}
export async function bulutaYaz() {
  const y = await erisimAl(); const p = paket();
  const simdi = new Date().toISOString();
  await istek('/rest/v1/yedekler', { method: 'POST', yetki: y, prefer: 'resolution=merge-duplicates,return=minimal', govde: { kullanici: hesap.kullanici, veri: p, guncelleme: simdi, cihaz: cihazAdi() } });
  kirli = false; yaz({ ...hesap, sonSenkron: new Date(simdi).getTime(), hata: '', bekleyen: false });
  return true;
}
export function buluttanUygula(bulut) { const n = yedekYukle(bulut.veri); kirli = false; yaz({ ...hesap, sonSenkron: bulut.guncelleme, hata: '', bekleyen: false }); return n; }
const cihazAdi = () => (typeof window === 'undefined' ? 'node' : window.Capacitor ? 'android' : /iPhone|iPad/.test(navigator.userAgent) ? 'ios-pwa' : 'web');

// Karar: yerel değişiklik var mı, bulut daha yeni mi? → 'yukle' | 'indir' | 'sor' | 'esit'
export function karar({ kirli, sonSenkron, bulutZaman, yerelBos, olayFarki = false }) {
  if (bulutZaman == null) return sonSenkron > 0 ? 'silindi' : 'yukle';   // daha önce eşitlenmiş ama bulutta yedek yoksa: hesap silinmiş
  const bulutYeni = !sonSenkron || bulutZaman > sonSenkron + 1000;      // hiç eşitlenmemiş cihaz için bulut her zaman "yeni" sayılır
  if (!sonSenkron && !yerelBos) return 'sor';                          // ilk eşitleme ve iki taraf da dolu: kullanıcıya sorulur
  if (yerelBos) return bulutYeni ? 'indir' : (kirli || olayFarki ? 'yukle' : 'esit'); // bu cihaz boş: bulut kazanır; tekrar indirme döngüsü yok
  if (!kirli && bulutYeni) return 'indir';
  if (kirli && !bulutYeni) return 'yukle';
  if (kirli && bulutYeni) return 'sor';
  return olayFarki ? 'yukle' : 'esit';   // yalnızca cevap olayları farklıysa birleşimi buluta gönder
}
export const yerelBosMu = () => { const o = ozetCikar(yedekAl().veri); return o.kart === 0 && o.test === 0 && o.defter === 0 && o.xp < 50; };

// Açılışta / girişte eşitleme. sor(bulut) → Promise<'indir'|'yukle'|null>
export async function esitle(sor) {
  if (!hesap) return null;
  try {
    const bulut = await bulutOku();
    // Cevap olayları kimliğe göre birleşir: iki cihazın cevapları da korunur, çakışma sorusu gerekmez
    let olayFarki = false;
    if (bulut) {
      const yerel = loadOlay();
      const uzak = Array.isArray(bulut.veri?.veri?.[OLAY]) ? bulut.veri.veri[OLAY] : [];
      const uzakKimlik = new Set(uzak.map(o => o.id));
      olayFarki = yerel.some(o => !uzakKimlik.has(o.id));
      const birlesik = kirp(birlestir(yerel, uzak));
      olayYazSessiz(birlesik);
      bulut.veri.veri[OLAY] = birlesik;
    }
    const k = karar({ kirli, sonSenkron: hesap.sonSenkron || 0, bulutZaman: bulut ? bulut.guncelleme : null, yerelBos: yerelBosMu(), olayFarki });
    if (k === 'silindi') { yaz(null); return 'silindi'; }
    if (k === 'yukle') { await bulutaYaz(); return 'yukle'; }
    if (k === 'indir') { buluttanUygula(bulut); if (olayFarki) await bulutaYaz(); return 'indir'; }
    if (k === 'sor') { const secim = sor ? await sor(bulut) : null; if (secim === 'indir') { buluttanUygula(bulut); return 'indir'; } if (secim === 'yukle') { await bulutaYaz(); return 'yukle'; } return null; }
    if (hesap && hesap.hata) yaz({ ...hesap, hata: '' });   // başarılı eşitlemede eski hata metni kalmasın
    return 'esit';
  } catch (e) { yaz({ ...hesap, hata: String(e.message || e) }); return 'hata'; }
}

// Yerel kayıt → "kirli" işareti (kalıcı). Otomatik yazım açıksa gecikmeli yazar.
function planla() {
  if (!tazele()) return;
  kirli = true;
  if (!hesap.bekleyen) yaz({ ...hesap, bekleyen: true }); else bildir();   // bekleyen: uygulama kapanıp açılsa da bilinir
  if (!OTOMATIK_YAZIM) return;
  clearTimeout(zamanlayici);
  zamanlayici = setTimeout(() => { bulutaYaz().catch(e => yaz({ ...hesap, hata: String(e.message || e) })); }, BEKLEME_MS);
}
// Elle eşitleme için: bekleyen değişiklik varsa buluta yazar (çakışma kontrolü için app.js bulutEsitle kullanılmalı)
export function hemenYaz() { clearTimeout(zamanlayici); if (tazele() && kirli) return bulutaYaz().catch(() => {}); return Promise.resolve(); }
kayitDinle((anahtar) => { if (anahtar !== HKEY) planla(); });
