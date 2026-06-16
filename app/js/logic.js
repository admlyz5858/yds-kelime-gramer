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

export function isAnswerCorrect(question, choice) {
  return question.cevap === choice;
}

export function scoreQuiz(quiz, answers) {
  let dogru = 0;
  quiz.forEach((q, i) => { if (q.cevap === answers[i]) dogru++; });
  return { dogru, toplam: quiz.length };
}

export function nextCard(index, total) {
  if (total <= 0) return 0;
  return (index + 1) % total;
}

export function dersKilitli(ders) {
  const d = ders && ders.durum;
  return d === 'premium' || d === 'yakinda';
}

export function dersDurumEtiket(ders) {
  const d = ders && ders.durum;
  if (d === 'premium') return 'Premium — yakında';
  if (d === 'yakinda') return 'Yakında';
  return '';
}
