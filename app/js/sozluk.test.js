import test from 'node:test';
import assert from 'node:assert/strict';
import { filtrele, turAna } from './sozluk.js';

const H = [
  { en: 'abandon', tr: 'terk etmek', tur: 'Fiil', sv: 2, u: 1 },
  { en: 'able', tr: 'yapabilen', tur: 'Sıfat', sv: 1, u: 1 },
  { en: 'about', tr: 'hakkında', tur: 'Edat (preposition)', sv: 1, u: 2 },
  { en: 'zeal', tr: 'şevk', tur: 'İsim / Fiil', sv: 5, u: 7 },
];
const durum = (en) => en === 'able' ? 'pekisti' : 'yeni';
const defter = (en) => en === 'zeal';

test('turAna normalizes compound/annotated types', () => {
  assert.equal(turAna(H[2]), 'edat');
  assert.equal(turAna(H[3]), 'isim');
  assert.equal(turAna({ tur: '' }), 'diğer');
});
test('filtrele: seviye, tür, ünite, durum, defter', () => {
  assert.deepEqual(filtrele(H, { sv: 1 }, durum, defter).map(w => w.en), ['able', 'about']);
  assert.deepEqual(filtrele(H, { tur: 'fiil' }, durum, defter).map(w => w.en), ['abandon']);
  assert.deepEqual(filtrele(H, { unite: 7 }, durum, defter).map(w => w.en), ['zeal']);
  assert.deepEqual(filtrele(H, { durum: 'pekisti' }, durum, defter).map(w => w.en), ['able']);
  assert.deepEqual(filtrele(H, { durum: 'defter' }, durum, defter).map(w => w.en), ['zeal']);
});
test('filtrele: arama hem İngilizce hem Türkçe, sıralama', () => {
  assert.deepEqual(filtrele(H, { q: 'ŞEVK' }, durum, defter).map(w => w.en), ['zeal']);
  assert.deepEqual(filtrele(H, { q: 'ab' }, durum, defter).map(w => w.en), ['abandon', 'able', 'about']);
  assert.deepEqual(filtrele(H, { sira: 'alfabe' }, durum, defter).map(w => w.en), ['abandon', 'able', 'about', 'zeal']);
  assert.deepEqual(filtrele(H, { sira: 'tur' }, durum, defter).map(w => turAna(w)), ['isim', 'fiil', 'sıfat', 'edat']);
});
