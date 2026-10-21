// app/js/deneme.js — Mini deneme sınavı: Soru Bankası'ndan ÖSYM dağılımına yakın 20 soru, 25 dakika, sonunda net/puan
// tahmini ve konu kırılımı. Sorular sırayla gezilir, cevaplar sonda açıklanır; yanlışlar Yanlışlarım'a düşer.
import { shuffle } from './logic.js';
import { loadDeneme, saveDeneme } from './storage.js';

export const DAGILIM = { edat: 4, zaman: 3, modal: 3, baglac: 2, kosul: 2, cumlecik: 2, fiilimsi: 1, cati: 1, kelime: 2 };   // = 20
export const SURE_DK = 25;

// Dağılıma göre soru seç; bir konuda yeterli soru yoksa diğerlerinden tamamla
export function denemeSec(sorular, dagilim = DAGILIM, rnd = Math.random) {
  const kar = (a) => a.map(v => [rnd(), v]).sort((x, y) => x[0] - y[0]).map(x => x[1]);
  const secilen = [], kullanilan = new Set();
  for (const [konu, n] of Object.entries(dagilim)) {
    const aday = kar(sorular.filter(q => q.konu === konu && !kullanilan.has(q.id)));
    for (const q of aday.slice(0, n)) { secilen.push(q); kullanilan.add(q.id); }
  }
  const hedef = Object.values(dagilim).reduce((s, n) => s + n, 0);
  if (secilen.length < hedef) for (const q of kar(sorular)) { if (secilen.length >= hedef) break; if (!kullanilan.has(q.id)) { secilen.push(q); kullanilan.add(q.id); } }
  return kar(secilen);
}
export function puanla(liste, cevaplar) {
  let dogru = 0, yanlis = 0, bos = 0; const kirilim = {};
  liste.forEach((q, i) => {
    const k = kirilim[q.konu] || (kirilim[q.konu] = { n: 0, dogru: 0 }); k.n++;
    const c = cevaplar[i];
    if (c == null) bos++; else if (c === q.cevap) { dogru++; k.dogru++; } else yanlis++;
  });
  const puan = Math.round(dogru / liste.length * 100);
  return { dogru, yanlis, bos, puan, kirilim };
}

export function kurDeneme(api) {
  const { render, esc, ornekHTML, wireOrnekler, gunKaydet, altEkran, toast, ses, titre, konfeti, yanlisEkle, bankaYukle, konuAd } = api;
  let gecmis = loadDeneme(), oturum = null, sayac = null;
  const kaydet = () => saveDeneme(gecmis);

  function ozet() { const son = gecmis[gecmis.length - 1]; return { sayi: gecmis.length, son, sonTarih: son ? son.tarih : null, enIyi: gecmis.reduce((m, g) => Math.max(m, g.puan), 0) }; }
  // Bugün planı için: 7 günden uzun süredir deneme yoksa öner
  function onerilsinMi() { const s = ozet(); if (!s.son) return true; return Date.now() - new Date(s.sonTarih).getTime() > 7 * 86400000; }

  function ac(geriFn) {
    altEkran('Mini Deneme', geriFn);
    const s = ozet();
    const satirlar = gecmis.slice(-8).reverse().map(g => `<div class="dn-gecmis-satir"><span>${new Date(g.tarih).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' })}</span><b>${g.puan}</b><i>${g.dogru}D · ${g.yanlis}Y · ${g.bos}B · ${Math.round(g.sure / 60)} dk</i></div>`).join('');
    render(`
      <div class="dn-hero"><div class="dn-hero-et">🧪 Sınav provası</div><div class="dn-hero-bas">Mini Deneme</div>
        <div class="dn-hero-alt">${Object.values(DAGILIM).reduce((a, b) => a + b, 0)} soru · ${SURE_DK} dakika · karışık konular</div>
        <div class="dn-dagilim">${Object.entries(DAGILIM).map(([k, n]) => `<span>${esc(konuAd(k))} <b>${n}</b></span>`).join('')}</div></div>
      ${s.sayi ? `<div class="mf-ozet"><div><b>${s.sayi}</b><span>deneme</span></div><div><b>${s.son.puan}</b><span>son puan</span></div><div><b>${s.enIyi}</b><span>en iyi</span></div></div>` : ''}
      <button class="aksiyon dn-basla" id="dnBasla">▶ Denemeye başla</button>
      <div class="ogr-bilgi"><div class="ogr-bilgi-bas">Nasıl puanlanır?</div><p>Her soru 5 puan; yanlış puan götürmez (YDS'de de götürmez). Süre bitince sınav kendiliğinden biter. Boş bıraktığın sorulara "Sonraki" ile geçebilir, sonra geri dönebilirsin. Sonuçta konu kırılımı ve tahmini YDS puanı görürsün.</p></div>
      ${satirlar ? `<div class="plan-baslik">Geçmiş</div><div class="dn-gecmis">${satirlar}</div>` : ''}`);
    document.getElementById('dnBasla').onclick = () => basla(geriFn);
  }

  async function basla(geriFn) {
    let veri; try { veri = await bankaYukle(); } catch { toast('Soru bankası yüklenemedi'); return; }
    const liste = denemeSec(veri.sorular);
    oturum = { liste, cevaplar: new Array(liste.length).fill(null), i: 0, bas: Date.now(), bitis: Date.now() + SURE_DK * 60000, geri: geriFn };
    altEkran('Mini Deneme', () => { if (confirm('Denemeyi yarıda bırakmak istiyor musun? Cevaplar silinir.')) { durdur(); ac(geriFn); } });
    sayac = setInterval(() => { const el = document.getElementById('dnSure'); if (!el) return; const kalan = Math.max(0, oturum.bitis - Date.now()); el.textContent = sureYazi(kalan); el.classList.toggle('az', kalan < 60000); if (kalan <= 0) bitir(true); }, 1000);
    ciz();
  }
  function durdur() { if (sayac) { clearInterval(sayac); sayac = null; } oturum = null; }
  const sureYazi = (ms) => { const s = Math.ceil(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

  function ciz() {
    const o = oturum; if (!o) return;
    const q = o.liste[o.i], c = o.cevaplar[o.i];
    const sik = q.secenekler.map((s, idx) => `<button class="q-secenek ${c === s ? 'secili' : ''}" data-o="${esc(s).replace(/"/g, '&quot;')}"><span class="q-harf">${'ABCDE'[idx] || '•'}</span><span class="q-sik-metin">${esc(s)}</span></button>`).join('');
    const govde = esc(q.soru).replace(/_{2,}/g, c ? `<span class="q-bosluk secili">${esc(c)}</span>` : '<span class="q-bosluk"></span>');
    const cevaplanan = o.cevaplar.filter(x => x != null).length;
    render(`
      <div class="dn-ust"><span class="dn-sayac">Soru ${o.i + 1} / ${o.liste.length} · ${cevaplanan} cevaplı</span><span class="es-sure" id="dnSure">${sureYazi(o.bitis - Date.now())}</span></div>
      <div class="dn-nokta">${o.liste.map((_, k) => `<button class="dn-n ${o.cevaplar[k] != null ? 'dolu' : ''} ${k === o.i ? 'aktif' : ''}" data-k="${k}">${k + 1}</button>`).join('')}</div>
      <div class="soru-kart"><div class="soru-etiket">${esc(konuAd(q.konu))}</div><div class="soru-cumle">${govde}</div></div>
      <div class="q-secenekler">${sik}</div>
      <div class="btn-satir">
        <button class="aksiyon ikincil" id="dnOnceki" ${o.i === 0 ? 'disabled' : ''}>‹ Önceki</button>
        ${o.i + 1 < o.liste.length ? '<button class="aksiyon" id="dnSonraki">Sonraki ›</button>' : '<button class="aksiyon" id="dnBitir">Sınavı bitir</button>'}
      </div>
      ${o.i + 1 < o.liste.length ? '<button class="dn-bitir-link" id="dnBitirErken">Sınavı şimdi bitir</button>' : ''}`);
    document.querySelectorAll('.q-secenek').forEach(b => b.onclick = () => { o.cevaplar[o.i] = b.dataset.o; titre('hafif'); if (o.i + 1 < o.liste.length) { o.i++; } ciz(); });
    document.querySelectorAll('.dn-n').forEach(b => b.onclick = () => { o.i = Number(b.dataset.k); ciz(); });
    const on = document.getElementById('dnOnceki'); if (on) on.onclick = () => { if (o.i > 0) { o.i--; ciz(); } };
    const sn = document.getElementById('dnSonraki'); if (sn) sn.onclick = () => { o.i++; ciz(); };
    const bt = document.getElementById('dnBitir'); if (bt) bt.onclick = () => bitir(false);
    const be = document.getElementById('dnBitirErken'); if (be) be.onclick = () => { if (confirm(`${o.liste.length - cevaplanan} soru boş. Sınavı bitirmek istiyor musun?`)) bitir(false); };
  }

  function bitir(sureDoldu) {
    const o = oturum; if (!o) return;
    if (sayac) { clearInterval(sayac); sayac = null; }
    const r = puanla(o.liste, o.cevaplar);
    const sure = Math.round((Math.min(Date.now(), o.bitis) - o.bas) / 1000);
    const kayit = { tarih: new Date().toISOString(), dogru: r.dogru, yanlis: r.yanlis, bos: r.bos, puan: r.puan, sure, kirilim: r.kirilim };
    gecmis.push(kayit); if (gecmis.length > 50) gecmis = gecmis.slice(-50); kaydet();
    gunKaydet(r.dogru + r.yanlis, { bitir: true });
    o.liste.forEach((q, i) => { if (o.cevaplar[i] != null && o.cevaplar[i] !== q.cevap && yanlisEkle) yanlisEkle(q, `Mini deneme · ${konuAd(q.konu)}`); });
    if (r.puan >= 70) { ses('kutlama'); konfeti(); } else ses('seviye');
    const onceki = gecmis.length > 1 ? gecmis[gecmis.length - 2].puan : null;
    const kir = Object.entries(r.kirilim).sort((a, b) => (a[1].dogru / a[1].n) - (b[1].dogru / b[1].n));
    altEkran('Deneme Sonucu', () => { durdur(); ac(o.geri); });
    render(`
      <div class="es-sonuc"><div class="es-sonuc-amblem">${r.puan >= 70 ? '🌟' : r.puan >= 50 ? '👏' : '💪'}</div><div class="es-sonuc-bas">${sureDoldu ? 'Süre doldu' : 'Deneme tamam'}</div>
        <div class="es-sonuc-skor">${r.puan}<small>/100</small></div><div class="es-sonuc-alt">tahmini YDS puanı · ${r.dogru} doğru · ${r.yanlis} yanlış · ${r.bos} boş · ${Math.floor(sure / 60)} dk ${sure % 60} sn</div>
        ${onceki != null ? `<div class="es-sonuc-not">Önceki deneme: <b>${onceki}</b> → ${r.puan > onceki ? '📈 +' + (r.puan - onceki) : r.puan < onceki ? '📉 ' + (r.puan - onceki) : 'aynı'}</div>` : ''}</div>
      <div class="plan-baslik">Konu kırılımı</div>
      <div class="dn-kirilim">${kir.map(([k, v]) => `<div class="dn-kir-satir"><span>${esc(konuAd(k))}</span><div class="gorev-bar"><div class="gorev-bar-ic" style="width:${Math.round(v.dogru / v.n * 100)}%"></div></div><b>${v.dogru}/${v.n}</b></div>`).join('')}</div>
      ${kir.length && kir[0][1].dogru < kir[0][1].n ? `<div class="es-sonuc-not" style="margin:10px 0">🎯 En zayıf konu: <b>${esc(konuAd(kir[0][0]))}</b> — Soru Bankası'nda çalış.</div>` : ''}
      <div class="btn-satir"><button class="aksiyon" id="dnIncele">Soruları incele</button><button class="aksiyon ikincil" id="dnYeni">Yeni deneme</button></div>`);
    document.getElementById('dnIncele').onclick = () => incele(o, r);
    document.getElementById('dnYeni').onclick = () => basla(o.geri);
    oturum = null;
  }
  function incele(o, r) {
    altEkran('Soru İncelemesi', () => { ac(o.geri); });
    render(`<div class="cumle"><div class="tr">${r.dogru} doğru · ${r.yanlis} yanlış · ${r.bos} boş. Yanlışlar “Yanlışlarım”a eklendi.</div></div>` + o.liste.map((q, i) => {
      const c = o.cevaplar[i], d = c === q.cevap;
      return `<div class="dn-inc ${c == null ? 'bos' : d ? 'dogru' : 'yanlis'}"><div class="dn-inc-bas"><span>${i + 1}. ${esc(konuAd(q.konu))}</span><b>${c == null ? '— boş' : d ? '✓ doğru' : '✕ yanlış'}</b></div>
        <div class="dn-inc-soru">${esc(q.soru).replace(/_{2,}/g, `<span class="q-bosluk dogru">${esc(q.cevap)}</span>`)}</div>
        ${c != null && !d ? `<div class="dn-inc-cevap">Senin cevabın: <s>${esc(c)}</s></div>` : ''}
        ${q.aciklama ? `<div class="q-aciklama"><span class="q-aciklama-bas">💡 İpucu</span>${esc(q.aciklama)}</div>` : ''}</div>`;
    }).join('') + `<div class="btn-satir"><button class="aksiyon ikincil" id="dnGeri">Denemeye dön</button></div>`);
    document.getElementById('dnGeri').onclick = () => ac(o.geri);
  }

  return { ac, ozet, onerilsinMi, durdur };
}
