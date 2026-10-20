// app/js/lig.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { adGecerli } from './lig.js';

test('adGecerli: 2–16 karakter, harf/rakam/boşluk/_.-; boşlukları sadeleştirir', () => {
  assert.equal(adGecerli('  Ayşe   Yılmaz '), 'Ayşe Yılmaz');
  assert.equal(adGecerli('a'), null);
  assert.equal(adGecerli('x'.repeat(17)), null);
  assert.equal(adGecerli('<script>'), null);
  assert.equal(adGecerli('yds_2026.tr-1'), 'yds_2026.tr-1');
});
