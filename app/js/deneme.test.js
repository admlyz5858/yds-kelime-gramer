import test from 'node:test';
import assert from 'node:assert/strict';
import { denemeSec, puanla, DAGILIM } from './deneme.js';

const havuz = [];
let id = 0;
for (const [konu, n] of Object.entries({ edat: 30, zaman: 30, modal: 30, baglac: 10, kosul: 10, cumlecik: 10, fiilimsi: 1, cati: 0, kelime: 20 }))
  for (let i = 0; i < n; i++) havuz.push({ id: 'q' + (id++), konu, soru: 'x ____', secenekler: ['a', 'b', 'c', 'd'], cevap: 'a' });
let seed = 1; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };

test('denemeSec: dağılıma uyar, eksik konuyu diğerlerinden tamamlar, tekrar yok', () => {
  const s = denemeSec(havuz, DAGILIM, rnd);
  assert.equal(s.length, 20);
  assert.equal(new Set(s.map(q => q.id)).size, 20);
  const say = {}; s.forEach(q => say[q.konu] = (say[q.konu] || 0) + 1);
  assert.equal(say.edat, 4); assert.equal(say.fiilimsi, 1); assert.equal(say.cati, undefined);
});
test('puanla: doğru/yanlış/boş ve konu kırılımı', () => {
  const liste = havuz.slice(0, 4);
  const r = puanla(liste, ['a', 'b', null, 'a']);
  assert.deepEqual([r.dogru, r.yanlis, r.bos, r.puan], [2, 1, 1, 50]);
  assert.deepEqual(r.kirilim.edat, { n: 4, dogru: 2 });
});
