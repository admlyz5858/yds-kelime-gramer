// app/js/akis.js — "Kelime Akışı": tam ekran, yukarı kaydırmalı (TikTok/Reels tarzı) kelime akışı.
// İki modda çalışır:
//   1) Bağımsız (ana sayfa): tüm havuzdan sonsuz akış — ac() / ac({})
//   2) Gömülü (ünite/defter/öğrenilen "Kelime" sekmesi): verilen kelime kümesi — ac({kelimeler, baslik, gomulu:true})
// Kart öne gelince otomatik seslendirme (kapatılabilir) + 🔊 butonu.
import { loadSRS, saveSRS, loadOgrenilen, saveOgrenilen } from './storage.js';

const shuffle = (a) => a.map(v => [Math.random(), v]).sort((x, y) => x[0] - y[0]).map(x => x[1]);
const SES_KEY = 'yds-akis-ses';
const otoSesYukle = () => { try { return localStorage.getItem(SES_KEY) !== '0'; } catch { return true; } };
const otoSesYaz = (v) => { try { localStorage.setItem(SES_KEY, v ? '1' : '0'); } catch {} };

export function kurKelimeAkisi(api) {
  const { render, esc, ornekHTML, wireOrnekler, gunKaydet, anaSayfa, ekranModu, seslendir, paylas, titre } = api;

  let havuz = null, srs = null, ogrenilen = null;
  let sira = [], render_i = 0, karisik = false;
  let gomulu = false, baslik = 'Kelime Akışı', kaynakKelimeler = null;
  let otoSes = otoSesYukle();
  const gorulen = new Set();
  let gozlemci = null, sentinelGozlemci = null, aktifGozlemci = null;
  const BATCH = 15;

  async function yukle(havuzGerek) {
    srs = loadSRS() || { favori: {} }; if (!srs.favori) srs.favori = {};
    ogrenilen = loadOgrenilen() || {};
    if (havuzGerek && !havuz) {
      const r = await fetch('data/kelime-havuz.json');
      if (!r.ok) throw new Error('havuz');
      havuz = (await r.json()).kelimeler || [];
    }
  }
  const favoriMi = (en) => !!srs.favori[String(en).toLowerCase()];
  const bilinenMi = (en) => !!ogrenilen[String(en).toLowerCase()];

  function ac(opts = {}) {
    gomulu = !!opts.gomulu;
    baslik = opts.baslik || 'Kelime Akışı';
    kaynakKelimeler = Array.isArray(opts.kelimeler) ? opts.kelimeler : null;
    if (!gomulu) ekranModu(baslik, () => { temizle(); anaSayfa(); });
    yukle(!kaynakKelimeler).then(basla).catch(() => render('<div class="cumle"><div class="tr">Akış yüklenemedi.</div></div>'));
  }

  function basla() {
    temizle();
    const kaynak = kaynakKelimeler || havuz || [];
    if (!kaynak.length) {
      render('<div class="cumle"><div class="tr">Bu bölümde kelime yok.</div></div>');
      return;
    }
    sira = karisik ? shuffle(kaynak.slice()) : kaynak.slice();
    render_i = 0; gorulen.clear();
    const ustPx = (document.getElementById('ust-bar')?.offsetHeight || 56);
    render(`
      <div class="akis${gomulu ? ' gomulu' : ''}" id="akis" style="top:${ustPx}px">
        <div class="akis-kaydir" id="akisKaydir"></div>
        <div class="akis-ust-btnler">
          <button class="akis-mini" id="akisSes" aria-label="Otomatik seslendirme">${otoSes ? '🔊' : '🔇'}</button>
          <button class="akis-mini" id="akisKaris">${karisik ? '🔀' : '↕'}</button>
        </div>
      </div>`);
    const kaydir = document.getElementById('akisKaydir');
    daha(kaydir);
    document.getElementById('akisKaris').onclick = () => { karisik = !karisik; basla(); };
    document.getElementById('akisSes').onclick = (e) => {
      otoSes = !otoSes; otoSesYaz(otoSes);
      e.currentTarget.textContent = otoSes ? '🔊' : '🔇';
      if (otoSes) seslendirAktif(kaydir);
    };
    kurGozlem(kaydir);
  }

  function kartHTML(w, i) {
    const uni = w.u ? `Ünite ${w.u}` : '';
    return `<section class="akis-kart" data-i="${i}" data-en="${esc(w.en)}">
      <div class="akis-ic">
        <div class="akis-ust">${esc(uni)}${uni ? ' · ' : ''}${i + 1}/${sira.length}</div>
        <div class="akis-govde">
          <div class="akis-on">
            ${w.tur ? `<div class="akis-tur">${esc(w.tur)}</div>` : ''}
            <div class="akis-en">${esc(w.en)} <button class="akis-en-ses" aria-label="Seslendir">🔊</button></div>
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
        <button class="akis-rbtn ${bilinenMi(w.en) ? 'aktif' : ''}" data-akt="biliyorum"><span class="akis-rikon">${bilinenMi(w.en) ? '✅' : '🎓'}</span><span>Biliyorum</span></button>
        <button class="akis-rbtn" data-akt="paylas"><span class="akis-rikon">📤</span><span>Paylaş</span></button>
      </div>
    </section>`;
  }

  function daha(kaydir) {
    const parca = sira.slice(render_i, render_i + BATCH);
    if (!parca.length) return;
    const html = parca.map((w, k) => kartHTML(w, render_i + k)).join('');
    const eskiSentinel = kaydir.querySelector('.akis-sentinel');
    if (eskiSentinel) eskiSentinel.remove();
    kaydir.insertAdjacentHTML('beforeend', html + '<div class="akis-sentinel"></div>');
    const basI = render_i; render_i += parca.length;
    parca.forEach((w, k) => {
      const kart = kaydir.querySelector(`.akis-kart[data-i="${basI + k}"]`);
      wireKart(kart, w);
      if (aktifGozlemci) aktifGozlemci.observe(kart);
    });
    const sentinel = kaydir.querySelector('.akis-sentinel');
    if (sentinelGozlemci) sentinelGozlemci.disconnect();
    if (sentinel && render_i < sira.length) {
      sentinelGozlemci = new IntersectionObserver((es) => { if (es.some(e => e.isIntersecting)) daha(kaydir); }, { root: kaydir, rootMargin: '600px' });
      sentinelGozlemci.observe(sentinel);
    }
  }

  function wireKart(kart, w) {
    if (!kart) return;
    const govde = kart.querySelector('.akis-govde');
    const on = kart.querySelector('.akis-on');
    const arka = kart.querySelector('.akis-arka');
    govde.onclick = (e) => {
      if (e.target.closest('.tok-anlamli') || e.target.closest('.akis-en-ses')) return;
      const acik = !arka.hidden;
      arka.hidden = acik; on.classList.toggle('sonuk', !acik);
      if (!acik && w.ornek_tokenlar) wireOrnekler(kart);
    };
    kart.querySelector('.akis-en-ses').onclick = (e) => { e.stopPropagation(); seslendir(w.en); titre('hafif'); };
    kart.querySelectorAll('.akis-rbtn').forEach(b => b.onclick = (e) => {
      e.stopPropagation();
      const akt = b.dataset.akt;
      if (akt === 'ses') { seslendir(w.en); titre('hafif'); }
      else if (akt === 'favori') {
        const key = w.en.toLowerCase();
        if (srs.favori[key]) delete srs.favori[key]; else srs.favori[key] = true;
        saveSRS(srs);
        const on2 = srs.favori[key];
        b.classList.toggle('aktif', on2); b.querySelector('.akis-rikon').textContent = on2 ? '⭐' : '☆'; titre('hafif');
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

  // Aktif kartı algıla → günlük sayaç + otomatik seslendirme
  function kurGozlem(kaydir) {
    aktifGozlemci = new IntersectionObserver((es) => {
      es.forEach(e => {
        if (e.isIntersecting && e.intersectionRatio > 0.6) {
          const i = Number(e.target.dataset.i);
          if (!gorulen.has(i)) { gorulen.add(i); gunKaydet(1); }
          if (otoSes) seslendir(e.target.dataset.en || '');
        }
      });
    }, { root: kaydir, threshold: [0.6] });
    kaydir.querySelectorAll('.akis-kart').forEach(k => aktifGozlemci.observe(k));
  }
  function seslendirAktif(kaydir) {
    // görünür kartı seslendir
    const kartlar = [...kaydir.querySelectorAll('.akis-kart')];
    const k3 = kartlar.find(k => { const r = k.getBoundingClientRect(); return r.top >= 0 && r.top < window.innerHeight * 0.5; });
    if (k3) seslendir(k3.dataset.en || '');
  }

  function temizle() {
    [gozlemci, sentinelGozlemci, aktifGozlemci].forEach(o => { if (o) o.disconnect(); });
    gozlemci = sentinelGozlemci = aktifGozlemci = null;
    try { window.speechSynthesis && speechSynthesis.cancel(); } catch {}
  }

  return { ac, temizle };
}
