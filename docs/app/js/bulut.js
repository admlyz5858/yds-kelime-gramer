// app/js/bulut.js — E-posta hesabı + bulut yedekleme (Supabase Auth e-posta kodu + PostgREST, SDK'sız).
// Akış: Google ile giriş (OAuth yönlendirme) ya da e-posta → 6 haneli kod → oturum (yds-hesap-v1; yedeğe GİRMEZ). Oturum varken:
//   - her yerel kayıtta "kirli" bayrağı → 20 sn sonra (ya da uygulama arka plana geçince) buluta yazılır
//   - açılışta bulut sürümü yerelden yeniyse ve yerelde bekleyen değişiklik yoksa bulut cihaza indirilir
//   - ikisi de değişmişse kullanıcıya sorulur (bulut mu, bu cihaz mı)
import { yedekAl, yedekYukle, kayitDinle } from './storage.js';

const URL = 'https://thftjeecotladgnuqwhd.supabase.co';
const KEY = 'sb_publishable_Up8BuFFjwR-nNFlyyGpmzA_ns50xFAU';
const HKEY = 'yds-hesap-v1';
const BEKLEME_MS = 20000;

let hesap = oku();
let kirli = !!(hesap && hesap.bekleyen), zamanlayici = null, dinleyiciler = [];
function oku() { try { return JSON.parse(localStorage.getItem(HKEY)) || null; } catch { return null; } }
function yaz(h) { hesap = h; if (h) localStorage.setItem(HKEY, JSON.stringify(h)); else localStorage.removeItem(HKEY); bildir(); }
function bildir() { for (const f of dinleyiciler) { try { f(durum()); } catch {} } }
export function dinle(f) { dinleyiciler.push(f); }
export function durum() { return { girili: !!hesap, eposta: hesap?.eposta || '', saglayici: hesap?.saglayici || 'eposta', sonSenkron: hesap?.sonSenkron || 0, kirli, hata: hesap?.hata || '' }; }

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
export const epostaGecerli = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(e || '').trim());
// 1) kod gönder (kullanıcı yoksa oluşturulur)
export async function kodGonder(eposta) {
  await istek('/auth/v1/otp', { method: 'POST', govde: { email: String(eposta).trim().toLowerCase(), create_user: true } });
  return true;
}
// 2) kodu doğrula → oturum
export async function kodDogrula(eposta, kod) {
  const r = await istek('/auth/v1/verify', { method: 'POST', govde: { type: 'email', email: String(eposta).trim().toLowerCase(), token: String(kod).trim() } });
  if (!r || !r.access_token) throw new Error('Oturum açılamadı');
  yaz({ eposta: r.user?.email || eposta, kullanici: r.user?.id, erisim: r.access_token, yenileme: r.refresh_token, bitis: Date.now() + (r.expires_in || 3600) * 1000, sonSenkron: 0 });
  return durum();
}

// ---- Google ile giriş (Supabase OAuth, SDK'sız; tokenlar dönüş adresinin #parçasında gelir) ----
const DONUS_ANDROID = 'kelimetre://auth';
export const donusAdresi = () => (typeof window !== 'undefined' && window.Capacitor?.Plugins?.Browser) ? DONUS_ANDROID : (location.origin + location.pathname);
export const googleUrl = (donus) => `${URL}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(donus)}`;
// "#access_token=…&refresh_token=…" ya da "?error=…" → {erisim, yenileme, bitis} | {hata} | null
export function donusCoz(url) {
  const u = String(url || ''); const h = u.indexOf('#'); const q = u.indexOf('?');
  const parca = new URLSearchParams((h >= 0 ? u.slice(h + 1) : '') + '&' + (q >= 0 ? u.slice(q + 1, h >= 0 && h > q ? h : undefined) : ''));
  const hata = parca.get('error_description') || parca.get('error');
  if (hata) return { hata: decodeURIComponent(String(hata).replace(/\+/g, ' ')) };
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
export async function googleIleGiris() {
  const B = typeof window !== 'undefined' && window.Capacitor?.Plugins?.Browser, A = typeof window !== 'undefined' && window.Capacitor?.Plugins?.App;
  const url = googleUrl(donusAdresi());
  if (!B || !A) { location.href = url; return new Promise(() => {}); }
  return new Promise((coz, red) => {
    const zaman = setTimeout(() => { temizle(); red(new Error('Zaman aşımı')); }, 5 * 60000);
    const temizle = () => { clearTimeout(zaman); googleBekleyen = null; try { B.close(); } catch {} };
    googleBekleyen = async (gelen) => {
      const t = donusCoz(gelen); if (!t) return;   // başka bir derin bağlantı
      temizle();
      if (t.hata) { red(new Error(t.hata)); return; }
      try { coz(await oturumTamamla(t)); } catch (e) { red(e); }
    };
    B.open({ url, presentationStyle: 'popover' }).catch(e => { temizle(); red(e); });
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
  if (t.hata) throw new Error(t.hata);
  await oturumTamamla(t); return true;
}
async function erisimAl() {
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
export function karar({ kirli, sonSenkron, bulutZaman, yerelBos }) {
  if (bulutZaman == null) return 'yukle';
  if (yerelBos) return 'indir';                      // bu cihaz boş: buluttaki her şey kazanır
  const bulutYeni = bulutZaman > sonSenkron + 1000;
  if (!kirli && bulutYeni) return 'indir';
  if (kirli && !bulutYeni) return 'yukle';
  if (kirli && bulutYeni) return 'sor';
  return 'esit';
}
export const yerelBosMu = () => { const o = ozetCikar(yedekAl().veri); return o.kart === 0 && o.test === 0 && o.defter === 0 && o.xp < 50; };

// Açılışta / girişte eşitleme. sor(bulut) → Promise<'indir'|'yukle'|null>
export async function esitle(sor) {
  if (!hesap) return null;
  try {
    const bulut = await bulutOku();
    const k = karar({ kirli, sonSenkron: hesap.sonSenkron || 0, bulutZaman: bulut ? bulut.guncelleme : null, yerelBos: yerelBosMu() });
    if (k === 'yukle') { await bulutaYaz(); return 'yukle'; }
    if (k === 'indir') { buluttanUygula(bulut); return 'indir'; }
    if (k === 'sor') { const secim = sor ? await sor(bulut) : null; if (secim === 'indir') { buluttanUygula(bulut); return 'indir'; } if (secim === 'yukle') { await bulutaYaz(); return 'yukle'; } return null; }
    return 'esit';
  } catch (e) { yaz({ ...hesap, hata: String(e.message || e) }); return 'hata'; }
}

// Yerel kayıt → gecikmeli buluta yazma
function planla() {
  if (!hesap) return;
  kirli = true;
  if (!hesap.bekleyen) yaz({ ...hesap, bekleyen: true }); else bildir();   // kalıcı: uygulama kapanıp açılsa da bekleyen değişiklik bilinir
  clearTimeout(zamanlayici);
  zamanlayici = setTimeout(() => { bulutaYaz().catch(e => yaz({ ...hesap, hata: String(e.message || e) })); }, BEKLEME_MS);
}
export function hemenYaz() { clearTimeout(zamanlayici); if (hesap && kirli) return bulutaYaz().catch(() => {}); return Promise.resolve(); }
kayitDinle((anahtar) => { if (anahtar !== HKEY) planla(); });
if (typeof document !== 'undefined') document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') hemenYaz(); });
