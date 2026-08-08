// mobil/kelime-havuz.mjs — tüm ünitelerin kelimelerini tek havuzda toplar.
// Saf Node, bağımlılıksız. Hem CLI (dev: app/data/kelime-havuz.json üret) hem de
// hazirla.mjs tarafından (üretim: yalnız pakete giren ünitelerden yeniden üret) kullanılır.
//
// Üretim paketinde premium ünite JSON'ları silindiği için, hazirla.mjs bu modülü
// www/data/uniteler üzerinde çağırınca havuz kendiliğinden yalnız ücretsiz kelimeleri içerir.
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// Bir kelime kaydını normalize et (yalnız gerekli alanlar, tutarlı sıra)
function normalize(k, uniteId) {
  const o = { en: k.en, tur: k.tur || '', tr: k.tr || '' };
  if (k.ornek_tr) o.ornek_tr = k.ornek_tr;
  if (Array.isArray(k.ornek_tokenlar)) o.ornek_tokenlar = k.ornek_tokenlar;
  o.u = uniteId;                       // kaynak ünite (grup/filtre için)
  return o;
}

// uniteDir içindeki unite-*.json dosyalarından benzersiz kelime havuzu üret.
// Dedup: en (küçük harf) — düşük ünite id'si önce (Ünite 1 en sık kelimeler).
export function havuzUret(uniteDir) {
  const dosyalar = readdirSync(uniteDir)
    .filter(f => /^unite-\d+\.json$/.test(f))
    .sort((a, b) => (+a.match(/\d+/)[0]) - (+b.match(/\d+/)[0]));

  const gorulen = new Set();
  const kelimeler = [];
  const uniteSayac = {};

  for (const dosya of dosyalar) {
    let d;
    try { d = JSON.parse(readFileSync(join(uniteDir, dosya), 'utf8')); }
    catch { continue; }
    const uId = d.id ?? +dosya.match(/\d+/)[0];
    for (const k of (d.kelimeler || [])) {
      const en = String(k.en || '').trim();
      if (!en || !k.tr) continue;
      const anahtar = en.toLowerCase();
      if (gorulen.has(anahtar)) continue;
      gorulen.add(anahtar);
      kelimeler.push(normalize(k, uId));
      uniteSayac[uId] = (uniteSayac[uId] || 0) + 1;
    }
  }

  return {
    surum: 1,
    uretim: 'kelime-havuz.mjs',
    toplam: kelimeler.length,
    uniteler: Object.keys(uniteSayac).map(Number).sort((a, b) => a - b),
    kelimeler,
  };
}

// Havuzu dosyaya yaz, özet döndür.
export function havuzYaz(uniteDir, cikti) {
  const havuz = havuzUret(uniteDir);
  writeFileSync(cikti, JSON.stringify(havuz) + '\n');
  return havuz;
}

// CLI: node kelime-havuz.mjs  →  app/data/kelime-havuz.json (tüm üniteler)
if (import.meta.url === `file://${process.argv[1]}`) {
  const buGun = dirname(fileURLToPath(import.meta.url));
  const uniteDir = join(buGun, '..', 'app', 'data', 'uniteler');
  const cikti = join(buGun, '..', 'app', 'data', 'kelime-havuz.json');
  if (!existsSync(uniteDir)) { console.error('uniteler klasörü yok:', uniteDir); process.exit(1); }
  const h = havuzYaz(uniteDir, cikti);
  console.log(`Kelime havuzu üretildi: ${h.toplam} benzersiz kelime · üniteler ${h.uniteler.join(',')}`);
  console.log('→', cikti);
}
