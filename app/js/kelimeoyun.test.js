import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SEVIYE, MAX_HATA, adaylar, kelimeSec, yeniAvDurum, maske, tahminEt, kazandiMi, kaybettiMi, ipucuHarfi, avPuan,
  karistir, karisikCevap, karisikEkle, karisikDogruMu, karisikIpucu, karisikPuan,
} from './kelimeoyun.js';

const sabitRnd = (dizi) => { let i = 0; return () => dizi[i++ % dizi.length]; };

test('adaylar: yalnız tek sözcük, 4–10 harf, seviye bandı ve Türkçe karşılığı olan kelimeler', () => {
  const havuz = [
    { en: 'study', tr: 'çalışmak', sv: 2 }, { en: 'of', tr: 'ın', sv: 1 }, { en: 'give up', tr: 'vazgeçmek', sv: 2 },
    { en: 'notion', tr: 'kavram', sv: 3 }, { en: 'well-known', tr: 'ünlü', sv: 2 }, { en: 'cause', tr: '', sv: 2 },
    { en: 'verylongwordhere', tr: 'x', sv: 2 }, { en: 'robust', tr: 'sağlam', sv: 4 },
  ];
  assert.deepEqual(adaylar(havuz, 'kolay').map(w => w.en), ['study']);
  assert.deepEqual(adaylar(havuz, 'orta').map(w => w.en), ['notion']);
  assert.deepEqual(adaylar(havuz, 'zor').map(w => w.en), ['robust']);
  assert.deepEqual(adaylar(havuz, 'bilinmeyen').map(w => w.en), ['study']);   // bilinmeyen seviye → kolay
  assert.ok(SEVIYE.kolay && SEVIYE.orta && SEVIYE.zor);
});

test('kelimeSec: n kelime, tekrarsız, kaynağı değiştirmez', () => {
  const liste = ['a', 'b', 'c', 'd', 'e', 'f'].map(en => ({ en }));
  const kopya = liste.slice();
  const s = kelimeSec(liste, 4, sabitRnd([0.1, 0.5, 0.9]));
  assert.equal(s.length, 4);
  assert.equal(new Set(s.map(w => w.en)).size, 4);
  assert.deepEqual(liste, kopya);
  assert.equal(kelimeSec(liste, 10).length, 6);   // listeden fazlası istenirse hepsi
});

test('Harf Avı: maske ve tahmin', () => {
  let d = yeniAvDurum();
  assert.deepEqual(maske('Apple', d.bilinen), ['_', '_', '_', '_', '_']);
  let r = tahminEt('apple', d, 'p'); d = r.durum;
  assert.equal(r.dogru, true); assert.equal(d.hata, 0);
  assert.deepEqual(maske('apple', d.bilinen), ['_', 'p', 'p', '_', '_']);
  r = tahminEt('apple', d, 'z'); d = r.durum;
  assert.equal(r.dogru, false); assert.equal(d.hata, 1);
  r = tahminEt('apple', d, 'z');   // aynı harf ikinci kez sayılmaz
  assert.equal(r.dogru, null); assert.equal(r.durum.hata, 1);
  r = tahminEt('apple', d, '1');   // geçersiz karakter
  assert.equal(r.dogru, null);
});

test('Harf Avı: kazanma, kaybetme, ipucu ve girdiyi değiştirmeme', () => {
  const d0 = yeniAvDurum();
  const d1 = tahminEt('cat', d0, 'c').durum;
  assert.equal(d0.bilinen.size, 0);   // eski durum bozulmadı
  assert.equal(kazandiMi('cat', d1), false);
  assert.equal(ipucuHarfi('cat', d1), 'a');
  const d2 = tahminEt('cat', tahminEt('cat', d1, 'a').durum, 't').durum;
  assert.equal(kazandiMi('cat', d2), true);
  assert.equal(ipucuHarfi('cat', d2), null);
  let d = yeniAvDurum();
  for (const h of 'qwxzjk') d = tahminEt('cat', d, h).durum;
  assert.equal(d.hata, MAX_HATA);
  assert.equal(kaybettiMi(d), true);
  assert.equal(kaybettiMi(d1), false);
});

test('avPuan: kalan can artı, ipucu eksi, en az 4, kayıpta 0', () => {
  assert.equal(avPuan(true, 0, 0), 16);
  assert.equal(avPuan(true, 5, 0), 11);
  assert.equal(avPuan(true, 0, 2), 10);
  assert.equal(avPuan(true, 5, 9), 4);
  assert.equal(avPuan(false, 6, 0), 0);
});

test('karistir: aynı harfler, asıl kelimeden farklı sıra', () => {
  for (const k of ['study', 'notion', 'robust', 'abab']) {
    const a = karistir(k);
    assert.equal(a.slice().sort().join(''), [...k].sort().join(''));
    assert.notEqual(a.join(''), k);
  }
  assert.deepEqual(karistir('aaaa'), ['a', 'a', 'a', 'a']);   // karıştırılamayan kelime olduğu gibi
});

test('Karışık Harfler: seçim, doğru cevap ve tekrar seçimi engelleme', () => {
  const kar = ['t', 's', 'u', 'd', 'y'];   // study
  let s = [];
  s = karisikEkle(s, 1); s = karisikEkle(s, 0); s = karisikEkle(s, 2); s = karisikEkle(s, 3); s = karisikEkle(s, 4);
  assert.equal(karisikCevap(kar, s), 'studY'.toLowerCase());
  assert.equal(karisikDogruMu('study', kar, s), true);
  assert.deepEqual(karisikEkle([1], 1), [1]);   // aynı harf kutusu iki kez seçilemez
  assert.equal(karisikDogruMu('study', kar, [1, 0, 2]), false);   // eksik
  assert.equal(karisikDogruMu('study', kar, [0, 1, 2, 3, 4]), false);   // yanlış sıra
});

test('Karışık Harfler: ipucu doğru sıradaki harfi ekler, yanlış öneki temizler', () => {
  const kar = ['t', 's', 'u', 'd', 'y'];
  assert.deepEqual(karisikIpucu('study', kar, []), [1]);
  assert.deepEqual(karisikIpucu('study', kar, [1]), [1, 0]);
  assert.deepEqual(karisikIpucu('study', kar, [2, 4]), [1]);   // 'uy' yanlış → temizle, 's' ekle
  assert.deepEqual(karisikIpucu('study', kar, [1, 0, 2, 3, 4]), [1, 0, 2, 3, 4]);   // zaten tam
});

test('karisikPuan: yanlış −2, ipucu −3, en az 4, kayıpta 0', () => {
  assert.equal(karisikPuan(true, 0, 0), 10);
  assert.equal(karisikPuan(true, 1, 1), 5);
  assert.equal(karisikPuan(true, 9, 9), 4);
  assert.equal(karisikPuan(false, 0, 0), 0);
});
