import test from 'node:test';
import assert from 'node:assert/strict';
import { dizinKur, kokBul, metniAyir } from './tarayici.js';

const havuz = [
  { en: 'accept', tr: 'kabul etmek', bicimler: ['accepted'] }, { en: 'study', tr: 'çalışmak' }, { en: 'begin', tr: 'başlamak' },
  { en: 'city', tr: 'şehir' }, { en: 'take place', tr: 'olmak' }, { en: 'big', tr: 'büyük' }, { en: 'plan', tr: 'plan' },
];
const d = dizinKur(havuz);
test('kokBul: biçim, düzenli ek, düzensiz fiil, çoğul, noktalama', () => {
  assert.equal(kokBul(d, 'Accepted,').en, 'accept');
  assert.equal(kokBul(d, 'accepting').en, 'accept');
  assert.equal(kokBul(d, 'studies').en, 'study');
  assert.equal(kokBul(d, 'begun').en, 'begin');
  assert.equal(kokBul(d, 'cities').en, 'city');
  assert.equal(kokBul(d, 'bigger').en, 'big');
  assert.equal(kokBul(d, 'planning').en, 'plan');
  assert.equal(kokBul(d, "city's").en, 'city');
  assert.equal(kokBul(d, 'unknownword'), null);
  assert.equal(kokBul(d, '42'), null);
});
test('metniAyir boşlukları korur', () => { assert.deepEqual(metniAyir('a  b\nc'), ['a', '  ', 'b', '\n', 'c']); });
