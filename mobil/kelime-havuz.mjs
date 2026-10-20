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
// Tür etiketi: "İsim" / "isim" / "fiil " → "İsim", "Fiil"; bileşikler korunur ("Edat / Bağlaç")
export function turNormalize(t) {
  return String(t || '').trim().split(/\s*\/\s*/).map(p => {
    const k = p.trim().toLocaleLowerCase('tr-TR');
    return k ? k.charAt(0).toLocaleUpperCase('tr-TR') + k.slice(1) : '';
  }).filter(Boolean).join(' / ');
}
function normalize(k, uniteId) {
  const o = { en: k.en, tur: turNormalize(k.tur), tr: k.tr || '' };
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

  // Seviye bandı: Ünite 1 sıklık sırasına göre S1–S4 (dört dilim), gramer ünitelerinin kelimeleri S5 (akademik)
  const u1 = kelimeler.filter(w => w.u === 1);
  u1.forEach((w, i) => { w.sv = 1 + Math.min(3, Math.floor(i / Math.ceil(u1.length / 4))); });
  kelimeler.forEach(w => { if (!w.sv) w.sv = 5; });

  return {
    surum: 2,
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
