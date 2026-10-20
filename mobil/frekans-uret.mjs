// mobil/frekans-uret.mjs — Havuzdaki kelimeler için İngilizce sıklık sırası önbelleği üretir.
// Kaynak: Peter Norvig count_1w.txt (Google Web Trillion Word Corpus, 333k biçim).
// Kullanım: node frekans-uret.mjs /yol/count_1w.txt  →  kaynak/frekans-sira.json  { "kelime": sira }
// Çok kelimeli girdilerde ("give off", "according to") sıra = işlev sözcükleri dışındaki en seyrek sözcüğün sırası.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const STOP = new Set('a an the of to in on at for from by with as and or but be is are was were been being do does did have has had will would can could should may might must shall not no so if than that this these those it its one ones up down out off over into onto about'.split(' '));
export function anahtarSozcukler(en) {
  const s = String(en).toLowerCase().replace(/\([^)]*\)/g, ' ').replace(/[^a-z\s-]/g, ' ').split(/[\s-]+/).filter(Boolean);
  const ic = s.filter(x => !STOP.has(x));
  return ic.length ? ic : s;
}

const buGun = dirname(fileURLToPath(import.meta.url));
const kaynak = process.argv[2];
if (!kaynak) { console.error('kullanım: node frekans-uret.mjs count_1w.txt'); process.exit(1); }
const sira = new Map(); let i = 0;
for (const satir of readFileSync(kaynak, 'utf8').split('\n')) { const w = satir.split('\t')[0]; if (w && !sira.has(w)) sira.set(w, ++i); }

const uniteDir = join(buGun, '..', 'app', 'data', 'uniteler');
const cikti = {};
for (const f of readdirSync(uniteDir).filter(f => /^unite-\d+\.json$/.test(f))) {
  const d = JSON.parse(readFileSync(join(uniteDir, f), 'utf8'));
  for (const k of d.kelimeler || []) {
    const en = String(k.en || '').trim().toLowerCase(); if (!en || cikti[en] != null) continue;
    let m = 0, eksik = false;
    for (const x of anahtarSozcukler(en)) { const r = sira.get(x); if (!r) { eksik = true; break; } m = Math.max(m, r); }
    cikti[en] = eksik ? 0 : m;
  }
}
writeFileSync(join(buGun, 'kaynak', 'frekans-sira.json'), JSON.stringify(cikti) + '\n');
console.log('kelime:', Object.keys(cikti).length, '· bulunamayan:', Object.values(cikti).filter(v => !v).length);
