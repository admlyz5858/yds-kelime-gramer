import test from 'node:test';
import assert from 'node:assert/strict';
import { karar, epostaGecerli } from './bulut.js';

test('karar: bulutta yedek yoksa yükle', () => { assert.equal(karar({ kirli: false, sonSenkron: 0, bulutZaman: null, yerelBos: true }), 'yukle'); });
test('karar: yerel boş, bulut dolu → indir', () => { assert.equal(karar({ kirli: true, sonSenkron: 0, bulutZaman: 1000, yerelBos: true }), 'indir'); });
test('karar: bulut yeni, yerel temiz → indir', () => { assert.equal(karar({ kirli: false, sonSenkron: 5000, bulutZaman: 9000, yerelBos: false }), 'indir'); });
test('karar: yerel kirli, bulut eski → yükle', () => { assert.equal(karar({ kirli: true, sonSenkron: 9000, bulutZaman: 9000, yerelBos: false }), 'yukle'); });
test('karar: ikisi de değişmiş → sor', () => { assert.equal(karar({ kirli: true, sonSenkron: 5000, bulutZaman: 9000, yerelBos: false }), 'sor'); });
test('karar: değişiklik yok → esit', () => { assert.equal(karar({ kirli: false, sonSenkron: 9000, bulutZaman: 9000, yerelBos: false }), 'esit'); });
test('epostaGecerli', () => { assert.ok(epostaGecerli('a.b@c.io')); assert.ok(!epostaGecerli('abc')); assert.ok(!epostaGecerli('a@b')); });
