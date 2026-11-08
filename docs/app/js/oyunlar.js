// app/js/oyunlar.js — Kelime oyunları: Harf Avı (adam asmaca) ve Karışık Harfler.
// Saf mantık kelimeoyun.js'te; burada yalnızca ekranlar, kayıt ve tur akışı var.
// Oyun sekmesinin kökünde (segment çubuğunun altında) çalışır; her kelime gunKaydet ile günlük hedefe sayılır.
import { kisaTR, yildizHesapla } from './eslestir.js';
import { loadOyunlar, saveOyunlar } from './storage.js';
import {
  SEVIYE, KELIME_SAYISI, MAX_HATA, KELIME_PUAN, adaylar, kelimeSec, yeniAvDurum, maske, tahminEt, kazandiMi, kaybettiMi,
  ipucuHarfi, avPuan, karistir, karisikCevap, karisikEkle, karisikDogruMu, karisikIpucu, karisikPuan,
} from './kelimeoyun.js';

const OYUNLAR = {
  av: { ad: 'Harf Avı', ikon: '🔤', aciklama: 'Türkçe anlamı verilen İngilizce kelimeyi harf harf bul. 6 yanlış hakkın var.' },
  karisik: { ad: 'Karışık Harfler', ikon: '🔀', aciklama: 'Karışık harfleri doğru sırayla dizip kelimeyi oluştur.' },
};
const HARFLER = 'abcdefghijklmnopqrstuvwxyz'.split('');
const KARISIK_HAK = 3;   // Karışık Harfler: bir kelimede bu kadar yanlış denemeden sonra cevap gösterilir

export function kurOyunlar(api) {
  const { render, esc, gunKaydet, ses, titre, konfeti, ekranModu, anaSayfa, havuzYukle } = api;
  let havuz = null, tus = null;
  let tur = null;   // { oyun, seviye, kelimeler, i, puan, dogru, durum... }

  async function yukle() { if (!havuz) havuz = await havuzYukle(); }
  const ust = (oyun) => (typeof api.ustHTML === 'function' ? api.ustHTML(oyun) : '');
  const kayit = () => loadOyunlar();
  const enIyi = (oyun, seviye) => (kayit()[oyun] || {})[seviye] || null;

  function temizle() { if (tus) { document.removeEventListener('keydown', tus); tus = null; } tur = null; }

  // ---------- Başlangıç: seviye seçimi ----------
  function ac(oyun) {
    temizle();
    ekranModu('Oyun', anaSayfa);
    yukle().then(() => giris(oyun)).catch(() => render(`${ust(oyun)}<div class="cumle"><div class="tr">Kelime havuzu yüklenemedi.</div></div>`));
  }
  function giris(oyun) {
    const o = OYUNLAR[oyun];
    const seviyeler = Object.entries(SEVIYE).map(([id, s]) => {
      const say = adaylar(havuz, id).length, eb = enIyi(oyun, id);
      return `<button class="og-sev" data-sev="${id}" ${say < 1 ? 'disabled' : ''} aria-label="${esc(s.ad)} seviye, ${eb ? 'en iyi ' + eb.en + ' puan' : 'henüz oynanmadı'}">
        <b>${esc(s.ad)}</b><span>${eb ? `en iyi ${eb.en}` : 'henüz yok'}</span><i>${say} kelime</i></button>`;
    }).join('');
    render(`${ust(oyun)}
      <div class="og-hero"><div class="og-hero-ikon" aria-hidden="true">${o.ikon}</div>
        <div><div class="og-hero-bas">${esc(o.ad)}</div><div class="og-hero-alt">${esc(o.aciklama)}</div></div></div>
      <div class="es-baslik">Seviye seç <span>her tur ${KELIME_SAYISI} kelime</span></div>
      <div class="og-seviyeler">${seviyeler}</div>`);
    document.querySelectorAll('.og-sev').forEach(b => b.onclick = () => basla(oyun, b.dataset.sev));
  }

  // ---------- Tur ----------
  function basla(oyun, seviye) {
    const kelimeler = kelimeSec(adaylar(havuz, seviye), KELIME_SAYISI);
    if (!kelimeler.length) { giris(oyun); return; }
    tur = { oyun, seviye, kelimeler, i: 0, puan: 0, dogru: 0, kelimePuani: null };
    kelimeBasla();
  }
  function kelimeBasla() {
    const w = tur.kelimeler[tur.i];
    tur.kelimePuani = null; tur.ipucu = 0;
    if (tur.oyun === 'av') { tur.durum = yeniAvDurum(); cizAv(); }
    else { tur.karisik = karistir(w.en); tur.secilen = []; tur.yanlis = 0; cizKarisik(); }
  }
  const canlar = (hata) => '❤️'.repeat(MAX_HATA - hata) + '🖤'.repeat(hata);
  const ustSerit = (w) => `<div class="og-ust"><span>Kelime ${tur.i + 1}/${tur.kelimeler.length}</span><span>⭐ ${tur.puan}</span></div>
    <div class="og-tr"><b>${esc(kisaTR(w.tr))}</b>${w.tur ? `<i>${esc(w.tur)}</i>` : ''}</div>`;
  const altSatir = (ekstra = '') => `<div class="btn-satir">${ekstra}<button class="aksiyon ikincil" id="ogCik">Çık</button></div>`;
  function cikisBagla() { const c = document.getElementById('ogCik'); if (c) c.onclick = () => ac(tur.oyun); }

  // Kelime bitti: puan, sonuç kartı, sonraki
  function kelimeBitti(kazandi, puan) {
    const w = tur.kelimeler[tur.i];
    tur.kelimePuani = puan; tur.puan += puan; if (kazandi) tur.dogru++;
    gunKaydet(1, { dogru: kazandi });
    if (kazandi) { ses('dogru'); titre('hafif'); } else { ses('yanlis'); titre('hata'); }
    return `<div class="og-sonuc ${kazandi ? 'dogru' : 'yanlis'}" role="status">
      <div class="og-sonuc-bas">${kazandi ? `✓ Doğru! +${puan}` : '✕ Olmadı'}</div>
      <div class="og-sonuc-kelime">${esc(w.en)}</div><div class="og-sonuc-tr">${esc(w.tr)}</div></div>
      <div class="btn-satir"><button class="aksiyon" id="ogSonraki">${tur.i + 1 < tur.kelimeler.length ? 'Sonraki ›' : 'Sonucu gör'}</button></div>`;
  }
  function sonrakiBagla() {
    const b = document.getElementById('ogSonraki'); if (!b) return;
    b.onclick = () => { if (tur.i + 1 < tur.kelimeler.length) { tur.i++; kelimeBasla(); } else turBitti(); };
    b.focus();
  }

  // ---------- Harf Avı ----------
  function cizAv() {
    const w = tur.kelimeler[tur.i], d = tur.durum, k = w.en.toLowerCase();
    const bitti = tur.kelimePuani != null;
    const m = maske(k, d.bilinen);
    const klavye = HARFLER.map(h => {
      const denendi = d.bilinen.has(h), dogru = denendi && k.includes(h);
      return `<button class="og-tus ${denendi ? (dogru ? 'dogru' : 'yanlis') : ''}" data-h="${h}" ${denendi || bitti ? 'disabled' : ''} aria-label="harf ${h}">${h}</button>`;
    }).join('');
    render(`${ust('av')}${ustSerit(w)}
      <div class="og-can" aria-label="${MAX_HATA - d.hata} hakkın kaldı">${canlar(d.hata)}</div>
      <div class="og-kelime" role="img" aria-label="${m.length} harfli kelime: ${esc(m.join(' ').replace(/_/g, 'boş'))}">${m.map(h => `<span class="og-harf ${h !== '_' ? 'acik' : ''}">${h === '_' ? '' : esc(h)}</span>`).join('')}</div>
      ${bitti ? '' : `<div class="og-klavye">${klavye}</div>`}
      ${bitti ? '' : altSatir('<button class="aksiyon ikincil" id="ogIpucu">💡 İpucu (−3)</button>')}
      ${bitti ? tur.sonucHTML : ''}`);
    if (bitti) { sonrakiBagla(); return; }
    document.querySelectorAll('.og-tus').forEach(b => b.onclick = () => harfSec(b.dataset.h));
    document.getElementById('ogIpucu').onclick = () => { const h = ipucuHarfi(k, tur.durum); if (h) { tur.ipucu++; harfSec(h, true); } };
    cikisBagla();
    if (tus) document.removeEventListener('keydown', tus);
    tus = (e) => { if (e.ctrlKey || e.metaKey || e.altKey) return; if (/^[a-z]$/i.test(e.key) && tur && tur.kelimePuani == null) harfSec(e.key.toLowerCase()); };
    document.addEventListener('keydown', tus);
  }
  function harfSec(h) {
    const w = tur.kelimeler[tur.i], k = w.en.toLowerCase();
    const r = tahminEt(k, tur.durum, h);
    if (r.dogru === null) return;
    tur.durum = r.durum;
    if (kazandiMi(k, tur.durum)) tur.sonucHTML = kelimeBitti(true, avPuan(true, tur.durum.hata, tur.ipucu));
    else if (kaybettiMi(tur.durum)) { tur.durum.bilinen = new Set([...tur.durum.bilinen, ...k]); tur.sonucHTML = kelimeBitti(false, 0); }
    else { r.dogru ? (ses('dogru'), titre('hafif')) : (ses('yanlis'), titre('hata')); }
    cizAv();
  }

  // ---------- Karışık Harfler ----------
  function cizKarisik() {
    const w = tur.kelimeler[tur.i], k = w.en.toLowerCase(), kar = tur.karisik, sec = tur.secilen;
    const bitti = tur.kelimePuani != null;
    const cevap = kar.map((_, j) => `<span class="og-harf ${sec[j] != null ? 'acik' : ''}">${sec[j] != null ? esc(kar[sec[j]]) : ''}</span>`).join('');
    const karolar = kar.map((h, j) => `<button class="og-karo" data-j="${j}" ${sec.includes(j) || bitti ? 'disabled' : ''} aria-label="harf ${esc(h)}">${esc(h)}</button>`).join('');
    render(`${ust('karisik')}${ustSerit(w)}
      <div class="og-can" aria-label="${KARISIK_HAK - tur.yanlis} hakkın kaldı">${'❤️'.repeat(KARISIK_HAK - tur.yanlis)}${'🖤'.repeat(tur.yanlis)}</div>
      <div class="og-kelime og-cevap" role="img" aria-label="Cevabın: ${esc(karisikCevap(kar, sec) || 'boş')}">${cevap}</div>
      ${bitti ? '' : `<div class="og-karolar">${karolar}</div>`}
      ${bitti ? '' : altSatir('<button class="aksiyon ikincil" id="ogSil">⌫ Sil</button><button class="aksiyon ikincil" id="ogIpucu">💡 İpucu (−3)</button>')}
      ${bitti ? tur.sonucHTML : ''}`);
    if (bitti) { sonrakiBagla(); return; }
    document.querySelectorAll('.og-karo').forEach(b => b.onclick = () => karoSec(Number(b.dataset.j)));
    document.getElementById('ogSil').onclick = () => { tur.secilen = tur.secilen.slice(0, -1); cizKarisik(); };
    document.getElementById('ogIpucu').onclick = () => { tur.ipucu++; tur.secilen = karisikIpucu(k, kar, tur.secilen); kontrolEt(); };
    cikisBagla();
  }
  function karoSec(j) { tur.secilen = karisikEkle(tur.secilen, j); kontrolEt(); }
  function kontrolEt() {
    const w = tur.kelimeler[tur.i], k = w.en.toLowerCase();
    if (tur.secilen.length < tur.karisik.length) { cizKarisik(); return; }
    if (karisikDogruMu(k, tur.karisik, tur.secilen)) { tur.sonucHTML = kelimeBitti(true, karisikPuan(true, tur.yanlis, tur.ipucu)); cizKarisik(); return; }
    tur.yanlis++;
    if (tur.yanlis >= KARISIK_HAK) { tur.secilen = karisikIpucuTam(k); tur.sonucHTML = kelimeBitti(false, 0); cizKarisik(); return; }
    ses('yanlis'); titre('hata');
    cizKarisik();
    const c = document.querySelector('.og-cevap'); if (c) c.classList.add('titre');
    setTimeout(() => { if (tur && tur.kelimePuani == null) { tur.secilen = []; cizKarisik(); } }, 650);
  }
  // Kaybedince doğru dizilimi göster: her harfi sırayla doğru karoya eşle
  function karisikIpucuTam(k) { let s = []; for (let n = 0; n < k.length; n++) s = karisikIpucu(k, tur.karisik, s); return s; }

  // ---------- Tur sonu ----------
  function turBitti() {
    const n = tur.kelimeler.length, hedef = n * KELIME_PUAN;
    const yildiz = tur.dogru ? yildizHesapla(tur.puan, hedef) : 0;
    const d = kayit(); d[tur.oyun] = d[tur.oyun] || {};
    const onceki = d[tur.oyun][tur.seviye] || { en: 0, tur: 0 };
    const rekor = tur.puan > onceki.en;
    d[tur.oyun][tur.seviye] = { en: Math.max(onceki.en, tur.puan), tur: onceki.tur + 1 };
    saveOyunlar(d);
    gunKaydet(0, { bitir: true });
    if (yildiz === 3) { ses('kutlama'); titre('basari'); konfeti(); } else ses(yildiz ? 'dogru' : 'yanlis');
    const { oyun, seviye } = tur;
    render(`${ust(oyun)}
      <div class="es-sonuc"><div class="es-sonuc-amblem">${yildiz ? '🏅' : '💪'}</div>
        <div class="es-sonuc-bas">${esc(OYUNLAR[oyun].ad)} · ${esc(SEVIYE[seviye].ad)}</div>
        <div class="es-sonuc-yildiz" aria-label="${yildiz} yıldız">${'★'.repeat(yildiz)}${'☆'.repeat(3 - yildiz)}</div>
        <div class="es-sonuc-alt">${tur.puan} puan · ${tur.dogru}/${n} kelime${rekor ? ' · 🎉 yeni rekor' : ''}</div></div>
      <div class="btn-satir"><button class="aksiyon" id="ogTekrar">Tekrar oyna</button><button class="aksiyon ikincil" id="ogListe">Seviyeler</button></div>`);
    document.getElementById('ogTekrar').onclick = () => basla(oyun, seviye);
    document.getElementById('ogListe').onclick = () => ac(oyun);
    temizleKlavye();
  }
  function temizleKlavye() { if (tus) { document.removeEventListener('keydown', tus); tus = null; } }

  return { ac, temizle, OYUNLAR };
}
