// app/js/bulut.js — E-posta hesabı + bulut yedekleme (Supabase Auth e-posta kodu + PostgREST, SDK'sız).
// Akış: e-posta → 6 haneli kod → oturum (yds-hesap-v1; yedeğe GİRMEZ). Oturum varken:
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
export function durum() { return { girili: !!hesap, eposta: hesap?.eposta || '', sonSenkron: hesap?.sonSenkron || 0, kirli, hata: hesap?.hata || '' }; }

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
