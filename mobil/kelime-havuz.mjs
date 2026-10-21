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
  if (Array.isArray(k.ornekler) && k.ornekler.length) o.ornekler = k.ornekler;   // ek örnekler (birleştirilmiş kartlardan)
  if (Array.isArray(k.bicimler) && k.bicimler.length) o.bicimler = k.bicimler;
  o.u = uniteId;                       // kaynak ünite (grup/filtre için)
  return o;
}

function frekansYukle() {
  try { return JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'kaynak', 'frekans-sira.json'), 'utf8')); }
  catch { return {}; }
}

// ===== Çekimli kopyaları kök karta bağla =====
// "accepted / contains / drawing" gibi kartların kökü (accept / contain / draw) havuzdaysa ve tür + anlam uyuşuyorsa
// çekimli kart havuzdan çıkar; kök karta bicimler[] ve ornekler[] (ek örnek, bicim etiketli) olarak eklenir.
const DUZENSIZ = { began: 'begin', begun: 'begin', broke: 'break', broken: 'break', brought: 'bring', built: 'build', bought: 'buy', caught: 'catch', chose: 'choose', chosen: 'choose', came: 'come', did: 'do', done: 'do', drew: 'draw', drawn: 'draw', drove: 'drive', driven: 'drive', ate: 'eat', eaten: 'eat', fell: 'fall', fallen: 'fall', felt: 'feel', fought: 'fight', found: 'find', flew: 'fly', flown: 'fly', forgot: 'forget', forgotten: 'forget', froze: 'freeze', frozen: 'freeze', gave: 'give', given: 'give', went: 'go', gone: 'go', grew: 'grow', grown: 'grow', heard: 'hear', held: 'hold', hid: 'hide', hidden: 'hide', kept: 'keep', knew: 'know', known: 'know', led: 'lead', left: 'leave', lent: 'lend', lost: 'lose', made: 'make', meant: 'mean', met: 'meet', paid: 'pay', ran: 'run', rose: 'rise', risen: 'rise', said: 'say', saw: 'see', seen: 'see', sold: 'sell', sent: 'send', shook: 'shake', shaken: 'shake', shown: 'show', sang: 'sing', sung: 'sing', sank: 'sink', sunk: 'sink', sat: 'sit', slept: 'sleep', spoke: 'speak', spoken: 'speak', spent: 'spend', stood: 'stand', stole: 'steal', stolen: 'steal', struck: 'strike', swam: 'swim', swum: 'swim', took: 'take', taken: 'take', taught: 'teach', told: 'tell', thought: 'think', threw: 'throw', thrown: 'throw', understood: 'understand', woke: 'wake', woken: 'wake', wore: 'wear', worn: 'wear', won: 'win', wrote: 'write', written: 'write', withdrew: 'withdraw', withdrawn: 'withdraw', undergone: 'undergo', underwent: 'undergo', overcame: 'overcome', arose: 'arise', arisen: 'arise', burnt: 'burn', dealt: 'deal', fed: 'feed', fled: 'flee', laid: 'lay', lit: 'light', sought: 'seek', shot: 'shoot', spread: 'spread', stuck: 'stick', swore: 'swear', sworn: 'swear', tore: 'tear', torn: 'tear', bred: 'breed', bound: 'bind', wound: 'wind', ground: 'grind', hung: 'hang', spun: 'spin', bit: 'bite', bitten: 'bite', beaten: 'beat', bore: 'bear', born: 'bear', borne: 'bear', lay: 'lie', lain: 'lie', rode: 'ride', ridden: 'ride', rang: 'ring', rung: 'ring', shrank: 'shrink', shrunk: 'shrink', sprang: 'spring', sprung: 'spring', strove: 'strive', striven: 'strive', awoke: 'awake', awoken: 'awake', blew: 'blow', blown: 'blow', forgave: 'forgive', forgiven: 'forgive', mistook: 'mistake', mistaken: 'mistake', overtook: 'overtake', overtaken: 'overtake', undertook: 'undertake', undertaken: 'undertake', upheld: 'uphold', wept: 'weep', swept: 'sweep', crept: 'creep', dug: 'dig', clung: 'cling', flung: 'fling', slid: 'slide', sped: 'speed', strung: 'string', stung: 'sting', stank: 'stink', stunk: 'stink', bent: 'bend', lent: 'lend', sent: 'send', spent: 'spend', built: 'build', dealt: 'deal', knelt: 'kneel', leapt: 'leap', dreamt: 'dream', learnt: 'learn', smelt: 'smell', spelt: 'spell', spilt: 'spill', spoilt: 'spoil' };
const normEn = s => String(s || '').toLowerCase().replace(/[^a-z]/g, '');
const kokAdaylari = (en) => {
  const n = normEn(en); const out = [];
  if (DUZENSIZ[n]) out.push(DUZENSIZ[n]);
  const m = n.match(/^(.*?)(ies|ied|sses|shes|ches|xes|ing|ed|es|s)$/);
  if (m) {
    const g = m[1], ek = m[2];
    if (ek === 'ies' || ek === 'ied') out.push(g + 'y');
    else if (/^(sses|shes|ches|xes)$/.test(ek)) out.push(g + ek[0] + (ek.length === 4 ? ek[1] : ''), n.slice(0, -2));
    else if (ek === 'ing' || ek === 'ed') { out.push(g); if (/(.)$/.test(g)) out.push(g.slice(0, -1)); else out.push(g + 'e'); }
    else { out.push(g); if (ek === 'es') out.push(g + 'e'); }
  }
  return [...new Set(out.filter(x => x.length >= 3 && x !== n))];
};
const turAna = (t) => String(t || '').toLowerCase().replace(/\(.*?\)/g, '').split(/\s*\/\s*/).map(x => x.trim().split(' ')[0]).filter(Boolean);
const trKokler = (tr) => String(tr || '').toLowerCase().replace(/\([^)]*\)/g, ' ').split(/[^a-zçğıöşüâîû]+/).filter(x => x.length >= 4).map(x => x.slice(0, 4));
export function cekimBirlestir(kelimeler) {
  const index = new Map(kelimeler.map(w => [normEn(w.en), w]));
  const cikar = new Set();
  for (const w of kelimeler) {
    if (/\s/.test(w.en.trim())) continue;
    const kokEn = kokAdaylari(w.en).find(k => index.has(k) && !cikar.has(index.get(k)));
    if (!kokEn) continue;
    const kok = index.get(kokEn);
    // tür uyumu: çekimli kartın türlerinden biri kök kartta da olmalı (fiil↔fiil, isim↔isim)
    const tW = turAna(w.tur), tK = turAna(kok.tur);
    const turOk = !tW.length || !tK.length || tW.some(t => tK.includes(t)) || (tW.includes('fiil') && tK.includes('yardımcı'));
    // anlam uyumu: ortak Türkçe kök ya da anlam metninde kök İngilizcesi ("accept'in 3. hali")
    const aW = trKokler(w.tr), aK = trKokler(kok.tr);
    const anlamOk = aW.some(a => aK.includes(a)) || new RegExp('\\b' + kokEn + "('|\\b)", 'i').test(w.tr);
    if (!turOk || !anlamOk) continue;
    kok.bicimler = kok.bicimler || [];
    if (!kok.bicimler.includes(w.en)) kok.bicimler.push(w.en);
    if (Array.isArray(w.ornek_tokenlar) && w.ornek_tokenlar.length) {
      kok.ornekler = kok.ornekler || [];
      const cumle = w.ornek_tokenlar.map(t => t.k).join(' ');
      const kokCumle = (kok.ornek_tokenlar || []).map(t => t.k).join(' ');
      if (cumle !== kokCumle && !kok.ornekler.some(o => o.tokenlar.map(t => t.k).join(' ') === cumle)) kok.ornekler.push({ tokenlar: w.ornek_tokenlar, tr: w.ornek_tr, bicim: w.en });
      if (!kok.ornek_tokenlar) { kok.ornek_tokenlar = w.ornek_tokenlar; kok.ornek_tr = w.ornek_tr; }
    }
    cikar.add(w);
  }
  return kelimeler.filter(w => !cikar.has(w));
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

  // Çekimli kopyaları kök karta bağla (havuz küçülür, kök kart biçim + ek örnek kazanır)
  const birlesik = cekimBirlestir(kelimeler);
  kelimeler.length = 0; kelimeler.push(...birlesik);
  for (const k of Object.keys(uniteSayac)) uniteSayac[k] = kelimeler.filter(w => w.u === +k).length;

  // Seviye bandı (S1 Temel … S5 Akademik):
  //  - Ünite 1 (sınav sıklığına göre sıralı "en sık 1000"): listedeki sıraya göre dört dilim → S1–S4
  //  - Gramer ünitelerinin kelimeleri: İngilizce genel sıklık sırası (kaynak/frekans-sira.json, Norvig count_1w)
  //    ≤2000 S1 · ≤5000 S2 · ≤10000 S3 · ≤20000 S4 · daha seyrek ya da listede yok → S5
  const u1 = kelimeler.filter(w => w.u === 1);
  u1.forEach((w, i) => { w.sv = 1 + Math.min(3, Math.floor(i / Math.ceil(u1.length / 4))); w._s = i; });
  const frekans = frekansYukle();
  const ESIK = [2000, 5000, 10000, 20000];
  kelimeler.forEach(w => {
    if (w.sv) return;
    const r = frekans[w.en.toLowerCase()] || 0;
    w.sv = r ? 1 + ESIK.findIndex(e => r <= e) : 5;
    if (w.sv === 0) w.sv = 5;
    if (/\s/.test(w.en.trim())) w.sv = Math.min(5, w.sv + 1);   // öbek/deyimsel fiil: parçalarından bir bant zor
    w._s = 100000 + (r || 999999);
  });
  // Havuz sırası = seviye, ardından sıklık (Ünite 1 sırası önce, sonra genel sıklık)
  kelimeler.sort((a, b) => a.sv - b.sv || a._s - b._s);
  kelimeler.forEach(w => { delete w._s; });

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
