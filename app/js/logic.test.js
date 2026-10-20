// app/js/logic.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { searchLessons, toggleDone, isDone, scoreQuiz, shuffle, isoGun, gunStr } from './logic.js';

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

test('scoreQuiz doğru sayısını verir', () => {
  const quiz = [{ cevap: 'a', secenekler: ['a','b'] }, { cevap: 'b', secenekler: ['a','b'] }];
  assert.deepEqual(scoreQuiz(quiz, ['a', 'a']), { dogru: 1, toplam: 2 });
});

test('shuffle aynı elemanları korur, kaynağı değiştirmez', () => {
  const a = [1, 2, 3, 4, 5];
  const s = shuffle(a);
  assert.deepEqual([...s].sort(), a);
  assert.deepEqual(a, [1, 2, 3, 4, 5]);
});

test('isoGun/gunStr yerel günü YYYY-AA-GG verir', () => {
  assert.equal(isoGun(new Date(2026, 0, 5)), '2026-01-05');
  assert.match(gunStr(), /^\d{4}-\d{2}-\d{2}$/);
  assert.notEqual(gunStr(-1), gunStr(0));
});
