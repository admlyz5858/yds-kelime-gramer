// app/js/durum.js — Kelime durumu tek yerde: aralıklı tekrar (SRS) kartları + Kelime Defteri.
// Akış "Biliyorum", Öğren derecelendirmesi, sözlük ve oyun hepsi aynı kayıtları okur/yazar.
import { loadSRS, saveSRS, loadDefter, saveDefter, loadOgrenilen } from './storage.js';

export const PEKISME = 21;              // gün: bu aralığa ulaşan kelime "pekişti" (öğrenildi) sayılır
const bugunGun = () => Math.floor(Date.now() / 86400000);

export const srs = Object.assign({ surum: 1, kartlar: {}, gun: { tarih: '', yeni: 0, tekrar: 0 }, gec: [], ayar: {} }, loadSRS() || {});
if (!srs.kartlar) srs.kartlar = {};
export function srsKaydet() { saveSRS(srs); }

export const kartDurum = (en) => srs.kartlar[String(en).toLowerCase()];
// 'yeni' | 'ogreniliyor' | 'pekisti'
export function ogrenmeDurumu(en) {
  const c = kartDurum(en);
  if (!c) return 'yeni';
  return (c.i || 0) >= PEKISME ? 'pekisti' : 'ogreniliyor';
}
export const pekistiMi = (en) => ogrenmeDurumu(en) === 'pekisti';
// "Biliyorum": kelimeyi doğrudan pekişmiş aralığa taşı (ilk tekrar 21 gün sonra), defterden çıkar
export function pekistir(w) {
  const key = String(w.en).toLowerCase(), g = bugunGun();
  const c = srs.kartlar[key] || { b: 0, e: 2.5, r: 0, l: 0 };
  srs.kartlar[key] = Object.assign(c, { i: PEKISME, d: g + PEKISME, s: g, r: Math.max(3, c.r || 0), b: Math.max(3, c.b || 0) });
  srsKaydet();
  if (defter[key]) { delete defter[key]; defterKaydet(); }
}
export function pekisenSayisi() { let n = 0; for (const k in srs.kartlar) if ((srs.kartlar[k].i || 0) >= PEKISME) n++; return n; }

// ===== Kelime Defteri (yer imi) =====
export const defter = loadDefter();
export function defterKaydet() { saveDefter(defter); }
export const defterdeMi = (en) => !!defter[String(en).toLowerCase()];
const kelimeKaydi = (w) => ({ en: w.en, tur: w.tur, tr: w.tr, ornek_tokenlar: w.ornek_tokenlar, ornek_tr: w.ornek_tr, sv: w.sv, u: w.u });
export function defterEkle(w) { defter[String(w.en).toLowerCase()] = kelimeKaydi(w); defterKaydet(); }
export function defterToggle(w) {
  const key = String(w.en).toLowerCase();
  if (defter[key]) delete defter[key]; else defter[key] = kelimeKaydi(w);
  defterKaydet();
}
export const defterKelimeler = () => Object.values(defter);

// ===== Eski sürüm taşıma =====
// 1) "Öğrendiklerim" ayrı deposu → SRS pekişti; 2) srs.favori → Defter (havuz nesneleriyle)
export function eskiKayitlariTasi(havuz) {
  let degisti = false;
  const o = loadOgrenilen();
  if (o && Object.keys(o).length) {
    for (const k in o) if (ogrenmeDurumu(k) !== 'pekisti') { pekistir(o[k]); degisti = true; }
    try { localStorage.removeItem('yds-ogrenilen-v1'); } catch {}
  }
  if (srs.favori) {
    const index = new Map((havuz || []).map(w => [w.en.toLowerCase(), w]));
    for (const k in srs.favori) { const w = index.get(k); if (w && !defter[k]) { defterEkle(w); degisti = true; } }
    delete srs.favori; srsKaydet();
  }
  return degisti;
}
