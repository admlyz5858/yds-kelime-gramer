// app/js/banka.js — Soru Bankası: tüm ünite test soruları konu › alt konu ağacında.
// Konu seç → 10 soruluk oturum (önce hiç çözülmemiş / yanlış yapılmış sorular) → doğruluk kaydı; zayıf konular Bugün'e düşer.
import { shuffle } from './logic.js';
import { loadBanka, saveBanka } from './storage.js';

const N = 10;   // bir test / oturum en fazla 10 soru
// Alt konunun soruları zorluk sırasında (ünite → ünitedeki test sırası → soru sırası) 10'arlık testlere bölünür
export function testlereBol(sorular, n = N) {
  const sirali = sorular.slice().sort((a, b) => a.u - b.u || (a.t || 0) - (b.t || 0) || (a.q || 0) - (b.q || 0));
  const out = [];
  for (let i = 0; i < sirali.length; i += n) out.push(sirali.slice(i, i + n));
  return out;
}
export function kurBanka(api) {
  const { render, esc, ornekHTML, wireOrnekler, gunKaydet, ses, titre, konfeti, altEkran, toast, yanlisEkle, uniteAdi } = api;
  let veri = null, istat = loadBanka(), oturum = null;
  const kaydet = () => saveBanka(istat);
  const anahtar = (konu, alt) => konu + '/' + alt;

  async function yukle() {
    if (veri) return veri;
    const r = await fetch('data/sorular.json'); if (!r.ok) throw new Error('sorular');
    veri = await r.json();
    veri.konuMap = Object.fromEntries(veri.konular.map(k => [k.id, k]));
    return veri;
  }
  const konuAd = (id) => veri?.konuMap[id]?.ad || id;
  const altAd = (konu, alt) => veri?.konuMap[konu]?.alt.find(a => a.id === alt)?.ad || alt;
  function st(konu, alt) { return istat[anahtar(konu, alt)] || { yapilan: 0, dogru: 0, yanlis: [], cozulen: [] }; }
  function konuOzet(konuId, uId) {
    const k = veri.konuMap[konuId]; let soru = 0, yapilan = 0, dogru = 0;
    for (const a of k.alt) {
      const n = veri.sorular.filter(q => q.konu === konuId && q.alt === a.id && (!uId || q.u === uId)).length;
      if (!n) continue; soru += n; const s = st(konuId, a.id); yapilan += s.yapilan; dogru += s.dogru;
    }
    return { soru, yapilan, dogru, oran: yapilan ? Math.round(dogru / yapilan * 100) : null };
  }
  // Zayıf konu: en az 8 cevap ve %60 altı doğruluk; en düşük olan
  function zayifKonu() {
    if (!veri) return null;
    let enKotu = null;
    for (const [key, s] of Object.entries(istat)) {
      if (s.yapilan < 8) continue;
      const oran = s.dogru / s.yapilan; if (oran >= 0.6) continue;
      const [konu, alt] = key.split('/');
      if (!veri.konuMap[konu]) continue;
      if (!enKotu || oran < enKotu.oran) enKotu = { konu, alt, oran, ad: altAd(konu, alt), konuAd: konuAd(konu) };
    }
    return enKotu;
  }
  function ozet() {
    const toplam = veri ? veri.sorular.length : 0;
    let yapilan = 0, dogru = 0; for (const s of Object.values(istat)) { yapilan += s.yapilan; dogru += s.dogru; }
    return { toplam, konu: veri ? veri.konular.length : 0, yapilan, dogru, oran: yapilan ? Math.round(dogru / yapilan * 100) : null };
  }

  // ---------- Konu listesi ----------
  let geriKok = null;
  async function ac(geriFn) {
    geriKok = geriFn;
    try { await yukle(); } catch { render('<div class="cumle"><div class="tr">Soru bankası yüklenemedi.</div></div>'); return; }
    cizKonular();
  }
  function cizKonular() {
    altEkran('Soru Bankası', geriKok);
    const o = ozet();
    const z = zayifKonu();
    render(`
      <div class="mf-ozet">
        <div><b>${o.toplam}</b><span>soru</span></div>
        <div><b>${o.yapilan}</b><span>çözüldü</span></div>
        <div><b>${o.oran == null ? '—' : '%' + o.oran}</b><span>doğruluk</span></div>
      </div>
      ${z ? `<button class="plan-kart zayif" id="bkZayif"><span class="plan-ikon">🎯</span><span class="plan-ic"><b>Zayıf konu: ${esc(z.ad)}</b><i>${esc(z.konuAd)} · %${Math.round(z.oran * 100)} doğruluk — 10 soruyla güçlendir</i></span><span class="plan-durum">›</span></button>` : ''}
      <button class="plan-kart" id="bkKarma"><span class="plan-ikon">🔀</span><span class="plan-ic"><b>Karışık 10 soru</b><i>Tüm konulardan rastgele</i></span><span class="plan-durum">›</span></button>
      <div class="plan-baslik">Konular</div>
      ${veri.konular.map(k => { const s = konuOzet(k.id); if (!s.soru) return ''; return `<button class="mf-kart bk-konu" data-konu="${k.id}">
        <span class="mf-no">${k.ikon}</span>
        <span class="mf-ic"><span class="mf-bas">${esc(k.ad)}</span><span class="mf-alt">${s.soru} soru${s.yapilan ? ` · ${s.yapilan} çözüldü · <span class="mf-rozet ${s.oran >= 80 ? 'ok' : ''}">%${s.oran}</span>` : ' · henüz başlanmadı'}</span></span>
        <span class="ok">›</span></button>`; }).join('')}
    `);
    document.querySelectorAll('.bk-konu').forEach(b => b.onclick = () => cizAltlar(b.dataset.konu));
    document.getElementById('bkKarma').onclick = () => basla({ geri: cizKonular, baslik: 'Karışık' });
    const zb = document.getElementById('bkZayif'); if (zb) zb.onclick = () => basla({ konu: z.konu, alt: z.alt, geri: cizKonular, baslik: z.ad });
  }
  function cizAltlar(konuId, uId, geriFn) {
    const k = veri.konuMap[konuId];
    const geri = geriFn || cizKonular;
    altEkran(k.ad, geri);
    const altlar = k.alt.map(a => { const n = veri.sorular.filter(q => q.konu === konuId && q.alt === a.id && (!uId || q.u === uId)).length; const s = st(konuId, a.id); const tn = Math.ceil(n / N); const biten = Object.keys(s.testler || {}).filter(key => uId ? key.startsWith(`u${uId}:`) : !key.includes(':')).length; return { ...a, n, s, tn, biten }; }).filter(a => a.n);
    const toplam = altlar.reduce((t, a) => t + a.n, 0);
    render(`
      <button class="plan-kart" id="bkHepsi"><span class="plan-ikon">${k.ikon}</span><span class="plan-ic"><b>${esc(k.ad)} · karışık</b><i>${toplam} sorudan rastgele ${N}</i></span><span class="plan-durum">›</span></button>
      <div class="plan-baslik">Alt konular</div>
      ${altlar.map(a => `<button class="mf-kart bk-alt" data-alt="${a.id}">
        <span class="bk-oran ${a.s.yapilan ? (a.s.dogru / a.s.yapilan >= 0.8 ? 'iyi' : a.s.dogru / a.s.yapilan < 0.6 ? 'zayif' : '') : 'bos'}">${a.s.yapilan ? '%' + Math.round(a.s.dogru / a.s.yapilan * 100) : '—'}</span>
        <span class="mf-ic"><span class="mf-bas">${esc(a.ad)}</span><span class="mf-alt">${a.n} soru · ${a.tn} test${a.biten ? ` · ${a.biten}/${a.tn} çözüldü` : ''}</span></span>
        <span class="ok">›</span></button>`).join('')}
    `);
    const tekrar = () => cizAltlar(konuId, uId, geriFn);
    document.getElementById('bkHepsi').onclick = () => basla({ konu: konuId, u: uId, geri: tekrar, baslik: k.ad });
    document.querySelectorAll('.bk-alt').forEach(b => b.onclick = () => cizTestler(konuId, b.dataset.alt, uId, tekrar));
  }
  // ---------- Alt konu test listesi (Test 1 · Test 2 … kolaydan zora) ----------
  const testKey = (uId, i) => (uId ? `u${uId}:` : '') + 't' + i;
  function cizTestler(konuId, altId, uId, geriFn) {
    const ad = altAd(konuId, altId);
    altEkran(ad, geriFn);
    const sorular = veri.sorular.filter(q => q.konu === konuId && q.alt === altId && (!uId || q.u === uId));
    const testler = testlereBol(sorular);
    const s = st(konuId, altId); const skorlar = s.testler || {};
    const siradaki = testler.findIndex((_, i) => !skorlar[testKey(uId, i)]);
    const zorluk = (i, n) => { const r = n <= 1 ? 0 : i / (n - 1); return r < 0.34 ? '<span class="zorluk-rozet z-kolay">Kolay</span>' : r < 0.67 ? '<span class="zorluk-rozet z-orta">Orta</span>' : '<span class="zorluk-rozet z-zor">Zor</span>'; };
    const uniteler = [...new Set(sorular.map(q => q.u))].sort((a, b) => a - b);
    render(`
      <div class="cumle"><div class="tr"><b>${esc(konuAd(konuId))} › ${esc(ad)}</b> · ${sorular.length} soru, ${testler.length} test. Kolaydan zora sıralı${uniteler.length > 1 ? ` (${uniteler.map(u => uniteAdi(u)).join(' → ')})` : ''}; her test en fazla ${N} soru.</div></div>
      ${testler.map((t, i) => { const sk = skorlar[testKey(uId, i)]; return `<div class="test-link${sk ? ' biten' : ''}${i === siradaki ? ' siradaki' : ''}" data-i="${i}">
        <div><div class="baslik">Test ${i + 1}</div><div class="alt-bilgi">${t.length} soru · <span class="test-konu">${esc(uniteAdi(t[0].u))}${t[t.length - 1].u !== t[0].u ? ' → ' + esc(uniteAdi(t[t.length - 1].u)) : ''}</span></div></div>
        ${sk ? `<span class="test-skor ${sk.dogru === sk.toplam ? 'tam' : ''}">✓ ${sk.dogru}/${sk.toplam}</span>` : (i === siradaki ? '<span class="siradaki-rozet">Sıradaki</span>' : '')}${zorluk(i, testler.length)}<span class="ok">›</span>
      </div>`; }).join('')}
      <div class="btn-satir"><button class="aksiyon ikincil" id="bkKarisik">🔀 Rastgele ${N} soru</button></div>`);
    const tekrar = () => cizTestler(konuId, altId, uId, geriFn);
    document.querySelectorAll('.test-link').forEach(el => el.onclick = () => { const i = Number(el.dataset.i); basla({ konu: konuId, alt: altId, u: uId, test: i, testSay: testler.length, liste: testler[i], geri: tekrar, baslik: `${ad} · Test ${i + 1}` }); });
    document.getElementById('bkKarisik').onclick = () => basla({ konu: konuId, alt: altId, u: uId, geri: tekrar, baslik: ad });
  }
  // Ünite içi görünüm: o ünitenin soruları konuya göre (ünite ekranının segmentiyle birlikte)
  async function uniteKonular(uId, opts = {}) {
    try { await yukle(); } catch { render(`${opts.ustHTML || ''}<div class="cumle"><div class="tr">Soru bankası yüklenemedi.</div></div>`); return; }
    const konular = veri.konular.map(k => ({ k, s: konuOzet(k.id, uId) })).filter(x => x.s.soru);
    render(`${opts.ustHTML || ''}
      <div class="cumle"><div class="tr">Bu ünitenin ${konular.reduce((t, x) => t + x.s.soru, 0)} sorusu konuya göre. Bir konu seç, 10 soru çöz; doğruluk konu bazında saklanır.</div></div>
      ${konular.map(({ k, s }) => `<button class="mf-kart bk-konu" data-konu="${k.id}">
        <span class="mf-no">${k.ikon}</span>
        <span class="mf-ic"><span class="mf-bas">${esc(k.ad)}</span><span class="mf-alt">${s.soru} soru${s.yapilan ? ` · <span class="mf-rozet ${s.oran >= 80 ? 'ok' : ''}">%${s.oran}</span>` : ''}</span></span>
        <span class="ok">›</span></button>`).join('')}`);
    document.querySelectorAll('.bk-konu').forEach(b => b.onclick = () => cizAltlar(b.dataset.konu, uId, () => { if (opts.geri) opts.geri(); }));
  }

  // ---------- Oturum ----------
  function secSorular(f) {
    let havuz = veri.sorular.filter(q => (!f.konu || q.konu === f.konu) && (!f.alt || q.alt === f.alt) && (!f.u || q.u === f.u));
    // öncelik: daha önce yanlış yapılan → hiç görülmemiş → diğerleri
    const puan = (q) => { const s = st(q.konu, q.alt); return s.yanlis.includes(q.id) ? 0 : s.cozulen.includes(q.id) ? 2 : 1; };
    havuz = shuffle(havuz).sort((a, b) => puan(a) - puan(b));
    return havuz.slice(0, N);
  }
  function basla(f) {
    const liste = f.liste ? f.liste.slice() : secSorular(f);
    if (!liste.length) { toast('Bu konuda soru yok'); return; }
    oturum = { f, liste, i: 0, dogru: 0, cevap: null, yanlis: [] };
    altEkran(f.baslik || 'Soru Bankası', () => { oturum = null; f.geri(); });
    ciz();
  }
  function ciz() {
    const o = oturum; if (!o) return;
    if (o.i >= o.liste.length) return bitis();
    const q = o.liste[o.i], cevaplandi = o.cevap != null, dogruMu = cevaplandi && o.cevap === q.cevap;
    const sik = q.secenekler.map((s, idx) => {
      let cls = 'q-secenek', im = '';
      if (cevaplandi) { if (s === q.cevap) { cls += ' dogru'; im = '<span class="q-isaret">✓</span>'; } else if (s === o.cevap) { cls += ' yanlis'; im = '<span class="q-isaret">✕</span>'; } }
      return `<button class="${cls}" data-o="${esc(s).replace(/"/g, '&quot;')}" ${cevaplandi ? 'disabled' : ''}><span class="q-harf">${'ABCDE'[idx] || '•'}</span><span class="q-sik-metin">${esc(s)}</span>${im}</button>`;
    }).join('');
    const blank = cevaplandi ? `<span class="q-bosluk ${dogruMu ? 'dogru' : 'yanlis'}">${esc(q.cevap)}</span>` : '<span class="q-bosluk"></span>';
    const govde = esc(q.soru).replace(/_{2,}/, blank).replace(/_{2,}/g, '<span class="q-bosluk"></span>');
    let alt = '';
    if (cevaplandi) {
      alt = `<div class="q-sonuc-rozet ${dogruMu ? 'dogru' : 'yanlis'}">${dogruMu ? '✓ Doğru' : '✕ Doğrusu: ' + esc(q.cevap)}</div>`;
      if (q.aciklama) alt += `<div class="q-aciklama"><span class="q-aciklama-bas">💡 İpucu</span>${esc(q.aciklama)}</div>`;
      if (q.ornek) alt += `<div class="q-ornek"><div class="q-ornek-etiket">Örnek cümle · kelimeye dokun, çeviri için kaydır</div>${ornekHTML(q.ornek)}</div>`;
      alt += `<div class="btn-satir"><button class="aksiyon" id="bkDevam">${o.i + 1 < o.liste.length ? 'Sonraki ›' : 'Bitir'}</button></div>`;
    }
    render(`<div class="kart-sayac">${esc(konuAd(q.konu))} › ${esc(altAd(q.konu, q.alt))} · Soru ${o.i + 1} / ${o.liste.length} · ✓ ${o.dogru}</div>
      <div class="kart-ilerleme"><div class="kart-ilerleme-ic" style="width:${Math.round((cevaplandi ? o.i + 1 : o.i) / o.liste.length * 100)}%"></div></div>
      <div class="soru-kart"><div class="soru-etiket">${/_{2,}/.test(q.soru) ? 'Boşluğa uygun ifadeyi seç' : 'Doğru cevabı seç'} · <span class="bk-unite">${esc(uniteAdi(q.u))}</span></div><div class="soru-cumle">${govde}</div></div>
      <div class="q-secenekler">${sik}</div>${alt}`);
    if (!cevaplandi) {
      document.querySelectorAll('.q-secenek').forEach(b => b.onclick = () => {
        o.cevap = b.dataset.o; const d = o.cevap === q.cevap;
        const key = anahtar(q.konu, q.alt); const s = istat[key] || (istat[key] = { yapilan: 0, dogru: 0, yanlis: [], cozulen: [] });
        s.yapilan++; if (d) { s.dogru++; o.dogru++; s.yanlis = s.yanlis.filter(x => x !== q.id); ses('dogru'); titre('hafif'); }
        else { o.yanlis.push(q); if (!s.yanlis.includes(q.id)) s.yanlis.push(q.id); ses('yanlis'); titre('hata'); if (yanlisEkle) yanlisEkle(q, `Soru Bankası · ${altAd(q.konu, q.alt)}`); }
        if (!s.cozulen.includes(q.id)) s.cozulen.push(q.id);
        kaydet(); gunKaydet(1, { dogru: d }); ciz();
      });
    } else {
      if (q.ornek) wireOrnekler(document.getElementById('icerik'));
      document.getElementById('bkDevam').onclick = () => { o.i++; o.cevap = null; ciz(); };
    }
  }
  function bitis() {
    const o = oturum, yuzde = Math.round(o.dogru / o.liste.length * 100);
    gunKaydet(0, { bitir: true });
    if (o.f.test != null) {   // sabit test: en iyi skoru sakla
      const key = anahtar(o.f.konu, o.f.alt); const s = istat[key] || (istat[key] = { yapilan: 0, dogru: 0, yanlis: [], cozulen: [] });
      s.testler = s.testler || {}; const tk = testKey(o.f.u, o.f.test); const onceki = s.testler[tk];
      if (!onceki || o.dogru > onceki.dogru) s.testler[tk] = { dogru: o.dogru, toplam: o.liste.length };
      kaydet();
    }
    const sonrakiVar = o.f.test != null && o.f.test + 1 < o.f.testSay;
    if (yuzde >= 80) { ses('kutlama'); konfeti(); } else ses('seviye');
    const z = zayifKonu();
    render(`<div class="es-sonuc"><div class="es-sonuc-amblem">${yuzde >= 80 ? '🌟' : yuzde >= 50 ? '👏' : '💪'}</div><div class="es-sonuc-bas">${esc(o.f.baslik || 'Soru Bankası')}</div>
      <div class="es-sonuc-skor">${o.dogru} / ${o.liste.length}</div><div class="es-sonuc-alt">%${yuzde} doğru</div>
      ${o.yanlis.length ? `<div class="es-sonuc-not">Yanlışlar “Yanlışlarım”a eklendi: <b>${o.yanlis.map(q => esc(q.cevap)).join(' · ')}</b></div>` : '<div class="es-sonuc-not">Hiç yanlış yok — bu konu oturmuş.</div>'}
      ${z && (z.konu !== o.f.konu || z.alt !== o.f.alt) ? `<div class="es-sonuc-not">🎯 Zayıf konun: <b>${esc(z.ad)}</b> (%${Math.round(z.oran * 100)})</div>` : ''}</div>
      <div class="btn-satir">${sonrakiVar ? '<button class="aksiyon" id="bkSonraki">Sonraki test ›</button>' : ''}<button class="aksiyon ${sonrakiVar ? 'ikincil' : ''}" id="bkYeni">${o.f.test != null ? '🔁 Tekrar çöz' : '🔁 Yeni 10 soru'}</button><button class="aksiyon ikincil" id="bkGeri">${o.f.test != null ? 'Testler' : 'Konular'}</button></div>`);
    document.getElementById('bkYeni').onclick = () => basla(o.f);
    const sn = document.getElementById('bkSonraki');
    if (sn) sn.onclick = () => { const i = o.f.test + 1; const sorular = veri.sorular.filter(q => q.konu === o.f.konu && q.alt === o.f.alt && (!o.f.u || q.u === o.f.u)); const testler = testlereBol(sorular); basla({ ...o.f, test: i, liste: testler[i], baslik: `${altAd(o.f.konu, o.f.alt)} · Test ${i + 1}` }); };
    document.getElementById('bkGeri').onclick = () => { oturum = null; o.f.geri(); };
  }

  return { ac, uniteKonular, basla, zayifKonu, ozet, yukle };
}
