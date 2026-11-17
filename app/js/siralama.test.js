import test from 'node:test';
import assert from 'node:assert/strict';
import { anahtarUret, bekleyeneEkle, madalya, kurSiralama, BEKLEYEN_UST } from './siralama.js';

// Bellekte depo + kayıt tutan sahte sunucu
function kur({ cevrimdisi = false } = {}) {
  let kayit = null;
  const depo = { oku: () => (kayit ? JSON.parse(JSON.stringify(kayit)) : null), yaz: (v) => { kayit = JSON.parse(JSON.stringify(v)); } };
  const cagri = [];
  const sunucu = { cevrimdisi };
  const rpc = async (ad, govde) => {
    if (sunucu.cevrimdisi) throw new Error('ağ yok');
    cagri.push([ad, govde]);
    if (ad === 'oyuncu_kaydet') return 'Çevik Tilki 42';
    if (ad === 'ad_yenile') return 'Zeki Yunus 70';
    if (ad === 'skor_gonder') return true;
    if (ad === 'siralama') return [{ sira: 1, ad: 'Çevik Tilki 42', puan: 80, ben: true, toplam: 1 }];
    return null;
  };
  return { s: kurSiralama({ rpc, depo }), depo, cagri, sunucu };
}

test('anahtarUret: 48 onaltılık karakter, sunucu biçimine uygun', () => {
  const k = anahtarUret();
  assert.match(k, /^[0-9a-f]{48}$/);
  assert.notEqual(anahtarUret(), k);
  assert.equal(anahtarUret(() => new Uint8Array(24)), '0'.repeat(48));
});

test('bekleyeneEkle: en fazla üst sınır kadar kayıt, en eskiler atılır', () => {
  let l = [];
  for (let i = 0; i < BEKLEYEN_UST + 5; i++) l = bekleyeneEkle(l, { puan: i });
  assert.equal(l.length, BEKLEYEN_UST);
  assert.equal(l[0].puan, 5);
  assert.equal(bekleyeneEkle(null, { puan: 1 }).length, 1);
});

test('madalya: ilk üç için madalya, sonrası sıra numarası', () => {
  assert.deepEqual([1, 2, 3, 4, 12].map(madalya), ['🥇', '🥈', '🥉', '4', '12']);
});

test('gonder: ilk skor kaydı oluşturur, skoru gönderir ve kuyruğu boşaltır', async () => {
  const { s, cagri } = kur();
  await s.gonder('av', 79.6);
  assert.deepEqual(cagri.map(c => c[0]), ['oyuncu_kaydet', 'skor_gonder']);
  assert.equal(cagri[1][1].p_oyun, 'av');
  assert.equal(cagri[1][1].p_puan, 80);
  assert.match(cagri[1][1].p_anahtar, /^[0-9a-f]{48}$/);
  assert.equal(s.durum().ad, 'Çevik Tilki 42');
  assert.equal(s.durum().bekleyen.length, 0);
  await s.gonder('karisik', 40);
  assert.equal(cagri.filter(c => c[0] === 'oyuncu_kaydet').length, 1);   // kayıt bir kez
});

test('çevrimdışı: skorlar kuyrukta bekler, bağlantı gelince sırayla gönderilir', async () => {
  const { s, cagri, sunucu } = kur({ cevrimdisi: true });
  await s.gonder('av', 50);
  await s.gonder('gunluk', 200);
  assert.equal(s.durum().bekleyen.length, 2);
  sunucu.cevrimdisi = false;
  await s.bosalt();
  assert.deepEqual(cagri.filter(c => c[0] === 'skor_gonder').map(c => [c[1].p_oyun, c[1].p_puan]), [['av', 50], ['gunluk', 200]]);
  assert.equal(s.durum().bekleyen.length, 0);
});

test('bosalt: kuyruk boşken ağa hiç çıkmaz (oyun oynamayan kullanıcı kaydedilmez)', async () => {
  const { s, cagri } = kur();
  await s.bosalt();
  assert.equal(cagri.length, 0);
});

test('cik: sunucuda siler, kapalıyken skor gönderilmez; katil yeniden kaydeder', async () => {
  const { s, cagri } = kur();
  await s.gonder('av', 10);
  await s.cik();
  assert.equal(cagri.at(-1)[0], 'siralamadan_cik');
  assert.equal(s.durum().kapali, true);
  assert.equal(s.durum().anahtar, '');
  const once = cagri.length;
  await s.gonder('av', 10);
  assert.equal(cagri.length, once);   // kapalıyken ağa çıkılmaz
  await s.katil();
  assert.equal(s.durum().kapali, false);
  assert.equal(cagri.at(-1)[0], 'oyuncu_kaydet');
});

test('cik: çevrimdışıyken hata verir ve yerel durumu değiştirmez', async () => {
  const { s, sunucu } = kur();
  await s.gonder('av', 10);
  sunucu.cevrimdisi = true;
  await assert.rejects(s.cik());
  assert.equal(s.durum().kapali, false);
});

test('liste ve adYenile', async () => {
  const { s } = kur();
  const l = await s.liste('hafta');
  assert.equal(l[0].ben, true);
  assert.equal(await s.adYenile(), 'Zeki Yunus 70');
  assert.equal(s.durum().ad, 'Zeki Yunus 70');
});
