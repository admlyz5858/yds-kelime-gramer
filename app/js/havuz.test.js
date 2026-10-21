import test from 'node:test';
import assert from 'node:assert/strict';
import { cekimBirlestir } from '../../mobil/kelime-havuz.mjs';

const ex = (k) => [{ k: 'They' }, { k, vurgu: true }, { k: 'it.' }];
test('cekimBirlestir: çekimli fiil kök karta bağlanır, biçim ve ek örnek taşınır', () => {
  const h = [
    { en: 'accept', tur: 'Fiil', tr: 'kabul etmek', u: 1, ornek_tokenlar: ex('accept'), ornek_tr: 'A' },
    { en: 'accepted', tur: 'Fiil', tr: "kabul etmek (accept'in 3. hali)", u: 8, ornek_tokenlar: ex('accepted'), ornek_tr: 'B' },
    { en: 'won', tur: 'Fiil', tr: 'kazanmak (V3)', u: 8, ornek_tokenlar: ex('won'), ornek_tr: 'C' },
    { en: 'win', tur: 'Fiil', tr: 'kazanmak', u: 1 },
  ];
  const r = cekimBirlestir(h);
  assert.deepEqual(r.map(w => w.en), ['accept', 'win']);
  assert.deepEqual(r[0].bicimler, ['accepted']);
  assert.equal(r[0].ornekler.length, 1); assert.equal(r[0].ornekler[0].bicim, 'accepted');
  assert.deepEqual(r[1].bicimler, ['won']); assert.equal(r[1].ornek_tr, 'C');   // kökün örneği yoktu → taşındı
});
test('cekimBirlestir: tür ya da anlam uyuşmazsa ayrı kart kalır', () => {
  const h = [
    { en: 'ship', tur: 'İsim', tr: 'gemi', u: 2 }, { en: 'shipping', tur: 'İsim', tr: 'sevkiyat, kargo', u: 2 },
    { en: 'plane', tur: 'İsim', tr: 'uçak', u: 6 }, { en: 'planning', tur: 'İsim', tr: 'planlama', u: 14 },
    { en: 'warn', tur: 'Fiil', tr: 'uyarmak', u: 8 }, { en: 'warning', tur: 'İsim', tr: 'uyarı', u: 2 },
    { en: 'we', tur: 'Zamir', tr: 'biz', u: 1 }, { en: 'well', tur: 'Zarf', tr: 'iyi', u: 1 },
  ];
  assert.equal(cekimBirlestir(h).length, 8);
});
