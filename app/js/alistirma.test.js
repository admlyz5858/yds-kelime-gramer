import test from 'node:test';
import assert from 'node:assert/strict';
import { sorularUret, kuralEtiket, ornekleriTopla } from './alistirma.js';

const ex = (words, vurguIdx, tr) => ({ tokenlar: words.map((k, i) => ({ k, vurgu: i === vurguIdx })), tr });
const ders = {
  _id: 2,
  bolumler: [
    { baslik: 'at', ogeler: [
      { kural: 'yer (at the station)', ornekler: [ex(['He', 'is', 'at', 'home.'], 2, 'O evde.'), ex(['Meet', 'me', 'at', 'noon.'], 2, 'Öğlen buluşalım.')] },
      { kural: 'zaman', anlam: 'saatlerde', ornekler: [ex(['See', 'you', 'at', 'five.'], 2, 'Beşte görüşürüz.')] },
    ] },
    { baslik: 'in', ogeler: [{ kural: 'iç (in the box)', ornekler: [ex(['It', 'is', 'in', 'the', 'box.'], 2, 'Kutunun içinde.')] }] },
    { baslik: 'on', ogeler: [{ kural: 'üst (on the table)', ornekler: [ex(['It', 'is', 'on', 'the', 'table.'], 2, 'Masanın üstünde.')] }] },
    { baslik: 'by', ogeler: [{ kural: 'yanında (by the door)', ornekler: [ex(['Sit', 'by', 'me.'], 1, 'Yanıma otur.')] }] },
  ],
};

test('kuralEtiket: parantez > anlam > kural', () => {
  assert.equal(kuralEtiket({ kural: 'yer (at the station)' }), 'at the station');
  assert.equal(kuralEtiket({ kural: 'zaman', anlam: 'saatlerde, dakikalarda' }), 'saatlerde');
  assert.equal(kuralEtiket({ kural: 'düz' }), 'düz');
});
test('ornekleriTopla yalnızca vurgulu örnekleri alır', () => {
  assert.equal(ornekleriTopla(ders).length, 6);
  assert.equal(ornekleriTopla({ bolumler: [{ baslik: 'x', ciftler: [{ tokenlar: [{ k: 'no' }], tr: 'hayır' }] }] }).length, 0);
});
test('sorularUret: boşluk soruları doğru cevabı ve 4 şıkkı içerir', () => {
  const s = sorularUret(ders);
  assert.equal(s.bosluk.length, 6);
  for (const q of s.bosluk) {
    assert.equal(q.secenekler.length, 4);
    assert.ok(q.secenekler.includes(q.dogru));
    assert.equal(new Set(q.secenekler).size, 4);
  }
  assert.ok(s.sinif.length >= 6);
  for (const q of s.sinif) assert.ok(q.secenekler.includes(q.dogru));
});
test('sorularUret: az örnekte boş döner', () => {
  const s = sorularUret({ bolumler: [{ baslik: 'a', ogeler: [{ kural: 'k', ornekler: [ex(['a', 'b'], 0, '')] }] }] });
  assert.equal(s.bosluk.length, 0); assert.equal(s.sinif.length, 0);
});
