// app/js/tarayici.js — Metin tarayıcı: yapıştırılan metindeki kelimeleri havuzla eşler (biçimler + basit kök çözümü),
// seviye rengiyle işaretler; dokununca anlam balonu (🔊 + Deftere ekle); bilinmeyenler listesi → deftere ekle / çalış.
import { ogrenmeDurumu, defterdeMi, defterEkle } from './durum.js';

const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z'’-]/g, '').replace(/['’]s$/, '');
// Havuz dizini: en, biçimler ve türetilmiş kökler → kart
export function dizinKur(havuz) {
  const m = new Map();
  for (const w of havuz) {
    if (/\s/.test(w.en.trim())) continue;
    const n = norm(w.en); if (n && !m.has(n)) m.set(n, w);
    for (const b of w.bicimler || []) { const nb = norm(b); if (nb && !m.has(nb)) m.set(nb, w); }
  }
  return m;
}
const DUZENSIZ = { began: 'begin', begun: 'begin', broke: 'break', broken: 'break', brought: 'bring', built: 'build', bought: 'buy', caught: 'catch', chose: 'choose', chosen: 'choose', came: 'come', did: 'do', done: 'do', drew: 'draw', drawn: 'draw', drove: 'drive', driven: 'drive', ate: 'eat', eaten: 'eat', fell: 'fall', fallen: 'fall', felt: 'feel', fought: 'fight', found: 'find', flew: 'fly', flown: 'fly', forgot: 'forget', forgotten: 'forget', gave: 'give', given: 'give', went: 'go', gone: 'go', grew: 'grow', grown: 'grow', heard: 'hear', held: 'hold', hid: 'hide', hidden: 'hide', kept: 'keep', knew: 'know', known: 'know', led: 'lead', left: 'leave', lost: 'lose', made: 'make', meant: 'mean', met: 'meet', paid: 'pay', ran: 'run', rose: 'rise', risen: 'rise', said: 'say', saw: 'see', seen: 'see', sold: 'sell', sent: 'send', shown: 'show', sat: 'sit', spoke: 'speak', spoken: 'speak', spent: 'spend', stood: 'stand', stole: 'steal', stolen: 'steal', took: 'take', taken: 'take', taught: 'teach', told: 'tell', thought: 'think', threw: 'throw', thrown: 'throw', understood: 'understand', wore: 'wear', worn: 'wear', won: 'win', wrote: 'write', written: 'write', were: 'be', was: 'be', is: 'be', are: 'be', been: 'be', has: 'have', had: 'have', children: 'child', men: 'man', women: 'woman', people: 'people', feet: 'foot', teeth: 'tooth', mice: 'mouse', lives: 'life', better: 'good', best: 'good', worse: 'bad', worst: 'bad' };
export function kokBul(dizin, sozcuk) {
  const n = norm(sozcuk); if (!n) return null;
  if (dizin.has(n)) return dizin.get(n);
  if (DUZENSIZ[n] && dizin.has(DUZENSIZ[n])) return dizin.get(DUZENSIZ[n]);
  const m = n.match(/^(.*?)(ies|ied|ing|ed|es|s|ly|er|est)$/);
  if (m) {
    const g = m[1], ek = m[2]; const adaylar = [];
    if (ek === 'ies' || ek === 'ied') adaylar.push(g + 'y');
    else if (ek === 'ing' || ek === 'ed' || ek === 'er' || ek === 'est') { adaylar.push(g, g + 'e'); if (/(.)\1$/.test(g)) adaylar.push(g.slice(0, -1)); }
    else if (ek === 'es') adaylar.push(g, g + 'e');
    else adaylar.push(g);
    for (const a of adaylar) if (a.length >= 3 && dizin.has(a)) return dizin.get(a);
  }
  return null;
}
export function metniAyir(metin) { return String(metin).split(/(\s+)/); }   // boşluklar korunur

export function kurTarayici(api) {
  const { render, esc, havuzYukle, wireOrnekler, toast, titre, calis, altEkran } = api;
  let dizin = null, sonMetin = '';

  async function ac(opts = {}) {
    const havuz = await havuzYukle(); dizin = dizinKur(havuz);
    const ust = typeof opts.ustHTML === 'function' ? opts.ustHTML() : (opts.ustHTML || '');
    render(`${ust}
      <div class="cumle"><div class="tr">Bir İngilizce metin yapıştır: havuzdaki kelimeler seviye rengiyle işaretlenir, dokununca anlamı açılır. Bilmediklerin tek dokunuşla deftere girer.</div></div>
      <textarea id="trMetin" class="tr-metin" rows="6" placeholder="Metni buraya yapıştır…">${esc(sonMetin)}</textarea>
      <div class="btn-satir"><button class="aksiyon ikincil" id="trYapistir">📋 Panodan yapıştır</button><button class="aksiyon" id="trTara">🔍 Tara</button></div>
      <div id="trSonuc"></div>`);
    document.getElementById('trYapistir').onclick = async () => { try { const t = await navigator.clipboard.readText(); if (t) { document.getElementById('trMetin').value = t; tara(); } else toast('Pano boş'); } catch { toast('Panoya erişilemedi — metni elle yapıştır'); } };
    document.getElementById('trTara').onclick = tara;
    if (sonMetin) tara();
  }
  function tara() {
    const metin = document.getElementById('trMetin').value; sonMetin = metin;
    const kut = document.getElementById('trSonuc'); if (!kut) return;
    if (!metin.trim()) { kut.innerHTML = ''; return; }
    const parcalar = metniAyir(metin);
    const gorulen = new Map(); let sozcuk = 0, bilinen = 0;
    const html = parcalar.map(p => {
      if (/^\s+$/.test(p) || !p) return p.replace(/\n/g, '<br>');
      const w = /[a-zA-Z]/.test(p) ? kokBul(dizin, p) : null;
      if (/[a-zA-Z]{2,}/.test(p)) sozcuk++;
      if (!w) return esc(p);
      bilinen++;
      const d = ogrenmeDurumu(w.en);
      if (!gorulen.has(w.en)) gorulen.set(w.en, { w, d, n: 0 }); gorulen.get(w.en).n++;
      const kisa = String(w.tr).split(/[;(]/)[0].trim();
      return `<span class="tok tok-anlamli tr-tok s${w.sv || 0} ${d}" data-k="${esc(p).replace(/"/g, '&quot;')}" data-en="${esc(w.en)}" data-a="${esc(kisa).replace(/"/g, '&quot;')}">${esc(p)}</span>`;
    }).join('');
    // İşlev sözcükleri (artikel, zamir, yardımcı fiil…) "bilmediğin" listesine girmez
    const islev = (w) => /artikel|zamir|yardımcı|belirteç|iyelik|işaret|olumsuzluk|mastar/i.test(w.tur || '') || w.en.length <= 2;
    const yeni = [...gorulen.values()].filter(x => x.d === 'yeni' && !islev(x.w)).sort((a, b) => (b.w.sv || 0) - (a.w.sv || 0));
    const sv = {}; for (const x of gorulen.values()) sv[x.w.sv || 0] = (sv[x.w.sv || 0] || 0) + 1;
    kut.innerHTML = `
      <div class="mf-ozet"><div><b>${sozcuk}</b><span>sözcük</span></div><div><b>${gorulen.size}</b><span>havuzda</span></div><div><b>${yeni.length}</b><span>✨ yeni</span></div></div>
      <div class="sz-cipler">${[1, 2, 3, 4, 5].filter(s => sv[s]).map(s => `<span class="sz-cip sv s${s} aktif">S${s} <small>${sv[s]}</small></span>`).join('')}${sv[0] ? `<span class="sz-cip aktif">Özel ${sv[0]}</span>` : ''}</div>
      <div class="ornek-kutu tr-govde"><div class="ornek-cumle">${html}</div></div>
      <div class="kart-bicim-not">Renkler seviye; altı kesik çizgili kelimelere dokun. <b>Kalın</b> olanlar henüz çalışmadıkların.</div>
      ${yeni.length ? `<div class="plan-baslik">Bilmediğin kelimeler <span class="mf-grup-oran">${yeni.length}</span></div>
        <div class="btn-satir"><button class="aksiyon" id="trCalis">🌱 Bu kelimeleri çalış</button><button class="aksiyon ikincil" id="trDefter">📓 Hepsini deftere ekle</button></div>
        <div class="sz-liste">${yeni.map(({ w, n }) => `<div class="sz-satir tr-satir"><span class="sz-sv s${w.sv || 0}">${w.sv ? 'S' + w.sv : 'Ö'}</span><span class="sz-ic"><b>${esc(w.en)}</b><i>${esc(w.tr)}</i></span><span class="sz-sag">${n > 1 ? `<span class="sz-bicim-say">×${n}</span>` : ''}${defterdeMi(w.en) ? '📓' : ''}</span></div>`).join('')}</div>` : '<div class="cumle"><div class="tr">Metindeki tüm havuz kelimelerini zaten çalışmışsın 👏</div></div>'}`;
    wireOrnekler(kut);
    const c = document.getElementById('trCalis'); if (c) c.onclick = () => calis(yeni.map(x => x.w));
    const dfb = document.getElementById('trDefter'); if (dfb) dfb.onclick = () => { let k = 0; for (const { w } of yeni) if (!defterdeMi(w.en)) { defterEkle(w); k++; } titre('basari'); toast(`📓 ${k} kelime deftere eklendi`); tara(); };
  }
  return { ac };
}
