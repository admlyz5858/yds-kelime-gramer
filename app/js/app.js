// app/js/app.js — Kelimetre v2: beş sekme (Bugün · Kelimeler · Müfredat · Oyun · Ben)
import { toggleDone, isDone, scoreQuiz, shuffle, isoGun, gunStr } from './logic.js';
import { loadProgress, saveProgress, loadIstat, saveIstat, loadYanlis, saveYanlis, loadAyar, saveAyar } from './storage.js';
import { srs, srsKaydet, defter, defterKaydet, defterdeMi, defterToggle, defterEkle, defterKelimeler, pekisenSayisi, eskiKayitlariTasi } from './durum.js';
import { kurKelimeOgren } from './ogren.js';
import { kurKelimeAkisi } from './akis.js';
import { kurEslestirme } from './eslestir.js';
import { kurSozluk, UNITE_ADI } from './sozluk.js';
import { kurAlistirma } from './alistirma.js';
import { titre, ses, konfeti, paylas, efektAyarla, seslendir } from './efekt.js';
import { bildirimVarMi, gunlukKur, iptalEt } from './bildirim.js';

const SURUM = '1.3.0';
const icerik = document.getElementById('icerik');
const baslikEl = document.getElementById('baslik');
const geriBtn = document.getElementById('geri');
const sekmeBar = document.getElementById('sekme-bar');

let manifest = null;
let aktifDers = null;
let progress = loadProgress();
let _istat = loadIstat();      // test istatistikleri (kalıcı, tüm üniteler)
let _yanlis = loadYanlis();    // Yanlışlarım listesi (kalıcı, tüm üniteler)
let _ayar = loadAyar();        // uygulama ayarları / bayraklar
const testKey = (id, ti) => `${id}#${ti}`;
const soruKey = (q) => (q.soru || '').trim().toLowerCase();
let _acikBolum = null;   // Oku ekranında açık olan bölüm indeksi (null = başlık listesi)

async function getJSON(url) { const r = await fetch(url); if (!r.ok) throw new Error(url); return r.json(); }

// Kelime havuzu (tüm üniteler) — bir kez yüklenir; sözlük / öğren / akış / oyun paylaşır
let _havuz = null;
async function havuzYukle() {
  if (!_havuz) _havuz = (await getJSON('data/kelime-havuz.json')).kelimeler || [];
  return _havuz;
}
async function manifestYukle() {
  if (!manifest) manifest = await getJSON('data/manifest.json');
  return manifest;
}
const dersKisaAd = (id) => UNITE_ADI[id] || (manifest?.dersler.find(d => d.id === Number(id))?.baslik || '').replace(/^Ünite\s*\d+\s*[—-]\s*/i, '');

// ============================================================
// Sekme yönlendirici
// ============================================================
const SEKME_BASLIK = { bugun: 'Kelimetre', kelimeler: 'Kelimeler', mufredat: 'Müfredat', oyun: 'Oyun', ben: 'Ben' };
let aktifSekme = 'bugun';
let kelimelerSegment = 'liste';

// Sekme kökü görünümü: alt bar görünür, üst "Geri" yok
function sekmeKokChrome(sekme) {
  aktifDers = null;
  geriBtn.hidden = true; geriBtn.onclick = null;
  sekmeBar.hidden = false;
  sekmeBar.querySelectorAll('button').forEach(b => b.classList.toggle('aktif', b.dataset.sekme === sekme));
  baslikEl.textContent = SEKME_BASLIK[sekme] || 'Kelimetre';
  document.body.dataset.sekme = sekme;
}
function sekmeAc(sekme, opts = {}) {
  kelimeAkisi.temizle(); eslestirme.temizle();
  aktifSekme = sekme;
  sekmeKokChrome(sekme);
  if (sekme === 'kelimeler') return kelimelerAc(opts.segment, opts);
  if (sekme === 'mufredat') return mufredatAc();
  if (sekme === 'oyun') return eslestirme.ac(Object.assign({ ustHTML: () => ipucuHTML('oyun') }, opts));
  if (sekme === 'ben') return benAc();
  return anaSayfa();
}
const yenile = () => sekmeAc(aktifSekme);
// Alt ekran: üst "Geri" + başlık, alt bar gizli
function altEkran(baslik, geriFn) {
  geriBtn.hidden = false; geriBtn.onclick = geriFn; sekmeBar.hidden = true;
  baslikEl.textContent = baslik;
}
// Modüllerin "ana sayfa"sı: açıldıkları sekmeye dönerler. ev = modülün kendi sekmesi;
// o sekmedeyken paneli sekme kökü olarak (alt barla) gösteririz.
function kokFn(ev) { const f = () => sekmeAc(aktifSekme); f.ev = ev; return f; }
const kokKelimeler = kokFn('kelimeler'), kokOyun = kokFn('oyun');
function ekranModu(baslik, geriFn) {
  aktifDers = null;
  if (geriFn && geriFn.ev && geriFn.ev === aktifSekme) { sekmeKokChrome(aktifSekme); return; }
  altEkran(baslik, geriFn);
}
function render(html) { icerik.innerHTML = html; window.scrollTo(0, 0); }
function esc(s) { return String(s ?? '').replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m])); }

// Her sekmede ilk açılışta tek satırlık ipucu (kapatınca bir daha görünmez)
const IPUCU = {
  bugun: '🏠 Bugünün planı burada: tekrarlar, günün eşleştirmesi ve kaldığın ünite.',
  kelimeler: '📖 S1 → S5 çiplerle seviyeyi, türle kelime türünü süz; bir kelimeye dokununca detay açılır.',
  mufredat: '🎓 Her ünitede Oku → Alıştırma → Test sırası önerilir; halka ilerlemeni gösterir.',
  oyun: '🧩 Sezonlar sırayla açılır; günün eşleştirmesi herkese aynı 10 kelimedir.',
  ben: '👤 Tema, günlük hedef ve hatırlatma ayarları aşağıda; ilerlemeni paylaşabilirsin.',
};
function ipucuHTML(sekme) {
  const g = _ayar.ipucuGoruldu || {};
  if (g[sekme] || !IPUCU[sekme]) return '';
  return `<div class="ipucu" data-sekme="${sekme}"><span>${IPUCU[sekme]}</span><button class="ipucu-kapat" aria-label="Kapat">✕</button></div>`;
}
icerik.addEventListener('click', (e) => {
  const b = e.target.closest('.ipucu-kapat'); if (!b) return;
  const k = b.closest('.ipucu'); _ayar.ipucuGoruldu = Object.assign(_ayar.ipucuGoruldu || {}, { [k.dataset.sekme]: true }); saveAyar(_ayar);
  k.remove();
});

// Segment (sekme içi alt bölümler) — tıklamalar icerik üstünde delege edilir
function segmentHTML(alan, secenekler, aktif) {
  return `<div class="segment" data-alan="${alan}">${secenekler.map(([id, ad]) =>
    `<button data-seg="${id}" class="${id === aktif ? 'aktif' : ''}">${ad}</button>`).join('')}</div>`;
}
icerik.addEventListener('click', (e) => {
  const b = e.target.closest('.segment button[data-seg]');
  if (!b) return;
  const alan = b.closest('.segment').dataset.alan;
  if (alan === 'kelimeler') kelimelerAc(b.dataset.seg);
  else if (alan === 'unite' && aktifDers) ekranGoster(b.dataset.seg);
});

// ============================================================
// Modüller
// ============================================================
const kelimeOgren = kurKelimeOgren({
  render, esc, ornekHTML: ornekInteraktifHTML, wireOrnekler, gunKaydet, anaSayfa: kokKelimeler, ekranModu,
  havuzYukle, defterdeMi, defterToggle,
});
const kelimeAkisi = kurKelimeAkisi({
  render, esc, ornekHTML: ornekInteraktifHTML, wireOrnekler, gunKaydet, anaSayfa: kokKelimeler, ekranModu,
  seslendir, paylas, titre, havuzYukle,
});
const eslestirme = kurEslestirme({
  render, esc, gunKaydet, anaSayfa: kokOyun, ekranModu, paylas, titre, ses, konfeti, toast,
  havuzYukle, defterdeMi, defterToggle,
});
const sozluk = kurSozluk({
  render, esc, ornekHTML: ornekInteraktifHTML, wireOrnekler, havuzYukle, seslendir, titre, toast, altEkran,
  calis: (words) => { kelimeOgren.ustAyarla(() => ipucuHTML('kelimeler') + kelimelerSegmentHTML('ogren')); kelimeOgren.calis(words); },
  akisBaslat: (words, baslik) => kelimeAkisi.ac({ kelimeler: words, baslik: baslik || 'Kelime Akışı' }),
});
const alistirma = kurAlistirma({ render, esc, ornekHTML: ornekInteraktifHTML, wireOrnekler, gunKaydet, ses, titre, konfeti });

// Örnek cümledeki bir kelimeyi (o cümleyi örnek alarak) deftere ekle
function ogrenEkle(el) {
  const kutu = el.closest('.ornek-kutu');
  const spans = kutu ? [...kutu.querySelectorAll('.ornek-cumle .tok')] : [el];
  const toks = spans.map(s => { const o = { k: s.dataset.k != null ? s.dataset.k : s.textContent }; if (s.dataset.a) o.a = s.dataset.a; if (s.dataset.en) o.en = s.dataset.en; return o; });
  const idx = spans.indexOf(el); if (idx >= 0) toks[idx].vurgu = true;
  const word = (el.dataset.k || '').replace(/[.,!?;:"'’]+$/g, '');
  const tr = kutu ? (kutu.querySelector('.ornek-ceviri')?.textContent || '') : '';
  const havuzW = (_havuz || []).find(w => w.en.toLowerCase() === word.toLowerCase());
  defterEkle(havuzW || { en: word, tur: '', tr: el.dataset.a || '', ornek_tokenlar: toks, ornek_tr: tr });
}

// ============================================================
// BUGÜN
// ============================================================
let _tasindi = false;
async function anaSayfa() {
  sekmeKokChrome('bugun');
  await manifestYukle();
  await gununKelimesiYukle();
  const havuz = await havuzYukle().catch(() => []);
  if (!_tasindi) { _tasindi = true; try { eskiKayitlariTasi(havuz); } catch (_) {} }
  const oz = await kelimeOgren.ozet().catch(() => null);
  const es = eslestirme.ozet();
  const son = _ayar.sonDers;
  bildirimYenile(oz);
  const yarim = kelimeOgren.devamBilgi();
  const tekrarBitti = !yarim && oz && (oz.due + oz.yeni) === 0;
  const tekrarMetin = yarim ? `Yarım kalan oturum · ${yarim.i}/${yarim.n} tamamlandı` : !oz ? 'Aralıklı tekrar' : tekrarBitti ? 'Bugünlük tamam — istersen yine çalış' : `${oz.due} tekrar · ${oz.yeni} yeni kelime`;
  const sonAd = son ? dersKisaAd(son.id) : '';
  render(`
    ${ipucuHTML('bugun')}
    ${panoHTML()}
    <div class="ana-satir">${sinavKartHTML()}${gununKartHTML()}</div>
    <div class="plan-baslik">Bugünün planı</div>
    <button class="plan-kart ${tekrarBitti ? 'bitti' : ''}" id="pOgren">
      <span class="plan-ikon">🌱</span><span class="plan-ic"><b>Kelime tekrarı</b><i>${esc(tekrarMetin)}</i></span><span class="plan-durum">${tekrarBitti ? '✓' : '›'}</span>
    </button>
    <button class="plan-kart ${es.gunlukOynandi ? 'bitti' : ''}" id="pGunluk">
      <span class="plan-ikon">🧩</span><span class="plan-ic"><b>Günün eşleştirmesi</b><i>${es.gunlukOynandi ? 'Çözüldü — yarın yenisi gelir' : 'Herkese aynı 10 kelime · 60 sn · günde bir hak'}</i></span><span class="plan-durum">${es.gunlukOynandi ? '✓' : '›'}</span>
    </button>
    <button class="plan-kart" id="pDers">
      <span class="plan-ikon">🎓</span><span class="plan-ic"><b>${son ? 'Müfredata devam' : 'Müfredata başla'}</b><i>${son ? esc(sonAd) + ' · kaldığın yerden' : 'Edatlar, zamanlar, modallar…'}</i></span><span class="plan-durum">›</span>
    </button>
    <button class="plan-kart kucuk" id="pAkis">
      <span class="plan-ikon">🎬</span><span class="plan-ic"><b>Kelime Akışı</b><i>Yukarı kaydır, dinle, kaydet</i></span><span class="plan-durum">›</span>
    </button>
  `);
  icerik.querySelectorAll('[data-git]').forEach(c => c.onclick = () => {
    const g = c.dataset.git;
    if (g === 'defter') sekmeAc('kelimeler', { segment: 'defter' });
    else if (g === 'yanlis') yanlisAc();
    else if (g === 'ogrenilen') sekmeAc('kelimeler', { segment: 'liste', filtre: { durum: 'pekisti' } });
    else if (g === 'ilerleme') sekmeAc('ben');
  });
  const sk = document.getElementById('sinavKartBtn');
  if (sk) sk.onclick = sinavAyarAc;
  document.getElementById('pOgren').onclick = () => yarim ? kelimeOgren.devamEt() : kelimeOgren.ac();
  document.getElementById('pGunluk').onclick = () => eslestirme.ac({ gunluk: true });
  document.getElementById('pDers').onclick = () => son ? dersAc(son.dosya, son.id) : sekmeAc('mufredat');
  document.getElementById('pAkis').onclick = () => kelimeAkisi.ac({ baslik: 'Kelime Akışı' });
  const gb = document.getElementById('gununBtn');
  if (gb) gb.onclick = gununAc;
}

function gununKartHTML() {
  const w = gununKelimesi();
  if (!w) return '';
  return `<button class="mini-kart gunun" id="gununBtn"><small>Günün kelimesi</small><b>${esc(w.en)}</b><i>${esc(w.tr)}</i></button>`;
}

// ============================================================
// KELİMELER (Liste · Öğren · Defterim)
// ============================================================
const KELIME_SEGMENTLER = [['liste', '📖 Liste'], ['ogren', '🌱 Öğren'], ['defter', '📓 Defterim']];
const kelimelerSegmentHTML = (seg) => segmentHTML('kelimeler', KELIME_SEGMENTLER, seg);
function kelimelerAc(segment, opts = {}) {
  kelimelerSegment = segment || kelimelerSegment || 'liste';
  const seg = kelimelerSegment;
  const ust = () => ipucuHTML('kelimeler') + kelimelerSegmentHTML(seg);
  const geri = () => sekmeKokChrome('kelimeler');
  if (kelimelerSegment === 'ogren') return kelimeOgren.ac({ ustHTML: ust });
  if (kelimelerSegment === 'defter') return sozluk.ac({ ustHTML: ust, filtre: { durum: 'defter' }, geri });
  return sozluk.ac({ ustHTML: ust, filtre: opts.filtre || {}, geri });
}

// ============================================================
// MÜFREDAT
// ============================================================
const GRUPLAR = [
  { ad: 'Zamanlar', ikon: '⏱️', ids: [3, 4, 5, 6] },
  { ad: 'Modallar', ikon: '🎛️', ids: [7, 8] },
  { ad: 'Fiil yapıları', ikon: '🧬', ids: [9, 10] },
  { ad: 'Cümle yapıları', ikon: '🧱', ids: [11, 12, 13] },
  { ad: 'Bağlayıcılar', ikon: '🔗', ids: [2, 14] },
];
function uniteTestSayisi(id) { return Object.keys(_istat).filter(k => k.startsWith(id + '#')).length; }
// Ünite ilerlemesi 0–1: testler %50, "çalışıldı" %30, alıştırma (20 soru) %20
function uniteOrani(d, tS, al, bitti) {
  const test = d.test_sayisi ? Math.min(1, tS / d.test_sayisi) : (tS ? 1 : 0);
  const alis = al ? Math.min(1, (al.yapilan || 0) / 20) : 0;
  return Math.min(1, 0.5 * test + 0.3 * (bitti ? 1 : 0) + 0.2 * alis);
}
function halkaHTML(oran, etiket) {
  const r = 16, c = 2 * Math.PI * r, tam = oran >= 0.999;
  return `<span class="mf-halka ${tam ? 'tam' : ''} ${oran > 0 ? 'var' : ''}"><svg viewBox="0 0 40 40"><circle class="arka" cx="20" cy="20" r="${r}"/><circle class="on" cx="20" cy="20" r="${r}" stroke-dasharray="${(c * oran).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 20 20)"/></svg><b>${tam ? '✓' : etiket}</b></span>`;
}
async function mufredatAc() {
  await manifestYukle();
  const dersler = manifest.dersler.filter(d => d.id !== 1);
  const calisilan = dersler.filter(d => isDone(progress, d.id)).length;
  const cozTest = Object.keys(_istat).length;
  const son = _ayar.sonDers;
  const grup = GRUPLAR.map(g => {
    const dersListe = g.ids.map(id => manifest.dersler.find(d => d.id === id)).filter(Boolean);
    let grupOran = 0;
    const kartlar = dersListe.map(d => {
      const tS = uniteTestSayisi(d.id), al = alistirma.ozet(d.id), bitti = isDone(progress, d.id);
      const oran = uniteOrani(d, tS, al, bitti); grupOran += oran;
      const rozetler = [
        bitti ? '<span class="mf-rozet ok">✓ çalışıldı</span>' : '',
        tS ? `<span class="mf-rozet">🧠 ${tS}/${d.test_sayisi || tS} test</span>` : '',
        al && al.yapilan ? `<span class="mf-rozet">✍️ %${Math.round(al.dogru / al.yapilan * 100)}</span>` : '',
      ].filter(Boolean).join('');
      return `<button class="mf-kart ${son && son.id === d.id ? 'son' : ''}" data-id="${d.id}" data-dosya="${d.dosya}">
        ${halkaHTML(oran, d.id)}
        <span class="mf-ic"><span class="mf-bas">${esc(dersKisaAd(d.id))}</span>
          <span class="mf-alt">${d.bolum_sayisi || 0} bölüm${rozetler ? ' · ' : ''}${rozetler}${!rozetler && !tS ? ' · henüz başlanmadı' : ''}</span></span>
        <span class="ok">›</span>
      </button>`;
    }).join('');
    const gOran = Math.round(grupOran / dersListe.length * 100);
    return `<div class="mf-grup"><div class="mf-grup-bas">${g.ikon} ${g.ad}<span class="mf-grup-oran ${gOran >= 100 ? 'tam' : ''}">${gOran >= 100 ? '✓ tamam' : '%' + gOran}</span></div>${kartlar}</div>`;
  }).join('');
  render(`
    ${ipucuHTML('mufredat')}
    <div class="mf-ozet">
      <div><b>${calisilan}/${dersler.length}</b><span>ünite çalışıldı</span></div>
      <div><b>${cozTest}</b><span>test çözüldü</span></div>
      <button class="mf-ozet-btn" id="mfYanlis"><b>${_yanlis.length}</b><span>❌ yanlış soru</span></button>
    </div>
    ${son ? `<button class="hizli-devam" id="devamBtn"><div><div class="hizli-devam-ust">▶ Kaldığın yerden devam et</div><div class="hizli-devam-bas">${esc(dersKisaAd(son.id))}</div></div><span class="ok">›</span></button>` : ''}
    ${grup}
    <button class="mf-kelime-link" id="mfKelimeler"><span>📖</span><span><b>Tüm kelimeler tek yerde</b><i>2.300+ kelime · seviye ve türe göre</i></span><span class="ok">›</span></button>
  `);
  icerik.querySelectorAll('.mf-kart').forEach(b => b.onclick = () => dersAc(b.dataset.dosya, Number(b.dataset.id)));
  document.getElementById('mfYanlis').onclick = yanlisAc;
  document.getElementById('mfKelimeler').onclick = () => sekmeAc('kelimeler', { segment: 'liste' });
  const db = document.getElementById('devamBtn');
  if (db) db.onclick = () => dersAc(son.dosya, son.id);
}

// ---------- Ünite ekranı: Oku · Alıştırma · Test · Çeviri ----------
async function dersAc(dosya, id, ekran) {
  await manifestYukle();
  try {
    aktifDers = await getJSON('data/' + dosya);
  } catch (e) {
    modalAc('İçerik yok', `<p class="modal-aciklama">Bu ünitenin içeriği bu sürümde bulunmuyor.</p>`);
    return;
  }
  aktifDers._id = id;
  aktifDers.kisaAd = dersKisaAd(id);
  _ayar.sonDers = { dosya, id, baslik: aktifDers.baslik }; saveAyar(_ayar);
  ekranGoster(ekran || 'oku');
}
const ciftSayisi = (d) => (d.bolumler || []).reduce((s, b) => s + (b.ciftler?.length || 0), 0);
function uniteSegmentler() {
  const s = [['oku', '📖 Oku'], ['alistirma', '✍️ Alıştırma'], ['test', '🧠 Test']];
  if (ciftSayisi(aktifDers) >= 20) s.push(['ceviri', '🔁 Çeviri']);
  return s;
}
const uniteUstHTML = (ekran) => segmentHTML('unite', uniteSegmentler(), ekran);
function ekranGoster(ekran) {
  kelimeAkisi.temizle();
  const d = aktifDers;
  _acikBolum = null;
  altEkran(d.kisaAd, () => sekmeAc('mufredat'));
  if (ekran === 'alistirma') return alistirma.ac(d, { ustHTML: uniteUstHTML('alistirma') });
  if (ekran === 'test') return ekranQuiz();
  if (ekran === 'ceviri') return ekranCeviri();
  return ekranOku();
}

// Oku: bölüm başlıkları listesi → bölüm detayı
function ekranOku() {
  const d = aktifDers;
  if (Array.isArray(d.bolumler) && d.bolumler.length) {
    return _acikBolum == null ? bolumListesi(d) : bolumDetay(d, _acikBolum);
  }
  const html = (d.cumleler || []).map(c => `
    <div class="cumle"><div class="en">${esc(c.en)}</div><div class="tr">${esc(c.tr)}</div>${c.not ? `<div class="not">${esc(c.not)}</div>` : ''}</div>`).join('');
  render(uniteUstHTML('oku') + `<div class="cumle"><div class="tr">${esc(d.konu_ozeti || '')}</div></div>` + html + tamamBtnHTML(d));
  tamamBagla(d, ekranOku);
}
function tamamBtnHTML(d) {
  return `<div class="btn-satir"><button class="aksiyon ${isDone(progress, d._id) ? 'ikincil' : ''}" id="tamamla">${isDone(progress, d._id) ? '✓ Çalışıldı (geri al)' : '✓ Çalışıldı işaretle'}</button></div>`;
}
function tamamBagla(d, yeniden) {
  const t = document.getElementById('tamamla');
  if (t) t.onclick = () => { progress = toggleDone(progress, d._id); saveProgress(progress); if (isDone(progress, d._id)) { titre('basari'); toast('✓ Ünite çalışıldı olarak işaretlendi'); } yeniden(); };
}
function bolumListesi(d) {
  const kelimeSay = manifest?.dersler.find(x => x.id === d._id)?.kelime_sayisi || 0;
  const ust = `<div class="cumle"><div class="tr">${esc(d.konu_ozeti || '')}</div></div>`;
  const kelimeLink = kelimeSay ? `<button class="unite-kelime-link" id="uniteKelimeler"><span>📖</span><span><b>Bu ünitenin kelimeleri</b><i>${kelimeSay} kelime · sözlükte filtreli</i></span><span class="ok">›</span></button>` : '';
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
  render(uniteUstHTML('oku') + ust + kelimeLink + liste + tamamBtnHTML(d));
  icerik.querySelectorAll('.bolum-link').forEach(el =>
    el.onclick = () => { _acikBolum = Number(el.dataset.i); ekranOku(); });
  const uk = document.getElementById('uniteKelimeler');
  if (uk) uk.onclick = () => sekmeAc('kelimeler', { segment: 'liste', filtre: { unite: d._id } });
  tamamBagla(d, ekranOku);
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
function kuralEtiket(o) {
  const k = (o.kural || '').trim();
  const m = k.match(/\(([^)]+)\)/);
  if (m) return m[1].trim();
  const a = (o.anlam || '').replace(/^[.\s]+/, '').split(/[,/]/)[0].trim();
  if (a) return a.length > 20 ? a.slice(0, 18) + '…' : a;
  return k || '•';
}
function edatBolumHTML(b) {
  const ogeler = b.ogeler || [];
  const toplamOrnek = ogeler.reduce((s, o) => s + (o.ornekler?.length || 0), 0);
  let h = bolumHero(b.baslik, `${ogeler.length} kullanım · ${toplamOrnek} örnek`, { ust: b.ust || 'EDAT' });
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
function bolumDetay(d, i) {
  const b = d.bolumler[i];
  const onceki = i > 0, sonraki = i + 1 < d.bolumler.length;
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
  html += `<div class="btn-satir bolum-gez">
    ${onceki ? `<button class="aksiyon ikincil" id="bolumOnceki">‹ ${esc(d.bolumler[i - 1].baslik)}</button>` : ''}
    ${sonraki ? `<button class="aksiyon" id="bolumSonraki">${esc(d.bolumler[i + 1].baslik)} ›</button>` : `<button class="aksiyon" id="bolumAlistirma">✍️ Alıştırmaya geç</button>`}
  </div>`;
  render(html);
  document.getElementById('bolumGeri').onclick = () => { _acikBolum = null; ekranOku(); };
  const bo = document.getElementById('bolumOnceki'); if (bo) bo.onclick = () => { _acikBolum = i - 1; ekranOku(); };
  const bs = document.getElementById('bolumSonraki'); if (bs) bs.onclick = () => { _acikBolum = i + 1; ekranOku(); };
  const ba = document.getElementById('bolumAlistirma'); if (ba) ba.onclick = () => ekranGoster('alistirma');
  wireOrnekler(icerik);
  icerik.querySelectorAll('.edat-cip').forEach(c => c.onclick = () => {
    const el = document.getElementById(c.dataset.hedef);
    if (!el) return;
    icerik.querySelectorAll('.edat-cip').forEach(x => x.classList.remove('aktif'));
    c.classList.add('aktif');
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.remove('vurgula'); void el.offsetWidth; el.classList.add('vurgula');
  });
}

// Çeviri: ünitenin tüm EN↔TR öbek/cümle çiftleri (bölüm bölüm)
function ekranCeviri() {
  const d = aktifDers;
  let n = 0;
  const bolumler = (d.bolumler || []).filter(b => b.ciftler?.length).map(b => {
    n += b.ciftler.length;
    return `<div class="cv-bolum">${esc(b.baslik)} <span>${b.ciftler.length}</span></div>` + b.ciftler.map(ornekInteraktifHTML).join('');
  }).join('');
  render(uniteUstHTML('ceviri') + `<div class="cumle"><div class="tr">${n} çeviri çifti · İngilizcesini oku, çevirisi için cümleye dokun ya da sağa kaydır. Kelimeye dokununca anlam + 🔊.</div></div>` + bolumler);
  wireOrnekler(icerik);
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
    h += `<div class="sema-kademe-baslik">${esc(s.kademeBaslik || 'Öbek nasıl uzar?')}</div>`;
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
          `<span class="balon-btnler"><button class="balon-ses" aria-label="Seslendir">🔊</button>` +
          `<button class="balon-ogren"${eklenmis ? ' disabled' : ''}>${eklenmis ? '✓ Defterde' : '📓 Öğren'}</button></span>`;
        el.appendChild(b); el.classList.add('acik');
        b.querySelector('.balon-ses').onclick = (ev) => { ev.stopPropagation(); seslendir(enText); titre('hafif'); };
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
    cumle.addEventListener('click', (e) => {
      if (e.target.closest('.tok-anlamli') || kaydirildi) return;
      ceviri.style.transition = 'all .25s ease';
      ceviri.classList.contains('gorunur') ? kapatC() : ac();
    });
  });
}

// ============================================================
// TEST (ünite testleri) · Yanlışlarım
// ============================================================
let _quizCevap = [], _quizIdx = 0, _quizSorular = [], _aktifTest = null, _yanlisMod = false;
function quizTestleri() {
  const d = aktifDers;
  if (Array.isArray(d.testler) && d.testler.length) return d.testler;
  if (Array.isArray(d.quiz) && d.quiz.length) return [{ ad: 'Test', sorular: d.quiz }];
  return [];
}
// Testin konu etiketi: kısa cevaplardan en sık 3'ü (at · in · on) ya da soru biçimi
function testEtiket(t) {
  const say = {};
  for (const q of t.sorular || []) { const c = String(q.cevap || '').trim(); if (c && !/\s/.test(c) && c.length <= 14) say[c] = (say[c] || 0) + 1; }
  const top = Object.entries(say).sort((a, b) => b[1] - a[1]).slice(0, 3).map(x => x[0]);
  if (top.length >= 2 && Object.keys(say).length <= 14) return top.join(' · ');
  const n = (t.sorular || []).length, bosluk = (t.sorular || []).filter(q => /_{2,}/.test(q.soru)).length, ceviri = (t.sorular || []).filter(q => /çeviri/i.test(q.soru)).length;
  if (ceviri > n / 2) return 'çeviri';
  if (bosluk > n / 2) return 'boşluk doldurma';
  return 'karma';
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
  if (!testler.length) { render(uniteUstHTML('test') + '<div class="cumle"><div class="tr">Bu ünitede test yok.</div></div>'); return; }
  const id = aktifDers._id;
  let topD = 0, topT = 0, bitenSayi = 0;
  const siradaki = testler.findIndex((t, i) => !_istat[testKey(id, i)]);
  const liste = testler.map((t, i) => {
    const st = _istat[testKey(id, i)];
    if (st) { topD += st.dogru; topT += st.toplam; bitenSayi++; }
    const durum = st
      ? `<span class="test-skor ${st.dogru === st.toplam ? 'tam' : ''}">✓ ${st.dogru}/${st.toplam}</span>`
      : (i === siradaki ? '<span class="siradaki-rozet">Sıradaki</span>' : '');
    return `<div class="test-link${st ? ' biten' : ''}${i === siradaki ? ' siradaki' : ''}" data-i="${i}">
      <div><div class="baslik">${esc(t.ad || ('Test ' + (i + 1)))}</div><div class="alt-bilgi">${(t.sorular || []).length} soru · <span class="test-konu">${esc(testEtiket(t))}</span></div></div>
      ${durum}${zorlukRozet(i, testler.length)}<span class="ok">›</span>
    </div>`;
  }).join('');
  const ozet = bitenSayi
    ? `<div class="quiz-ozet">Çözülen: ${bitenSayi}/${testler.length} test · Toplam doğru: ${topD}/${topT} (%${Math.round(topD / topT * 100)})</div>`
    : '';
  render(uniteUstHTML('test') + `<div class="cumle"><div class="tr">Testler kolaydan zora sıralı; hepsi açık, sıradaki vurgulu. Yanlışların “Yanlışlarım”da birikir.</div></div>${ozet}${liste}`);
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
  const testler = _yanlisMod ? [] : quizTestleri();
  const cevaplandi = _quizCevap[i] != null;
  const dogruMu = cevaplandi && _quizCevap[i] === soru.cevap;
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
  const ust = _yanlisMod
    ? `<div class="kart-sayac">Yanlışlarım · Soru ${i + 1} / ${q.length}</div>`
    : `<button class="aksiyon ikincil" id="qGeri" style="margin-bottom:12px">‹ Testler</button>
       <div class="kart-sayac">${esc(testler[_aktifTest]?.ad || 'Test')} · Soru ${i + 1} / ${q.length}</div>`;
  const ilerleme = `<div class="kart-ilerleme"><div class="kart-ilerleme-ic" style="width:${Math.round((cevaplandi ? i + 1 : i) / q.length * 100)}%"></div></div>`;
  const etiket = /_{2,}/.test(soru.soru) ? 'Boşluğa uygun ifadeyi seç' : 'Doğru cevabı seç';
  const soruKart = `<div class="soru-kart">
      <div class="soru-etiket">${etiket}</div>
      <div class="soru-cumle">${soruGovde}</div>
    </div>`;
  render(`${ust}${ilerleme}${soruKart}<div class="q-secenekler">${sec}</div>${alt}`);
  const gb = document.getElementById('qGeri');
  if (gb) gb.onclick = () => ekranQuiz();
  if (!cevaplandi) {
    icerik.querySelectorAll('.q-secenek').forEach(b => b.onclick = () => {
      _quizCevap[i] = b.dataset.o;
      const dogruMu2 = b.dataset.o === soru.cevap;
      geriBildirim(dogruMu2);
      gunKaydet(1, { dogru: dogruMu2 });
      cizQuiz();
    });
  } else {
    if (soru.ornek) wireOrnekler(icerik);
    const ns = document.getElementById('qSonraki');
    if (ns) ns.onclick = () => { if (i + 1 < q.length) { _quizIdx++; cizQuiz(); } else cizQuizSonuc(); };
  }
}
function geriBildirim(dogruMu) {
  if (dogruMu) { ses('dogru'); titre('hafif'); } else { ses('yanlis'); titre('hata'); }
}
function cizQuizSonuc() {
  if (_yanlisMod) return yanlisSonuc();
  gunKaydet(0, { bitir: true });
  const r = scoreQuiz(_quizSorular, _quizCevap);
  const testler = quizTestleri();
  const sonrakiVar = _aktifTest != null && _aktifTest + 1 < testler.length;
  const yuzde = Math.round((r.dogru / r.toplam) * 100);
  const k = testKey(aktifDers._id, _aktifTest);
  const onceki = _istat[k];
  if (!onceki || r.dogru > onceki.dogru) { _istat[k] = { dogru: r.dogru, toplam: r.toplam, tamam: true }; saveIstat(_istat); }
  const mevcut = new Set(_yanlis.map(y => y.key));
  let eklenen = 0;
  _quizSorular.forEach((q, idx) => {
    if (_quizCevap[idx] !== q.cevap) {
      const sk = soruKey(q);
      if (!mevcut.has(sk)) { _yanlis.push({ key: sk, soru: q, unite: aktifDers.baslik || '' }); mevcut.add(sk); eklenen++; }
    }
  });
  if (eklenen) saveYanlis(_yanlis);
  if (yuzde >= 80) { ses('kutlama'); konfeti(); }
  render(`<div class="es-sonuc"><div class="es-sonuc-amblem">${yuzde >= 80 ? '🌟' : yuzde >= 50 ? '👏' : '💪'}</div>
      <div class="es-sonuc-bas">${esc(testler[_aktifTest]?.ad || 'Test')}</div>
      <div class="es-sonuc-skor">${r.dogru} / ${r.toplam}</div><div class="es-sonuc-alt">%${yuzde} doğru</div>
      ${eklenen ? `<div class="es-sonuc-not">❌ ${eklenen} yanlış soru “Yanlışlarım”a eklendi</div>` : '<div class="es-sonuc-not">Hiç yanlış yok 👏</div>'}</div>
    <div class="btn-satir">
      ${sonrakiVar ? '<button class="aksiyon" id="qSonrakiTest">Sonraki test ›</button>' : ''}
      <button class="aksiyon ${sonrakiVar ? 'ikincil' : ''}" id="qTekrar">Tekrar çöz</button>
      <button class="aksiyon ikincil" id="qListe">Testler</button>
    </div>`);
  document.getElementById('qTekrar').onclick = () => baslatTest(_aktifTest);
  const st = document.getElementById('qSonrakiTest');
  if (st) st.onclick = () => baslatTest(_aktifTest + 1);
  document.getElementById('qListe').onclick = () => ekranQuiz();
}

// Yanlışlarım — tüm ünitelerden biriken yanlış sorular; doğru yapınca silinir
function yanlisAc() {
  _yanlis = loadYanlis();
  const kaynak = aktifSekme;
  aktifDers = { _id: 'yanlis', baslik: 'Yanlışlarım' };
  altEkran('Yanlışlarım', () => sekmeAc(kaynak));
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
  const dogruKeys = new Set();
  _quizSorular.forEach((q, idx) => { if (_quizCevap[idx] === q.cevap) dogruKeys.add(soruKey(q)); });
  let cozulen = 0;
  _yanlis = _yanlis.filter(y => { if (dogruKeys.has(y.key)) { cozulen++; return false; } return true; });
  saveYanlis(_yanlis);
  render(`<div class="es-sonuc"><div class="es-sonuc-amblem">${_yanlis.length ? '💪' : '✨'}</div><div class="es-sonuc-bas">Yanlışlarım</div>
      <div class="es-sonuc-skor">${r.dogru} / ${r.toplam}</div>
      <div class="es-sonuc-alt">✅ ${cozulen} soru listeden silindi · Kalan: ${_yanlis.length}</div></div>
    <div class="btn-satir">
      ${_yanlis.length ? '<button class="aksiyon" id="yTekrar">Kalanları çöz</button>' : ''}
      <button class="aksiyon ikincil" id="yEv">Bitir</button>
    </div>`);
  const yt = document.getElementById('yTekrar');
  if (yt) yt.onclick = () => yanlisAc();
  document.getElementById('yEv').onclick = () => yenile();
}

// ============================================================
// Modal · Giriş · Yardım
// ============================================================
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

// 3 adımlı karşılama: tanıtım → günlük hedef → sınav tarihi
function girisEkrani(zorla) {
  if (!zorla && _ayar.girisGoruldu) return false;
  const o = document.createElement('div');
  o.className = 'giris-katman';
  document.body.appendChild(o);
  requestAnimationFrame(() => o.classList.add('acik'));
  let adim = 0, hedef = _ayar.hedef || HEDEF_VARSAYILAN, tarih = _ayar.sinavTarih || '';
  const noktalar = () => `<div class="giris-noktalar">${[0, 1, 2].map(i => `<span class="${i === adim ? 'aktif' : ''}"></span>`).join('')}</div>`;
  const kapat = () => {
    _ayar.girisGoruldu = true; _ayar.hedef = hedef;
    if (tarih) _ayar.sinavTarih = tarih;
    saveAyar(_ayar);
    o.classList.remove('acik'); setTimeout(() => o.remove(), 420);
    yenile();
  };
  const ciz = () => {
    if (adim === 0) {
      o.innerHTML = `<div class="giris-ic">
        <div class="giris-amblem">📏</div>
        <div class="giris-baslik">Kelimetre</div>
        <div class="giris-alt">YDS · YÖKDİL kelime &amp; gramer</div>
        <div class="giris-ozellik">
          <div class="giris-sat"><span>📖</span><div><b>2.300+ kelime tek yerde</b><i>Seviye (S1–S5), tür ve duruma göre süz; akışta gez</i></div></div>
          <div class="giris-sat"><span>🌱</span><div><b>Aralıklı tekrar</b><i>Unutmadan önce tekrar; “Bugün” sekmesi planı verir</i></div></div>
          <div class="giris-sat"><span>🎓</span><div><b>13 gramer ünitesi</b><i>Oku, alıştırma yap, test çöz, çeviri çalış</i></div></div>
          <div class="giris-sat"><span>🧩</span><div><b>Eşleştirme oyunu</b><i>Günün bulmacası, düello ve çevrimiçi lig</i></div></div>
        </div>
        ${noktalar()}
        <button class="aksiyon giris-basla" id="girisIleri">Devam →</button>
      </div>`;
      o.querySelector('#girisIleri').onclick = () => { adim = 1; ciz(); };
    } else if (adim === 1) {
      const sec = [[10, 'Hafif', '~5 dk/gün'], [20, 'Dengeli', '~10 dk/gün'], [30, 'Yoğun', '~15 dk/gün'], [50, 'Sınav modu', '~25 dk/gün']];
      o.innerHTML = `<div class="giris-ic">
        <div class="giris-amblem kucuk">🎯</div>
        <div class="giris-baslik">Günlük hedefin?</div>
        <div class="giris-alt">Aktivite = bir kart, bir soru, bir eşleşme</div>
        <div class="giris-secimler">${sec.map(([n, ad, sure]) => `<button class="giris-secim ${hedef === n ? 'aktif' : ''}" data-n="${n}"><b>${n}</b><span>${ad}</span><i>${sure}</i></button>`).join('')}</div>
        <p class="giris-not">Sonradan Ben › Ayarlar’dan değiştirebilirsin.</p>
        ${noktalar()}
        <div class="btn-satir"><button class="aksiyon ikincil" id="girisGeri">‹ Geri</button><button class="aksiyon giris-basla" id="girisIleri">Devam →</button></div>
      </div>`;
      o.querySelectorAll('.giris-secim').forEach(b => b.onclick = () => { hedef = Number(b.dataset.n); titre('hafif'); ciz(); });
      o.querySelector('#girisGeri').onclick = () => { adim = 0; ciz(); };
      o.querySelector('#girisIleri').onclick = () => { adim = 2; ciz(); };
    } else {
      o.innerHTML = `<div class="giris-ic">
        <div class="giris-amblem kucuk">📅</div>
        <div class="giris-baslik">Sınav tarihin var mı?</div>
        <div class="giris-alt">Geri sayım ve günlük kelime planı için</div>
        <input id="girisTarih" type="date" value="${esc(tarih)}" class="giris-tarih">
        <p class="giris-not">İstersen boş bırak; Bugün sekmesinden sonra da ekleyebilirsin.</p>
        ${noktalar()}
        <div class="btn-satir"><button class="aksiyon ikincil" id="girisGeri">‹ Geri</button><button class="aksiyon giris-basla" id="girisBasla">Çalışmaya Başla →</button></div>
      </div>`;
      o.querySelector('#girisTarih').onchange = (e) => { tarih = e.target.value; };
      o.querySelector('#girisGeri').onclick = () => { adim = 1; ciz(); };
      o.querySelector('#girisBasla').onclick = () => { tarih = o.querySelector('#girisTarih').value; kapat(); };
    }
  };
  ciz();
  return true;
}

function yardimAc() {
  modalAc('Nasıl çalışılır?', `
    <div class="yardim-sat"><span>🏠</span><div><b>Bugün</b> — Günlük hedef, seri ve bugünün planı: kelime tekrarı, günün eşleştirmesi, kaldığın ünite.</div></div>
    <div class="yardim-sat"><span>📖</span><div><b>Kelimeler</b> — Tüm kelimeler tek listede. S1 (temel) → S5 (akademik) seviye, tür ve durum çipleriyle süz; bir kelimeye dokun → anlam, örnek, 🔊, 📓 Defter, 🎓 Biliyorum. “Bu listeyi çalış” ile aralıklı tekrara al.</div></div>
    <div class="yardim-sat"><span>🌱</span><div><b>Öğren</b> — Aralıklı tekrar: kelimeler unutulmadan önce tekrar gelir; kart, test, yazım ve boşluk modları.</div></div>
    <div class="yardim-sat"><span>🎓</span><div><b>Müfredat</b> — Her ünitede Oku (kurallar + etkileşimli örnekler), Alıştırma (ünitenin kendi cümlelerinden boşluk ve sınıflandırma), Test (kolaydan zora) ve Çeviri.</div></div>
    <div class="yardim-sat"><span>🧩</span><div><b>Oyun</b> — İngilizce↔Türkçe eşleştirme; bölümler, günün bulmacası, düello, rekorlar ve çevrimiçi lig.</div></div>
    <div class="yardim-sat"><span>👤</span><div><b>Ben</b> — İlerleme, başarımlar, ısı haritası, ayarlar.</div></div>
    <div class="yardim-sat"><span>❌</span><div><b>Yanlışlarım</b> — Testlerde yanlış yaptığın sorular birikir; doğru çözünce silinir (Müfredat ve Bugün’den ulaşılır).</div></div>
  `);
}

// ============================================================
// BEN — ilerleme + ayarlar
// ============================================================
function ayarSatirlariHTML() {
  return `
    <div class="ben-baslik">Oyun</div>
    <button class="ayar-sat" data-is="rekor"><span>🏅</span><div><b>Rekorlarım</b><i>Eşleştirme skorların</i></div></button>
    <button class="ayar-sat" data-is="lig"><span>🌍</span><div><b>Çevrimiçi lig</b><i>Günün bulmacası, haftalık ve en iyi bölüm sıralaması</i></div></button>
    <div class="ben-baslik">Ayarlar</div>
    <button class="ayar-sat" data-is="tema"><span>${TEMA_AD[temaSecimi()][0]}</span><div><b>${TEMA_AD[temaSecimi()][1]}</b><i>${TEMA_AD[temaSecimi()][2]} — değiştirmek için dokun</i></div></button>
    <button class="ayar-sat" data-is="hedef"><span>🎯</span><div><b>Günlük hedef</b><i>${_ayar.hedef || HEDEF_VARSAYILAN} aktivite/gün — değiştirmek için dokun</i></div></button>
    <button class="ayar-sat" data-is="sinav"><span>📅</span><div><b>Sınav tarihi</b><i>${_ayar.sinavTarih ? _ayar.sinavTarih + ' — geri sayım açık' : 'YDS/YÖKDİL tarihini ekle'}</i></div></button>
    <button class="ayar-sat" data-is="bildirim"><span>🔔</span><div><b>Günlük hatırlatma</b><i>${_ayar.bildirimAcik ? (_ayar.bildirimSaat || '20:00') + ' — açık' : 'Kapalı'}${bildirimVarMi() ? '' : ' · sadece uygulamada'}</i></div></button>
    <button class="ayar-sat" data-is="ses"><span>${_ayar.sesKapali ? '🔇' : '🔊'}</span><div><b>Ses efektleri</b><i>${_ayar.sesKapali ? 'Kapalı' : 'Açık'}</i></div></button>
    <button class="ayar-sat" data-is="titresim"><span>📳</span><div><b>Titreşim</b><i>${_ayar.titresimKapali ? 'Kapalı' : 'Açık'}</i></div></button>
    <button class="ayar-sat" data-is="yardim"><span>❓</span><div><b>Nasıl çalışılır?</b><i>Sekmeler ve çalışma biçimleri</i></div></button>
    <button class="ayar-sat" data-is="giris"><span>👋</span><div><b>Tanıtım ekranı</b><i>Karşılama ekranını tekrar aç</i></div></button>
    <div class="ben-baslik">Veri</div>
    <button class="ayar-sat" data-is="yanlis"><span>❌</span><div><b>Yanlışlarım’ı temizle</b><i>${_yanlis.length} biriken soruyu sıfırla</i></div></button>
    <button class="ayar-sat" data-is="defter"><span>📓</span><div><b>Kelime Defteri’ni temizle</b><i>${defterKelimeler().length} kelimeyi sil</i></div></button>
    <button class="ayar-sat tehlike" data-is="hepsi"><span>🗑️</span><div><b>Tüm ilerlemeyi sıfırla</b><i>Test skorları, kelime durumları, defter, yanlışlar — hepsi</i></div></button>
    <div class="ayar-hakkinda">Kelimetre · YDS/YÖKDİL · v${SURUM}</div>`;
}
function ayarBagla(root) {
  root.querySelectorAll('.ayar-sat').forEach(b => b.onclick = () => {
    const is = b.dataset.is;
    if (is === 'rekor') { eslestirme.rekorlar(); return; }
    if (is === 'lig') { eslestirme.lig(); return; }
    if (is === 'tema') { temaDegistir(); benAc(); return; }
    if (is === 'hedef') {
      const ops = [10, 20, 30, 50];
      _ayar.hedef = ops[(ops.indexOf(_ayar.hedef || HEDEF_VARSAYILAN) + 1) % ops.length];
      saveAyar(_ayar); benAc(); return;
    }
    if (is === 'sinav') { sinavAyarAc(); return; }
    if (is === 'bildirim') { bildirimAyarAc(); return; }
    if (is === 'ses') { _ayar.sesKapali = !_ayar.sesKapali; saveAyar(_ayar); efektAyarla({ ses: !_ayar.sesKapali }); if (!_ayar.sesKapali) ses('dogru'); benAc(); return; }
    if (is === 'titresim') { _ayar.titresimKapali = !_ayar.titresimKapali; saveAyar(_ayar); efektAyarla({ titresim: !_ayar.titresimKapali }); if (!_ayar.titresimKapali) titre('orta'); benAc(); return; }
    if (is === 'yardim') { yardimAc(); return; }
    if (is === 'giris') { girisEkrani(true); return; }
    const sorular = {
      yanlis: 'Yanlışlarım listesindeki tüm sorular silinsin mi?',
      defter: 'Kelime Defteri’ndeki tüm kelimeler silinsin mi?',
      hepsi: 'TÜM ilerleme (test skorları, kelime durumları, defter, yanlışlar) sıfırlansın mı? Bu geri alınamaz.'
    };
    onayAc(sorular[is], () => {
      if (is === 'yanlis' || is === 'hepsi') { _yanlis = []; saveYanlis(_yanlis); }
      if (is === 'defter' || is === 'hepsi') { for (const k of Object.keys(defter)) delete defter[k]; defterKaydet(); }
      if (is === 'hepsi') {
        for (const k of Object.keys(srs.kartlar)) delete srs.kartlar[k]; srsKaydet();
        _istat = {}; saveIstat(_istat); progress = {}; saveProgress(progress);
      }
      benAc();
    });
  });
}
function benAc() {
  const s = panoStats();
  const aktifGun = Object.values(_ayar.gunlog || {}).filter(v => v > 0).length;
  const b = basarimlar(); const kazanilan = b.filter(x => x.ok).length;
  const rozetGrid = b.map(x => `<div class="basarim ${x.ok ? 'acik' : 'kilit'}">
      <div class="basarim-ikon">${x.ok ? x.ikon : '🔒'}</div>
      <div class="basarim-ad">${esc(x.ad)}</div>
      <div class="basarim-desc">${esc(x.desc)}</div></div>`).join('');
  render(`
    ${ipucuHTML('ben')}
    <div class="ilerleme-sv">
      <div class="ilerleme-sv-bas"><b>⭐ Seviye ${s.seviye}</b><span>${s.xp} XP toplam</span></div>
      <div class="pano-xp"><div class="pano-xp-ic" style="width:${Math.round(s.svOran * 100)}%"></div></div>
      <div class="pano-xp-et" style="color:var(--murekkep-2)">${s.svBu} / ${s.svGerek} XP · sonraki seviye</div>
    </div>
    ${gorevKartHTML()}
    <div class="ilerleme-cip-satir">
      <div class="ilerleme-cip"><b>🌳 ${s.ogrenilen}</b><span>öğrenilen</span></div>
      <div class="ilerleme-cip"><b>📓 ${s.defter}</b><span>defter</span></div>
      <div class="ilerleme-cip"><b>%${s.yuzde}</b><span>test başarısı</span></div>
      <div class="ilerleme-cip"><b>📝 ${s.cozTest}</b><span>çözülen test</span></div>
    </div>
    <div class="ilerleme-cip-satir">
      <div class="ilerleme-cip"><b>🔥 ${s.seri}</b><span>seri</span></div>
      <div class="ilerleme-cip"><b>🧊 ${s.dondurma}</b><span>dondurma</span></div>
      <div class="ilerleme-cip"><b>🏆 ${_ayar.enUzunSeri || 0}</b><span>en uzun</span></div>
      <div class="ilerleme-cip"><b>📆 ${aktifGun}</b><span>aktif gün</span></div>
    </div>
    <div class="ilerleme-baslik">Aktivite ısı haritası</div>
    ${isiHaritasi()}
    <button class="aksiyon" id="paylasBtn" style="width:100%;margin:16px 0 6px;">📤 İlerlememi paylaş</button>
    <div class="ilerleme-baslik">Başarımlar <span style="color:var(--murekkep-2);font-weight:400">${kazanilan}/${b.length}</span></div>
    <div class="basarim-grid">${rozetGrid}</div>
    ${ayarSatirlariHTML()}
  `);
  document.getElementById('paylasBtn').onclick = async () => {
    const metin = `📏 Kelimetre · YDS ilerlemem:\n⭐ Seviye ${s.seviye} · 🔥 ${s.seri} günlük seri\n🌳 ${s.ogrenilen} kelime öğrendim, %${s.yuzde} test başarısı.\nSen de çalış!`;
    const sonuc = await paylas({ baslik: 'Kelimetre ilerlemem', metin });
    if (sonuc === 'kopyalandi') toast('📋 İlerleme panoya kopyalandı');
    else if (sonuc === false) toast('Paylaşım bu cihazda desteklenmiyor');
  };
  ayarBagla(icerik);
}

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

// ============================================================
// Gamifikasyon: XP + seviye + günlük görevler + seri
// ============================================================
const HEDEF_VARSAYILAN = 20;
const XP_AKTIVITE = 8, XP_DOGRU = 4, XP_HEDEF = 30, XP_GOREV = 25;
function seviyeBilgi(xp = 0) {
  let sv = 1, gerek = 120, top = 0;
  while (xp >= top + gerek) { top += gerek; sv++; gerek = Math.round(gerek * 1.22); }
  return { seviye: sv, buXp: xp - top, gerek, oran: Math.min(1, (xp - top) / gerek) };
}
function gorevListesi() {
  const hedef = _ayar.hedef || HEDEF_VARSAYILAN;
  const bitti = _ayar.gorevBitti || {};
  return [
    { id: 'aktivite', ikon: '⚡', ad: `${hedef} aktivite yap`, ilerleme: Math.min(_ayar.gunSayac || 0, hedef), hedef, bitti: !!bitti.aktivite },
    { id: 'dogru', ikon: '🎯', ad: '15 doğru cevap ver', ilerleme: Math.min(_ayar.gunDogru || 0, 15), hedef: 15, bitti: !!bitti.dogru },
    { id: 'bitir', ikon: '🏁', ad: '2 test/oturum bitir', ilerleme: Math.min(_ayar.gunBitirilen || 0, 2), hedef: 2, bitti: !!bitti.bitir },
  ];
}
function gorevleriKontrol() {
  if (!_ayar.gorevBitti) _ayar.gorevBitti = {};
  let kazanim = false;
  for (const g of gorevListesi()) {
    if (!_ayar.gorevBitti[g.id] && g.ilerleme >= g.hedef) {
      _ayar.gorevBitti[g.id] = true;
      _ayar.xp = (_ayar.xp || 0) + XP_GOREV;
      kazanim = true;
      toast(`✅ Görev tamam: ${g.ad} · +${XP_GOREV} XP`);
    }
  }
  return kazanim;
}
function gunKaydet(miktar = 1, opt = {}) {
  const bugun = gunStr(0);
  if (_ayar.gunTarih !== bugun) {
    const dun = gunStr(-1), oncekiGun = gunStr(-2);
    if (_ayar.sonAktif === dun) _ayar.seri = (_ayar.seri || 0) + 1;
    else if (_ayar.sonAktif === oncekiGun && (_ayar.dondurma || 0) > 0) {
      _ayar.dondurma--; _ayar.seri = (_ayar.seri || 0) + 1; _ayar._dondurmaBildir = true;
    } else _ayar.seri = 1;
    _ayar.sonAktif = bugun; _ayar.gunTarih = bugun;
    _ayar.gunSayac = 0; _ayar.gunDogru = 0; _ayar.gunYanlis = 0; _ayar.gunBitirilen = 0; _ayar.gorevBitti = {};
  }
  const oncekiSv = seviyeBilgi(_ayar.xp || 0).seviye;
  const oncekiHedefTam = (_ayar.gunSayac || 0) >= (_ayar.hedef || HEDEF_VARSAYILAN);
  _ayar.gunSayac = (_ayar.gunSayac || 0) + miktar;
  _ayar.toplamAktivite = (_ayar.toplamAktivite || 0) + miktar;
  _ayar.enUzunSeri = Math.max(_ayar.enUzunSeri || 0, _ayar.seri || 0);
  if (!_ayar.hedef) _ayar.hedef = HEDEF_VARSAYILAN;
  if (opt.dogru === true) _ayar.gunDogru = (_ayar.gunDogru || 0) + 1;
  else if (opt.dogru === false) _ayar.gunYanlis = (_ayar.gunYanlis || 0) + 1;
  if (opt.bitir) _ayar.gunBitirilen = (_ayar.gunBitirilen || 0) + 1;
  _ayar.xp = (_ayar.xp || 0) + XP_AKTIVITE * miktar + (opt.dogru === true ? XP_DOGRU : 0);
  if (!_ayar.gunlog) _ayar.gunlog = {};
  _ayar.gunlog[bugun] = (_ayar.gunlog[bugun] || 0) + miktar;
  const simdiHedefTam = _ayar.gunSayac >= (_ayar.hedef || HEDEF_VARSAYILAN);
  if (simdiHedefTam && !oncekiHedefTam) {
    _ayar.xp += XP_HEDEF;
    toast(`🎯 Günlük hedef tamam! +${XP_HEDEF} XP`);
    ses('kutlama'); titre('basari'); konfeti();
  }
  gorevleriKontrol();
  const yeniSv = seviyeBilgi(_ayar.xp).seviye;
  if (yeniSv > oncekiSv) {
    _ayar.dondurma = Math.min(3, (_ayar.dondurma || 0) + 1);
    toast(`⭐ Seviye ${yeniSv}! Seri dondurma +1 🧊`);
    ses('seviye'); titre('basari'); konfeti({ adet: 160, sure: 1700 });
  }
  budaGunlog();
  saveAyar(_ayar);
}
function budaGunlog() {
  if (!_ayar.gunlog) return;
  const keys = Object.keys(_ayar.gunlog);
  if (keys.length <= 130) return;
  const sinir = gunStr(-129);
  for (const k of keys) if (k < sinir) delete _ayar.gunlog[k];
}

let _toastZ = null;
function toast(metin) {
  try {
    if (!_toastZ) { _toastZ = document.createElement('div'); _toastZ.className = 'toast-katman'; document.body.appendChild(_toastZ); }
    const t = document.createElement('div'); t.className = 'toast'; t.textContent = metin;
    _toastZ.appendChild(t);
    requestAnimationFrame(() => t.classList.add('gor'));
    setTimeout(() => { t.classList.remove('gor'); setTimeout(() => t.remove(), 300); }, 2600);
  } catch (_) {}
}

const _sistemKoyu = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
const TEMA_SIRA = ['sistem', 'acik', 'koyu'];
const TEMA_AD = { sistem: ['📱', 'Tema: Sistem', 'Cihaz ayarını izler'], acik: ['☀️', 'Tema: Açık', 'Her zaman açık'], koyu: ['🌙', 'Tema: Koyu', 'Her zaman koyu'] };
function temaSecimi() { return TEMA_SIRA.includes(_ayar.tema) ? _ayar.tema : 'sistem'; }
function temaUygula() {
  const secim = temaSecimi();
  const koyu = secim === 'koyu' || (secim === 'sistem' && !!(_sistemKoyu && _sistemKoyu.matches));
  document.documentElement.dataset.tema = koyu ? 'koyu' : 'acik';
  const mt = document.querySelector('meta[name="theme-color"]');
  if (mt) mt.content = koyu ? '#0f1114' : '#f1f3f5';
  const K = window.Capacitor?.Plugins?.Kenar;
  if (K) K.renk({ renk: koyu ? '#0f1114' : '#f1f3f5', koyu }).catch?.(() => {});
}
function temaDegistir() { _ayar.tema = TEMA_SIRA[(TEMA_SIRA.indexOf(temaSecimi()) + 1) % TEMA_SIRA.length]; saveAyar(_ayar); temaUygula(); }
if (_sistemKoyu && _sistemKoyu.addEventListener) _sistemKoyu.addEventListener('change', () => { if (temaSecimi() === 'sistem') temaUygula(); });

function basarimlar() {
  const s = panoStats();
  const top = _ayar.toplamAktivite || 0;
  const enSeri = _ayar.enUzunSeri || 0;
  const tamTest = Object.values(_istat).filter(x => x.dogru === x.toplam).length;
  const es = eslestirme.istat();
  return [
    { ikon: '🌱', ad: 'İlk Adım', desc: 'İlk çalışmanı yap', ok: top >= 1 },
    { ikon: '⚡', ad: 'Isınma', desc: '50 aktivite tamamla', ok: top >= 50 },
    { ikon: '🔋', ad: 'Maraton', desc: '200 aktivite tamamla', ok: top >= 200 },
    { ikon: '🔥', ad: '3 Gün Seri', desc: '3 gün üst üste çalış', ok: enSeri >= 3 },
    { ikon: '🏆', ad: 'Haftalık', desc: '7 gün üst üste çalış', ok: enSeri >= 7 },
    { ikon: '👑', ad: 'Azimli', desc: '30 gün üst üste çalış', ok: enSeri >= 30 },
    { ikon: '📓', ad: 'Kelime Avcısı', desc: 'Deftere 25 kelime ekle', ok: s.defter >= 25 },
    { ikon: '🌳', ad: 'Yüz Kelime', desc: '100 kelime öğren', ok: s.ogrenilen >= 100 },
    { ikon: '🎯', ad: 'Kusursuz', desc: 'Bir testi %100 çöz', ok: tamTest >= 1 },
    { ikon: '🧠', ad: 'Test Ustası', desc: '5 test tamamla', ok: s.cozTest >= 5 },
    { ikon: '✨', ad: 'Tertemiz', desc: 'Tüm yanlışlarını temizle', ok: s.cozTest > 0 && s.yanlis === 0 },
    { ikon: '🧩', ad: 'Eşleştirici', desc: 'Bir eşleştirme bölümünü bitir', ok: es.bitenBolum >= 1 },
    { ikon: '🌟', ad: 'Üç Yıldız', desc: 'Bir bölümü 3 yıldızla bitir', ok: es.ucYildiz >= 1 },
    { ikon: '📅', ad: 'Bulmacacı', desc: '5 günün eşleştirmesini çöz', ok: es.gunlukSayi >= 5 },
    { ikon: '⚔️', ad: 'Düellocu', desc: 'Bir düello kazan', ok: es.duelloKazanilan >= 1 },
  ];
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
      <div class="gunun-kelime">${esc(w.en)} <button class="ogr-ses" id="gununSes" aria-label="Seslendir">🔊</button></div>
      <div class="gunun-anlam">${esc(w.tr)}</div>
      <div class="kart-ornek-etiket">Örnek · kelimeye dokun, çeviri için kaydır</div>
      ${ornekInteraktifHTML({ tokenlar: w.ornek_tokenlar, tr: w.ornek_tr })}
    </div>`, { onWire: (o) => { wireOrnekler(o); o.querySelector('#gununSes').onclick = () => seslendir(w.en); } });
}

// --- Pano (Bugün üstü) ---
function panoStats() {
  const cozTest = Object.keys(_istat).length;
  let d = 0, t = 0;
  Object.values(_istat).forEach(s => { d += s.dogru; t += s.toplam; });
  const bugun = gunStr(0), dun = gunStr(-1);
  const seri = (_ayar.sonAktif === bugun || _ayar.sonAktif === dun) ? (_ayar.seri || 0) : 0;
  const bugunSay = _ayar.gunTarih === bugun ? (_ayar.gunSayac || 0) : 0;
  const sv = seviyeBilgi(_ayar.xp || 0);
  return {
    cozTest, dogru: d, toplam: t, yuzde: t ? Math.round(d / t * 100) : 0,
    defter: defterKelimeler().length, yanlis: _yanlis.length, ogrenilen: pekisenSayisi(),
    seri, bugun: bugunSay, hedef: _ayar.hedef || HEDEF_VARSAYILAN,
    xp: _ayar.xp || 0, seviye: sv.seviye, svOran: sv.oran, svBu: sv.buXp, svGerek: sv.gerek,
    dondurma: _ayar.dondurma || 0
  };
}
function panoHTML() {
  const s = panoStats();
  const r = 34, cevre = 2 * Math.PI * r;
  const oran = Math.min(1, s.hedef ? s.bugun / s.hedef : 0);
  const dolu = cevre * oran, tamam = s.bugun >= s.hedef;
  const seriYazi = s.seri > 0 ? `🔥 ${s.seri} gün` : '🔥 seriyi başlat';
  const dondurmaRozet = s.dondurma > 0 ? `<span class="pano-buz" title="Seri dondurma">🧊 ${s.dondurma}</span>` : '';
  const gorevler = gorevListesi(), bitenGorev = gorevler.filter(g => g.bitti).length;
  return `<div class="pano">
    <div class="pano-ust">
      <div class="pano-sol">
        <div class="pano-selam"><span class="pano-sv">⭐ Sv ${s.seviye}</span><span class="pano-seri ${s.seri > 0 ? 'aktif' : ''}">${seriYazi}</span>${dondurmaRozet}</div>
        <div class="pano-xp"><div class="pano-xp-ic" style="width:${Math.round(s.svOran * 100)}%"></div></div>
        <div class="pano-xp-et">${s.svBu} / ${s.svGerek} XP · sonraki seviye</div>
      </div>
      <div class="pano-ring ${tamam ? 'tamam' : ''}">
        <svg viewBox="0 0 80 80" width="68" height="68">
          <circle class="ring-arka" cx="40" cy="40" r="${r}"/>
          <circle class="ring-on" cx="40" cy="40" r="${r}" stroke-dasharray="${dolu.toFixed(1)} ${cevre.toFixed(1)}" transform="rotate(-90 40 40)"/>
        </svg>
        <div class="pano-ring-yazi">${tamam ? '<b class="ring-tik">✓</b>' : `<b>${s.bugun}</b>`}<span>${tamam ? 'hedef!' : '/' + s.hedef}</span></div>
      </div>
    </div>
    <div class="pano-stat">
      <button class="pano-cip" data-git="ogrenilen"><b>${s.ogrenilen}</b><span>🌳 Öğrenilen</span></button>
      <button class="pano-cip" data-git="defter"><b>${s.defter}</b><span>📓 Defter</span></button>
      <button class="pano-cip" data-git="yanlis"><b>${s.yanlis}</b><span>❌ Yanlış</span></button>
      <button class="pano-cip" data-git="ilerleme"><b>${bitenGorev}/${gorevler.length}</b><span>🎮 Görev</span></button>
    </div>
  </div>`;
}

// ===== Sınav geri sayımı =====
function _tarihFark(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  const hedef = new Date(y, m - 1, d), bugun = new Date();
  hedef.setHours(0, 0, 0, 0); bugun.setHours(0, 0, 0, 0);
  return Math.round((hedef - bugun) / 86400000);
}
function sinavKartHTML() {
  if (!_ayar.sinavTarih) {
    return `<button class="mini-kart sinav" id="sinavKartBtn"><small>Sınav</small><b>📅 Tarih ekle</b><i>geri sayım ve günlük plan</i></button>`;
  }
  const kalan = _tarihFark(_ayar.sinavTarih);
  if (kalan < 0) {
    return `<button class="mini-kart sinav" id="sinavKartBtn"><small>Sınav</small><b>Günü geçti</b><i>yeni tarih ekle</i></button>`;
  }
  const toplamKelime = _havuz ? _havuz.length : 0;
  const kalanKelime = Math.max(0, toplamKelime - pekisenSayisi());
  const gunluk = kalan > 0 ? Math.ceil(kalanKelime / kalan) : kalanKelime;
  const planKisa = kalan > 0 && kalanKelime > 0 ? `günde ~${gunluk} kelime` : (kalanKelime === 0 ? 'hepsi öğrenildi 🎉' : 'bugün son gün');
  return `<button class="mini-kart sinav" id="sinavKartBtn"><small>Sınava kalan</small><b>${kalan} gün</b><i>${planKisa}</i></button>`;
}
function sinavAyarAc() {
  const mevcut = _ayar.sinavTarih || '';
  modalAc('Sınav tarihi', `
    <p class="modal-aciklama">YDS/YÖKDİL sınav tarihini seç; Bugün sekmesinde geri sayım ve günlük kelime planı görünsün.</p>
    <input id="sinavInput" type="date" value="${mevcut}" style="width:100%;box-sizing:border-box;padding:13px;border:1px solid var(--hat);border-radius:12px;background:var(--yuzey);color:var(--murekkep);font-size:16px;margin-bottom:12px;">
    <div class="btn-satir">
      ${mevcut ? '<button class="aksiyon ikincil" id="sinavSil">Kaldır</button>' : ''}
      <button class="aksiyon" id="sinavKaydet">Kaydet</button>
    </div>`, {
    onWire: (o, kapat) => {
      o.querySelector('#sinavKaydet').onclick = () => {
        const v = o.querySelector('#sinavInput').value;
        if (v) { _ayar.sinavTarih = v; saveAyar(_ayar); }
        kapat(); yenile();
      };
      const sil = o.querySelector('#sinavSil');
      if (sil) sil.onclick = () => { delete _ayar.sinavTarih; saveAyar(_ayar); kapat(); yenile(); };
    }
  });
}

function gorevKartHTML() {
  const gorevler = gorevListesi();
  const bitenSay = gorevler.filter(g => g.bitti).length;
  const satirlar = gorevler.map(g => {
    const yuzde = Math.round(g.ilerleme / g.hedef * 100);
    return `<div class="gorev-satir ${g.bitti ? 'bitti' : ''}">
      <span class="gorev-ikon">${g.bitti ? '✅' : g.ikon}</span>
      <div class="gorev-ic">
        <div class="gorev-ad">${esc(g.ad)}</div>
        <div class="gorev-bar"><div class="gorev-bar-ic" style="width:${yuzde}%"></div></div>
      </div>
      <span class="gorev-say">${g.ilerleme}/${g.hedef}</span>
    </div>`;
  }).join('');
  return `<div class="gorev-kart">
    <div class="gorev-bas">🎮 Günlük görevler <span class="gorev-rozet">${bitenSay}/${gorevler.length}</span></div>
    ${satirlar}
  </div>`;
}

function isiHaritasi() {
  const log = _ayar.gunlog || {};
  const HAFTA = 13, gun = HAFTA * 7;
  const bugun = new Date(); bugun.setHours(0, 0, 0, 0);
  const bugunGun = (bugun.getDay() + 6) % 7;
  const bitis = new Date(bugun); bitis.setDate(bitis.getDate() + (6 - bugunGun));
  const hucreler = [];
  for (let i = gun - 1; i >= 0; i--) {
    const d = new Date(bitis); d.setDate(d.getDate() - i);
    const iso = isoGun(d);
    const say = log[iso] || 0;
    const seviye = say === 0 ? 0 : say < 8 ? 1 : say < 20 ? 2 : say < 40 ? 3 : 4;
    const gelecek = d > bugun;
    hucreler.push(`<div class="isi-hucre s${seviye}${gelecek ? ' gelecek' : ''}" title="${iso}: ${say} aktivite"></div>`);
  }
  return `<div class="isi-izgara">${hucreler.join('')}</div>
    <div class="isi-lejant">Az <span class="isi-hucre s0"></span><span class="isi-hucre s1"></span><span class="isi-hucre s2"></span><span class="isi-hucre s3"></span><span class="isi-hucre s4"></span> Çok</div>`;
}

// Hatırlatma metni kişiselleşir: vadesi gelen tekrar, seri, günün bulmacası
let _sonBildirimMetin = '';
function bildirimMetni(oz) {
  const seri = panoStats().seri;
  const seriEk = seri >= 2 ? ` · ${seri} günlük serini koru 🔥` : '';
  if (oz && oz.due > 0) return `${oz.due} tekrar seni bekliyor${seriEk}`;
  if (oz && oz.yeni > 0) return `Bugün ${oz.yeni} yeni kelime öğren 🌱${seriEk}`;
  return `Günün eşleştirmesi hazır 🧩${seriEk}`;
}
function bildirimYenile(oz) {
  if (!_ayar.bildirimAcik || !bildirimVarMi()) return;
  const m = bildirimMetni(oz);
  if (m === _sonBildirimMetin) return;
  _sonBildirimMetin = m;
  gunlukKur(_ayar.bildirimSaat || '20:00', m).catch(() => {});
}
function bildirimAyarAc() {
  const saat = _ayar.bildirimSaat || '20:00';
  const acik = !!_ayar.bildirimAcik;
  const native = bildirimVarMi();
  modalAc('Günlük hatırlatma', `
    <p class="modal-aciklama">Her gün seçtiğin saatte “bugünkü kelimeler seni bekliyor” hatırlatması gönderilsin.${native ? '' : ' <b>Not:</b> Bildirimler yalnızca Android uygulamasında çalışır (tarayıcıda değil).'}</p>
    <label class="ayar-sat" style="cursor:default"><span>🔔</span><div style="flex:1"><b>Hatırlatma</b><i>Açık/Kapalı</i></div>
      <input type="checkbox" id="bildAcik" ${acik ? 'checked' : ''} style="width:22px;height:22px;accent-color:var(--orman)"></label>
    <label class="ayar-sat" style="cursor:default"><span>⏰</span><div style="flex:1"><b>Saat</b><i>Hatırlatma vakti</i></div>
      <input type="time" id="bildSaat" value="${saat}" style="padding:8px;border:1px solid var(--hat);border-radius:10px;background:var(--yuzey);color:var(--murekkep);font-size:15px"></label>
    <button class="aksiyon" id="bildKaydet" style="width:100%;margin-top:12px">Kaydet</button>
    <div id="bildMsg" style="margin-top:10px;color:var(--murekkep-2);min-height:1.2em;font-size:13px"></div>
  `, {
    onWire: (o, kapat) => {
      o.querySelector('#bildKaydet').onclick = async () => {
        const ac = o.querySelector('#bildAcik').checked;
        const sa = o.querySelector('#bildSaat').value || '20:00';
        _ayar.bildirimAcik = ac; _ayar.bildirimSaat = sa; saveAyar(_ayar);
        const msg = o.querySelector('#bildMsg');
        const bitir = (ms) => setTimeout(() => { kapat(); if (aktifSekme === 'ben') benAc(); }, ms);
        if (ac && native) {
          const r = await gunlukKur(sa, bildirimMetni(await kelimeOgren.ozet().catch(() => null)));
          if (r.ok) { msg.textContent = `✓ Her gün ${sa} için kuruldu.`; bitir(900); }
          else if (r.sebep === 'izin') msg.textContent = 'Bildirim izni verilmedi. Ayarlardan izin ver.';
          else msg.textContent = 'Bildirim kurulamadı.';
        } else if (ac && !native) {
          msg.textContent = 'Kaydedildi. Uygulamada (Android) etkin olacak.'; bitir(1100);
        } else {
          await iptalEt(); msg.textContent = 'Hatırlatma kapatıldı.'; bitir(800);
        }
      };
    }
  });
}

// ============================================================
// Android donanım geri tuşu
// ============================================================
// Öncelik: açık katman(modal/giriş) → içerik-içi geri → üst geri → sekme ≠ Bugün ise Bugün → çıkış onayı
function geriYonet() {
  const modal = document.querySelector('.modal-katman');
  if (modal) { modalKapat(); return true; }
  const giris = document.querySelector('.giris-katman');
  if (giris) { giris.classList.remove('acik'); setTimeout(() => giris.remove(), 420); _ayar.girisGoruldu = true; saveAyar(_ayar); return true; }
  const icBack = document.querySelector('#bolumGeri, #qGeri, #ogrCik, #ogrDetGeri, #alGeri');
  if (icBack) { icBack.click(); return true; }
  if (!geriBtn.hidden && typeof geriBtn.onclick === 'function') { geriBtn.onclick(); return true; }
  if (aktifSekme !== 'bugun') { sekmeAc('bugun'); return true; }
  return false;
}
function cikisOnay() {
  if (document.querySelector('.cikis-onay')) return;
  modalAc('Çıkış', `
    <p class="modal-aciklama">Uygulamadan çıkmak istiyor musun?</p>
    <div class="btn-satir">
      <button class="aksiyon ikincil" id="cikHayir">Hayır</button>
      <button class="aksiyon onay-evet" id="cikEvet">Evet, çık</button>
    </div>`, {
    onWire: (o, kapat) => {
      o.querySelector('.modal-sheet')?.classList.add('cikis-onay');
      o.querySelector('#cikHayir').onclick = kapat;
      o.querySelector('#cikEvet').onclick = () => { try { window.Capacitor?.Plugins?.App?.exitApp(); } catch (_) {} };
    }
  });
}
window.__geriYonet = geriYonet;   // native köprü + test için
window.__sekmeAc = sekmeAc;

// ============================================================
// Başlangıç
// ============================================================
sekmeBar.querySelectorAll('button').forEach(b => b.onclick = () => sekmeAc(b.dataset.sekme));
document.getElementById('yardimBtn').onclick = yardimAc;
document.getElementById('ayarBtn').onclick = () => sekmeAc('ben');

temaUygula();
efektAyarla({ ses: !_ayar.sesKapali, titresim: !_ayar.titresimKapali });
girisEkrani(false);
sekmeAc('bugun');

const _capApp = window.Capacitor?.Plugins?.App;
if (_capApp?.addListener) {
  _capApp.addListener('backButton', () => { if (!geriYonet()) cikisOnay(); });
}
