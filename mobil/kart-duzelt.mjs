// mobil/kart-duzelt.mjs — kaynak/kart-duzeltme.json'daki kelime kartı düzeltmelerini ünite JSON'larına uygular.
//   ornek/ornek_tr → yeni örnek cümle: tokenlar sözcüklere bölünür, hedef kelime vurgulanır, anlamlar (a)
//                    eski tokenlardan ve kelime havuzundan türetilir
//   tr             → anlam metni
//   birlestir      → kart silinir; örneği kök karta "ornekler" (ek örnek) olarak eklenir, "not" kök anlamına eklenir
// Kullanım: node kart-duzelt.mjs   (idempotent: aynı düzeltme ikinci kez değişiklik yapmaz)
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const buGun = dirname(fileURLToPath(import.meta.url));
const uniteDir = join(buGun, '..', 'app', 'data', 'uniteler');
const { duzeltmeler } = JSON.parse(readFileSync(join(buGun, 'kaynak', 'kart-duzeltme.json'), 'utf8'));

const norm = s => String(s || '').toLowerCase().replace(/[^a-z]/g, '');
const stem = s => { s = norm(s); return s.replace(/ies$/, 'y').replace(/ied$/, 'y').replace(/(sses|shes|ches|xes)$/, m => m.slice(0, -2)).replace(/(ing|ed|es|s)$/, '').replace(/(\w)\1$/, '$1'); };
const ATLA = new Set('a an the and or but is are was were be been being am do does did it its he she they we you i his her their our my your this that these those as not no'.split(' '));

// Havuz: tüm ünitelerdeki kelimeler + tokenlardaki (k → a) çiftleri → anlam sözlüğü
const dosyalar = readdirSync(uniteDir).filter(f => /^unite-\d+\.json$/.test(f)).sort();
const uniteler = dosyalar.map(f => ({ f, yol: join(uniteDir, f), d: JSON.parse(readFileSync(join(uniteDir, f), 'utf8')) }));
const anlam = new Map();          // norm(k) → a
const anlamStem = new Map();      // stem(k) → a
for (const { d } of uniteler) for (const w of d.kelimeler || []) {
  const kisa = String(w.tr || '').split(/[,;/·(]/)[0].trim();
  if (!/\s/.test(w.en) && kisa) { anlam.set(norm(w.en), kisa); if (!anlamStem.has(stem(w.en))) anlamStem.set(stem(w.en), kisa); }
  for (const t of w.ornek_tokenlar || []) if (t.a && t.k && !/\s/.test(t.k)) { const n = norm(t.k); if (!anlam.has(n)) anlam.set(n, t.a); }
}

function tokenla(cumle, hedef, eskiToks) {
  const eski = new Map((eskiToks || []).map(t => [norm(t.k), t.a]).filter(([k, a]) => k && a));
  const hedefStems = String(hedef).toLowerCase().replace(/\([^)]*\)/g, ' ').split(/[\s/]+/).filter(x => x && !ATLA.has(x)).map(stem);
  return cumle.split(/\s+/).map(k => {
    const n = norm(k), t = { k };
    if (!n) return t;
    const vurgu = hedefStems.some(h => h.length >= 3 && (stem(n) === h || n.startsWith(h) && n.length - h.length <= 3));
    if (vurgu) t.vurgu = true;
    if (!ATLA.has(n)) { const a = eski.get(n) || anlam.get(n) || anlamStem.get(stem(n)); if (a) t.a = a; }
    return t;
  });
}

let sayac = { ornek: 0, tr: 0, birlestir: 0, bulunamayan: [] };
for (const dz of duzeltmeler) {
  const u = uniteler.find(x => +x.f.match(/\d+/)[0] === dz.u); if (!u) { sayac.bulunamayan.push(dz.en); continue; }
  const liste = u.d.kelimeler || [];
  const i = liste.findIndex(w => w.en === dz.en);
  if (i < 0) { if (!dz.birlestir) sayac.bulunamayan.push(dz.en); continue; }
  const w = liste[i];
  if (dz.birlestir) {
    // Kök kart herhangi bir ünitede olabilir
    let kok = null; for (const x of uniteler) { kok = (x.d.kelimeler || []).find(y => y.en === dz.birlestir); if (kok) { x.degisti = true; break; } }
    if (!kok) { sayac.bulunamayan.push(dz.en + ' → ' + dz.birlestir); continue; }
    kok.ornekler = kok.ornekler || [];
    if (w.ornek_tokenlar && !kok.ornekler.some(o => o.tr === w.ornek_tr)) kok.ornekler.push({ tokenlar: tokenla(w.ornek_tokenlar.map(t => t.k).join(' '), kok.en, w.ornek_tokenlar), tr: w.ornek_tr, bicim: dz.en });
    if (dz.not && !kok.tr.includes(dz.not)) kok.tr = kok.tr + ' · ' + dz.not;
    liste.splice(i, 1); u.degisti = true; sayac.birlestir++;
    continue;
  }
  if (dz.tr && w.tr !== dz.tr) { w.tr = dz.tr; u.degisti = true; sayac.tr++; }
  if (dz.ornek) {
    const mevcut = (w.ornek_tokenlar || []).map(t => t.k).join(' ');
    if (mevcut !== dz.ornek) { w.ornek_tokenlar = tokenla(dz.ornek, w.en, w.ornek_tokenlar); w.ornek_tr = dz.ornek_tr; u.degisti = true; sayac.ornek++; }
  }
}
for (const u of uniteler) if (u.degisti) writeFileSync(u.yol, JSON.stringify(u.d, null, 2) + '\n');
console.log('örnek yenilendi:', sayac.ornek, '· anlam:', sayac.tr, '· birleştirilen:', sayac.birlestir, '· bulunamayan:', sayac.bulunamayan);
