// mobil/soru-banka.mjs — Ünite testlerindeki tüm soruları konu/alt konu etiketiyle tek bankada toplar.
// Çıktı: app/data/sorular.json  { surum, konular:[{id, ad, ikon, alt:[{id, ad}]}], sorular:[{id, u, konu, alt, soru, secenekler, cevap, aciklama?, ornek?}] }
// Etiketler kurallarla atanır; elle düzeltmeler kaynak/soru-etiket-duzeltme.json ({ "<id>": { konu, alt } }) ile ezilir.
// Kullanım: node soru-banka.mjs [--rapor]   (--rapor: belirsiz etiketlerin listesi stdout'a)
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const KONULAR = [
  { id: 'edat', ad: 'Edatlar', ikon: '🧭', alt: [['temel', 'at · in · on'], ['yon', 'Yön: from · to · into · towards'], ['arac', 'Araç/eşlik: by · with · without'], ['soyut', 'Soyut: for · of · about'], ['zaman', 'Zaman: during · until · since'], ['konum', 'Konum: between · across · over…'], ['diger', 'Diğer edatlar']] },
  { id: 'zaman', ad: 'Zamanlar', ikon: '⏱️', alt: [['present', 'Present Simple'], ['present-cont', 'Present Continuous'], ['present-perf', 'Present Perfect'], ['present-perf-cont', 'Present Perfect Cont.'], ['past', 'Past Simple'], ['past-cont', 'Past Continuous'], ['past-perf', 'Past Perfect'], ['past-perf-cont', 'Past Perfect Cont.'], ['future', 'Future'], ['future-cont', 'Future Continuous'], ['future-perf', 'Future Perfect']] },
  { id: 'modal', ad: 'Modallar', ikon: '🎛️', alt: [['olasilik', 'Olasılık: may · might · could'], ['cikarim', 'Geçmiş çıkarım: modal + have V3'], ['zorunluluk', 'Zorunluluk: must · have to · need'], ['tavsiye', 'Tavsiye: should · ought to · had better'], ['yetenek', 'Yetenek: can · could · be able to'], ['aliskanlik', 'Geçmiş alışkanlık: used to · would'], ['ceviri', 'Modal çevirisi']] },
  { id: 'cati', ad: 'Etken – Edilgen', ikon: '🔁', alt: [['edilgen', 'Edilgen çatı'], ['etken', 'Etken çatı']] },
  { id: 'kosul', ad: 'Koşul Cümleleri', ikon: '🔀', alt: [['tip1', 'Type 0 / 1 (gerçek)'], ['tip2', 'Type 2 (hayalî)'], ['tip3', 'Type 3 (geçmiş)'], ['karma', 'Karma / devrik'], ['baglayici', 'Koşul bağlayıcıları']] },
  { id: 'fiilimsi', ad: 'Fiilimsiler', ikon: '🧬', alt: [['infinitive', 'Infinitive (to V)'], ['gerund', 'Gerund (V-ing)'], ['participle', 'Participle (V3 / V-ing)']] },
  { id: 'cumlecik', ad: 'Cümlecikler', ikon: '🧱', alt: [['isim', 'İsim cümlecikleri'], ['sifat', 'Sıfat cümlecikleri'], ['edatli', 'Edat + which / whom']] },
  { id: 'baglac', ad: 'Bağlaçlar', ikon: '🔗', alt: [['zitlik', 'Zıtlık'], ['sebep', 'Sebep – sonuç'], ['kosul', 'Koşul'], ['ekleme', 'Ekleme'], ['zaman', 'Zaman – sıra'], ['amac', 'Amaç'], ['diger', 'Diğer']] },
  { id: 'kelime', ad: 'Kelime Bilgisi', ikon: '📖', alt: [['tek', 'Tek kelime'], ['obek', 'Öbek fiil / deyim'], ['cumle', 'Cümle tamamlama']] },
];

const EDAT_GRUP = {
  at: 'temel', in: 'temel', on: 'temel',
  from: 'yon', to: 'yon', into: 'yon', onto: 'yon', towards: 'yon', toward: 'yon', out: 'yon', off: 'yon', up: 'yon', down: 'yon',
  by: 'arac', with: 'arac', without: 'arac', via: 'arac', per: 'arac',
  for: 'soyut', of: 'soyut', about: 'soyut', regarding: 'soyut', concerning: 'soyut', despite: 'soyut', like: 'soyut', as: 'soyut', against: 'soyut', except: 'soyut', excepting: 'soyut', upon: 'soyut',
  during: 'zaman', until: 'zaman', till: 'zaman', since: 'zaman', before: 'zaman', after: 'zaman', throughout: 'zaman', within: 'zaman',
  between: 'konum', among: 'konum', across: 'konum', through: 'konum', along: 'konum', over: 'konum', under: 'konum', above: 'konum', below: 'konum', behind: 'konum', beside: 'konum', beyond: 'konum', near: 'konum', inside: 'konum', outside: 'konum', beneath: 'konum', past: 'konum', around: 'konum', round: 'konum', underneath: 'konum', opposite: 'konum', amid: 'konum', amidst: 'konum',
};
const BAGLAC = [
  ['zitlik', /^(despite|in spite of|although|though|even though|even if|whereas|while|however|nevertheless|nonetheless|yet|but|still|on the other hand|in contrast|conversely|on the contrary|instead|rather|regardless of|notwithstanding|albeit)$/],
  ['sebep', /^(because|because of|since|as|due to|owing to|on account of|thanks to|therefore|thus|hence|consequently|as a result|as a consequence|accordingly|so|thereby|for this reason|that is why)$/],
  ['kosul', /^(provided that|providing that|provided|as long as|so long as|unless|if|in case|only if|on condition that|supposing|otherwise|or else|in the event that)$/],
  ['ekleme', /^(moreover|furthermore|in addition|besides|also|additionally|likewise|similarly|what is more|as well as|not only|both|neither|nor|either)$/],
  ['zaman', /^(when|whenever|while|as soon as|until|till|before|after|once|meanwhile|then|finally|eventually|by the time|no sooner|hardly|scarcely|as|since|afterwards|subsequently)$/],
  ['amac', /^(so that|in order that|in order to|so as to|lest|for fear that|with a view to|in case)$/],
];
const V3_DUZENSIZ = /\b(been|done|gone|seen|made|taken|given|written|spoken|broken|chosen|driven|eaten|fallen|forgotten|frozen|hidden|known|shown|thrown|worn|begun|drunk|sung|sunk|swum|run|come|become|built|bought|brought|caught|felt|found|had|heard|held|kept|left|lent|lost|met|paid|put|read|said|sent|sold|sent|set|shut|sat|slept|spent|stood|taught|told|thought|understood|won|cut|hit|hurt|let|led|fed|bred|sought|fought|dealt|meant|lit|struck|stuck|sworn|torn|born|borne|drawn|grown|flown|blown|lain|laid|ridden|risen|shaken|stolen|woken|bitten|beaten|proven|sewn|sown|wound|bound|ground|hung|spun|spread|split|won|undergone|overcome|withdrawn|arisen|awoken|forbidden|forgiven|mistaken|overtaken|undertaken|upset|cast|burst|quit|rid)\b/;
const V2_DUZENSIZ = /\b(broke|drank|wrote|went|saw|did|took|ate|left|made|came|ran|began|spoke|found|gave|got|knew|thought|told|became|felt|kept|held|brought|bought|caught|paid|sold|sent|built|lost|met|sat|stood|won|heard|led|fed|fell|drove|rose|grew|flew|threw|drew|wore|chose|forgot|froze|hid|rode|shook|stole|woke|swam|sang|sank|rang|taught|understood|lay|lent|spent|slept|shut|fought|sought|swung|hung|dealt|meant|lit|struck|stuck|swore|tore|bore|wound|bound|spun|was|were|had|said|cut|put|hit|hurt|let|set|quit|cost|spread|split)\b/;
const v3 = (s) => V3_DUZENSIZ.test(s) || /\b\w{3,}(ed|en)\b/.test(s);
const MODAL = /\b(can|cannot|can't|could|couldn't|may|might|must|mustn't|should|shouldn't|ought to|oughtn't to|have to|has to|had to|need to|needn't|need not|don't need to|doesn't need to|used to|didn't use to|would|wouldn't|will|won't|shall|had better|be able to|is able to|are able to|was able to|were able to|been able to|isn't able to|is unable to|unable to|dare)\b/i;

function zamanEtiketi(c) {
  const s = ' ' + c.toLowerCase() + ' ';
  if (/\bwill have been \w+ing\b/.test(s)) return 'future-perf';
  if (/\bwill have\b/.test(s)) return 'future-perf';
  if (/\bwill be \w+ing\b/.test(s)) return 'future-cont';
  if (/\b(will|shall|going to)\b/.test(s)) return 'future';
  if (/\bhad been \w+ing\b/.test(s)) return 'past-perf-cont';
  if (/\bhad (not |never |already |just )?(\w+)/.test(s) && v3(s.replace(/\bhad\b/, ''))) return 'past-perf';
  if (/\b(was|were) (not )?\w+ing\b/.test(s)) return 'past-cont';
  if (/\b(have|has) (not |never |already |just )?been \w+ing\b/.test(s)) return 'present-perf-cont';
  if (/\b(have|has|'ve|'s) (not |never |already |just )?\w+/.test(s) && v3(s.replace(/\b(have|has)\b/, ''))) return 'present-perf';
  if (/\b(am|is|are) (not )?\w+ing\b/.test(s)) return 'present-cont';
  if (/\b(was|were|did|didn't|\w{3,}ed)\b/.test(s) || V2_DUZENSIZ.test(s) || V3_DUZENSIZ.test(s) && !/\b(is|are|am)\b/.test(s)) return 'past';
  if (/\b(do|does|don't|doesn't|am|is|are)\b/.test(s) || /\b\w{3,}(?<!ou|s)s\b/.test(s.trim()) && !/\s/.test(s.trim())) return 'present';
  return null;
}
function modalEtiketi(c) {
  const s = ' ' + c.toLowerCase() + ' ';
  if (/\b(must|can't|cannot|couldn't|may|might|could|should|shouldn't|ought to|needn't|would|wouldn't|ought not to|oughtn't to|didn't need to|needn't have)\s*(not )?have\b/.test(s) || /\bneedn't have\b/.test(s)) return 'cikarim';
  if (/\b(used to|didn't use to|didn't used to)\b/.test(s)) return 'aliskanlik';
  if (/\b(should|shouldn't|ought to|oughtn't to|had better|ought not)\b/.test(s)) return 'tavsiye';
  if (/\b(must|mustn't|have to|has to|had to|need to|needn't|need not|don't need to|doesn't need to|don't have to|doesn't have to|didn't have to|will need to|have got to)\b/.test(s)) return 'zorunluluk';
  if (/\b(can|cannot|can't|be able to|is able to|are able to|was able to|were able to|been able to|isn't able to|aren't able to|unable to|is unable to|will be able to)\b/.test(s)) return 'yetenek';
  if (/\b(may|might|could|may not|might not|couldn't)\b/.test(s)) return 'olasilik';
  if (/\b(would|wouldn't)\b/.test(s)) return 'aliskanlik';
  if (/\b(will|won't|shall)\b/.test(s)) return 'zorunluluk';
  return 'olasilik';
}
function edilgenMi(c) {
  const s = c.toLowerCase();
  return /\b(be|been|being|am|is|are|was|were|get|got|gets|getting)\s+(not\s+)?(\w+ly\s+)?\w+/.test(s) && v3(s.replace(/\b(be|been|being|am|is|are|was|were|get|got|gets|getting)\b/g, '')) && !/\b(was|were|is|are|am|been|being)\s+\w+ing\b/.test(s);
}
function kosulEtiketi(soru, c) {
  const s = (soru + ' ' + c).toLowerCase(), cv = c.toLowerCase();
  const kosulBag = /^(if|unless|provided that|providing that|provided|as long as|so long as|in case|only if|on condition that|supposing|even if|otherwise|but for|without|in case of|on the condition that)$/.test(cv.trim());
  if (kosulBag) return 'baglayici';
  const tip3 = /\b(would|could|might|should)( not)?( n't)? have\b|\bwouldn't have\b|\bcouldn't have\b|\bhad(n't)? (not )?\w+/.test(cv) && v3(cv);
  const tip2 = /\b(would|could|might|wouldn't|couldn't)\b(?! have)/.test(cv) || /\bwere\b/.test(cv);
  const tip1 = /\b(will|won't|can|can't|may|must|should|shall|going to)\b/.test(cv);
  const parcalar = cv.split(/\s*\/\s*/);
  if (parcalar.length === 2) {
    const [a, b] = parcalar;
    const t = (p) => (/\b(would|could|might|should)( not)? have\b|wouldn't have|couldn't have/.test(p) || (/\bhad\b/.test(p) && v3(p))) ? 3 : (/\b(would|could|might|wouldn't|couldn't|were)\b/.test(p) || (/\b\w+ed\b|\bwas\b|\bdid\b|\bdidn't\b/.test(p) && !/\bwill\b/.test(p))) ? 2 : (/\b(will|won't|can|may|must|shall)\b/.test(p) ? 1 : 0);
    const ta = t(a), tb = t(b);
    if (!ta && !tb) return 'tip1';   // her iki yan geniş zaman: Type 0/1
    if (ta && tb && ta !== tb) return 'karma';
    if (ta === 3 || tb === 3) return 'tip3';
    if (ta === 2 || tb === 2) return 'tip2';
    if (ta === 1 || tb === 1) return 'tip1';
  }
  if (tip3) return 'tip3';
  if (/\bhad\b.*\b(would|could|might)\b(?! have)|\b(would|could|might)\b(?! have).*\bhad\b/.test(s) && /\b(would|could|might)\b(?! have)/.test(cv)) return 'karma';
  if (tip2) return 'tip2';
  if (tip1) return 'tip1';
  return null;
}

export function etiketle(u, q) {
  const soru = q.soru, c = String(q.cevap || '').trim(), cl = c.toLowerCase();
  const tek = !/\s/.test(cl);
  const ilk = cl.split(/\s+/)[0];
  // 1) Modal çevirisi
  if (/çevirisi/i.test(soru)) return ['modal', 'ceviri'];
  // 2) Cümlecikler
  if ((u === 12 || u === 13) || /^(of|to|in|for|with|from|by|on|at|about|during) (which|whom|whose)$/.test(cl)) {
    if (/^(of|to|in|for|with|from|by|on|at|about|during) (which|whom|whose)$/.test(cl)) return ['cumlecik', 'edatli'];
    if (/^(who|whom|whose|which|that|where|when|why|which is|who is|that is|where the)$/.test(cl) && u === 13) return ['cumlecik', 'sifat'];
    if (/^(that|what|whether|if|who|whom|whose|which|where|when|why|how|how much|how many|whatever|whoever|whichever|wherever|whenever|the fact that)$/.test(cl) && u === 12) return ['cumlecik', 'isim'];
    if (u === 12) return ['cumlecik', 'isim'];
    if (u === 13) return ['cumlecik', 'sifat'];
  }
  // 3) Koşul
  if (u === 11) { const k = kosulEtiketi(soru, c); if (k) return ['kosul', k]; }
  // 4) Bağlaçlar
  for (const [alt, re] of BAGLAC) if (re.test(cl)) { if (u === 11 && alt === 'kosul') return ['kosul', 'baglayici']; if (u === 2 && EDAT_GRUP[cl]) break; return ['baglac', alt]; }
  if (u === 14) return ['baglac', 'diger'];
  // 5) Edatlar
  if (tek && EDAT_GRUP[cl]) return ['edat', EDAT_GRUP[cl]];
  if (u === 2) return ['edat', 'diger'];
  // 6) Edilgen çatı (çatı ünitesinde modal/infinitive biçimlerinden önce)
  if (edilgenMi(c) && (u === 10 || !MODAL.test(c))) return ['cati', 'edilgen'];
  // 6b) Modallar
  if (MODAL.test(c) && !(u >= 3 && u <= 6 && /\b(will|would|shall)\b/i.test(c) && !/\b(can|could|may|might|must|should|ought|have to|has to|had to|need|used to|able to|had better)\b/i.test(c))) return ['modal', modalEtiketi(c)];
  // 7) Fiilimsiler
  if (/^(to|not to|in order to|so as to) \w+/.test(cl) || /^to have (been )?\w+/.test(cl)) return ['fiilimsi', 'infinitive'];
  if (/^(having|not having|being|not being)\b/.test(cl) || (/^\w+ing\b/.test(cl) && !/^(during|something|nothing|anything|everything|morning|evening|building|meeting|king|ring|thing|spring|string|wing|bring|sing|sting|swing|cling|fling|wring)$/.test(ilk))) {
    if (u === 9 || u === 10) return ['fiilimsi', /^(being|not being)\b/.test(cl) ? 'participle' : 'gerund'];
    return ['fiilimsi', 'gerund'];
  }
  // 8) Çatı / zamanlar
  if (edilgenMi(c)) return ['cati', 'edilgen'];
  const z = zamanEtiketi(c);
  if (u >= 3 && u <= 6 && z) return ['zaman', z];
  if (u === 10) { if (z) return ['cati', 'etken']; if (tek && v3(cl)) return ['fiilimsi', 'participle']; }
  if (u === 9 && tek && v3(cl) && !/ed$/.test(cl)) return ['fiilimsi', 'participle'];
  if (z && (/\b(have|has|had|will|was|were|is|are|am)\b/.test(cl) || /\b\w+ing\b/.test(cl))) return ['zaman', z];
  // 9) Kelime bilgisi / cümle tamamlama
  if (cl.split(/\s+/).length >= 5) return ['kelime', 'cumle'];
  return ['kelime', tek ? 'tek' : 'obek'];
}

function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); }

const buGun = dirname(fileURLToPath(import.meta.url));
if (import.meta.url === `file://${process.argv[1]}`) {
  const uniteDir = join(buGun, '..', 'app', 'data', 'uniteler');
  const duzeltmeYol = join(buGun, 'kaynak', 'soru-etiket-duzeltme.json');
  const duzeltme = existsSync(duzeltmeYol) ? JSON.parse(readFileSync(duzeltmeYol, 'utf8')) : {};
  const rapor = process.argv.includes('--rapor');
  const sorular = []; const say = {}; const belirsiz = [];
  for (const f of readdirSync(uniteDir).filter(f => /^unite-\d+\.json$/.test(f)).sort()) {
    const u = JSON.parse(readFileSync(join(uniteDir, f), 'utf8'));
    const uId = +f.match(/\d+/)[0];   // manifest id = dosya numarası
    for (const t of u.testler || []) for (const q of t.sorular || []) {
      let [konu, alt] = etiketle(uId, q);
      const id = hash(uId + '|' + q.soru + '|' + q.cevap);
      if (duzeltme[id]) ({ konu, alt } = duzeltme[id]);
      const kayit = { id, u: uId, konu, alt, soru: q.soru, secenekler: q.secenekler, cevap: q.cevap };
      if (q.aciklama) kayit.aciklama = q.aciklama;
      if (q.ornek) kayit.ornek = q.ornek;
      sorular.push(kayit);
      const k = konu + '/' + alt; say[k] = (say[k] || 0) + 1;
      // Belirsizlik: ünite beklentisi dışı konu ya da genel "kelime" etiketi
      const beklenen = { 2: 'edat', 3: 'zaman', 4: 'zaman', 5: 'zaman', 6: 'zaman', 7: 'modal', 8: 'modal', 9: 'fiilimsi', 10: 'cati', 11: 'kosul', 12: 'cumlecik', 13: 'cumlecik', 14: 'baglac' }[uId];
      if (konu !== beklenen && !duzeltme[id]) belirsiz.push({ id, u: uId, konu, alt, soru: q.soru.slice(0, 80), cevap: q.cevap });
    }
  }
  const konular = KONULAR.map(k => ({ id: k.id, ad: k.ad, ikon: k.ikon, alt: k.alt.map(([id, ad]) => ({ id, ad })) }));
  writeFileSync(join(buGun, '..', 'app', 'data', 'sorular.json'), JSON.stringify({ surum: 1, konular, sorular }) + '\n');
  console.log('soru:', sorular.length, '· konu/alt dağılımı:');
  for (const k of konular) { const satir = k.alt.map(a => `${a.id} ${say[k.id + '/' + a.id] || 0}`).join(' · '); console.log(`  ${k.ikon} ${k.ad} (${k.alt.reduce((s, a) => s + (say[k.id + '/' + a.id] || 0), 0)}): ${satir}`); }
  console.log('ünite beklentisi dışı:', belirsiz.length);
  if (rapor) for (const b of belirsiz) console.log(`${b.id}\tU${b.u}\t${b.konu}/${b.alt}\t${b.soru.replace(/\n/g, ' ')}\t→ ${b.cevap}`);
}
