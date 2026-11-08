// app/js/kelimeoyun.js — Harf Avı ve Karışık Harfler oyunlarının saf mantığı (arayüzsüz, test edilebilir).
// Arayüz oyunlar.js'te; burada yalnızca kelime seçimi, durum geçişleri ve puanlama vardır.
import { kisaTR } from './eslestir.js';

export const SEVIYE = { kolay: { ad: 'Kolay', sv: [1, 2] }, orta: { ad: 'Orta', sv: [3] }, zor: { ad: 'Zor', sv: [4, 5] } };
export const KELIME_SAYISI = 5;   // bir turdaki kelime sayısı
export const MAX_HATA = 6;        // Harf Avı: bu kadar yanlış harfte kelime kaybedilir
export const KELIME_PUAN = 10;    // bir kelimeden alınabilecek en yüksek puan

// Oyuna uygun kelimeler: tek sözcük, yalnız harf, 4–10 karakter, seçilen seviye bandında ve kısa Türkçe karşılığı olan
export function adaylar(havuz, seviye) {
  const sv = (SEVIYE[seviye] || SEVIYE.kolay).sv;
  return (havuz || []).filter(w => /^[a-z]{4,10}$/i.test(String(w.en || '')) && sv.includes(w.sv) && kisaTR(w.tr));
}

// Rastgele n kelime (Fisher–Yates); rnd sınanabilirlik için dışarıdan verilebilir
export function kelimeSec(liste, n = KELIME_SAYISI, rnd = Math.random) {
  const a = (liste || []).slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a.slice(0, n);
}

// ---------- Harf Avı (adam asmaca) ----------
export const yeniAvDurum = () => ({ bilinen: new Set(), hata: 0 });
// Bilinen harfler açık, diğerleri '_' olan karakter dizisi
export function maske(kelime, bilinen) { return [...String(kelime).toLowerCase()].map(h => (bilinen.has(h) ? h : '_')); }
// Bir harf tahmini: yeni durum + doğru mu (null = geçersiz ya da zaten denenmiş). Girdi durumunu değiştirmez.
export function tahminEt(kelime, durum, harf) {
  const k = String(kelime).toLowerCase(), h = String(harf).toLowerCase();
  if (!/^[a-z]$/.test(h) || durum.bilinen.has(h)) return { durum, dogru: null };
  const bilinen = new Set(durum.bilinen); bilinen.add(h);
  const dogru = k.includes(h);
  return { durum: { bilinen, hata: durum.hata + (dogru ? 0 : 1) }, dogru };
}
export const kazandiMi = (kelime, durum) => [...new Set(String(kelime).toLowerCase())].every(h => durum.bilinen.has(h));
export const kaybettiMi = (durum) => durum.hata >= MAX_HATA;
// İpucu: kelimede henüz açılmamış ilk harf
export function ipucuHarfi(kelime, durum) { return [...String(kelime).toLowerCase()].find(h => !durum.bilinen.has(h)) || null; }
// Kazanılan kelimenin puanı: kalan can artı, ipucu eksi (en az 4)
export const avPuan = (kazandi, hata, ipucu) => kazandi ? Math.max(4, KELIME_PUAN + (MAX_HATA - hata) - 3 * ipucu) : 0;

// ---------- Karışık Harfler ----------
// Harfleri karıştırır; mümkünse asıl kelimeden farklı bir sıra verir
export function karistir(kelime, rnd = Math.random) {
  const harfler = [...String(kelime).toLowerCase()];
  if (new Set(harfler).size < 2) return harfler;
  for (let deneme = 0; deneme < 30; deneme++) {
    const a = harfler.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    if (a.join('') !== harfler.join('')) return a;
  }
  return harfler.slice().reverse();
}
// secilen: karışık harf dizisinde seçilen sıra numaraları
export const karisikCevap = (karisik, secilen) => secilen.map(i => karisik[i]).join('');
export function karisikEkle(secilen, idx) { return secilen.includes(idx) ? secilen : [...secilen, idx]; }
export const karisikDogruMu = (kelime, karisik, secilen) => secilen.length === karisik.length && karisikCevap(karisik, secilen) === String(kelime).toLowerCase();
// İpucu: yanlış önek varsa temizler, sonra doğru sıradaki harfi ekler
export function karisikIpucu(kelime, karisik, secilen) {
  const k = String(kelime).toLowerCase();
  const s = secilen.slice();
  while (s.length && karisikCevap(karisik, s) !== k.slice(0, s.length)) s.pop();
  if (s.length >= k.length) return s;
  const idx = karisik.findIndex((h, i) => h === k[s.length] && !s.includes(i));
  return idx < 0 ? s : [...s, idx];
}
// Kazanılan kelimenin puanı: yanlış deneme −2, ipucu −3 (en az 4)
export const karisikPuan = (kazandi, yanlis, ipucu) => kazandi ? Math.max(4, KELIME_PUAN - 2 * yanlis - 3 * ipucu) : 0;
