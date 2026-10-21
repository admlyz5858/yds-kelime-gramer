import test from 'node:test';
import assert from 'node:assert/strict';
import { testlereBol } from './banka.js';

test('testlereBol: ünite → test → soru sırası, en fazla 10 soru', () => {
  const s = [];
  for (let u = 4; u >= 2; u--) for (let t = 2; t >= 0; t--) for (let q = 3; q >= 0; q--) s.push({ u, t, q, id: `${u}-${t}-${q}` });
  const testler = testlereBol(s);
  assert.equal(testler.length, 4);                       // 36 soru → 10+10+10+6
  assert.ok(testler.every(t => t.length <= 10));
  assert.equal(testler[0][0].id, '2-0-0');
  assert.equal(testler[0][9].id, '2-2-1');
  assert.equal(testler[3].length, 6);
  assert.equal(testler[3][5].id, '4-2-3');
});
test('testlereBol: boş liste ve t/q eksik kayıtlar', () => {
  assert.deepEqual(testlereBol([]), []);
  const t = testlereBol([{ u: 3 }, { u: 2 }]);
  assert.equal(t[0][0].u, 2);
});
