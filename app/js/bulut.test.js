import test from 'node:test';
import assert from 'node:assert/strict';
import { karar, epostaGecerli } from './bulut.js';
import * as bulut from './bulut.js';

test('karar: bulutta yedek yoksa yükle', () => { assert.equal(karar({ kirli: false, sonSenkron: 0, bulutZaman: null, yerelBos: true }), 'yukle'); });
test('karar: yerel boş, bulut dolu → indir', () => { assert.equal(karar({ kirli: true, sonSenkron: 0, bulutZaman: 1000, yerelBos: true }), 'indir'); });
test('karar: bulut yeni, yerel temiz → indir', () => { assert.equal(karar({ kirli: false, sonSenkron: 5000, bulutZaman: 9000, yerelBos: false }), 'indir'); });
test('karar: yerel kirli, bulut eski → yükle', () => { assert.equal(karar({ kirli: true, sonSenkron: 9000, bulutZaman: 9000, yerelBos: false }), 'yukle'); });
test('karar: ikisi de değişmiş → sor', () => { assert.equal(karar({ kirli: true, sonSenkron: 5000, bulutZaman: 9000, yerelBos: false }), 'sor'); });
test('karar: değişiklik yok → esit', () => { assert.equal(karar({ kirli: false, sonSenkron: 9000, bulutZaman: 9000, yerelBos: false }), 'esit'); });
test('epostaGecerli', () => { assert.ok(epostaGecerli('a.b@c.io')); assert.ok(!epostaGecerli('abc')); assert.ok(!epostaGecerli('a@b')); });

test('donusCoz: token parçası, hata ve boş adres', () => {
  const t = bulut.donusCoz('https://x/app/#access_token=A&expires_in=3600&refresh_token=R&token_type=bearer&type=magiclink');
  assert.equal(t.erisim, 'A'); assert.equal(t.yenileme, 'R'); assert.ok(t.bitis > Date.now() + 3500000);
  assert.deepEqual(bulut.donusCoz('https://x/app/?error=access_denied&error_description=User+denied+access'), { hata: 'User denied access' });
  assert.equal(bulut.donusCoz('https://x/app/'), null);
  assert.equal(bulut.donusCoz('https://x/app/#access_token=A'), null);   // yenileme yoksa oturum kurulamaz
});
test('googleUrl: sağlayıcı ve dönüş adresi', () => {
  const u = bulut.googleUrl('kelimetre://auth');
  assert.ok(u.startsWith('https://thftjeecotladgnuqwhd.supabase.co/auth/v1/authorize?provider=google&redirect_to=kelimetre%3A%2F%2Fauth'));
});
