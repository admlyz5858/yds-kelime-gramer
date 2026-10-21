// mobil/test-temizle.mjs — Ünite test sorularını temizler (kaynak metinden gelen numara/harf kalıntıları,
// kesik gövdeler, gömülü şıklar, tekrarlar). Kullanım: node test-temizle.mjs [--kuru]
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const buGun = dirname(fileURLToPath(import.meta.url));
const uniteDir = join(buGun, '..', 'app', 'data', 'uniteler');
const kuru = process.argv.includes('--kuru');
const MIN_TEST = 5;

const metinTemizle = (s) => String(s || '')
  .replace(/\(CLOZE TEST\)\s*/gi, '')
  .replace(/^\s*CLOZE TEST\s*[–-]\s*/i, '')
  .replace(/^\s*\(?\d{1,3}[.)]\)?\s*/, '')          // "40. " / "(17.) " / "18) "
  .replace(/^\s*\(?\d{1,3}[.)]\)?\s*/, '')          // iki kat numara
  .replace(/\(Q\d+\)\s*/gi, '')
  .replace(/\n\s*A\)[\s\S]*$/, '')                 // gövdeye gömülü "A) … B) …" satırları (şıklar ayrıca var)
  .replace(/\(\d{1,2}\)\s*(?=_)/g, '')              // "(3) ____" → "____"
  .replace(/\s{2,}/g, ' ').trim();
const sikTemizle = (s) => String(s || '').replace(/^\s*[A-E]\)\s*/, '').replace(/\s{2,}/g, ' ').trim();

export function soruDuzelt(q) {
  const soru = metinTemizle(q.soru);
  const secenekler = [...new Set((q.secenekler || []).map(sikTemizle).filter(Boolean))];
  const cevap = sikTemizle(q.cevap);
  return { ...q, soru, secenekler, cevap };
}
export function soruSorunu(q) {
  const s = q.soru;
  if (!s) return 'boş';
  if (/^(\.{3}|…)/.test(s)) return 'kesik başlangıç';
  if (/(\.{3}|…)\s*$/.test(s)) return 'kesik son';
  if (/\((stem kesik|continuation|devam)\)/i.test(s)) return 'kesik gövde notu';
  if (/\.{3}|…/.test(s)) return 'kesik (üç nokta)';
  if (/seçenek görünmüyor|matched above|->/i.test(s + ' ' + q.secenekler.join(' '))) return 'meta not';
  if (/\bA\)\s.*\bB\)\s/.test(s)) return 'gömülü şık';
  if (s.replace(/_+/g, '').replace(/[^\p{L}\p{N}]/gu, '').length < 10) return 'çok kısa gövde';
  if (!/_{2,}/.test(s) && !/\?|hangisi|çeviri|anlam|doğru|yanlış|eş\s*anlam|zıt/i.test(s)) return 'boşluksuz/sorusuz';
  if (q.secenekler.length < 3) return 'az şık';
  if (!q.secenekler.includes(q.cevap)) return 'cevap şıklarda yok';
  return null;
}

const rapor = { incelenen: 0, duzeltilen: 0, atilan: {}, tekrar: 0, birlesen: 0 };
for (const f of readdirSync(uniteDir).filter(f => /^unite-\d+\.json$/.test(f)).sort()) {
  const yol = join(uniteDir, f);
  const u = JSON.parse(readFileSync(yol, 'utf8'));
  if (!Array.isArray(u.testler) || !u.testler.length) continue;
  const gorulen = new Set();
  let testler = u.testler.map(t => {
    const sorular = [];
    for (const q0 of t.sorular || []) {
      rapor.incelenen++;
      const q = soruDuzelt(q0);
      if (q.soru !== q0.soru || q.cevap !== q0.cevap || q.secenekler.length !== (q0.secenekler || []).length || q.secenekler.some((o, i) => o !== q0.secenekler[i])) rapor.duzeltilen++;
      const sorun = soruSorunu(q);
      if (sorun) { rapor.atilan[sorun] = (rapor.atilan[sorun] || 0) + 1; continue; }
      const key = q.soru.toLowerCase() + '|' + q.cevap.toLowerCase();
      if (gorulen.has(key)) { rapor.tekrar++; continue; }
      gorulen.add(key);
      sorular.push(q);
    }
    return { ...t, sorular };
  });
  // Küçük testleri komşusuyla birleştir
  for (let i = testler.length - 1; i >= 0; i--) {
    if (testler[i].sorular.length >= MIN_TEST) continue;
    const hedef = i > 0 ? i - 1 : (testler.length > 1 ? 1 : -1);
    if (hedef < 0) continue;
    testler[hedef].sorular = hedef < i ? [...testler[hedef].sorular, ...testler[i].sorular] : [...testler[i].sorular, ...testler[hedef].sorular];
    testler.splice(i, 1); rapor.birlesen++;
  }
  testler = testler.filter(t => t.sorular.length > 0).map((t, i) => ({ ...t, ad: /^Test\s*\d+$/i.test(t.ad || '') || !t.ad ? `Test ${i + 1}` : t.ad }));
  const once = u.testler.reduce((s, t) => s + t.sorular.length, 0), sonra = testler.reduce((s, t) => s + t.sorular.length, 0);
  console.log(`${f}: ${u.testler.length} test / ${once} soru → ${testler.length} test / ${sonra} soru`);
  if (!kuru) { u.testler = testler; writeFileSync(yol, JSON.stringify(u, null, 2) + '\n'); }
}
console.log(rapor);
