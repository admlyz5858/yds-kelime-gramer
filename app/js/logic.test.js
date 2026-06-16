// app/js/logic.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { searchLessons, toggleDone, isDone, scoreQuiz, isAnswerCorrect, nextCard, dersKilitli, dersDurumEtiket } from './logic.js';

test('searchLessons başlığa göre filtreler (büyük/küçük harf duyarsız)', () => {
  const m = [{ id: 1, baslik: 'Hazırlık 101' }, { id: 2, baslik: 'Deneme 5' }];
  assert.deepEqual(searchLessons(m, 'haz').map(x => x.id), [1]);
  assert.deepEqual(searchLessons(m, '').map(x => x.id), [1, 2]);
});

test('toggleDone/isDone ilerlemeyi değiştirir (saf)', () => {
  let p = {};
  p = toggleDone(p, 1);
  assert.equal(isDone(p, 1), true);
  p = toggleDone(p, 1);
  assert.equal(isDone(p, 1), false);
});

test('isAnswerCorrect cevabı karşılaştırır', () => {
  const q = { soru: 'x', secenekler: ['a', 'b'], cevap: 'b' };
  assert.equal(isAnswerCorrect(q, 'b'), true);
  assert.equal(isAnswerCorrect(q, 'a'), false);
});

test('scoreQuiz doğru sayısını verir', () => {
  const quiz = [{ cevap: 'a', secenekler: ['a','b'] }, { cevap: 'b', secenekler: ['a','b'] }];
  assert.deepEqual(scoreQuiz(quiz, ['a', 'a']), { dogru: 1, toplam: 2 });
});

test('nextCard indeksi döngüsel ilerletir', () => {
  assert.equal(nextCard(0, 3), 1);
  assert.equal(nextCard(2, 3), 0);
});

test('dersKilitli premium ve yakinda için true, hazir için false', () => {
  assert.equal(dersKilitli({ durum: 'premium' }), true);
  assert.equal(dersKilitli({ durum: 'yakinda' }), true);
  assert.equal(dersKilitli({ durum: 'hazir' }), false);
  assert.equal(dersKilitli({}), false);
  assert.equal(dersKilitli(null), false);
});

test('dersDurumEtiket duruma göre etiket verir', () => {
  assert.equal(dersDurumEtiket({ durum: 'premium' }), 'Premium — yakında');
  assert.equal(dersDurumEtiket({ durum: 'yakinda' }), 'Yakında');
  assert.equal(dersDurumEtiket({ durum: 'hazir' }), '');
});
