// app/js/kademe.js — saf, DOM'suz: kelime kademesi (SRS aralığından türetilir) ve gün planı hesapları.
// Kademe: 0 Yeni (kart yok) · 1 Başlangıç (i<4) · 2 Bronz (i<10) · 3 Gümüş (i<21) · 4 Altın (i<45) · 5 Elmas (i≥45).
// Altın eşiği durum.js PEKISME (21) ile aynıdır: Altın ve üstü = "pekişti" (öğrenildi).
export const GUN_BOYUT = 20;
export const KADEME_AD = ['Yeni', 'Başlangıç', 'Bronz', 'Gümüş', 'Altın', 'Elmas'];
export const KADEME_ESIK = [4, 10, 21, 45];

export function kademe(kart) {
  if (!kart) return 0;
  const i = kart.i || 0;
  let k = 1;
  for (const e of KADEME_ESIK) if (i >= e) k++;
  return k;
}

// Havuzu gün numarasına göre böler (üretimde yazılan `g`); g'siz kelimeler (özel kelimeler) dışarıda kalır.
// Dönüş: Map<g, kelimeler[]> (g artan sırada).
export function gunlereBol(havuz) {
  const m = new Map();
  for (const w of havuz || []) {
    if (!w || !w.g) continue;
    if (!m.has(w.g)) m.set(w.g, []);
    m.get(w.g).push(w);
  }
  return new Map([...m].sort((a, b) => a[0] - b[0]));
}

// [n0..n5]: kelime listesinin kademe histogramı
export function kademeDagilim(kelimeler, kartlar) {
  const h = [0, 0, 0, 0, 0, 0];
  for (const w of kelimeler || []) h[kademe((kartlar || {})[String(w.en).toLowerCase()])]++;
  return h;
}

// Gün durumu: başlanmadı / devam / tamam; n = en az bir kez çalışılmış (kademe ≥ 1) kelime sayısı
export function gunDurumu(kelimeler, kartlar) {
  const hist = kademeDagilim(kelimeler, kartlar);
  const toplam = (kelimeler || []).length;
  const n = toplam - hist[0];
  return { toplam, n, hist, durum: !n ? 'baslanmadi' : n < toplam ? 'devam' : 'tamam' };
}

export function tamamlananGun(gunler, kartlar) {
  let n = 0;
  for (const ws of gunler.values()) if (gunDurumu(ws, kartlar).durum === 'tamam') n++;
  return n;
}

// Sıradaki gün: kullanıcının kaldığı günden (sonGun) başlayarak tamamlanmamış ilk gün.
// sonGun yoksa en ileri "başlanmış" gün; hiç başlanmamışsa ilk gün; her gün tamamsa 0.
export function siradakiGun(gunler, kartlar, sonGun = 0) {
  const gs = [...gunler.keys()];
  if (!gs.length) return 0;
  let bas = sonGun;
  if (!bas) for (const g of gs) if (gunDurumu(gunler.get(g), kartlar).n > 0) bas = g;
  if (!bas) return gs[0];
  for (const g of gs) if (g >= bas && gunDurumu(gunler.get(g), kartlar).durum !== 'tamam') return g;
  for (const g of gs) if (gunDurumu(gunler.get(g), kartlar).durum !== 'tamam') return g;
  return 0;
}
