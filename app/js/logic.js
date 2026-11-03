// app/js/logic.js — saf, DOM'suz, storage'sız mantık
export function searchLessons(lessons, query) {
  const q = (query || '').trim().toLowerCase();
  if (!q) return lessons.slice();
  return lessons.filter(l => (l.baslik || '').toLowerCase().includes(q));
}

export function toggleDone(progress, id) {
  const next = { ...progress };
  if (next[id]) delete next[id]; else next[id] = true;
  return next;
}

export function isDone(progress, id) {
  return Boolean(progress[id]);
}

export function scoreQuiz(quiz, answers) {
  let dogru = 0;
  quiz.forEach((q, i) => { if (q.cevap === answers[i]) dogru++; });
  return { dogru, toplam: quiz.length };
}

export function shuffle(arr) {
  return arr.map(v => [Math.random(), v]).sort((x, y) => x[0] - y[0]).map(x => x[1]);
}

// Yerel takvim günü "YYYY-AA-GG"
export function isoGun(d = new Date()) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
// Yerel takvim günü (Türkiye'de gece yarısı yerel saate göre değişir). UTC günü kullanılmaz:
// yoksa 00:00-03:00 arasındaki "1 gün sonra" tekrarlar birkaç saat sonraya düşer.
export function yerelGunNo(ms = Date.now()) {
  const d = new Date(ms);
  return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
}
export function gunStr(off = 0) {
  const d = new Date(); d.setDate(d.getDate() + off);
  return isoGun(d);
}

// Soru metnindeki boşlukları doldurur. secim: seçilen/doğru cevap ("A / B" biçimi çok boşluklu sorular içindir).
// doldur(metin) → dolu boşluk HTML'i, bos() → boş boşluk HTML'i. secim null ise hepsi boş kalır.
export function bosluklariDoldur(metin, secim, doldur, bos) {
  const bl = (String(metin).match(/_{2,}/g) || []).length;
  const parcalar = String(secim ?? '').split(' / ');
  const coklu = bl > 1 && parcalar.length === bl;
  let k = 0;
  return String(metin).replace(/_{2,}/g, () => {
    const i = k++;
    if (secim == null) return bos();
    if (coklu) return doldur(parcalar[i]);
    return i === 0 ? doldur(String(secim)) : bos();
  });
}
