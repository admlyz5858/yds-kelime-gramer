// app/js/alistirma.js — Üniteye özel alıştırma motoru. Ünitenin kendi örneklerinden iki tür soru üretir:
//   1) "vurgu-boşluk": örnek cümlede vurgulu öbek boşluk olur, çeldiriciler aynı ünitenin diğer vurgulu öbekleri
//      (edat ünitesinde edatlar, modal ünitesinde modallar, zaman ünitesinde fiil biçimleri…)
//   2) "sınıflandır": cümle → ait olduğu kural/kullanım (hangi zaman, hangi tip, hangi anlam…)
import { shuffle } from './logic.js';
import { loadAlistirma, saveAlistirma } from './storage.js';

export const KONU = {
  2: { bosluk: ['Edatı seç', 'Boşluğa uygun edatı seç'], sinif: ['Hangi anlam?', 'Bu cümlede edat hangi kullanımda?'] },
  3: { bosluk: ['Fiili çek', 'Boşluğa uygun zaman biçimini seç'], sinif: ['Hangi zaman?', 'Bu cümle hangi zamanda?'] },
  4: { bosluk: ['Fiili çek', 'Boşluğa uygun zaman biçimini seç'], sinif: ['Hangi zaman?', 'Bu cümle hangi zamanda?'] },
  5: { bosluk: ['Fiili çek', 'Boşluğa uygun zaman biçimini seç'], sinif: ['Hangi zaman?', 'Bu cümle hangi zamanda?'] },
  6: { bosluk: ['Fiili çek', 'Boşluğa uygun zaman biçimini seç'], sinif: ['Hangi zaman?', 'Bu cümle hangi zamanda?'] },
  7: { bosluk: ['Hangi modal?', 'Boşluğa uygun modalı seç'], sinif: ['Hangi anlam?', 'Modal bu cümlede ne anlatıyor?'] },
  8: { bosluk: ['Hangi modal?', 'Boşluğa uygun modalı seç'], sinif: ['Hangi anlam?', 'Modal bu cümlede ne anlatıyor?'] },
  9: { bosluk: ['Doğru biçimi seç', 'Boşluğa uygun fiil biçimini seç'], sinif: ['Hangi yapı?', 'Bu cümledeki fiilimsi hangi yapıda?'] },
  10: { bosluk: ['Edilgeni tamamla', 'Boşluğa uygun yapıyı seç'], sinif: ['Hangi yapı?', 'Bu cümle hangi yapıda?'] },
  11: { bosluk: ['Doğru kipi seç', 'Boşluğa uygun fiil biçimini seç'], sinif: ['Hangi tip?', 'Bu koşul cümlesi hangi tip?'] },
  12: { bosluk: ['Bağlayıcıyı seç', 'Boşluğa uygun bağlayıcıyı seç'], sinif: ['Hangi cümlecik?', 'Bu cümlecik hangi türde?'] },
  13: { bosluk: ['Bağlayıcıyı seç', 'Boşluğa uygun ilgi zamirini seç'], sinif: ['Hangi kullanım?', 'Bu cümlecik hangi kullanımda?'] },
  14: { bosluk: ['Bağlacı seç', 'Boşluğa uygun bağlacı seç'], sinif: ['Hangi ilişki?', 'Bu bağlaç hangi anlam ilişkisini kurar?'] },
};
const VARSAYILAN = { bosluk: ['Boşluğu doldur', 'Boşluğa uygun ifadeyi seç'], sinif: ['Sınıflandır', 'Bu cümle hangi kurala ait?'] };
export const konuAd = (id) => KONU[id] || VARSAYILAN;

// Kural için kısa etiket (parantez içi > anlam > kural)
export function kuralEtiket(o) {
  const k = (o.kural || '').trim();
  const m = k.match(/\(([^)]+)\)/);
  if (m) return m[1].trim();
  const a = (o.anlam || '').replace(/^[.\s]+/, '').split(/[,/]/)[0].trim();
  if (a) return a.length > 24 ? a.slice(0, 22) + '…' : a;
  return k.length > 28 ? k.slice(0, 26) + '…' : (k || '•');
}
const temiz = (s) => String(s || '').replace(/[.,!?;:"'’]+$/g, '').trim();
// Vurgulu öbek metni; ayrık vurgular (from … till) üç nokta ile birleşir
const hedefMetni = (toks) => {
  const p = []; let onceki = false;
  toks.forEach(t => { if (t.vurgu) { if (p.length && !onceki) p.push('…'); p.push(temiz(t.k)); } onceki = !!t.vurgu; });
  return p.join(' ');
};

// Ünitenin örneklerini tek listede topla: { toks, tr, etiket, kural }
export function ornekleriTopla(ders) {
  const out = [];
  for (const b of ders.bolumler || []) {
    for (const o of b.ogeler || []) {
      const etiket = kuralEtiket(o);
      for (const ex of o.ornekler || []) if (Array.isArray(ex.tokenlar) && ex.tokenlar.some(t => t.vurgu)) out.push({ toks: ex.tokenlar, tr: ex.tr, etiket, kural: o.kural || '', bolum: b.baslik });
    }
    for (const ex of b.ciftler || []) if (Array.isArray(ex.tokenlar) && ex.tokenlar.some(t => t.vurgu)) out.push({ toks: ex.tokenlar, tr: ex.tr, etiket: '', kural: '', bolum: b.baslik });   // çift listeleri sınıflandırmaya girmez
  }
  return out;
}

export function sorularUret(ders) {
  const ornekler = ornekleriTopla(ders);
  // --- vurgu-boşluk ---
  const hedefler = new Map();   // lower → { metin, say(kelime) }
  for (const o of ornekler) { const h = hedefMetni(o.toks); if (h) hedefler.set(h.toLowerCase(), { metin: h, say: h.split(' ').length }); }
  const bosluk = [];
  for (const o of ornekler) {
    const h = hedefMetni(o.toks); if (!h) continue;
    const digerleri = [...hedefler.values()].filter(x => x.metin.toLowerCase() !== h.toLowerCase());
    const ayni = digerleri.filter(x => x.say === h.split(' ').length);
    const havuz = ayni.length >= 3 ? ayni : digerleri;
    if (havuz.length < 3) continue;
    const yanlislar = shuffle(havuz).slice(0, 3).map(x => x.metin);
    bosluk.push({ tip: 'bosluk', toks: o.toks, tr: o.tr, dogru: h, secenekler: shuffle([h, ...yanlislar]), ipucu: o.etiket, kural: o.kural });
  }
  // --- sınıflandır ---
  const etiketSay = {};
  for (const o of ornekler) etiketSay[o.etiket] = (etiketSay[o.etiket] || 0) + 1;
  const etiketler = Object.keys(etiketSay).filter(e => e && e !== '•');
  const sinif = [];
  if (etiketler.length >= 3) {
    for (const o of ornekler) {
      if (!o.etiket || o.etiket === '•') continue;
      const digerleri = etiketler.filter(e => e !== o.etiket);
      const yanlislar = shuffle(digerleri).slice(0, Math.min(3, digerleri.length));
      sinif.push({ tip: 'sinif', toks: o.toks, tr: o.tr, dogru: o.etiket, secenekler: shuffle([o.etiket, ...yanlislar]), ipucu: o.kural, kural: o.kural });
    }
  }
  return { bosluk, sinif };
}

export function kurAlistirma(api) {
  const { render, esc, ornekHTML, wireOrnekler, gunKaydet, ses, titre, konfeti } = api;
  let ders = null, sorular = null, oturum = null, ust = '', panelCiz = null;
  let istat = loadAlistirma();
  const kaydet = () => saveAlistirma(istat);
  const N = 10;

  function ac(d, opts = {}) {
    ders = d; sorular = sorularUret(d); ust = opts.ustHTML || ''; panelCiz = opts.panel || panel;
    panel();
  }
  function uniteIstat() { return istat[ders._id] || (istat[ders._id] = { yapilan: 0, dogru: 0, zayif: {}, tur: {} }); }
  function panel() {
    const k = konuAd(ders._id), st = uniteIstat();
    const turler = [['bosluk', k.bosluk[0], sorular.bosluk.length, '✍️'], ['sinif', k.sinif[0], sorular.sinif.length, '🧭']].filter(t => t[2] >= 4);
    if (!turler.length) { render(`${ust}<div class="cumle"><div class="tr">Bu ünite için alıştırma üretilemedi (örnek cümle yok).</div></div>`); return; }
    const zayif = Object.entries(st.zayif).sort((a, b) => b[1] - a[1]).slice(0, 4);
    const oran = st.yapilan ? Math.round(st.dogru / st.yapilan * 100) : null;
    render(`${ust}
      <div class="al-ozet"><div><b>${st.yapilan}</b><span>soru çözüldü</span></div><div><b>${oran == null ? '—' : '%' + oran}</b><span>doğruluk</span></div><div><b>${turler.reduce((s, t) => s + t[2], 0)}</b><span>soru havuzu</span></div></div>
      ${turler.map(t => `<button class="al-tur" data-tur="${t[0]}"><span class="al-tur-ikon">${t[3]}</span><span class="al-tur-ic"><b>${esc(t[1])}</b><i>${t[2]} soru · ${st.tur[t[0]] ? `en iyi ${st.tur[t[0]].enIyi}/${N}` : 'henüz çözülmedi'}</i></span><span class="ogren-banner-ok">›</span></button>`).join('')}
      ${turler.length > 1 ? `<button class="al-tur karma" data-tur="karma"><span class="al-tur-ikon">🔀</span><span class="al-tur-ic"><b>Karışık</b><i>${N} soru · iki tür bir arada</i></span><span class="ogren-banner-ok">›</span></button>` : ''}
      ${zayif.length ? `<div class="es-baslik">Zayıf noktaların <span>en çok yanlış</span></div><div class="es-cipler">${zayif.map(([e, n]) => `<span class="es-cip">${esc(e)} <i>${n}</i></span>`).join('')}</div>` : ''}`);
    document.querySelectorAll('.al-tur').forEach(b => b.onclick = () => basla(b.dataset.tur));
  }
  function basla(tur) {
    const havuz = tur === 'karma' ? [...sorular.bosluk, ...sorular.sinif] : sorular[tur];
    oturum = { tur, liste: shuffle(havuz).slice(0, N), i: 0, dogru: 0, cevap: null, yanlisEtiket: [] };
    ciz();
  }
  function cumleHTML(q, cevaplandi) {
    if (cevaplandi || q.tip === 'sinif') return ornekHTML({ tokenlar: q.toks, tr: q.tr });
    const parcalar = []; let konuldu = false;
    for (const t of q.toks) {
      if (t.vurgu) { if (!konuldu) { parcalar.push('<span class="q-bosluk"></span>'); konuldu = true; } }
      else { konuldu = false; parcalar.push(esc(t.k)); }
    }
    return `<div class="soru-cumle">${parcalar.join(' ')}</div>`;
  }
  function ciz() {
    const o = oturum;
    if (o.i >= o.liste.length) return bitis();
    const q = o.liste[o.i], k = konuAd(ders._id), cevaplandi = o.cevap != null, dogruMu = cevaplandi && o.cevap === q.dogru;
    const sik = q.secenekler.map((s, idx) => {
      let cls = 'q-secenek', im = '';
      if (cevaplandi) { if (s === q.dogru) { cls += ' dogru'; im = '<span class="q-isaret">✓</span>'; } else if (s === o.cevap) { cls += ' yanlis'; im = '<span class="q-isaret">✕</span>'; } }
      return `<button class="${cls}" data-o="${esc(s)}" ${cevaplandi ? 'disabled' : ''}><span class="q-harf">${'ABCD'[idx] || '•'}</span><span class="q-sik-metin">${esc(s)}</span>${im}</button>`;
    }).join('');
    let alt = '';
    if (cevaplandi) {
      alt = `<div class="q-sonuc-rozet ${dogruMu ? 'dogru' : 'yanlis'}">${dogruMu ? '✓ Doğru' : '✕ Doğrusu: ' + esc(q.dogru)}</div>`;
      if (q.ipucu) alt += `<div class="q-aciklama"><span class="q-aciklama-bas">💡 ${q.tip === 'bosluk' ? 'Kullanım' : 'Kural'}</span>${esc(q.ipucu)}</div>`;
      alt += `<div class="btn-satir"><button class="aksiyon" id="alDevam">${o.i + 1 < o.liste.length ? 'Sonraki ›' : 'Bitir'}</button></div>`;
    }
    render(`<button class="aksiyon ikincil" id="alGeri" style="margin-bottom:12px">‹ Alıştırmalar</button>
      <div class="kart-sayac">${esc(k[q.tip][0])} · Soru ${o.i + 1} / ${o.liste.length} · ✓ ${o.dogru}</div>
      <div class="kart-ilerleme"><div class="kart-ilerleme-ic" style="width:${Math.round((cevaplandi ? o.i + 1 : o.i) / o.liste.length * 100)}%"></div></div>
      <div class="soru-kart"><div class="soru-etiket">${esc(k[q.tip][1])}</div>${cumleHTML(q, cevaplandi)}</div>
      <div class="q-secenekler">${sik}</div>${alt}`);
    document.getElementById('alGeri').onclick = panel;
    if (!cevaplandi) {
      document.querySelectorAll('.q-secenek').forEach(b => b.onclick = () => {
        o.cevap = b.dataset.o; const d = o.cevap === q.dogru;
        if (d) { o.dogru++; ses('dogru'); titre('hafif'); } else { o.yanlisEtiket.push(q.tip === 'bosluk' ? q.ipucu : q.dogru); ses('yanlis'); titre('hata'); }
        const st = uniteIstat(); st.yapilan++; if (d) st.dogru++; else if (q.ipucu) st.zayif[q.tip === 'bosluk' ? q.ipucu : q.dogru] = (st.zayif[q.tip === 'bosluk' ? q.ipucu : q.dogru] || 0) + 1;
        kaydet(); gunKaydet(1, { dogru: d }); ciz();
      });
    } else {
      if (q.tip === 'sinif' || cevaplandi) wireOrnekler(document.getElementById('icerik'));
      document.getElementById('alDevam').onclick = () => { o.i++; o.cevap = null; ciz(); };
    }
  }
  function bitis() {
    const o = oturum, st = uniteIstat(), yuzde = Math.round(o.dogru / o.liste.length * 100);
    const t = st.tur[o.tur] || (st.tur[o.tur] = { enIyi: 0, oynama: 0 });
    t.oynama++; t.enIyi = Math.max(t.enIyi, o.dogru); kaydet();
    gunKaydet(0, { bitir: true });
    if (yuzde >= 80) { ses('kutlama'); konfeti(); } else ses('seviye');
    const yanlis = [...new Set(o.yanlisEtiket)];
    render(`<div class="es-sonuc"><div class="es-sonuc-amblem">${yuzde >= 80 ? '🌟' : yuzde >= 50 ? '👏' : '💪'}</div><div class="es-sonuc-bas">Alıştırma tamam</div>
      <div class="es-sonuc-skor">${o.dogru} / ${o.liste.length}</div><div class="es-sonuc-alt">%${yuzde} doğru${t.enIyi === o.dogru && t.oynama > 1 ? ' · en iyi skor' : ''}</div>
      ${yanlis.length ? `<div class="es-sonuc-not">Tekrar bak: <b>${yanlis.map(esc).join(' · ')}</b></div>` : '<div class="es-sonuc-not">Hiç yanlış yok — bu konu oturmuş.</div>'}</div>
      <div class="btn-satir"><button class="aksiyon" id="alTekrar">🔁 Yeni set</button><button class="aksiyon ikincil" id="alPanel">Alıştırmalar</button></div>`);
    document.getElementById('alTekrar').onclick = () => basla(o.tur);
    document.getElementById('alPanel').onclick = panel;
  }
  function varMi(d) { const s = sorularUret(d); return s.bosluk.length >= 4 || s.sinif.length >= 4; }
  function ozet(id) { const s = istat[id]; return s ? { yapilan: s.yapilan, dogru: s.dogru } : null; }

  return { ac, varMi, ozet, panel: () => panel() };
}
