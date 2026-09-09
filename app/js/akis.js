// app/js/akis.js — "Kelime Akışı": tam ekran, yukarı kaydırmalı (TikTok/Reels tarzı) kelime akışı.
// Her kart bir kelime; dokununca anlam + örnek açılır. Sağ dikey çubukta dinle/kaydet/biliyorum/paylaş.
// Havuz: data/kelime-havuz.json (tüm üniteler). Kaydırma günlük seri/XP sayacına işler.
import { loadSRS, saveSRS, loadOgrenilen, saveOgrenilen } from './storage.js';

const shuffle = (a) => a.map(v => [Math.random(), v]).sort((x, y) => x[0] - y[0]).map(x => x[1]);

export function kurKelimeAkisi(api) {
  // api: { render, esc, ornekHTML, wireOrnekler, gunKaydet, anaSayfa, ekranModu, seslendir, paylas, titre }
  const { render, esc, ornekHTML, wireOrnekler, gunKaydet, anaSayfa, ekranModu, seslendir, paylas, titre } = api;

  let havuz = null, srs = null, ogrenilen = null;
  let sira = [];            // akış sırası (kelime nesneleri)
  let render_i = 0;         // kaç kart DOM'a basıldı
  let karisik = false;
  const gorulen = new Set();   // günlük sayaç için (kart index)
  let gozlemci = null, sentinelGozlemci = null;
  const BATCH = 15;

  async function yukle() {
    if (havuz) return;
    const r = await fetch('data/kelime-havuz.json');
    if (!r.ok) throw new Error('havuz');
    havuz = (await r.json()).kelimeler || [];
    srs = loadSRS() || { favori: {} };
    if (!srs.favori) srs.favori = {};
    ogrenilen = loadOgrenilen() || {};
  }
  const favoriMi = (en) => !!srs.favori[en.toLowerCase()];
  const bilinenMi = (en) => !!ogrenilen[en.toLowerCase()];

  function ac() {
    ekranModu('Kelime Akışı', () => { temizle(); anaSayfa(); });
    yukle().then(basla).catch(() => render('<div class="cumle"><div class="tr">Akış yüklenemedi.</div></div>'));
  }

  function basla() {
    sira = karisik ? shuffle(havuz.slice()) : havuz.slice();   // frekans sırası (Ünite 1 en sık) veya karışık
    render_i = 0; gorulen.clear();
    const ustPx = (document.getElementById('ust-bar')?.offsetHeight || 56);
    render(`
      <div class="akis" id="akis" style="top:${ustPx}px">
        <div class="akis-kaydir" id="akisKaydir"></div>
        <button class="akis-karis" id="akisKaris">${karisik ? '🔀 Karışık' : '↕ Sıralı'}</button>
      </div>`);
    const kaydir = document.getElementById('akisKaydir');
    daha(kaydir);
    document.getElementById('akisKaris').onclick = () => { karisik = !karisik; basla(); };
    kurGozlem(kaydir);
  }

  function kartHTML(w, i) {
    const uni = w.u ? `Ünite ${w.u}` : '';
    return `<section class="akis-kart" data-i="${i}">
      <div class="akis-ic">
        <div class="akis-ust">${esc(uni)} · ${i + 1}/${sira.length}</div>
        <div class="akis-govde">
          <div class="akis-on">
            ${w.tur ? `<div class="akis-tur">${esc(w.tur)}</div>` : ''}
            <div class="akis-en">${esc(w.en)}</div>
            <div class="akis-ipucu">anlamı için dokun</div>
          </div>
          <div class="akis-arka" hidden>
            <div class="akis-tr">${esc(w.tr)}</div>
            ${w.ornek_tokenlar ? `<div class="akis-ornek-et">Örnek · kelimeye dokun</div>${ornekHTML({ tokenlar: w.ornek_tokenlar, tr: w.ornek_tr })}` : ''}
          </div>
        </div>
        <div class="akis-alt">↑ sonraki kelime</div>
      </div>
      <div class="akis-rail">
        <button class="akis-rbtn" data-akt="ses"><span class="akis-rikon">🔊</span><span>Dinle</span></button>
        <button class="akis-rbtn ${favoriMi(w.en) ? 'aktif' : ''}" data-akt="favori"><span class="akis-rikon">${favoriMi(w.en) ? '⭐' : '☆'}</span><span>Kaydet</span></button>
        <button class="akis-rbtn ${bilinenMi(w.en) ? 'aktif' : ''}" data-akt="biliyorum"><span class="akis-rikon">${bilinenMi(w.en) ? '✅' : '🎓'}</span><span>${bilinenMi(w.en) ? 'Biliyorum' : 'Biliyorum'}</span></button>
        <button class="akis-rbtn" data-akt="paylas"><span class="akis-rikon">📤</span><span>Paylaş</span></button>
      </div>
    </section>`;
  }

  function daha(kaydir) {
    const parca = sira.slice(render_i, render_i + BATCH);
    if (!parca.length) return;
    const html = parca.map((w, k) => kartHTML(w, render_i + k)).join('');
    // sentinel'i sona taşı
    const eskiSentinel = kaydir.querySelector('.akis-sentinel');
    if (eskiSentinel) eskiSentinel.remove();
    kaydir.insertAdjacentHTML('beforeend', html + '<div class="akis-sentinel"></div>');
    render_i += parca.length;
    parca.forEach((w, k) => wireKart(kaydir.querySelector(`.akis-kart[data-i="${render_i - parca.length + k}"]`), w));
    // sentinel gözlem (sonsuz akış)
    const sentinel = kaydir.querySelector('.akis-sentinel');
    if (sentinelGozlemci) sentinelGozlemci.disconnect();
    if (sentinel && render_i < sira.length) {
      sentinelGozlemci = new IntersectionObserver((es) => {
        if (es.some(e => e.isIntersecting)) daha(kaydir);
      }, { root: kaydir, rootMargin: '600px' });
      sentinelGozlemci.observe(sentinel);
    }
  }

  function wireKart(kart, w) {
    if (!kart) return;
    const govde = kart.querySelector('.akis-govde');
    const on = kart.querySelector('.akis-on');
    const arka = kart.querySelector('.akis-arka');
    govde.onclick = (e) => {
      if (e.target.closest('.tok-anlamli')) return;
      const acik = !arka.hidden;
      arka.hidden = acik; on.classList.toggle('sonuk', !acik);
      if (!acik && w.ornek_tokenlar) wireOrnekler(kart);
    };
    kart.querySelectorAll('.akis-rbtn').forEach(b => b.onclick = (e) => {
      e.stopPropagation();
      const akt = b.dataset.akt;
      if (akt === 'ses') { seslendir(w.en); titre('hafif'); }
      else if (akt === 'favori') {
        const key = w.en.toLowerCase();
        if (srs.favori[key]) delete srs.favori[key]; else srs.favori[key] = true;
        saveSRS(srs);
        const on2 = srs.favori[key];
        b.classList.toggle('aktif', on2);
        b.querySelector('.akis-rikon').textContent = on2 ? '⭐' : '☆';
        titre('hafif');
      } else if (akt === 'biliyorum') {
        const key = w.en.toLowerCase();
        if (!ogrenilen[key]) {
          ogrenilen[key] = { en: w.en, tur: w.tur, tr: w.tr, ornek_tokenlar: w.ornek_tokenlar, ornek_tr: w.ornek_tr };
          saveOgrenilen(ogrenilen); gunKaydet(1, { dogru: true }); titre('basari');
        }
        b.classList.add('aktif'); b.querySelector('.akis-rikon').textContent = '✅';
      } else if (akt === 'paylas') {
        paylas({ baslik: w.en, metin: `${w.en} — ${w.tr}${w.ornek_tr ? '\n"' + w.ornek_tr + '"' : ''}\n\n📚 YDS Çalışma Defteri` });
      }
    });
  }

  // Aktif kartı algıla → günlük sayaç (her kart bir kez)
  function kurGozlem(kaydir) {
    if (gozlemci) gozlemci.disconnect();
    gozlemci = new IntersectionObserver((es) => {
      es.forEach(e => {
        if (e.isIntersecting && e.intersectionRatio > 0.6) {
          const i = Number(e.target.dataset.i);
          if (!gorulen.has(i)) { gorulen.add(i); gunKaydet(1); }
        }
      });
    }, { root: kaydir, threshold: [0.6] });
    // mevcut ve gelecek kartları gözle (daha() eklerken tekrar gözlem kur)
    const gozle = () => kaydir.querySelectorAll('.akis-kart').forEach(k => gozlemci.observe(k));
    gozle();
    // basit: her scroll'da yeni kartları da gözle
    kaydir.addEventListener('scroll', () => gozle(), { passive: true });
  }

  function temizle() {
    if (gozlemci) { gozlemci.disconnect(); gozlemci = null; }
    if (sentinelGozlemci) { sentinelGozlemci.disconnect(); sentinelGozlemci = null; }
  }

  return { ac };
}
