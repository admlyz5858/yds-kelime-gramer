import test from 'node:test';
import assert from 'node:assert/strict';
import { birlestir, ozet, kirp, olayKimlik } from './olay.js';

const a = { id: 's1:0', t: 100, en: 'make', q: 2 }, b = { id: 's1:1', t: 200, en: 'take', q: 0 }, c = { id: 's2:0', t: 150, en: 'make', q: 2 };
test('birlestir: kimliğe göre tekilleştirir, zamana göre sıralar', () => {
  const r = birlestir([a, b], [a, c]);
  assert.deepEqual(r.map(o => o.id), ['s1:0', 's2:0', 's1:1']);
});
test('birlestir: değişmeli ve idempotent (iki cihaz aynı sonucu verir)', () => {
  assert.deepEqual(birlestir([a, b], [c]), birlestir([c], [b, a]));
  assert.deepEqual(birlestir([a, b], [a, b]), birlestir([a, b]));
});
test('birlestir: bozuk girdi atlanır', () => {
  assert.deepEqual(birlestir(null, [{ x: 1 }, a], undefined), [a]);
});
test('ozet: toplam, doğru, yanlış, kart ve bugün sayıları', () => {
  const gun = (t) => (t < 180 ? 'dun' : 'bugun');   // a(100) ve c(150) dün, b(200) bugün
  const o = ozet([a, b, c], gun, 'bugun');
  assert.deepEqual(o, { toplam: 3, dogru: 2, yanlis: 1, kart: 2, bugun: 1, bugunDogru: 0 });
});
test('kirp: en yeni kayıtlar kalır', () => {
  const liste = [a, b, c];
  assert.deepEqual(kirp(liste, 2).map(o => o.id), ['s2:0', 's1:1']);
});
test('olayKimlik: oturum + konum', () => { assert.equal(olayKimlik('abc', 3), 'abc:3'); });
