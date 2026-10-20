// app/js/eslestir.test.js — eşleştirme oyununun saf mantığı
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mulberry32, tohumluKaristir, kisaTR, zorlukSirala, setOlustur, seviyeSetleri, ozelSet, puanla, comboPuan, kodUret, kodCoz, izgara, yildizHesapla, SEVIYELER, PUAN } from './eslestir.js';

const havuz = [];
for (let i = 0; i < 400; i++) havuz.push({ en: 'word' + i, tur: ['İsim', 'fiil', 'Sıfat', 'zarf'][i % 4], tr: 'anlam' + i + ', ikinci', u: i < 300 ? 1 : 2 + (i % 13) });
havuz.push({ en: 'the', tur: 'Artikel', tr: 'belirli artikel — çevrilmez', u: 1 });
havuz.push({ en: 'of', tur: 'Edat', tr: '-in', u: 1 });
havuz.push({ en: 'big', tur: 'Sıfat', tr: 'büyük', u: 1 });
havuz.push({ en: 'large', tur: 'Sıfat', tr: 'büyük, geniş', u: 1 });

test('mulberry32 deterministik, tohumluKaristir kaynağı bozmaz', () => {
  const a = mulberry32(42), b = mulberry32(42);
  assert.equal(a(), b());
  const src = [1, 2, 3, 4, 5]; const s = tohumluKaristir(src, mulberry32(7));
  assert.deepEqual(src, [1, 2, 3, 4, 5]); assert.deepEqual([...s].sort(), src);
  assert.deepEqual(tohumluKaristir(src, mulberry32(7)), s);
});

test('kisaTR ilk anlamı alır', () => {
  assert.equal(kisaTR('büyük, geniş'), 'büyük');
  assert.equal(kisaTR('izin vermek; bırakmak'), 'izin vermek');
  assert.equal(kisaTR('belirli artikel — çevrilmez'), 'belirli artikel');
  assert.equal(kisaTR('o (cansız nesne, hayvan)'), 'o');
  assert.equal(kisaTR('orada · there is'), 'orada');
  assert.equal(kisaTR('(bir şeyi) yapmak, etmek'), 'yapmak');
});

test('zorlukSirala artikel/ek gibi uygunsuzları eler, Ünite 1 öne gelir', () => {
  const s = zorlukSirala(havuz);
  assert.ok(!s.find(w => w.en === 'the')); assert.ok(!s.find(w => w.en === 'of'));
  assert.equal(s[0].u, 1); assert.equal(s[s.length - 1].u > 1, true);
});

test('setOlustur İngilizce ve kısa Türkçe anlamı benzersiz tutar', () => {
  const s = setOlustur([havuz.find(w => w.en === 'big'), havuz.find(w => w.en === 'large'), havuz[0], havuz[1]], 3);
  assert.equal(s.length, 3);
  assert.equal(new Set(s.map(w => kisaTR(w.tr))).size, 3);
  assert.ok(!(s.includes(havuz.find(w => w.en === 'big')) && s.includes(havuz.find(w => w.en === 'large'))));
});

test('seviyeSetleri 5/8/10/10/10/10 verir, seviyeler arası tekrar yok, son seviyeler tek türden', () => {
  const s = zorlukSirala(havuz);
  const { setler } = seviyeSetleri(s, 0);
  assert.deepEqual(setler.map(x => x.length), SEVIYELER.map(x => x.n));
  const hepsi = setler.flat().map(w => w.en);
  assert.equal(new Set(hepsi).size, hepsi.length);
  assert.equal(new Set(setler[5].map(w => w.tur.toLowerCase())).size, 1);
  // deterministik
  assert.deepEqual(seviyeSetleri(s, 0).setler.map(x => x.map(w => w.en)), setler.map(x => x.map(w => w.en)));
});

test('ozelSet tohuma göre aynı, farklı tohumda farklı', () => {
  const s = zorlukSirala(havuz);
  const a = ozelSet(s, 20261020), b = ozelSet(s, 20261020), c = ozelSet(s, 20261021);
  assert.equal(a.length, 10);
  assert.deepEqual(a.map(w => w.en), b.map(w => w.en));
  assert.notDeepEqual(a.map(w => w.en), c.map(w => w.en));
});

test('puanla: +10/−5, seri 3 → 15, seri 5 → 20, kusursuz +20, süre bonusu, taban 0', () => {
  assert.equal(comboPuan(0), 10); assert.equal(comboPuan(3), 15); assert.equal(comboPuan(5), 20);
  // 5 doğru, hatasız, süresiz: 10+10+10+15+15 = 60 + 20 kusursuz
  assert.equal(puanla(['d', 'd', 'd', 'd', 'd'], 0).puan, 80);
  // yanlış seriyi sıfırlar: d d d y d → 10+10+10−5+10 = 35, kusursuz yok
  const r = puanla(['d', 'd', 'd', 'y', 'd'], 0);
  assert.equal(r.puan, 35); assert.equal(r.kusursuz, 0); assert.equal(r.yanlis, 1); assert.equal(r.enSeri, 3);
  // 7 doğru seri: 10+10+10+15+15+20+20 = 100
  assert.equal(puanla('ddddddd'.split(''), 0).temel, 100);
  // süre bonusu yalnız tamamlanınca
  assert.equal(puanla(['d'], 23, true).sureBonus, 23); assert.equal(puanla(['d'], 23, false).sureBonus, 0);
  // taban 0
  assert.equal(puanla(['y', 'y', 'y', 'y'], 0).puan, 0);
});

test('düello kodu gidip gelir', () => {
  const k = kodUret(123456789, 134);
  assert.match(k, /^[0-9A-Z]{5}-[0-9A-Z]{2}$/);
  const c = kodCoz(k.toLowerCase());
  assert.equal(c.skor, 134);
  assert.equal(kodUret(c.seed, c.skor), k);
  assert.equal(kodCoz('xx'), null);
  assert.equal(kodCoz(kodUret(5, 2000)).skor, 1295);
});

test('izgara ve yıldız', () => {
  assert.equal(izgara(['d', 'y', 'd'], 3), '🟩🟥🟩⬜');
  assert.equal(yildizHesapla(100, 100), 3); assert.equal(yildizHesapla(60, 100), 2); assert.equal(yildizHesapla(10, 100), 1);
  assert.equal(PUAN.sureCeza, 10);
});
