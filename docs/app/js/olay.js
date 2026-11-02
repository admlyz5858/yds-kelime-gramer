// app/js/olay.js — Cevap olay günlüğü (Faz 2). Her cevap, kimliği olan ve yalnızca eklenen bir kayıttır.
// Aynı kimlik iki kez eklenmez (çift sayım yok). İki cihazın günlükleri kimliğe göre birleşir (çakışma sorusu gerekmez).
// Bu modül saf fonksiyonlar içerir; depolama storage.js (loadOlay/saveOlay) üzerinden yapılır.

export const OLAY_LIMIT = 6000;    // en eski olaylar kırpılır; ~70 bayt/kayıt, bulut yedeğinin 2 MB sınırı için güvenli pay

// Oturum kimliği + kart konumu: aynı kart aynı oturumda ikinci kez puanlanamaz
export const olayKimlik = (sid, konum) => `${sid}:${konum}`;

// Birleşim: kimliğe göre tekilleştir, zamana göre sırala. Sıra ve tekrar etkilemez (değişmeli ve idempotent).
export function birlestir(...listeler) {
  const m = new Map();
  for (const l of listeler) for (const o of Array.isArray(l) ? l : []) {
    if (o && typeof o.id === 'string' && !m.has(o.id)) m.set(o.id, o);
  }
  return [...m.values()].sort((a, b) => (a.t - b.t) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

// Olaylardan türetilen özet. gunFn(ms) → yerel gün dizgisi (bugünkü sayılar için)
export function ozet(olaylar, gunFn, bugun) {
  let dogru = 0, yanlis = 0, bugunSay = 0, bugunDogru = 0;
  const kartlar = new Set();
  for (const o of olaylar || []) {
    const d = o.q > 0;
    if (d) dogru++; else yanlis++;
    kartlar.add(o.en);
    if (gunFn(o.t) === bugun) { bugunSay++; if (d) bugunDogru++; }
  }
  return { toplam: dogru + yanlis, dogru, yanlis, kart: kartlar.size, bugun: bugunSay, bugunDogru };
}

// Kırpma: en yeni OLAY_LIMIT kayıt kalır
export function kirp(olaylar, limit = OLAY_LIMIT) {
  const s = birlestir(olaylar);
  return s.length > limit ? s.slice(s.length - limit) : s;
}
