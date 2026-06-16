// app/js/app.js
import { searchLessons, toggleDone, isDone, isAnswerCorrect, scoreQuiz, nextCard } from './logic.js';
import { loadProgress, saveProgress, loadDefter, saveDefter, loadIstat, saveIstat, loadYanlis, saveYanlis, loadAyar, saveAyar } from './storage.js';

const icerik = document.getElementById('icerik');
const baslikEl = document.getElementById('baslik');
const geriBtn = document.getElementById('geri');
const menuBtn = document.getElementById('menuBtn');
const altMenu = document.getElementById('alt-menu');

let manifest = null;
let aktifDers = null;
let progress = loadProgress();
let _istat = loadIstat();      // test istatistikleri (kalıcı, tüm üniteler)
let _yanlis = loadYanlis();    // Yanlışlarım listesi (kalıcı, tüm üniteler)
let _ayar = loadAyar();        // uygulama ayarları / bayraklar
const testKey = (id, ti) => `${id}#${ti}`;
const soruKey = (q) => (q.soru || '').trim().toLowerCase();
let _acikBolum = null;   // Oku ekranında açık olan bölüm indeksi (null = başlık listesi)

// ===== Kelime Defteri =====
let _defter = loadDefter();   // { en(küçük): kelimeObj }
const shuffle = (a) => a.map(v => [Math.random(), v]).sort((x, y) => x[0] - y[0]).map(x => x[1]);
function defterdeMi(en) { return !!_defter[String(en).toLowerCase()]; }
function defterKelimeler() { return Object.values(_defter); }
function defterToggle(kart) {
  const en = String(kart.en).toLowerCase();
  if (_defter[en]) delete _defter[en];
  else _defter[en] = { en: kart.en, tur: kart.tur, tr: kart.tr, ornek_tokenlar: kart.ornek_tokenlar, ornek_tr: kart.ornek_tr };
  saveDefter(_defter);
}
// Örnek cümledeki bir kelimeyi (o cümleyi örnek alarak) deftere ekle
function ogrenEkle(el) {
  const kutu = el.closest('.ornek-kutu');
  const spans = kutu ? [...kutu.querySelectorAll('.ornek-cumle .tok')] : [el];
  const toks = spans.map(s => { const o = { k: s.dataset.k != null ? s.dataset.k : s.textContent }; if (s.dataset.a) o.a = s.dataset.a; if (s.dataset.en) o.en = s.dataset.en; return o; });
  const idx = spans.indexOf(el); if (idx >= 0) toks[idx].vurgu = true;
  const word = (el.dataset.k || '').replace(/[.,!?;:"'’]+$/g, '');
  const tr = kutu ? (kutu.querySelector('.ornek-ceviri')?.textContent || '') : '';
  _defter[word.toLowerCase()] = { en: word, tur: '', tr: el.dataset.a || '', ornek_tokenlar: toks, ornek_tr: tr };
  saveDefter(_defter);
}

async function getJSON(url) { const r = await fetch(url); if (!r.ok) throw new Error(url); return r.json(); }

async function anaSayfa() {
  aktifDers = null;
  geriBtn.hidden = true; menuBtn.hidden = false; altMenu.hidden = true;
  baslikEl.textContent = 'Çalışma Defteri';
  if (!manifest) manifest = await getJSON('data/manifest.json');
  await gununKelimesiYukle();
  const son = _ayar.sonDers;
  const devam = son ? `<button class="hizli-devam" id="devamBtn">
      <div><div class="hizli-devam-ust">▶ Kaldığın yerden devam et</div>
      <div class="hizli-devam-bas">${esc(son.baslik)}</div></div>
      <span class="ok">›</span>
    </button>` : '';
  const n = defterKelimeler().length, ny = _yanlis.length;
  const koyu = _ayar.tema === 'koyu';
  render(`
    ${panoHTML()}
    ${gununKartHTML()}
    ${devam}
    <div class="hizli-baslik">Hızlı erişim</div>
    <div class="hizli-grid">
      <button class="hizli-kart vurgu" id="hUniteler"><span class="hizli-ikon">📚</span><b>Üniteler</b><i>Müfredat menüsü</i></button>
      <button class="hizli-kart" id="hDefter"><span class="hizli-ikon">📓</span><b>Kelime Defteri</b><i>${n} kelime</i></button>
      <button class="hizli-kart" id="hYanlis"><span class="hizli-ikon">❌</span><b>Yanlışlarım</b><i>${ny} soru</i></button>
      <button class="hizli-kart" id="hBasarim"><span class="hizli-ikon">🏅</span><b>Başarımlar</b><i>${basarimlar().filter(x => x.ok).length}/${basarimlar().length} rozet</i></button>
      <button class="hizli-kart" id="hYardim"><span class="hizli-ikon">💡</span><b>Nasıl çalışılır</b><i>Kısa kılavuz</i></button>
      <button class="hizli-kart" id="hTema"><span class="hizli-ikon">${koyu ? '☀️' : '🌙'}</span><b>${koyu ? 'Açık tema' : 'Koyu tema'}</b><i>Görünümü değiştir</i></button>
    </div>
  `);
  icerik.querySelectorAll('.pano-cip[data-git]').forEach(c => c.onclick = () => {
    if (c.dataset.git === 'defter') defterAc();
    else if (c.dataset.git === 'yanlis') yanlisAc();
  });
  document.getElementById('hUniteler').onclick = cekmeceAc;
  document.getElementById('hDefter').onclick = defterAc;
  document.getElementById('hYanlis').onclick = yanlisAc;
  document.getElementById('hBasarim').onclick = basarimAc;
  document.getElementById('hYardim').onclick = yardimAc;
  document.getElementById('hTema').onclick = () => { temaDegistir(); anaSayfa(); };
  const gb = document.getElementById('gununBtn');
  if (gb) gb.onclick = gununAc;
  const db = document.getElementById('devamBtn');
  if (db) db.onclick = () => dersAc(son.dosya, son.id);
}

function gununKartHTML() {
  const w = gununKelimesi();
  if (!w) return '';
  return `<button class="gunun-kart" id="gununBtn">
      <div class="gunun-sol">
        <div class="gunun-et">📅 Günün Kelimesi</div>
        <div class="gunun-bas">${esc(w.en)}</div>
        <div class="gunun-altt">${esc(w.tr)}</div>
      </div>
      <span class="gunun-ok">→</span>
    </button>`;
}

// Müfredat çekmecesi (soldan açılan ünite listesi)
function cekmeceAc() {
  if (!manifest) return;
  const o = document.createElement('div');
  o.className = 'cekmece-katman';
  o.innerHTML = `<aside class="cekmece" role="dialog" aria-modal="true">
      <div class="cekmece-bas"><div class="cekmece-baslik">📚 Müfredat</div><button class="modal-x" id="cekKapat" aria-label="Kapat">✕</button></div>
      <input id="cekAra" class="secenek" placeholder="Ünite ara...">
      <div class="cekmece-liste" id="cekListe"></div>
    </aside>`;
  document.body.appendChild(o);
  requestAnimationFrame(() => o.classList.add('acik'));
  const kapat = () => { o.classList.remove('acik'); setTimeout(() => o.remove(), 300); };
  o.addEventListener('click', e => { if (e.target === o) kapat(); });
  o.querySelector('#cekKapat').onclick = kapat;
  const liste = o.querySelector('#cekListe');
  const ciz = (q) => {
    liste.innerHTML = searchLessons(manifest.dersler, q).map(d => {
      const bilgi = d.durum === 'yakinda' ? 'Yakında'
        : [d.kelime_sayisi ? `${d.kelime_sayisi} kelime` : '', d.bolum_sayisi ? `${d.bolum_sayisi} bölüm` : ''].filter(Boolean).join(' · ');
      const ad = d.baslik.replace(/^Ünite\s*\d+\s*[—-]\s*/i, '');
      return `<button class="cek-ders ${d.durum === 'yakinda' ? 'yakinda' : ''}" data-id="${d.id}" data-dosya="${d.dosya}" ${d.durum === 'yakinda' ? 'disabled' : ''}>
        <div class="cek-no">${d.id}</div>
        <div class="cek-ic"><div class="cek-bas">${esc(ad)}</div><div class="cek-alt">${esc(bilgi)}${isDone(progress, d.id) ? ' · ✓ çalışıldı' : ''}</div></div>
        ${d.durum === 'yakinda' ? '<span class="cek-kilit">🔒</span>' : '<span class="ok">›</span>'}
      </button>`;
    }).join('');
    liste.querySelectorAll('.cek-ders:not([disabled])').forEach(el =>
      el.onclick = () => { kapat(); dersAc(el.dataset.dosya, Number(el.dataset.id)); });
  };
  ciz('');
  o.querySelector('#cekAra').oninput = (e) => ciz(e.target.value);
}

async function dersAc(dosya, id) {
  aktifDers = await getJSON('data/' + dosya);
  aktifDers._id = id;
  _ayar.sonDers = { dosya, id, baslik: aktifDers.baslik }; saveAyar(_ayar);
  geriBtn.hidden = false; menuBtn.hidden = true; altMenu.hidden = false;
  geriBtn.onclick = anaSayfa;
  altMenu.querySelectorAll('button').forEach(b =>
    b.onclick = () => ekranGoster(b.dataset.ekran));
  // Kelime ünitesi ise doğrudan flashcard ekranıyla aç
  const ilk = (aktifDers.kelimeler?.length && !(aktifDers.bolumler?.length) && !(aktifDers.cumleler?.length)) ? 'kelime' : 'oku';
  ekranGoster(ilk);
}

// Kelime Defterini sanal bir ünite gibi aç
function defterAc() {
  const kelimeler = defterKelimeler();
  aktifDers = {
    _id: 'defter', baslik: 'Kelime Defterim', konu_ozeti: '',
    bolumler: [], cumleler: [], gramer: [], soru_cozumleri: [],
    kelimeler, quiz: defterQuizUret(kelimeler)
  };
  geriBtn.hidden = false; menuBtn.hidden = true; altMenu.hidden = false;
  geriBtn.onclick = anaSayfa;
  altMenu.querySelectorAll('button').forEach(b => b.onclick = () => ekranGoster(b.dataset.ekran));
  ekranGoster(kelimeler.length ? 'kelime' : 'oku');
}

// Defter kelimelerinden çoktan seçmeli (kelime → anlam) quiz üret
function defterQuizUret(kelimeler) {
  if (kelimeler.length < 2) return [];
  return shuffle(kelimeler).slice(0, 20).map(w => {
    const yanlislar = shuffle(kelimeler.filter(x => x.en !== w.en)).slice(0, 3).map(x => x.tr);
    return {
      soru: `“${w.en}” ne demek?`,
      secenekler: shuffle([w.tr, ...yanlislar]),
      cevap: w.tr,
      ornek: Array.isArray(w.ornek_tokenlar) ? { tokenlar: w.ornek_tokenlar, tr: w.ornek_tr } : null
    };
  });
}

function render(html) { icerik.innerHTML = html; window.scrollTo(0, 0); }
function setAktifMenu(ekran) {
  altMenu.querySelectorAll('button').forEach(b =>
    b.classList.toggle('aktif', b.dataset.ekran === ekran));
}

function ekranGoster(ekran) {
  baslikEl.textContent = aktifDers.baslik;
  setAktifMenu(ekran);
  _acikBolum = null;
  if (ekran === 'oku') return ekranOku();
  if (ekran === 'kelime') return ekranKelime();
  if (ekran === 'gramer') return ekranGramer();
  if (ekran === 'soru') return ekranSoru();
  if (ekran === 'quiz') return ekranQuiz();
  if (ekran === 'bosluk') return ekranBosluk();
}

window.ekranGoster = ekranGoster; // diğer ekran modülleri için
window.__app = { get aktifDers(){return aktifDers;}, render, progress, saveProgress, toggleDone,
  isAnswerCorrect, scoreQuiz, nextCard };

// Task 11: Ders okuma ekranı
function ekranOku() {
  const d = aktifDers;
  if (Array.isArray(d.bolumler) && d.bolumler.length) {
    return _acikBolum == null ? bolumListesi(d) : bolumDetay(d, _acikBolum);
  }
  // Bölüm yok: düz cümle/özet görünümü
  const html = (d.cumleler || []).map(c => `
    <div class="cumle">
      <div class="en">${esc(c.en)}</div>
      <div class="tr">${esc(c.tr)}</div>
      ${c.not ? `<div class="not">${esc(c.not)}</div>` : ''}
    </div>`).join('');
  const ust = `<div class="cumle"><div class="tr">${esc(d.konu_ozeti || '')}</div></div>`;
  const tamamBtn = `<div class="btn-satir"><button class="aksiyon" id="tamamla">${isDone(progress, d._id) ? '✓ Çalışıldı (geri al)' : 'Çalışıldı işaretle'}</button></div>`;
  render(ust + html + tamamBtn);
  document.getElementById('tamamla').onclick = () => {
    progress = toggleDone(progress, d._id); saveProgress(progress); ekranOku();
  };
}

// Bölüm başlıkları listesi (başlığa tıkla → içeri gir)
function bolumListesi(d) {
  const ust = `<div class="cumle"><div class="tr">${esc(d.konu_ozeti || '')}</div></div>`;
  const liste = d.bolumler.map((b, i) => {
    const adet = (b.ciftler?.length || 0) +
      (b.ogeler ? b.ogeler.reduce((s, o) => s + (o.ornekler?.length || 0), 0) : 0) +
      (b.satirlar?.length || 0);
    const altBilgi = b.sema ? 'Konu anlatımı' : (adet ? `${adet} örnek` : '');
    return `<div class="bolum-link" data-i="${i}">
      <div><div class="baslik">${esc(b.baslik)}</div>${altBilgi ? `<div class="alt-bilgi">${altBilgi}</div>` : ''}</div>
      <span class="ok">›</span>
    </div>`;
  }).join('');
  render(ust + liste);
  icerik.querySelectorAll('.bolum-link').forEach(el =>
    el.onclick = () => { _acikBolum = Number(el.dataset.i); ekranOku(); });
}

// Bölüm hero başlığı (büyük kelime + üst etiket + alt bilgi + filigran)
function bolumHero(baslik, alt, opt = {}) {
  const { genis = false, ust = '' } = opt;
  return `<div class="edat-hero${genis ? ' genis' : ''}">
    ${genis ? '' : `<span class="edat-fon" aria-hidden="true">${esc(baslik)}</span>`}
    ${ust ? `<div class="edat-ust">${esc(ust)}</div>` : ''}
    <div class="edat-kelime">${esc(baslik)}</div>
    ${alt ? `<div class="edat-alt">${esc(alt)}</div>` : ''}
  </div>`;
}
// Kural için kısa çip etiketi (parantez içi kullanım > anlam > kural)
function kuralEtiket(o) {
  const k = (o.kural || '').trim();
  const m = k.match(/\(([^)]+)\)/);
  if (m) return m[1].trim();
  const a = (o.anlam || '').replace(/^[.\s]+/, '').split(/[,/]/)[0].trim();
  if (a) return a.length > 20 ? a.slice(0, 18) + '…' : a;
  return k || '•';
}
// Edat bölümü: hero + interaktif anlam çipleri + numaralı kural kartları
function edatBolumHTML(b) {
  const ogeler = b.ogeler || [];
  const toplamOrnek = ogeler.reduce((s, o) => s + (o.ornekler?.length || 0), 0);
  let h = bolumHero(b.baslik, `${ogeler.length} kullanım · ${toplamOrnek} örnek`, { ust: 'EDAT' });
  if (ogeler.length > 1) {
    h += `<div class="edat-cipler">` + ogeler.map((o, idx) =>
      `<button class="edat-cip" data-hedef="kural-${idx}"><span class="edat-cip-no">${idx + 1}</span>${esc(kuralEtiket(o))}</button>`
    ).join('') + `</div>`;
  }
  h += ogeler.map((o, idx) => `
    <div class="edat-kural-kart" id="kural-${idx}">
      <div class="edat-kural-bas">
        <span class="edat-no">${idx + 1}</span>
        <div class="edat-kural-metin">${esc(o.kural)}${o.anlam ? `<span class="edat-anlam-cip">${esc(o.anlam)}</span>` : ''}</div>
      </div>
      ${(o.ornekler || []).map(ornekInteraktifHTML).join('')}
    </div>`).join('');
  return h;
}

// Tek bölüm detayı (kural + etkileşimli örnekler)
function bolumDetay(d, i) {
  const b = d.bolumler[i];
  let html = `<button class="aksiyon ikincil" id="bolumGeri" style="margin-bottom:14px">‹ Bölümler</button>`;
  if (b.ogeler) {
    html += `<div class="bolum">` + edatBolumHTML(b) + `</div>`;
  } else if (b.ciftler) {
    html += `<div class="bolum">` + bolumHero(b.baslik, `${b.ciftler.length} öbek · kelimeye dokun, çeviri için kaydır`, { genis: true, ust: 'KARMA ÖBEKLER' })
      + b.ciftler.map(ornekInteraktifHTML).join('') + `</div>`;
  } else {
    html += `<div class="bolum"><div class="bolum-baslik">${esc(b.baslik)}</div>`;
    html += semaHTML(b.sema);
    html += (b.satirlar || []).map(s => `<div class="bolum-satir">${esc(s)}</div>`).join('');
    html += `</div>`;
  }
  render(html);
  document.getElementById('bolumGeri').onclick = () => { _acikBolum = null; ekranOku(); };
  wireOrnekler(icerik);
  // Anlam çipleri → ilgili kural kartına kaydır + vurgula
  icerik.querySelectorAll('.edat-cip').forEach(c => c.onclick = () => {
    const el = document.getElementById(c.dataset.hedef);
    if (!el) return;
    icerik.querySelectorAll('.edat-cip').forEach(x => x.classList.remove('aktif'));
    c.classList.add('aktif');
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.remove('vurgula'); void el.offsetWidth; el.classList.add('vurgula');
  });
}

function esc(s) { return String(s ?? '').replace(/[&<>]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[m])); }
// *kelime* -> vurgulu (highlight). Önce kaçışlanır, sonra yıldız çiftleri <mark>'a çevrilir.
function vurgu(s) { return esc(s).replace(/\*([^*]+)\*/g, '<mark>$1</mark>'); }

// Task 12: Flashcard (kelime) ekranı
let _kartIdx = 0, _kartAcik = false;
function ekranKelime() {
  _kartIdx = 0; _kartAcik = false;
  cizKart();
}
function cizKart() {
  const k = aktifDers.kelimeler;
  if (!k.length) { render('<div class="bolum"><div class="bolum-satir">Bu ünitede kelime yok.</div></div>'); return; }
  const kart = k[_kartIdx];
  const yuz = _kartAcik
    ? `<div class="kart-arka">
         ${kart.tur ? `<div class="kart-arka-tur">${esc(kart.tur)} · ${esc(kart.en)}</div>` : ''}
         <div class="kart-anlam" id="kartAnlam">
           <span>${esc(kart.tr)}</span>
           <span class="kart-anlam-ipucu">↑ ön yüze dön</span>
         </div>
         <div class="kart-ornek-etiket">Örnek cümle · kelimeye dokun, çeviri için kaydır</div>
         ${ornekInteraktifHTML({ tokenlar: kart.ornek_tokenlar, tr: kart.ornek_tr })}
       </div>`
    : `<div class="kart-on-grup">
         ${kart.tur ? `<div class="kart-tur">${esc(kart.tur)}</div>` : ''}
         <div class="kart-on">${esc(kart.en)}</div>
         <div class="kart-ipucu-on">çevirmek için karta dokun</div>
       </div>`;
  render(`
    <div class="kart-sayac">🎴 ${_kartIdx + 1} / ${k.length}</div>
    <div class="kart-ilerleme"><div class="kart-ilerleme-ic" style="width:${Math.round((_kartIdx + 1) / k.length * 100)}%"></div></div>
    <div class="flashcard ${_kartAcik ? 'acik' : ''}" id="kart">
      <div class="kart-et sol">📓 Öğren</div>
      <div class="kart-et sag">✓ Biliyorum</div>
      ${yuz}
    </div>
    <div class="kart-kaydir-ipucu">← öğren&nbsp;&nbsp;·&nbsp;&nbsp;kaydır&nbsp;&nbsp;·&nbsp;&nbsp;biliyorum →</div>
    <div class="btn-satir">
      <button class="aksiyon ${defterdeMi(kart.en) ? '' : 'ikincil'} defter-toggle" id="defterBtn">${defterdeMi(kart.en) ? '📓 Defterde ✓' : '📓 Bilmiyorum'}</button>
      <button class="aksiyon" id="sonraki">Sonraki ›</button>
    </div>
    <div class="btn-satir"><button class="aksiyon ikincil" id="cevir">${_kartAcik ? '↺ Ön yüz' : 'Çevir'}</button></div>`);
  const kartEl = document.getElementById('kart');
  let sx = 0, dx = 0, surukluyor = false, surukledi = false;
  kartEl.addEventListener('pointerdown', e => {
    if (e.target.closest('.tok-anlamli')) return;   // örnekte kelime baloncuğu öncelikli
    surukluyor = true; surukledi = false; sx = e.clientX; dx = 0;
    kartEl.style.transition = 'none';
    try { kartEl.setPointerCapture(e.pointerId); } catch (_) {}
  });
  kartEl.addEventListener('pointermove', e => {
    if (!surukluyor) return;
    dx = e.clientX - sx;
    if (Math.abs(dx) > 6) surukledi = true;
    kartEl.style.transform = `translateX(${dx}px) rotate(${dx / 24}deg)`;
    kartEl.classList.toggle('swipe-sag', dx > 45);
    kartEl.classList.toggle('swipe-sol', dx < -45);
  });
  const bitir = () => {
    if (!surukluyor) return;
    surukluyor = false; kartEl.style.transition = '';
    if (dx > 95) kartUcur(1);
    else if (dx < -95) kartUcur(-1);
    else { kartEl.style.transform = ''; kartEl.classList.remove('swipe-sag', 'swipe-sol'); }
  };
  kartEl.addEventListener('pointerup', bitir);
  kartEl.addEventListener('pointercancel', bitir);
  kartEl.onclick = () => { if (surukledi) { surukledi = false; return; } if (!_kartAcik) { _kartAcik = true; cizKart(); } };
  document.getElementById('cevir').onclick = (e) => { e.stopPropagation(); _kartAcik = !_kartAcik; cizKart(); };
  document.getElementById('sonraki').onclick = (e) => { e.stopPropagation(); gunKaydet(); _kartIdx = nextCard(_kartIdx, k.length); _kartAcik = false; cizKart(); };
  document.getElementById('defterBtn').onclick = (e) => { e.stopPropagation(); defterToggle(kart); cizKart(); };
  const anlamEl = document.getElementById('kartAnlam');
  if (anlamEl) anlamEl.onclick = (e) => { e.stopPropagation(); _kartAcik = false; cizKart(); };
  if (_kartAcik) wireOrnekler(icerik);
}
// Kartı kaydırarak gönder: yön>0 biliyorum, yön<0 bilmiyorum (deftere ekle)
function kartUcur(yon) {
  const k = aktifDers.kelimeler, kart = k[_kartIdx];
  const kartEl = document.getElementById('kart');
  kartEl.style.transition = 'transform .32s ease, opacity .32s ease';
  kartEl.style.transform = `translateX(${yon * 520}px) rotate(${yon * 22}deg)`;
  kartEl.style.opacity = '0';
  if (yon < 0 && !defterdeMi(kart.en)) defterToggle(kart);
  gunKaydet();
  setTimeout(() => { _kartIdx = nextCard(_kartIdx, k.length); _kartAcik = false; cizKart(); }, 300);
}

// Etkileşimli örnek HTML — ex: {tokenlar:[{k,a,en?,vurgu?}], tr} ya da {en, tr}
function ornekInteraktifHTML(ex) {
  if (!ex) return '';
  const eq = (s) => esc(s).replace(/"/g, '&quot;');
  let govde;
  if (Array.isArray(ex.tokenlar)) {
    govde = ex.tokenlar.map(t => {
      const cls = ['tok', t.a ? 'tok-anlamli' : '', t.vurgu ? 'tok-vurgu' : ''].filter(Boolean).join(' ');
      return `<span class="${cls}" data-k="${eq(t.k)}"${t.a ? ` data-a="${eq(t.a)}"` : ''}${t.en ? ` data-en="${eq(t.en)}"` : ''}>${esc(t.k)}</span>`;
    }).join(' ');
  } else {
    govde = esc(ex.en || '');
  }
  const ceviriVar = ex.tr ? ' var-ceviri' : '';
  return `
    <div class="ornek-kutu">
      <div class="ornek-cumle${ceviriVar}">${govde}</div>
      ${ex.tr ? `<div class="ornek-ceviri">${esc(ex.tr)}</div>` : ''}
    </div>`;
}

// Konu anlatımı şeması (görsel: numaralı adımlar, ok yönü, edat-ek çipleri)
function semaHTML(s) {
  if (!s) return '';
  let h = '<div class="sema">';
  if (s.kural) h += `<div class="sema-kural">${esc(s.kural)}</div>`;
  if (Array.isArray(s.ekler) && s.ekler.length)
    h += `<div class="sema-ekler">${s.ekler.map(e => `<span class="ek-chip"><b>${esc(e.edat)}</b> ${esc(e.ek)}</span>`).join('')}</div>`;
  for (const o of (s.ornekler || [])) {
    h += `<div class="sema-ornek">`;
    if (o.cumle) h += `<div class="sema-cumle">${esc(o.cumle)}</div>`;
    h += `<div class="sema-yon">⬇ sondan başa çevir</div>`;
    h += (o.adimlar || []).map((a, i) => `
      <div class="sema-adim">
        <span class="sema-no">${i + 1}</span>
        <span class="sema-en">${esc(a.en)}</span>
        <span class="sema-ok">→</span>
        <span class="sema-tr">${esc(a.tr)}</span>
      </div>`).join('');
    if (o.sonuc) h += `<div class="sema-sonuc">${esc(o.sonuc)}</div>`;
    h += `</div>`;
  }
  if (Array.isArray(s.kademe) && s.kademe.length) {
    h += `<div class="sema-kademe-baslik">Öbek nasıl uzar?</div>`;
    h += s.kademe.map(k => `<div class="kademe-satir"><span class="kademe-en">${esc(k.en)}</span><span class="kademe-ok">→</span><span class="kademe-tr">${esc(k.tr)}</span></div>`).join('');
  }
  return h + '</div>';
}

// Sayfadaki TÜM .ornek-kutu'ları etkinleştir: kelime baloncuğu + sağa kaydır-çeviri
function wireOrnekler(root) {
  const kapat = () => root.querySelectorAll('.tok.acik').forEach(t => {
    t.classList.remove('acik'); const b = t.querySelector('.balon'); if (b) b.remove();
  });
  root.querySelectorAll('.tok-anlamli').forEach(el => {
    el.onclick = (e) => {
      e.stopPropagation();
      const aciktiMi = el.classList.contains('acik');
      kapat();
      if (!aciktiMi) {
        const kelimeHam = (el.dataset.k || '').replace(/[.,!?;:"'’]+$/g, '');
        const enText = el.dataset.en || kelimeHam;
        const eklenmis = defterdeMi(kelimeHam);
        const b = document.createElement('span'); b.className = 'balon';
        b.innerHTML = `<span class="balon-en">${esc(enText)}</span><span class="balon-tr">${esc(el.dataset.a || '')}</span>` +
          `<button class="balon-ogren"${eklenmis ? ' disabled' : ''}>${eklenmis ? '✓ Defterde' : '📓 Öğren'}</button>`;
        el.appendChild(b); el.classList.add('acik');
        const ob = b.querySelector('.balon-ogren');
        if (ob) ob.onclick = (ev) => { ev.stopPropagation(); ogrenEkle(el); ob.textContent = '✓ Defterde'; ob.disabled = true; };
      }
    };
  });
  root.querySelectorAll('.ornek-kutu').forEach(kutu => {
    const cumle = kutu.querySelector('.ornek-cumle');
    const ceviri = kutu.querySelector('.ornek-ceviri');
    if (!ceviri || !cumle) return;
    const MAKS = 90, ESIK = 40;
    const ac = () => { ceviri.classList.add('gorunur'); ceviri.style.maxHeight = ''; ceviri.style.opacity = ''; };
    const kapatC = () => { ceviri.classList.remove('gorunur'); ceviri.style.maxHeight = '0'; ceviri.style.opacity = '0'; };
    let x0 = null, dx = 0, kaydirildi = false;
    cumle.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; dx = 0; kaydirildi = false; cumle.style.transition = 'none'; ceviri.style.transition = 'none'; }, { passive: true });
    cumle.addEventListener('touchmove', (e) => {
      if (x0 == null) return;
      dx = Math.max(0, Math.min(MAKS, e.touches[0].clientX - x0));
      if (dx > 6) kaydirildi = true;
      cumle.style.transform = `translateX(${dx}px)`;
      const o = dx / MAKS; ceviri.style.maxHeight = (o * 240) + 'px'; ceviri.style.opacity = o;
    }, { passive: true });
    cumle.addEventListener('touchend', () => {
      cumle.style.transition = 'transform .25s ease'; ceviri.style.transition = 'all .25s ease';
      cumle.style.transform = 'translateX(0)';
      if (kaydirildi) { if (dx > ESIK) ac(); else kapatC(); }
      x0 = null;
    });
    // Boş alana (kelime değil) dokununca çeviriyi aç/kapat — yazısız, sade
    cumle.addEventListener('click', (e) => {
      if (e.target.closest('.tok-anlamli') || kaydirildi) return;
      ceviri.style.transition = 'all .25s ease';
      ceviri.classList.contains('gorunur') ? kapatC() : ac();
    });
  });
}

// Task 13: Gramer ekranı
function ekranGramer() {
  const g = aktifDers.gramer;
  if (!g.length) { render('<div class="cumle"><div class="tr">Bu derste gramer notu yok.</div></div>'); return; }
  render(g.map(x => `
    <div class="cumle">
      <div class="en">${esc(x.konu)}</div>
      <div class="tr">${esc(x.aciklama)}</div>
      ${(x.ornekler || []).map(o => `<div class="not">• ${esc(o)}</div>`).join('')}
    </div>`).join(''));
}

// Task 14: Soru çözümleri ekranı
function ekranSoru() {
  const s = aktifDers.soru_cozumleri;
  if (!s.length) { render('<div class="cumle"><div class="tr">Bu derste soru çözümü yok.</div></div>'); return; }
  render(s.map((q, i) => `
    <div class="cumle" data-i="${i}">
      <div class="en">${i + 1}. ${esc(q.soru)}</div>
      ${(q.secenekler || []).map(o => `<div class="tr">• ${esc(o)}</div>`).join('')}
      <button class="secenek goster" data-i="${i}" style="margin-top:8px">Cevabı göster</button>
      <div class="cozum" id="cozum-${i}" hidden>
        <div class="not">Cevap: ${esc(q.cevap)}</div>
        ${q.hoca_aciklama ? `<div class="tr">${esc(q.hoca_aciklama)}</div>` : ''}
      </div>
    </div>`).join(''));
  icerik.querySelectorAll('.goster').forEach(b => b.onclick = () => {
    document.getElementById('cozum-' + b.dataset.i).hidden = false;
    b.hidden = true;
  });
}

// Task 15: Quiz ekranı — testlere bölünmüş (Test 1 Kolay → Test N Zor), tek tek soru
let _quizCevap = [], _quizIdx = 0, _quizSorular = [], _aktifTest = null, _yanlisMod = false;
// Dersin testleri: yeni `testler` alanı; yoksa eski düz `quiz`'i tek test sayar
function quizTestleri() {
  const d = aktifDers;
  if (Array.isArray(d.testler) && d.testler.length) return d.testler;
  if (Array.isArray(d.quiz) && d.quiz.length) return [{ ad: 'Test', sorular: d.quiz }];
  return [];
}
function zorlukRozet(i, n) {
  const r = n <= 1 ? 0 : i / (n - 1);
  if (r < 0.34) return '<span class="zorluk-rozet z-kolay">Kolay</span>';
  if (r < 0.67) return '<span class="zorluk-rozet z-orta">Orta</span>';
  return '<span class="zorluk-rozet z-zor">Zor</span>';
}
function ekranQuiz() {
  _aktifTest = null; _yanlisMod = false;
  const testler = quizTestleri();
  if (!testler.length) { render('<div class="cumle"><div class="tr">Bu bölümde test yok.</div></div>'); return; }
  if (testler.length === 1) { baslatTest(0); return; }
  const id = aktifDers._id;
  let topD = 0, topT = 0, bitenSayi = 0;
  const liste = testler.map((t, i) => {
    const st = _istat[testKey(id, i)];
    if (st) { topD += st.dogru; topT += st.toplam; bitenSayi++; }
    const durum = st
      ? `<span class="test-skor ${st.dogru === st.toplam ? 'tam' : ''}">✓ ${st.dogru}/${st.toplam}</span>`
      : '';
    return `<div class="test-link${st ? ' biten' : ''}" data-i="${i}">
      <div><div class="baslik">${esc(t.ad || ('Test ' + (i + 1)))}</div><div class="alt-bilgi">${(t.sorular || []).length} soru</div></div>
      ${durum}${zorlukRozet(i, testler.length)}<span class="ok">›</span>
    </div>`;
  }).join('');
  const ozet = bitenSayi
    ? `<div class="quiz-ozet">Çözülen: ${bitenSayi}/${testler.length} test · Toplam doğru: ${topD}/${topT} (%${Math.round(topD / topT * 100)})</div>`
    : '';
  render(`<div class="cumle"><div class="tr">Testler kolaydan zora doğru sıralı. Bir test seç:</div></div>${ozet}${liste}`);
  icerik.querySelectorAll('.test-link').forEach(el => el.onclick = () => baslatTest(Number(el.dataset.i)));
}
function baslatTest(ti) {
  _aktifTest = ti; _yanlisMod = false;
  _quizSorular = (quizTestleri()[ti].sorular) || [];
  _quizCevap = new Array(_quizSorular.length).fill(null);
  _quizIdx = 0;
  cizQuiz();
}
const _harfler = ['A', 'B', 'C', 'D', 'E', 'F'];
function cizQuiz() {
  const q = _quizSorular, i = _quizIdx, soru = q[i];
  const testler = quizTestleri();
  const cokTest = testler.length > 1;
  const cevaplandi = _quizCevap[i] != null;
  const dogruMu = cevaplandi && _quizCevap[i] === soru.cevap;

  // Şıklar: A/B/C/D rozetli kartlar
  const sec = soru.secenekler.map((o, idx) => {
    let sinif = 'q-secenek';
    let isaret = '';
    if (cevaplandi) {
      if (o === soru.cevap) { sinif += ' dogru'; isaret = '<span class="q-isaret">✓</span>'; }
      else if (o === _quizCevap[i]) { sinif += ' yanlis'; isaret = '<span class="q-isaret">✕</span>'; }
    }
    return `<button class="${sinif}" data-o="${esc(o)}" ${cevaplandi ? 'disabled' : ''}>
      <span class="q-harf">${_harfler[idx] || '•'}</span><span class="q-sik-metin">${esc(o)}</span>${isaret}</button>`;
  }).join('');

  // Soru cümlesi: boşluğu görünür kutu yap (cevaplanınca dolar)
  const blank = cevaplandi
    ? `<span class="q-bosluk ${dogruMu ? 'dogru' : 'yanlis'}">${esc(soru.cevap)}</span>`
    : `<span class="q-bosluk"></span>`;
  const soruGovde = esc(soru.soru).replace(/_{2,}/, blank);

  let alt = '';
  if (cevaplandi) {
    alt += `<div class="q-sonuc-rozet ${dogruMu ? 'dogru' : 'yanlis'}">${dogruMu ? '✓ Doğru' : '✕ Yanlış · doğrusu: ' + esc(soru.cevap)}</div>`;
    if (soru.aciklama) alt += `<div class="q-aciklama"><span class="q-aciklama-bas">💡 İpucu</span>${esc(soru.aciklama)}</div>`;
    if (soru.ornek) alt += `<div class="q-ornek"><div class="q-ornek-etiket">Örnek cümle · kelimeye dokun, çeviri için kaydır</div>${ornekInteraktifHTML(soru.ornek)}</div>`;
    alt += `<div class="btn-satir"><button class="aksiyon" id="qSonraki">${i + 1 < q.length ? 'Sonraki ›' : 'Testi bitir'}</button></div>`;
  }

  const ust = cokTest
    ? `<button class="aksiyon ikincil" id="qGeri" style="margin-bottom:12px">‹ Testler</button>
       <div class="kart-sayac">${esc(testler[_aktifTest].ad)} · Soru ${i + 1} / ${q.length}</div>`
    : `<div class="kart-sayac">Soru ${i + 1} / ${q.length}</div>`;
  const ilerleme = `<div class="kart-ilerleme"><div class="kart-ilerleme-ic" style="width:${Math.round((cevaplandi ? i + 1 : i) / q.length * 100)}%"></div></div>`;
  const etiket = /_{2,}/.test(soru.soru) ? 'Boşluğa uygun edatı seç' : 'Doğru cevabı seç';
  const soruKart = `<div class="soru-kart">
      <div class="soru-etiket">${etiket}</div>
      <div class="soru-cumle">${soruGovde}</div>
    </div>`;

  render(`${ust}${ilerleme}${soruKart}<div class="q-secenekler">${sec}</div>${alt}`);
  const gb = document.getElementById('qGeri');
  if (gb) gb.onclick = () => ekranQuiz();
  if (!cevaplandi) {
    icerik.querySelectorAll('.q-secenek').forEach(b => b.onclick = () => { _quizCevap[i] = b.dataset.o; gunKaydet(); cizQuiz(); });
  } else {
    if (soru.ornek) wireOrnekler(icerik);
    const ns = document.getElementById('qSonraki');
    if (ns) ns.onclick = () => { if (i + 1 < q.length) { _quizIdx++; cizQuiz(); } else cizQuizSonuc(); };
  }
}
function cizQuizSonuc() {
  if (_yanlisMod) return yanlisSonuc();
  const r = scoreQuiz(_quizSorular, _quizCevap);
  const testler = quizTestleri();
  const sonrakiVar = _aktifTest != null && _aktifTest + 1 < testler.length;
  const yuzde = Math.round((r.dogru / r.toplam) * 100);

  // İstatistiği kaydet (en iyi skoru tut, ✓ tamam işareti)
  const k = testKey(aktifDers._id, _aktifTest);
  const onceki = _istat[k];
  if (!onceki || r.dogru > onceki.dogru) { _istat[k] = { dogru: r.dogru, toplam: r.toplam, tamam: true }; saveIstat(_istat); }

  // Yanlış yapılan soruları Yanlışlarım'a ekle (tekrar yapmamak için dedup)
  const mevcut = new Set(_yanlis.map(y => y.key));
  let eklenen = 0;
  _quizSorular.forEach((q, idx) => {
    if (_quizCevap[idx] !== q.cevap) {
      const sk = soruKey(q);
      if (!mevcut.has(sk)) { _yanlis.push({ key: sk, soru: q, unite: aktifDers.baslik || '' }); mevcut.add(sk); eklenen++; }
    }
  });
  if (eklenen) saveYanlis(_yanlis);

  render(`<div class="cumle"><div class="en">${esc(testler[_aktifTest]?.ad || 'Test')} sonucu</div>
      <div class="tr" style="font-size:20px;font-weight:700">${r.dogru} / ${r.toplam} doğru · %${yuzde}</div>
      ${eklenen ? `<div class="alt-bilgi" style="color:var(--kil)">❌ ${eklenen} yanlış soru “Yanlışlarım”a eklendi</div>` : ''}</div>
    <div class="btn-satir">
      <button class="aksiyon" id="qTekrar">Tekrar çöz</button>
      ${sonrakiVar ? '<button class="aksiyon" id="qSonrakiTest">Sonraki test ›</button>' : ''}
      ${testler.length > 1 ? '<button class="aksiyon ikincil" id="qListe">Testler</button>' : ''}
    </div>`);
  document.getElementById('qTekrar').onclick = () => baslatTest(_aktifTest);
  const st = document.getElementById('qSonrakiTest');
  if (st) st.onclick = () => baslatTest(_aktifTest + 1);
  const ql = document.getElementById('qListe');
  if (ql) ql.onclick = () => ekranQuiz();
}

// ===== Yanlışlarım — tüm ünitelerden biriken yanlış sorular; doğru yapınca silinir =====
function yanlisAc() {
  _yanlis = loadYanlis();
  aktifDers = { _id: 'yanlis', baslik: 'Yanlışlarım' };
  geriBtn.hidden = false; menuBtn.hidden = true; altMenu.hidden = true;
  geriBtn.onclick = anaSayfa;
  baslikEl.textContent = 'Yanlışlarım';
  _yanlisMod = true; _aktifTest = 0;
  _quizSorular = shuffle(_yanlis.map(y => y.soru));
  if (!_quizSorular.length) {
    render('<div class="cumle"><div class="tr">Henüz yanlışın yok. 👏 Testlerde yanlış yaptığın sorular burada birikir; burada doğru çözünce listeden silinir.</div></div>');
    return;
  }
  _quizCevap = new Array(_quizSorular.length).fill(null);
  _quizIdx = 0;
  cizQuiz();
}
function yanlisSonuc() {
  const r = scoreQuiz(_quizSorular, _quizCevap);
  // Doğru cevaplanan soruları listeden çıkar
  const dogruKeys = new Set();
  _quizSorular.forEach((q, idx) => { if (_quizCevap[idx] === q.cevap) dogruKeys.add(soruKey(q)); });
  let cozulen = 0;
  _yanlis = _yanlis.filter(y => { if (dogruKeys.has(y.key)) { cozulen++; return false; } return true; });
  saveYanlis(_yanlis);
  render(`<div class="cumle"><div class="en">Yanlışlarım — sonuç</div>
      <div class="tr" style="font-size:20px;font-weight:700">${r.dogru} / ${r.toplam} doğru</div>
      <div class="alt-bilgi">✅ ${cozulen} soru listeden silindi · Kalan: ${_yanlis.length} soru</div></div>
    <div class="btn-satir">
      ${_yanlis.length ? '<button class="aksiyon" id="yTekrar">Kalanları çöz</button>' : ''}
      <button class="aksiyon ikincil" id="yEv">Ana sayfa</button>
    </div>`);
  const yt = document.getElementById('yTekrar');
  if (yt) yt.onclick = () => yanlisAc();
  document.getElementById('yEv').onclick = anaSayfa;
}

// Boşluk doldurma ekranı (kelime örnek cümlelerinden)
let _bosluk = [], _boslukCevap = [];
function ekranBosluk() {
  const k = (aktifDers.kelimeler || []).filter(w => Array.isArray(w.ornek_tokenlar) && w.ornek_tokenlar.some(t => t.vurgu));
  if (k.length < 2) { render('<div class="cumle"><div class="tr">Boşluk doldurma için yeterli örnekli kelime yok. (Kelime sekmesinden “Bilmiyorum” ile deftere ekle.)</div></div>'); return; }
  _bosluk = shuffle(k).slice(0, 15).map(w => {
    const toks = w.ornek_tokenlar;
    const hedefIdx = toks.findIndex(t => t.vurgu);
    const dogru = toks[hedefIdx].k.replace(/[.,!?;:]+$/g, '');
    const yanlislar = shuffle(k.filter(x => x.en !== w.en)).slice(0, 3).map(x => x.en);
    return { toks, hedefIdx, dogru, secenekler: shuffle([dogru, ...yanlislar]), tr: w.ornek_tr };
  });
  _boslukCevap = new Array(_bosluk.length).fill(null);
  cizBosluk();
}
function cizBosluk() {
  const bas = `<div class="kart-sayac">✍️ Boşluk Doldurma · ${_bosluk.length} cümle</div>`;
  const html = _bosluk.map((q, i) => {
    const cevaplandi = _boslukCevap[i] != null;
    let govde;
    if (cevaplandi) {
      // cevap sonrası: tam etkileşimli örnek cümle (kelimeye dokun, çeviri için kaydır)
      govde = ornekInteraktifHTML({ tokenlar: q.toks, tr: q.tr });
    } else {
      const cumle = q.toks.map((t, j) => j === q.hedefIdx ? '<span class="q-bosluk"></span>' : esc(t.k)).join(' ');
      govde = `<div class="soru-cumle">${cumle}</div>`;
    }
    const sec = q.secenekler.map((o, idx) => {
      let cls = 'q-secenek', isaret = '';
      if (cevaplandi) {
        if (o.toLowerCase() === q.dogru.toLowerCase()) { cls += ' dogru'; isaret = '<span class="q-isaret">✓</span>'; }
        else if (o === _boslukCevap[i]) { cls += ' yanlis'; isaret = '<span class="q-isaret">✕</span>'; }
      }
      return `<button class="${cls}" data-i="${i}" data-o="${esc(o)}" ${cevaplandi ? 'disabled' : ''}>
        <span class="q-harf">${_harfler[idx] || '•'}</span><span class="q-sik-metin">${esc(o)}</span>${isaret}</button>`;
    }).join('');
    return `<div class="soru-kart">
        <div class="soru-etiket">${i + 1}. Boşluğa uygun kelimeyi seç</div>
        ${govde}
      </div>
      <div class="q-secenekler" style="margin-bottom:18px">${sec}</div>`;
  }).join('');
  const bitti = _boslukCevap.every(x => x != null);
  const dogruSay = _boslukCevap.filter((a, i) => a != null && a.toLowerCase() === _bosluk[i].dogru.toLowerCase()).length;
  const skor = bitti ? `<div class="bosluk-sonuc ${dogruSay === _bosluk.length ? 'tam' : ''}">✍️ Sonuç: ${dogruSay} / ${_bosluk.length} doğru</div>` : '';
  render(bas + html + skor);
  icerik.querySelectorAll('.q-secenek:not([disabled])').forEach(b => b.onclick = () => {
    _boslukCevap[Number(b.dataset.i)] = b.dataset.o; gunKaydet(); cizBosluk();
  });
  wireOrnekler(icerik);
}

// ============================================================
// Giriş ekranı · Modal sistemi · Dashboard · Üst bar aksiyonları
// ============================================================

// --- Genel modal (alttan açılan sayfa) ---
let _modalKapat = null;
function modalAc(baslik, govde, opt = {}) {
  modalKapat();
  const o = document.createElement('div');
  o.className = 'modal-katman';
  o.innerHTML = `<div class="modal-sheet" role="dialog" aria-modal="true">
      <div class="modal-tut"></div>
      <div class="modal-bas"><h2>${esc(baslik)}</h2><button class="modal-x" aria-label="Kapat">✕</button></div>
      <div class="modal-govde">${govde}</div>
    </div>`;
  document.body.appendChild(o);
  requestAnimationFrame(() => o.classList.add('acik'));
  const kapat = () => { o.classList.remove('acik'); setTimeout(() => o.remove(), 260); _modalKapat = null; };
  o.addEventListener('click', e => { if (e.target === o) kapat(); });
  o.querySelector('.modal-x').onclick = kapat;
  _modalKapat = kapat;
  if (opt.onWire) opt.onWire(o, kapat);
  return { el: o, kapat };
}
function modalKapat() { if (_modalKapat) _modalKapat(); }

// --- Giriş / karşılama ekranı (ilk açılışta bir kez) ---
function girisEkrani(zorla) {
  if (!zorla && _ayar.girisGoruldu) return false;
  const o = document.createElement('div');
  o.className = 'giris-katman';
  o.innerHTML = `
    <div class="giris-ic">
      <div class="giris-amblem">📖</div>
      <div class="giris-baslik">Çalışma Defteri</div>
      <div class="giris-alt">YDS · YÖKDİL İngilizce</div>
      <div class="giris-ozellik">
        <div class="giris-sat"><span>🎴</span><div><b>Akıllı kartlar</b><i>Kelimeye dokun, çeviriyi kaydır</i></div></div>
        <div class="giris-sat"><span>🧠</span><div><b>Seviyeli testler</b><i>Kolaydan zora, istatistikli</i></div></div>
        <div class="giris-sat"><span>❌</span><div><b>Yanlışlarım</b><i>Hatalar biriksin, tekrar çöz</i></div></div>
      </div>
      <button class="aksiyon giris-basla" id="girisBasla">Çalışmaya Başla →</button>
    </div>`;
  document.body.appendChild(o);
  requestAnimationFrame(() => o.classList.add('acik'));
  o.querySelector('#girisBasla').onclick = () => {
    _ayar.girisGoruldu = true; saveAyar(_ayar);
    o.classList.remove('acik'); setTimeout(() => o.remove(), 420);
  };
  return true;
}

// --- Yardım modalı ---
function yardimAc() {
  modalAc('Nasıl çalışılır?', `
    <div class="yardim-sat"><span>📖</span><div><b>Oku</b> — Konu anlatımı şeması, edat kartları ve etkileşimli örnek cümleler.</div></div>
    <div class="yardim-sat"><span>🎴</span><div><b>Kelime</b> — Karta dokun çevrilir; örnekte kelimeye dokun → baloncuk, sağa kaydır → çeviri.</div></div>
    <div class="yardim-sat"><span>🧠</span><div><b>Quiz</b> — Test 1’den başla, kolaydan zora. Her testin skoru ve ✓’si saklanır.</div></div>
    <div class="yardim-sat"><span>✍️</span><div><b>Boşluk</b> — Cümledeki boşluğa doğru kelimeyi seç; cevap sonrası cümle etkileşimli olur.</div></div>
    <div class="yardim-sat"><span>📓</span><div><b>Kelime Defterim</b> — Bilmediğin kelimeyi “Bilmiyorum/Öğren” ile ekle, burada çalış.</div></div>
    <div class="yardim-sat"><span>❌</span><div><b>Yanlışlarım</b> — Testlerde yanlış yaptığın sorular birikir; doğru çözünce silinir.</div></div>
  `);
}

// --- Ayarlar modalı ---
function ayarAc() {
  modalAc('Ayarlar', `
    <button class="ayar-sat" data-is="tema"><span>${_ayar.tema === 'koyu' ? '☀️' : '🌙'}</span><div><b>${_ayar.tema === 'koyu' ? 'Açık tema' : 'Koyu tema'}</b><i>Görünümü değiştir</i></div></button>
    <button class="ayar-sat" data-is="hedef"><span>🎯</span><div><b>Günlük hedef</b><i>${_ayar.hedef || HEDEF_VARSAYILAN} aktivite/gün — değiştirmek için dokun</i></div></button>
    <button class="ayar-sat" data-is="giris"><span>👋</span><div><b>Tanıtım ekranını göster</b><i>Karşılama ekranını tekrar aç</i></div></button>
    <button class="ayar-sat" data-is="yanlis"><span>❌</span><div><b>Yanlışlarım’ı temizle</b><i>Biriken yanlış soruları sıfırla</i></div></button>
    <button class="ayar-sat" data-is="defter"><span>📓</span><div><b>Kelime Defteri’ni temizle</b><i>Eklenen kelimeleri sil</i></div></button>
    <button class="ayar-sat tehlike" data-is="hepsi"><span>🗑️</span><div><b>Tüm ilerlemeyi sıfırla</b><i>Test skorları, defter, yanlışlar — hepsi</i></div></button>
    <div class="ayar-hakkinda">Çalışma Defteri · YDS/YÖKDİL · sürüm 44</div>
  `, {
    onWire: (o, kapat) => {
      o.querySelectorAll('.ayar-sat').forEach(b => b.onclick = () => {
        const is = b.dataset.is;
        if (is === 'tema') { temaDegistir(); kapat(); ayarAc(); return; }
        if (is === 'hedef') {
          const ops = [10, 20, 30, 50];
          _ayar.hedef = ops[(ops.indexOf(_ayar.hedef || HEDEF_VARSAYILAN) + 1) % ops.length];
          saveAyar(_ayar); kapat(); ayarAc(); return;
        }
        if (is === 'giris') { kapat(); girisEkrani(true); return; }
        const sorular = {
          yanlis: 'Yanlışlarım listesindeki tüm sorular silinsin mi?',
          defter: 'Kelime Defteri’ndeki tüm kelimeler silinsin mi?',
          hepsi: 'TÜM ilerleme (test skorları, defter, yanlışlar) sıfırlansın mı? Bu geri alınamaz.'
        };
        onayAc(sorular[is], () => {
          if (is === 'yanlis' || is === 'hepsi') { _yanlis = []; saveYanlis(_yanlis); }
          if (is === 'defter' || is === 'hepsi') { _defter = {}; saveDefter(_defter); }
          if (is === 'hepsi') { _istat = {}; saveIstat(_istat); progress = {}; saveProgress(progress); }
          anaSayfa();
        });
      });
    }
  });
}

// --- Onay penceresi (küçük modal) ---
function onayAc(mesaj, evet) {
  modalAc('Emin misin?', `
    <div class="onay-mesaj">${esc(mesaj)}</div>
    <div class="btn-satir">
      <button class="aksiyon ikincil" id="onayHayir">Vazgeç</button>
      <button class="aksiyon onay-evet" id="onayEvet">Evet, sil</button>
    </div>`, {
    onWire: (o, kapat) => {
      o.querySelector('#onayHayir').onclick = kapat;
      o.querySelector('#onayEvet').onclick = () => { evet(); kapat(); };
    }
  });
}

// --- Çalışma serisi (streak) + günlük hedef ---
function _gunStr(off = 0) {
  const d = new Date(); d.setDate(d.getDate() + off);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
const HEDEF_VARSAYILAN = 20;
// Çalışma aktivitesi kaydı (quiz/boşluk/kart) → günlük sayaç + seri
function gunKaydet(miktar = 1) {
  const bugun = _gunStr(0);
  if (_ayar.gunTarih !== bugun) {            // günün ilk aktivitesi
    _ayar.seri = (_ayar.sonAktif === _gunStr(-1)) ? (_ayar.seri || 0) + 1 : 1;
    _ayar.sonAktif = bugun;
    _ayar.gunTarih = bugun;
    _ayar.gunSayac = 0;
  }
  _ayar.gunSayac = (_ayar.gunSayac || 0) + miktar;
  _ayar.toplamAktivite = (_ayar.toplamAktivite || 0) + miktar;
  _ayar.enUzunSeri = Math.max(_ayar.enUzunSeri || 0, _ayar.seri || 0);
  if (!_ayar.hedef) _ayar.hedef = HEDEF_VARSAYILAN;
  saveAyar(_ayar);
}

// --- Tema (açık / koyu) ---
function temaUygula() {
  const koyu = _ayar.tema === 'koyu';
  document.documentElement.dataset.tema = koyu ? 'koyu' : 'acik';
  const mt = document.querySelector('meta[name="theme-color"]');
  if (mt) mt.content = koyu ? '#1a1611' : '#f4ecdb';
}
function temaDegistir() { _ayar.tema = _ayar.tema === 'koyu' ? 'acik' : 'koyu'; saveAyar(_ayar); temaUygula(); }

// --- Başarımlar ---
function basarimlar() {
  const s = panoStats();
  const top = _ayar.toplamAktivite || 0;
  const enSeri = _ayar.enUzunSeri || 0;
  const tamTest = Object.values(_istat).filter(x => x.dogru === x.toplam).length;
  return [
    { ikon: '🌱', ad: 'İlk Adım', desc: 'İlk çalışmanı yap', ok: top >= 1 },
    { ikon: '⚡', ad: 'Isınma', desc: '50 aktivite tamamla', ok: top >= 50 },
    { ikon: '🔋', ad: 'Maraton', desc: '200 aktivite tamamla', ok: top >= 200 },
    { ikon: '🔥', ad: '3 Gün Seri', desc: '3 gün üst üste çalış', ok: enSeri >= 3 },
    { ikon: '🏆', ad: 'Haftalık', desc: '7 gün üst üste çalış', ok: enSeri >= 7 },
    { ikon: '👑', ad: 'Azimli', desc: '30 gün üst üste çalış', ok: enSeri >= 30 },
    { ikon: '📓', ad: 'Kelime Avcısı', desc: 'Deftere 25 kelime ekle', ok: s.defter >= 25 },
    { ikon: '🎯', ad: 'Kusursuz', desc: 'Bir testi %100 çöz', ok: tamTest >= 1 },
    { ikon: '🧠', ad: 'Test Ustası', desc: '5 test tamamla', ok: s.cozTest >= 5 },
    { ikon: '✨', ad: 'Tertemiz', desc: 'Tüm yanlışlarını temizle', ok: s.cozTest > 0 && s.yanlis === 0 },
  ];
}
function basarimAc() {
  const b = basarimlar();
  const kazanilan = b.filter(x => x.ok).length;
  const grid = b.map(x => `<div class="basarim ${x.ok ? 'acik' : 'kilit'}">
      <div class="basarim-ikon">${x.ok ? x.ikon : '🔒'}</div>
      <div class="basarim-ad">${esc(x.ad)}</div>
      <div class="basarim-desc">${esc(x.desc)}</div>
    </div>`).join('');
  modalAc('Başarımlar', `<div class="basarim-ozet">${kazanilan} / ${b.length} kazanıldı</div><div class="basarim-grid">${grid}</div>`);
}

// --- Günün kelimesi ---
let _gununHavuz = null;
function _yilGunu() {
  const d = new Date(), bas = new Date(d.getFullYear(), 0, 0);
  return Math.floor((d - bas) / 86400000);
}
async function gununKelimesiYukle() {
  if (_gununHavuz) return _gununHavuz;
  try { _gununHavuz = (await getJSON('data/gunun.json')).kelimeler || []; }
  catch { _gununHavuz = []; }
  return _gununHavuz;
}
function gununKelimesi() {
  if (!_gununHavuz || !_gununHavuz.length) return null;
  return _gununHavuz[_yilGunu() % _gununHavuz.length];
}
function gununAc() {
  const w = gununKelimesi();
  if (!w) return;
  modalAc('Günün Kelimesi', `
    <div class="gunun-modal">
      <div class="gunun-tur">${esc(w.tur || '')}</div>
      <div class="gunun-kelime">${esc(w.en)}</div>
      <div class="gunun-anlam">${esc(w.tr)}</div>
      <div class="kart-ornek-etiket">Örnek · kelimeye dokun, çeviri için kaydır</div>
      ${ornekInteraktifHTML({ tokenlar: w.ornek_tokenlar, tr: w.ornek_tr })}
    </div>`, { onWire: (o) => wireOrnekler(o) });
}

// --- Ana sayfa dashboard (pano) ---
function panoStats() {
  const cozTest = Object.keys(_istat).length;
  let d = 0, t = 0;
  Object.values(_istat).forEach(s => { d += s.dogru; t += s.toplam; });
  const bugun = _gunStr(0), dun = _gunStr(-1);
  const seri = (_ayar.sonAktif === bugun || _ayar.sonAktif === dun) ? (_ayar.seri || 0) : 0;
  const bugunSay = _ayar.gunTarih === bugun ? (_ayar.gunSayac || 0) : 0;
  return {
    cozTest, dogru: d, toplam: t, yuzde: t ? Math.round(d / t * 100) : 0,
    defter: defterKelimeler().length, yanlis: _yanlis.length,
    seri, bugun: bugunSay, hedef: _ayar.hedef || HEDEF_VARSAYILAN
  };
}
function panoHTML() {
  const s = panoStats();
  const r = 34, cevre = 2 * Math.PI * r;
  const oran = Math.min(1, s.hedef ? s.bugun / s.hedef : 0);
  const dolu = cevre * oran, tamam = s.bugun >= s.hedef;
  const seriYazi = s.seri > 0 ? `🔥 ${s.seri} günlük seri` : '🔥 Bugün seriyi başlat';
  return `<div class="pano">
    <div class="pano-ust">
      <div>
        <div class="pano-selam">Çalışma Defteri</div>
        <div class="pano-seri ${s.seri > 0 ? 'aktif' : ''}">${seriYazi}</div>
      </div>
      <div class="pano-ring ${tamam ? 'tamam' : ''}">
        <svg viewBox="0 0 80 80" width="76" height="76">
          <circle class="ring-arka" cx="40" cy="40" r="${r}"/>
          <circle class="ring-on" cx="40" cy="40" r="${r}" stroke-dasharray="${dolu.toFixed(1)} ${cevre.toFixed(1)}" transform="rotate(-90 40 40)"/>
        </svg>
        <div class="pano-ring-yazi">${tamam ? '<b class="ring-tik">✓</b>' : `<b>${s.bugun}</b>`}<span>${tamam ? 'hedef!' : '/' + s.hedef + ' bugün'}</span></div>
      </div>
    </div>
    <div class="pano-stat">
      <div class="pano-cip dur"><b>%${s.yuzde}</b><span>✔ Başarı</span></div>
      <button class="pano-cip" data-git="defter"><b>${s.defter}</b><span>📓 Defter</span></button>
      <button class="pano-cip" data-git="yanlis"><b>${s.yanlis}</b><span>❌ Yanlış</span></button>
      <div class="pano-cip dur"><b>${s.cozTest}</b><span>📝 Test</span></div>
    </div>
  </div>`;
}

// Üst bar aksiyon butonları (bir kez bağla)
menuBtn.onclick = cekmeceAc;
document.getElementById('yardimBtn').onclick = yardimAc;
document.getElementById('ayarBtn').onclick = ayarAc;

temaUygula();
girisEkrani(false);
anaSayfa();

// Geliştirme sırasında: eski service worker'ı kaldır ve önbelleği temizle
// (içerik sık değiştiği için her zaman güncel görünsün). Uygulama oturunca tekrar açılır.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(rs => rs.forEach(r => r.unregister())).catch(() => {});
}
if (window.caches) { caches.keys().then(ks => ks.forEach(k => caches.delete(k))).catch(() => {}); }
