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

import { gunlereBol, GUN_BOYUT } from '../../mobil/kelime-havuz.mjs';
test('gunlereBol: sıralı havuz 20\'şerlik günlere bölünür, artık son güne kalır', () => {
  const h = Array.from({ length: 45 }, (_, i) => ({ en: 'w' + i }));
  gunlereBol(h);
  assert.equal(GUN_BOYUT, 20);
  assert.equal(h[0].g, 1); assert.equal(h[19].g, 1); assert.equal(h[20].g, 2); assert.equal(h[44].g, 3);
  assert.deepEqual(gunlereBol([{ en: 'a' }, { en: 'b' }, { en: 'c' }], 2).map(w => w.g), [1, 1, 2]);
});
test('gunlereBol: artikel/zamir/yardımcı fiil gibi dil bilgisi sözcükleri plana girmez, sıra kaymaz', () => {
  const h = [{ en: 'the', tur: 'Artikel (belirli)' }, { en: 'of', tur: 'Edat' }, { en: 'is', tur: 'Yardımcı fiil (be)' }, { en: 'it', tur: 'Zamir' }, { en: 'make', tur: 'Fiil' }, { en: 'can', tur: 'Modal' }];
  gunlereBol(h, 2);
  assert.deepEqual(h.map(w => w.g), [undefined, 1, undefined, undefined, 1, 2]);
});
test('gunlereBol: S1 kelimeleri planın sonuna gider, S2+ iç sırası korunur', () => {
  const h = [{ en: 'of', sv: 1 }, { en: 'study', sv: 2 }, { en: 'to', sv: 1 }, { en: 'cause', sv: 2 }, { en: 'notion', sv: 3 }];
  gunlereBol(h, 2);
  assert.deepEqual(h.map(w => [w.en, w.g]), [['of', 2], ['study', 1], ['to', 3], ['cause', 1], ['notion', 2]]);
});
