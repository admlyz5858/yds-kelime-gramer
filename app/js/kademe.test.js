// app/js/kademe.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { kademe, gunlereBol, kademeDagilim, gunDurumu, tamamlananGun, siradakiGun, KADEME_AD } from './kademe.js';

test('kademe: SRS aralığından 0–5 arası kademe', () => {
  assert.equal(kademe(undefined), 0);
  assert.equal(kademe({ i: 0 }), 1);
  assert.equal(kademe({ i: 3 }), 1);
  assert.equal(kademe({ i: 4 }), 2);
  assert.equal(kademe({ i: 10 }), 3);
  assert.equal(kademe({ i: 20 }), 3);
  assert.equal(kademe({ i: 21 }), 4);   // PEKISME=21: pekişti = Altın ve üstü
  assert.equal(kademe({ i: 44 }), 4);
  assert.equal(kademe({ i: 45 }), 5);
  assert.equal(KADEME_AD[5], 'Elmas');
});

const w = (en, g) => ({ en, g });
const havuz = [w('a', 1), w('b', 1), w('c', 2), w('d', 2), { en: 'ozel' }, w('e', 3)];

test('gunlereBol: g alanına göre gruplar, g olmayan dışarıda kalır, sıra artan', () => {
  const m = gunlereBol([w('x', 3), ...havuz]);
  assert.deepEqual([...m.keys()], [1, 2, 3]);
  assert.deepEqual(m.get(1).map(x => x.en), ['a', 'b']);
  assert.deepEqual(m.get(3).map(x => x.en), ['x', 'e']);
});

test('kademeDagilim / gunDurumu: histogram ve durum', () => {
  const kartlar = { a: { i: 1 }, b: { i: 30 } };
  assert.deepEqual(kademeDagilim([w('a'), w('b'), w('c')], kartlar), [1, 1, 0, 0, 1, 0]);
  assert.equal(gunDurumu([w('a'), w('b')], kartlar).durum, 'tamam');
  assert.equal(gunDurumu([w('a'), w('c')], kartlar).durum, 'devam');
  assert.equal(gunDurumu([w('c')], kartlar).durum, 'baslanmadi');
  assert.equal(gunDurumu([], kartlar).durum, 'baslanmadi');
  assert.equal(gunDurumu([w('A')], { a: { i: 1 } }).n, 1);   // anahtar küçük harf
});

test('siradakiGun ve tamamlananGun', () => {
  const m = gunlereBol(havuz);   // 1:{a,b} 2:{c,d} 3:{e}
  assert.equal(siradakiGun(m, {}), 1);                                  // hiç başlanmamış → ilk gün
  assert.equal(siradakiGun(m, { a: { i: 1 } }), 1);                      // 1 devam ediyor
  assert.equal(siradakiGun(m, { a: { i: 1 }, b: { i: 1 } }), 2);         // 1 tamam → 2
  assert.equal(siradakiGun(m, { c: { i: 1 } }), 1);                      // sonGun yok: plan dışı çalışma işaretçiyi ileri atmaz → ilk eksik gün
  assert.equal(siradakiGun(m, { c: { i: 1 }, d: { i: 1 } }, 2), 3);      // kaldığı gün tamam → sonraki
  assert.equal(siradakiGun(m, { c: { i: 1 }, d: { i: 1 }, e: { i: 1 } }, 3), 1);   // sonrası yok → geriye kalan ilk eksik gün
  const hepsi = { a: { i: 1 }, b: { i: 1 }, c: { i: 1 }, d: { i: 1 }, e: { i: 1 } };
  assert.equal(siradakiGun(m, hepsi, 2), 0);
  assert.equal(tamamlananGun(m, hepsi), 3);
  assert.equal(tamamlananGun(m, { a: { i: 1 } }), 0);
  assert.equal(siradakiGun(new Map(), {}), 0);
});
