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
export function gunStr(off = 0) {
  const d = new Date(); d.setDate(d.getDate() + off);
  return isoGun(d);
}
