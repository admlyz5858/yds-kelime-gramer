// app/js/app.js — Kelimetre v2: beş sekme (Bugün · Kelimeler · Müfredat · Oyun · Ben)
import { toggleDone, isDone, shuffle, isoGun, gunStr } from './logic.js';
import { loadProgress, saveProgress, loadAyar, saveAyar } from './storage.js';
import { srs, srsKaydet, defter, defterKaydet, defterdeMi, defterToggle, defterEkle, defterKelimeler, pekisenSayisi, eskiKayitlariTasi } from './durum.js';
import { kurKelimeOgren } from './ogren.js';
import { kurKelimeAkisi } from './akis.js';
import { kurEslestirme } from './eslestir.js';
import { kurOyunlar } from './oyunlar.js';
import { kurSozluk, UNITE_ADI } from './sozluk.js';
import { kurTarayici } from './tarayici.js';
import { kurGun } from './gun.js';
import * as bulut from './bulut.js';
import { loadOzel, saveOzel, saveDefter, saveOgrenilen, saveEslestir, saveOyunlar, eskiTestVerisiniTemizle, saveOlay, loadOlay, olayYazSessiz } from './storage.js';
import { etkinlikOzeti, kirp } from './olay.js';
import { notAl, notKaydet } from './notlar.js';
import { titre, ses, konfeti, paylas, efektAyarla, seslendir } from './efekt.js';
import { bildirimVarMi, gunlukKur, iptalEt } from './bildirim.js';

const SURUM = '1.6.0';
const icerik = document.getElementById('icerik');
const baslikEl = document.getElementById('baslik');
const geriBtn = document.getElementById('geri');
const sekmeBar = document.getElementById('sekme-bar');

let manifest = null;
let aktifDers = null;
let progress = loadProgress();
let _ayar = loadAyar();        // uygulama ayarları / bayraklar
eskiTestVerisiniTemizle();     // kaldırılan test özelliklerinden kalan eski veri
let _acikBolum = null;   // Oku ekranında açık olan bölüm indeksi (null = başlık listesi)

async function getJSON(url) { const r = await fetch(url); if (!r.ok) throw new Error(url); return r.json(); }

// Kelime havuzu (tüm üniteler) — bir kez yüklenir; sözlük / öğren / akış / oyun paylaşır
let _havuz = null;
let _ozel = loadOzel();   // kullanıcının kendi kelimeleri (sv 0, u 0, ozel: true)
const ozelKart = (o) => Object.assign({ sv: 0, u: 0, ozel: true }, o);
async function havuzYukle() {
  if (!_havuz) { _havuz = (await getJSON('data/kelime-havuz.json')).kelimeler || []; for (const o of _ozel) _havuz.push(ozelKart(o)); }
  return _havuz;
}
// Kendi kelimesini ekle / sil (Defter'e de girer)
function ozelEkle(o) {
  const key = o.en.toLowerCase();
  if (_ozel.some(x => x.en.toLowerCase() === key) || (_havuz || []).some(w => w.en.toLowerCase() === key)) return false;
  _ozel.push(o); saveOzel(_ozel);
  const w = ozelKart(o); if (_havuz) _havuz.push(w);
  defterEkle(w); return true;
}
function ozelSil(en) {
  const key = en.toLowerCase();
  _ozel = _ozel.filter(x => x.en.toLowerCase() !== key); saveOzel(_ozel);
  if (_havuz) { const i = _havuz.findIndex(w => w.ozel && w.en.toLowerCase() === key); if (i >= 0) _havuz.splice(i, 1); }
  if (defter[key]) { delete defter[key]; defterKaydet(); }
  if (srs.kartlar && srs.kartlar[key]) { delete srs.kartlar[key]; srsKaydet(); }   // yetim SRS kaydı kalmasın
  notKaydet(key, '');   // yetim hafıza ipucu kalmasın (boş metin = sil)
}
// Cümleyi tokenlara böl, hedef kelimeyi vurgula (özel kelime örneği için)
function cumleTokenla(cumle, hedef) {
  const h = hedef.toLowerCase().replace(/[^a-z]/g, '');
  return cumle.trim().split(/\s+/).map(k => { const t = { k }; const n = k.toLowerCase().replace(/[^a-z]/g, ''); if (h && n && (n === h || n.startsWith(h) && n.length - h.length <= 3)) t.vurgu = true; return t; });
}
function ozelEkleAc(sonra) {
  modalAc('Kendi kelimeni ekle', `
    <p class="modal-aciklama">Kelime Defter'e girer, aralıklı tekrar ve akışta diğer kelimeler gibi çalışılır.</p>
    <input id="ozEn" class="giris-tarih" style="margin-top:0" placeholder="İngilizce kelime (ör. resilient)" autocapitalize="off" autocomplete="off" aria-label="İngilizce kelime">
    <input id="ozTr" class="giris-tarih" style="margin-top:8px" placeholder="Türkçe anlamı" aria-label="Türkçe anlamı">
    <select id="ozTur" class="giris-tarih" style="margin-top:8px"><option>İsim</option><option>Fiil</option><option>Sıfat</option><option>Zarf</option><option>Edat</option><option>Bağlaç</option><option>Öbek</option></select>
    <input id="ozOrnek" class="giris-tarih" style="margin-top:8px" placeholder="Örnek cümle (isteğe bağlı)" autocapitalize="off" aria-label="Örnek cümle">
    <input id="ozOrnekTr" class="giris-tarih" style="margin-top:8px" placeholder="Örnek cümlenin çevirisi (isteğe bağlı)" aria-label="Örnek cümlenin çevirisi">
    <input id="ozNot" class="giris-tarih" style="margin-top:8px" placeholder="Hafıza ipucu (isteğe bağlı)" aria-label="Hafıza ipucu">
    <div id="ozMsg" style="margin-top:8px;color:var(--gul);min-height:1.2em;font-size:13px"></div>
    <button class="aksiyon" id="ozKaydet" style="width:100%;margin-top:6px">Ekle</button>`, {
    onWire: (o, kapat) => {
      setTimeout(() => o.querySelector('#ozEn').focus(), 120);
      o.querySelector('#ozKaydet').onclick = () => {
        const en = o.querySelector('#ozEn').value.trim(), tr = o.querySelector('#ozTr').value.trim();
        const msg = o.querySelector('#ozMsg');
        if (!en || !tr) { msg.textContent = 'Kelime ve anlamı gerekli.'; return; }
        const kayit = { en, tr, tur: o.querySelector('#ozTur').value, t: Date.now() };
        const ornek = o.querySelector('#ozOrnek').value.trim();
        if (ornek) { kayit.ornek_tokenlar = cumleTokenla(ornek, en); kayit.ornek_tr = o.querySelector('#ozOrnekTr').value.trim(); }
        if (!ozelEkle(kayit)) { msg.textContent = 'Bu kelime zaten var (sözlükte ara).'; return; }
        const not = o.querySelector('#ozNot').value.trim(); if (not) notKaydet(en, not);
        titre('basari'); toast(`📓 "${en}" eklendi`); kapat(); if (sonra) sonra();
      };
    }
  });
}
// Hafıza ipucu düzenleme
function notDuzenleAc(w, sonra) {
  modalAc('Hafıza ipucu', `
    <p class="modal-aciklama"><b>${esc(w.en)}</b> için kendi ipucun: çağrışım, benzer kelime, kısa bir cümle… Kartın arkasında görünür.</p>
    <textarea id="notMetin" class="tr-metin" rows="3" placeholder="ör. re-silient → yaylanıp geri gelen, dirençli">${esc(notAl(w.en))}</textarea>
    <div class="btn-satir"><button class="aksiyon ikincil" id="notSil">Sil</button><button class="aksiyon" id="notKaydetBtn">Kaydet</button></div>`, {
    onWire: (o, kapat) => {
      setTimeout(() => o.querySelector('#notMetin').focus(), 120);
      o.querySelector('#notKaydetBtn').onclick = () => { notKaydet(w.en, o.querySelector('#notMetin').value); kapat(); if (sonra) sonra(); };
      o.querySelector('#notSil').onclick = () => { notKaydet(w.en, ''); kapat(); if (sonra) sonra(); };
    }
  });
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
let anaTur = 0;   // sekme değişimi sayacı: eski bir Bugün çizimi yeni sekmenin üstüne yazmasın
let kelimelerSegment = 'gunler';

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
  kelimeAkisi.temizle(); eslestirme.temizle(); oyunlar.temizle();
  aktifSekme = sekme; anaTur++;
  sekmeKokChrome(sekme);
  if (sekme === 'kelimeler') return kelimelerAc(opts.segment, opts);
  if (sekme === 'mufredat') return mufredatAc();
  if (sekme === 'oyun') return oyunAc(opts.segment, opts);
  if (sekme === 'ben') return benAc();
  return anaSayfa();
}
const yenile = () => sekmeAc(aktifSekme);
// Oyun sekmesi: Eşleştirme · Harf Avı · Karışık Harfler (segment çubuğu)
const OYUN_SEGMENTLER = [['esles', '🧩 Eşleştirme'], ['av', '🔤 Harf Avı'], ['karisik', '🔀 Karışık']];
const oyunSegmentHTML = (aktif) => segmentHTML('oyun', OYUN_SEGMENTLER, aktif);
function oyunAc(seg = 'esles', opts = {}) {
  eslestirme.temizle(); oyunlar.temizle();
  if (seg === 'av' || seg === 'karisik') return oyunlar.ac(seg);
  return eslestirme.ac(Object.assign({ ustHTML: () => ipucuHTML('oyun') + oyunSegmentHTML('esles') }, opts));
}
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
  kelimeler: '📅 Her gün 20 kelime: bir güne dokun, kartlarla çalış. Liste\'de S1 → S5 çiplerle süz.',
  mufredat: '🎓 Her ünitede kuralları oku, örnekleri incele; bitince ✓ çalışıldı işaretle.',
  oyun: '🎮 Eşleştirme, Harf Avı ve Karışık Harfler ile kelimeleri oyunla öğren. Eşleştirmede sezonlar sırayla açılır.',
  ben: '👤 Tema, günlük hedef ve hatırlatma ayarları aşağıda; ilerlemeni paylaşabilirsin.',
};
function ipucuHTML(sekme) {
  const g = _ayar.ipucuGoruldu || {};
  if (g[sekme] || !IPUCU[sekme]) return '';
  return `<div class="ipucu" data-sekme="${sekme}"><span>${IPUCU[sekme]}</span><button class="ipucu-kapat" aria-label="Kapat">✕</button></div>`;
}
icerik.addEventListener('click', (e) => { if (e.target.closest('#ozelEkleBtn')) ozelEkleAc(() => kelimelerAc('defter')); });
icerik.addEventListener('click', (e) => {
  const b = e.target.closest('.ipucu-kapat'); if (!b) return;
  const k = b.closest('.ipucu'); if (!k) return;   // Bugün'ün bulut kartı .ipucu değil; kendi tıklama işleyicisi kapatır
  _ayar.ipucuGoruldu = Object.assign(_ayar.ipucuGoruldu || {}, { [k.dataset.sekme]: true }); saveAyar(_ayar);
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
  else if (alan === 'oyun') oyunAc(b.dataset.seg);
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
  havuzYukle, defterdeMi, defterToggle, onayAc,
});
const oyunlar = kurOyunlar({
  render, esc, gunKaydet, ses, titre, konfeti, ekranModu, anaSayfa: kokOyun, havuzYukle,
  ustHTML: (oyun) => ipucuHTML('oyun') + oyunSegmentHTML(oyun),
});
const sozluk = kurSozluk({
  render, esc, ornekHTML: ornekInteraktifHTML, wireOrnekler, havuzYukle, seslendir, titre, toast, altEkran,
  calis: (words) => { kelimeOgren.ustAyarla(() => ipucuHTML('kelimeler') + kelimelerSegmentHTML(kelimelerSegment)); kelimeOgren.calis(words); },
  akisBaslat: (words, baslik) => kelimeAkisi.ac({ kelimeler: words, baslik: baslik || 'Kelime Akışı' }),
  notDuzenle: notDuzenleAc, ozelSil: (w, sonra) => onayAc(`"${w.en}" kelimen silinsin mi?`, () => { ozelSil(w.en); sonra(); }),
});
// Gün planı — Günler ızgarası, gün detay, Bugün hero (gun.js); kademe hesapları kademe.js
const gun = kurGun({
  render, esc, havuzYukle, altEkran,
  sekmeKok: () => sekmeKokChrome('kelimeler'),
  calis: (words, opt) => { kelimeOgren.ustAyarla(() => ipucuHTML('kelimeler') + kelimelerSegmentHTML(kelimelerSegment)); kelimeOgren.calis(words, opt); },
  listeAc: (g, words) => {
    const geri = () => altEkran(`${g}. Gün · kelimeler`, () => gun.detay(g));
    geri(); sozluk.ac({ ustHTML: '', filtre: { gun: g }, geri });
  },
  akisAc: (words, baslik) => kelimeAkisi.ac({ kelimeler: words, baslik }),
  ayar: () => _ayar, ayarKaydet: () => saveAyar(_ayar),
});
// Metin tarayıcı — yapıştırılan metindeki kelimeleri havuzla eşler
const tarayici = kurTarayici({
  render, esc, havuzYukle, wireOrnekler, toast, titre, altEkran,
  calis: (words) => { kelimeOgren.ustAyarla(() => ipucuHTML('kelimeler') + kelimelerSegmentHTML(kelimelerSegment)); kelimeOgren.calis(words); },
});
// Örnek cümledeki bir kelimeyi (o cümleyi örnek alarak) deftere ekle
function ogrenEkle(el) {
  const kutu = el.closest('.ornek-kutu');
  const spans = kutu ? [...kutu.querySelectorAll('.ornek-cumle .tok')] : [el];
  const toks = spans.map(s => { const o = { k: s.dataset.k != null ? s.dataset.k : s.textContent }; if (s.dataset.a) o.a = s.dataset.a; if (s.dataset.en) o.en = s.dataset.en; return o; });
  const idx = spans.indexOf(el); if (idx >= 0) toks[idx].vurgu = true;
  const word = (el.dataset.k || '').replace(/[.,!?;:"'’]+$/g, '');
  const tr = kutu ? (kutu.querySelector('.ornek-ceviri')?.textContent || '') : '';
  const hedefEn = (el.dataset.en || word).toLowerCase();
  const havuzW = (_havuz || []).find(w => w.en.toLowerCase() === hedefEn) || (_havuz || []).find(w => w.en.toLowerCase() === word.toLowerCase());
  defterEkle(havuzW || { en: word, tur: '', tr: el.dataset.a || '', ornek_tokenlar: toks, ornek_tr: tr });
}

// ============================================================
// BUGÜN
// ============================================================
let _tasindi = false;
async function anaSayfa() {
  const tur = anaTur;
  sekmeKokChrome('bugun');
  await manifestYukle();
  await gununKelimesiYukle();
  const havuz = await havuzYukle().catch(() => []);
  if (!_tasindi) { _tasindi = true; try { eskiKayitlariTasi(havuz); } catch (_) {} }
  await gun.hazirla().catch(() => {});
  const oz = await kelimeOgren.ozet().catch(() => null);
  if (aktifSekme !== 'bugun' || anaTur !== tur) return;   // beklerken başka sekmeye geçildiyse (ör. Google dönüşü → Ben) ezme
  const es = eslestirme.ozet();
  const son = _ayar.sonDers;
  bildirimYenile(oz);
  const yarim = kelimeOgren.devamBilgi();
  const tekrarBitti = !yarim && oz && (oz.due + oz.yeni) === 0;
  const tekrarMetin = yarim ? `Yarım kalan oturum · ${yarim.i}/${yarim.n} tamamlandı` : !oz ? 'Aralıklı tekrar' : tekrarBitti ? 'Bugünlük tamam — istersen yine çalış' : `${oz.due} tekrar · ${oz.yeni} yeni kelime`;
  const sonAd = son ? dersKisaAd(son.id) : '';
  render(`
    ${ipucuHTML('bugun')}
    ${gun.heroHTML()}
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
    ${!bulut.durum().girili && !_ayar.bulutKapatildi && etkinlikDurumu().toplam >= 1 ? `<button class="plan-kart kucuk bulut" id="pBulut"><span class="plan-ikon">☁️</span><span class="plan-ic"><b>İlerlemeni kaydet</b><i>Google ile giriş yap; telefon değişse de devam et</i></span><span class="ipucu-kapat" id="pBulutKapat" role="button" aria-label="Kapat">✕</span></button>` : ''}
    <button class="plan-kart kucuk" id="pOyun">
      <span class="plan-ikon">🔤</span><span class="plan-ic"><b>Harf Avı · Karışık Harfler</b><i>Kelimeleri oyunla pekiştir</i></span><span class="plan-durum">›</span>
    </button>
    <button class="plan-kart kucuk" id="pAkis">
      <span class="plan-ikon">🎬</span><span class="plan-ic"><b>Kelime Akışı</b><i>Yukarı kaydır, dinle, kaydet</i></span><span class="plan-durum">›</span>
    </button>
  `);
  icerik.querySelectorAll('[data-git]').forEach(c => c.onclick = () => {
    const g = c.dataset.git;
    if (g === 'defter') sekmeAc('kelimeler', { segment: 'defter' });
    else if (g === 'ogrenilen') sekmeAc('kelimeler', { segment: 'liste', filtre: { durum: 'pekisti' } });
    else if (g === 'oyun') sekmeAc('oyun');
    else if (g === 'ilerleme') sekmeAc('ben');
  });
  gun.heroBagla();
  const sk = document.getElementById('sinavKartBtn');
  if (sk) sk.onclick = sinavAyarAc;
  document.getElementById('pOgren').onclick = () => yarim ? kelimeOgren.devamEt() : kelimeOgren.ac();
  document.getElementById('pGunluk').onclick = () => eslestirme.ac({ gunluk: true });
  document.getElementById('pDers').onclick = () => son ? dersAc(son.dosya, son.id) : sekmeAc('mufredat');
  document.getElementById('pAkis').onclick = () => kelimeAkisi.ac({ baslik: 'Kelime Akışı' });
  document.getElementById('pOyun').onclick = () => sekmeAc('oyun', { segment: 'av' });
  const pb = document.getElementById('pBulut'); if (pb) pb.onclick = (e) => { if (e.target.closest('#pBulutKapat')) { e.stopPropagation(); _ayar.bulutKapatildi = true; saveAyar(_ayar); anaSayfa(); return; } girisAc(); };
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
const KELIME_SEGMENTLER = [['gunler', '📅 Günler'], ['liste', '📖 Liste'], ['ogren', '🌱 Öğren'], ['defter', '📓 Defter'], ['tara', '📄 Tara']];
const kelimelerSegmentHTML = (seg) => segmentHTML('kelimeler', KELIME_SEGMENTLER, seg);
function kelimelerAc(segment, opts = {}) {
  kelimelerSegment = segment || kelimelerSegment || 'gunler';
  const seg = kelimelerSegment;
  const ust = () => ipucuHTML('kelimeler') + kelimelerSegmentHTML(seg);
  const geri = () => sekmeKokChrome('kelimeler');
  if (kelimelerSegment === 'gunler') return gun.ac({ ustHTML: ust });
  if (kelimelerSegment === 'ogren') return kelimeOgren.ac({ ustHTML: ust });
  if (kelimelerSegment === 'tara') return tarayici.ac({ ustHTML: ust });
  if (kelimelerSegment === 'defter') return sozluk.ac({ ustHTML: () => ust() + `<button class="plan-kart kucuk" id="ozelEkleBtn"><span class="plan-ikon">➕</span><span class="plan-ic"><b>Kendi kelimeni ekle</b><i>${_ozel.length ? _ozel.length + ' özel kelime' : 'Listelerde olmayan kelimeleri deftere al'}</i></span><span class="plan-durum">›</span></button>`, filtre: { durum: 'defter' }, geri });
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
// Ünite ilerlemesi 0–1: "çalışıldı" işaretliyse tam
function uniteOrani(bitti) { return bitti ? 1 : 0; }
function halkaHTML(oran, etiket) {
  const r = 16, c = 2 * Math.PI * r, tam = oran >= 0.999;
  return `<span class="mf-halka ${tam ? 'tam' : ''} ${oran > 0 ? 'var' : ''}"><svg viewBox="0 0 40 40"><circle class="arka" cx="20" cy="20" r="${r}"/><circle class="on" cx="20" cy="20" r="${r}" stroke-dasharray="${(c * oran).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 20 20)"/></svg><b>${tam ? '✓' : etiket}</b></span>`;
}
async function mufredatAc() {
  await manifestYukle();
  const dersler = manifest.dersler.filter(d => d.id !== 1);
  const calisilan = dersler.filter(d => isDone(progress, d.id)).length;
  const son = _ayar.sonDers;
  const grup = GRUPLAR.map(g => {
    const dersListe = g.ids.map(id => manifest.dersler.find(d => d.id === id)).filter(Boolean);
    let grupOran = 0;
    const kartlar = dersListe.map(d => {
      const bitti = isDone(progress, d.id);
      const oran = uniteOrani(bitti); grupOran += oran;
      const rozetler = bitti ? '<span class="mf-rozet ok">✓ çalışıldı</span>' : '';
      return `<button class="mf-kart ${son && son.id === d.id ? 'son' : ''}" data-id="${d.id}" data-dosya="${d.dosya}">
        ${halkaHTML(oran, d.id)}
        <span class="mf-ic"><span class="mf-bas">${esc(dersKisaAd(d.id))}</span>
          <span class="mf-alt">${d.bolum_sayisi || 0} bölüm${rozetler ? ' · ' : ''}${rozetler}${!rozetler ? ' · henüz başlanmadı' : ''}</span></span>
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
    </div>
    ${son ? `<button class="hizli-devam" id="devamBtn"><div><div class="hizli-devam-ust">▶ Kaldığın yerden devam et</div><div class="hizli-devam-bas">${esc(dersKisaAd(son.id))}</div></div><span class="ok">›</span></button>` : ''}
    ${grup}
    <button class="mf-kelime-link" id="mfKelimeler"><span>📖</span><span><b>Tüm kelimeler tek yerde</b><i>2.100+ kelime kartı · seviye ve türe göre</i></span><span class="ok">›</span></button>
  `);
  icerik.querySelectorAll('.mf-kart').forEach(b => b.onclick = () => dersAc(b.dataset.dosya, Number(b.dataset.id)));
  document.getElementById('mfKelimeler').onclick = () => sekmeAc('kelimeler', { segment: 'liste' });
  const db = document.getElementById('devamBtn');
  if (db) db.onclick = () => dersAc(son.dosya, son.id);
}

// ---------- Ünite ekranı: Oku · Çeviri ----------
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
  const s = [['oku', '📖 Oku']];
  if (ciftSayisi(aktifDers) >= 20) s.push(['ceviri', '🔁 Çeviri']);
  return s;
}
const uniteUstHTML = (ekran) => segmentHTML('unite', uniteSegmentler(), ekran);
function ekranGoster(ekran) {
  kelimeAkisi.temizle();
  const d = aktifDers;
  _acikBolum = null;
  altEkran(d.kisaAd, () => sekmeAc('mufredat'));
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
    ${sonraki ? `<button class="aksiyon" id="bolumSonraki">${esc(d.bolumler[i + 1].baslik)} ›</button>` : ''}
  </div>`;
  render(html);
  document.getElementById('bolumGeri').onclick = () => { _acikBolum = null; ekranOku(); };
  const bo = document.getElementById('bolumOnceki'); if (bo) bo.onclick = () => { _acikBolum = i - 1; ekranOku(); };
  const bs = document.getElementById('bolumSonraki'); if (bs) bs.onclick = () => { _acikBolum = i + 1; ekranOku(); };
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
      <div class="ornek-cumle${ceviriVar}" lang="en">${govde}</div>
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
        // Balon ekran dışına taşmasın: kenara göre kaydır
        { const r = b.getBoundingClientRect(), pad = 8, vw = document.documentElement.clientWidth;
          if (r.left < pad) b.style.transform = `translateX(calc(-50% + ${Math.ceil(pad - r.left)}px))`;
          else if (r.right > vw - pad) b.style.transform = `translateX(calc(-50% - ${Math.ceil(r.right - (vw - pad))}px))`; }
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
          <div class="giris-sat"><span>📖</span><div><b>2.100+ kelime tek yerde</b><i>Seviye (S1–S5), tür ve duruma göre süz; akışta gez</i></div></div>
          <div class="giris-sat"><span>🌱</span><div><b>Aralıklı tekrar</b><i>Unutmadan önce tekrar; “Bugün” sekmesi planı verir</i></div></div>
          <div class="giris-sat"><span>🎓</span><div><b>13 gramer ünitesi</b><i>Kuralları oku, örnekleri incele, çeviri çalış</i></div></div>
          <div class="giris-sat"><span>🧩</span><div><b>Kelime oyunları</b><i>Eşleştirme, Harf Avı, Karışık Harfler</i></div></div>
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
        <input id="girisTarih" type="date" value="${esc(tarih)}" class="giris-tarih" aria-label="Sınav tarihi">
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
    <div class="yardim-sat"><span>🎓</span><div><b>Müfredat</b> — Her ünitede Oku (kurallar + etkileşimli örnekler) ve Çeviri.</div></div>
    <div class="yardim-sat"><span>🧩</span><div><b>Oyun</b> — İngilizce↔Türkçe eşleştirme (bölümler, günün bulmacası, düello, rekorlar), Harf Avı ve Karışık Harfler. Tüm oyunlar günlük hedefe sayılır.</div></div>
    <div class="yardim-sat"><span>📄</span><div><b>Metin tara</b> — Kelimeler › Tara: bir metin yapıştır, havuzdaki kelimeler seviye rengiyle işaretlenir; bilmediklerini deftere al ya da çalış.</div></div>
    <div class="yardim-sat"><span>➕</span><div><b>Kendi kelimen</b> — Defterim › "Kendi kelimeni ekle"; her karta 📝 hafıza ipucu yazabilirsin.</div></div>
    <div class="yardim-sat"><span>👤</span><div><b>Ben</b> — İlerleme, ayarlar; ☁️ Google ile giriş yapınca ilerlemen buluta yedeklenir ve cihazlar arasında taşınır.</div></div>
  `);
}

// ============================================================
// BEN — ilerleme + ayarlar
// ============================================================
function ayarSatirlariHTML() {
  return `
    <div class="ben-baslik">Oyun</div>
    <button class="ayar-sat" data-is="rekor"><span>🏅</span><div><b>Rekorlarım</b><i>Eşleştirme skorların</i></div></button>
    <div class="ben-baslik">Ayarlar</div>
    <button class="ayar-sat" data-is="tema"><span>${TEMA_AD[temaSecimi()][0]}</span><div><b>${TEMA_AD[temaSecimi()][1]}</b><i>${TEMA_AD[temaSecimi()][2]} — değiştirmek için dokun</i></div></button>
    <button class="ayar-sat" data-is="hedef"><span>🎯</span><div><b>Günlük hedef</b><i>${_ayar.hedef || HEDEF_VARSAYILAN} aktivite/gün — değiştirmek için dokun</i></div></button>
    <button class="ayar-sat" data-is="sinav"><span>📅</span><div><b>Sınav tarihi</b><i>${_ayar.sinavTarih ? _ayar.sinavTarih + ' — geri sayım açık' : 'YDS/YÖKDİL tarihini ekle'}</i></div></button>
    <button class="ayar-sat" data-is="bildirim"><span>🔔</span><div><b>Günlük hatırlatma</b><i>${_ayar.bildirimAcik ? (_ayar.bildirimSaat || '20:00') + ' — açık' : 'Kapalı'}${bildirimVarMi() ? '' : ' · sadece uygulamada'}</i></div></button>
    <button class="ayar-sat" data-is="ses"><span>${_ayar.sesKapali ? '🔇' : '🔊'}</span><div><b>Ses efektleri</b><i>${_ayar.sesKapali ? 'Kapalı' : 'Açık'}</i></div></button>
    <button class="ayar-sat" data-is="titresim"><span>📳</span><div><b>Titreşim</b><i>${_ayar.titresimKapali ? 'Kapalı' : 'Açık'}</i></div></button>
    <button class="ayar-sat" data-is="yardim"><span>❓</span><div><b>Nasıl çalışılır?</b><i>Sekmeler ve çalışma biçimleri</i></div></button>
    <button class="ayar-sat" data-is="giris"><span>👋</span><div><b>Tanıtım ekranı</b><i>Karşılama ekranını tekrar aç</i></div></button>
    <div class="ben-baslik">Hesap ve bulut yedek</div>
    ${hesapSatirlariHTML()}
    <div class="ben-baslik">Veri</div>
    <button class="ayar-sat" data-is="defter"><span>📓</span><div><b>Kelime Defteri’ni temizle</b><i>${defterKelimeler().length} kelime silinir; kendi eklediğin kelimeler ve ipuçları kalır</i></div></button>
    <button class="ayar-sat tehlike" data-is="hepsi"><span>🗑️</span><div><b>Tüm ilerlemeyi sıfırla</b><i>Öğrenilen kelimeler, defter, oyun geçmişi, seri ve günlük sayaçlar silinir. Ayarların, kendi kelimelerin ve ipuçların kalır</i></div></button>
    <div class="ayar-hakkinda">Kelimetre · YDS/YÖKDİL · v${SURUM}</div>`;
}
function ayarBagla(root) {
  root.querySelectorAll('.ayar-sat').forEach(b => b.onclick = () => {
    const is = b.dataset.is;
    if (is === 'rekor') { eslestirme.rekorlar(); return; }
    if (is === 'giris-yap') { girisAc(); return; }
    if (is === 'esitle') { toast('☁️ Eşitleniyor…'); bulutEsitle(true).then(() => benAc()); return; }
    if (is === 'cikis-yap') { onayAc('Hesaptan çıkılsın mı? Bu cihazdaki ilerleme kalır, bulut yedeği durur.', () => { bulut.cikis().then(() => benAc()); }); const eb = document.getElementById('onayEvet'); if (eb) eb.textContent = 'Evet, çık'; return; }
    if (is === 'hesap-sil') { onayAc('Hesabın ve buluttaki yedeğin kalıcı olarak silinsin mi? Bu cihazdaki ilerleme silinmez.', () => { bulut.hesabiSil().then((r) => { toast(r === 'tam' ? 'Hesap ve yedek silindi' : 'Bulut yedeği silindi, oturum kapatıldı'); benAc(); }).catch(() => toast('Silinemedi, tekrar dene')); }); return; }
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
      defter: 'Kelime Defteri’ndeki tüm kelimeler silinsin mi?',
      hepsi: 'TÜM ilerleme (kelime durumları, defter, oyun geçmişi) sıfırlansın mı? Bu geri alınamaz.'
    };
    onayAc(sorular[is], () => {
      if (is === 'defter' || is === 'hepsi') { for (const k of Object.keys(defter)) delete defter[k]; defterKaydet(); }
      if (is === 'hepsi') { ilerlemeSifirla(); return; }
      benAc();
    });
  });
}
// Tüm ilerlemeyi sıfırlar (ayarlar, özel kelimeler ve hafıza ipuçları kalır). Kayıtlar bildirimli yazılır:
// giriş yapılmışsa değişiklik buluta gider, aksi halde bulut kopyası eski ilerlemeyi geri getirmez.
function ilerlemeSifirla() {
  for (const k of Object.keys(srs.kartlar)) delete srs.kartlar[k];
  srs.gun = { tarih: '', yeni: 0, tekrar: 0 }; srs.gec = []; delete srs.devam; srsKaydet();
  for (const k of Object.keys(defter)) delete defter[k]; saveDefter(defter);
  eskiTestVerisiniTemizle();
  progress = {}; saveProgress(progress);
  saveOgrenilen({}); saveEslestir({}); saveOyunlar({}); saveOlay([]);
  for (const k of ['seri', 'sonAktif', 'gunTarih', 'gunSayac', 'gunDogru', 'gunYanlis', 'gunBitirilen', 'gorevBitti', 'toplamAktivite', 'enUzunSeri', 'gunlog', 'dondurma', 'sonDers', 'sonGunKelime', 'sonDondurmaSeri', '_dondurmaBildir', 'xp']) delete _ayar[k];
  saveAyar(_ayar);
  const bitir = () => setTimeout(() => location.reload(), 300);
  toast('🧹 İlerleme sıfırlandı');
  if (bulut.durum().girili) bulut.hemenYaz().finally(bitir); else bitir();
}
function benAc() {
  const s = panoStats();
  const aktifGun = Object.values(_ayar.gunlog || {}).filter(v => v > 0).length;
  render(`
    ${ipucuHTML('ben')}
    ${gorevKartHTML()}
    <div class="ilerleme-cip-satir">
      <div class="ilerleme-cip"><b>🌳 ${s.ogrenilen}</b><span>öğrenilen</span></div>
      <div class="ilerleme-cip"><b>📓 ${s.defter}</b><span>defter</span></div>
      <div class="ilerleme-cip"><b>⭐ ${s.yildiz}</b><span>yıldız</span></div>
      <div class="ilerleme-cip"><b>🧩 ${s.bolum}</b><span>oyun bölümü</span></div>
    </div>
    <div class="ilerleme-cip-satir">
      <div class="ilerleme-cip"><b>🔥 ${s.seri}</b><span>seri</span></div>
      <div class="ilerleme-cip"><b>🧊 ${s.dondurma}</b><span>dondurma</span></div>
      <div class="ilerleme-cip"><b>🏆 ${_ayar.enUzunSeri || 0}</b><span>en uzun</span></div>
      <div class="ilerleme-cip"><b>📆 ${aktifGun}</b><span>aktif gün</span></div>
    </div>
    <button class="aksiyon" id="paylasBtn" style="width:100%;margin:16px 0 6px;">📤 İlerlememi paylaş</button>
    ${ayarSatirlariHTML()}
  `);
  document.getElementById('paylasBtn').onclick = async () => {
    const metin = `📏 Kelimetre · YDS ilerlemem:\n🔥 ${s.seri} günlük seri\n🌳 ${s.ogrenilen} kelime öğrendim, ⭐ ${s.yildiz} yıldız topladım.\nSen de çalış!`;
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
// Günlük görevler ve seri
// ============================================================
const HEDEF_VARSAYILAN = 20;
// Bugün ve toplam sayılar olay günlüğünden türetilir: iki cihazda aynı rakam (cihaza özel sayaç yok)
const etkinlikDurumu = () => etkinlikOzeti(loadOlay(), (ms) => isoGun(new Date(ms)), gunStr(0));
let _kimlikSayac = 0;
const kimlikUret = (on) => `${on}${Date.now().toString(36)}${(++_kimlikSayac).toString(36)}${Math.random().toString(36).slice(2, 6)}`;
function gorevListesi() {
  const hedef = _ayar.hedef || HEDEF_VARSAYILAN;
  // Dünün değerleri bugünün görevine taşınmasın (halka ile aynı gün kuralı)
  const bugunMu = _ayar.gunTarih === gunStr(0);
  const bitti = bugunMu ? (_ayar.gorevBitti || {}) : {};
  const et = etkinlikDurumu();
  const g = (k) => (bugunMu ? (et[k] || 0) : 0);
  return [
    { id: 'aktivite', ikon: '⚡', ad: `${hedef} aktivite yap`, ilerleme: Math.min(g('bugunAktivite'), hedef), hedef, bitti: !!bitti.aktivite },
    { id: 'dogru', ikon: '🎯', ad: '15 doğru cevap ver', ilerleme: Math.min(g('bugunDogru'), 15), hedef: 15, bitti: !!bitti.dogru },
    { id: 'bitir', ikon: '🏁', ad: '2 oturum/oyun bitir', ilerleme: Math.min(g('bugunBitir'), 2), hedef: 2, bitti: !!bitti.bitir },
  ];
}
function gorevleriKontrol() {
  if (!_ayar.gorevBitti) _ayar.gorevBitti = {};
  let kazanim = false;
  for (const g of gorevListesi()) {
    if (!_ayar.gorevBitti[g.id] && g.ilerleme >= g.hedef) {
      _ayar.gorevBitti[g.id] = true;
      kazanim = true;
      toast(`✅ Görev tamam: ${g.ad}`);
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
      _ayar.dondurma--; _ayar.seri = (_ayar.seri || 0) + 1; _ayar._dondurmaBildir = true; setTimeout(() => toast('🧊 Dondurma kullanıldı, serin korundu'), 700);
    } else _ayar.seri = 1;
    _ayar.sonAktif = bugun; _ayar.gunTarih = bugun;
    // Her 7 günlük seride bir dondurma (ayrıca bir kez)
    if (_ayar.seri > 0 && _ayar.seri % 7 === 0 && _ayar.sonDondurmaSeri !== _ayar.seri) { _ayar.dondurma = Math.min(3, (_ayar.dondurma || 0) + 1); _ayar.sonDondurmaSeri = _ayar.seri; setTimeout(() => toast('🧊 7 günlük seri! Dondurma +1'), 900); }
    _ayar.gorevBitti = {};
  }
  const oncekiHedefTam = etkinlikDurumu().bugunAktivite >= (_ayar.hedef || HEDEF_VARSAYILAN);
  const yeniKayit = [];
  if (miktar > 0 || 'dogru' in opt) yeniKayit.push({ id: kimlikUret('a'), t: Date.now(), k: 'akt', n: miktar, d: opt.dogru === true ? 1 : opt.dogru === false ? 0 : -1 });
  if (opt.bitir) yeniKayit.push({ id: kimlikUret('b'), t: Date.now(), k: 'bit' });
  if (yeniKayit.length) olayYazSessiz(kirp([...loadOlay(), ...yeniKayit]));
  _ayar.enUzunSeri = Math.max(_ayar.enUzunSeri || 0, _ayar.seri || 0);
  if (!_ayar.hedef) _ayar.hedef = HEDEF_VARSAYILAN;
  if (opt.bitir) { if (!_ayar.kayitSoruldu && !bulut.durum().girili && etkinlikDurumu().toplam >= 5) { _ayar.kayitSoruldu = true; setTimeout(() => { if (!document.querySelector('.modal-katman')) girisAc({ oner: true }); }, 1400); } }
  if (!_ayar.gunlog) _ayar.gunlog = {};
  _ayar.gunlog[bugun] = (_ayar.gunlog[bugun] || 0) + miktar;
  const simdiHedefTam = etkinlikDurumu().bugunAktivite >= (_ayar.hedef || HEDEF_VARSAYILAN);
  if (simdiHedefTam && !oncekiHedefTam) {
    toast('🎯 Günlük hedef tamam!');
    ses('kutlama'); titre('basari'); konfeti();
  }
  gorevleriKontrol();
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
  const bugun = gunStr(0), dun = gunStr(-1);
  const seri = (_ayar.sonAktif === bugun || _ayar.sonAktif === dun) ? (_ayar.seri || 0) : 0;
  const bugunSay = etkinlikDurumu().bugunAktivite;
  return {
    defter: defterKelimeler().length, ogrenilen: pekisenSayisi(),
    yildiz: eslestirme.ozet().toplamYildiz, bolum: eslestirme.istat().bitenBolum,
    seri, bugun: bugunSay, hedef: _ayar.hedef || HEDEF_VARSAYILAN,
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
        <div class="pano-selam"><span class="pano-seri ${s.seri > 0 ? 'aktif' : ''}">${seriYazi}</span>${dondurmaRozet}</div>
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
      <button class="pano-cip" data-git="oyun"><b>${s.yildiz}</b><span>⭐ Yıldız</span></button>
      <button class="pano-cip" data-git="ilerleme"><b>${bitenGorev}/${gorevler.length}</b><span>🎮 Görev</span></button>
    </div>
  </div>`;
}

// ===== Sınav geri sayımı =====
function _tarihFark(iso) {
  if (typeof iso !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return NaN;
  const [y, m, d] = iso.split('-').map(Number);
  const hedef = new Date(y, m - 1, d), bugun = new Date();
  hedef.setHours(0, 0, 0, 0); bugun.setHours(0, 0, 0, 0);
  return Math.round((hedef - bugun) / 86400000);
}
function sinavKartHTML() {
  if (!_ayar.sinavTarih || Number.isNaN(_tarihFark(_ayar.sinavTarih))) {
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
    <input id="sinavInput" type="date" value="${mevcut}" style="width:100%;box-sizing:border-box;padding:13px;border:1px solid var(--hat);border-radius:12px;background:var(--yuzey);color:var(--murekkep);font-size:16px;margin-bottom:12px;" aria-label="Sınav tarihi">
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


// ===== Hesap (Google) ve bulut yedek =====
function hesapSatirlariHTML() {
  const d = bulut.durum();
  if (!d.girili) return `<button class="ayar-sat" data-is="giris-yap"><span>☁️</span><div><b>Kayıt ol / giriş yap</b><i>Google ile tek dokunuş. İlerlemen otomatik yedeklenir; telefon değişince ya da iPhone'da aynı yerden devam edersin.</i></div></button>`;
  const zaman = d.sonSenkron ? new Date(d.sonSenkron).toLocaleString('tr-TR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'henüz yok';
  return `<div class="ayar-sat hesap-sat"><span>✅</span><div><b>${esc(d.eposta)}</b><i>Google hesabı · Bulut yedek açık · son eşitleme: ${zaman}${d.kirli ? ' · bekleyen değişiklik var' : ''}${d.hata ? ` · <span style="color:var(--gul)">hata: ${esc(d.hata)}</span>` : ''}</i></div></div>
    <button class="ayar-sat" data-is="esitle"><span>🔄</span><div><b>Şimdi eşitle</b><i>Yerel değişikliklerini buluta gönderir, buluttaki yenileri alır. Çakışmada sana sorulur.</i></div></button>
    <button class="ayar-sat" data-is="cikis-yap"><span>🚪</span><div><b>Çıkış yap</b><i>Cihazdaki ilerleme kalır</i></div></button>
    <button class="ayar-sat tehlike" data-is="hesap-sil"><span>🗑️</span><div><b>Hesabımı ve bulut yedeğimi sil</b><i>Geri alınamaz</i></div></button>`;
}
function girisAc(opt = {}) {
  const m = modalAc(opt.oner ? '🎉 İlk oturum tamam!' : 'Google ile giriş', `
    <p class="modal-aciklama">${opt.oner ? 'İlerlemen şu an sadece bu telefonda. Google ile giriş yaparsan buluta yedeklenir; telefon değişse de kaldığın yerden devam edersin.' : 'Google hesabınla giriş yap. İlerlemen bu hesapta yedeklenir; cihaz değiştirsen de kaldığın yerden devam edersin.'}</p>
    <button class="g-btn" id="hsGoogle" type="button"><svg viewBox="0 0 48 48" width="20" height="20" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.7c-.6 3-2.3 5.5-4.8 7.2l7.6 5.9c4.4-4.1 7-10.1 7-17.1z"/><path fill="#FBBC05" d="M10.5 28.7A14.5 14.5 0 0 1 9.7 24c0-1.6.3-3.2.8-4.7l-7.9-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.8l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.6-5.9c-2.1 1.4-4.9 2.3-8.3 2.3-6.3 0-11.6-4.1-13.5-9.9l-7.9 6.1C6.5 42.6 14.6 48 24 48z"/></svg>Google ile devam et</button>
    <div id="hsMsg" style="margin-top:8px;min-height:1.2em;font-size:13px;color:var(--murekkep-2)"></div>
    ${opt.oner ? '<button class="dn-bitir-link" id="hsGec">Şimdilik geç</button>' : ''}
    <p class="giris-not" style="text-align:left">Uygulama Google hesabındaki e-posta adresini ve ilerleme yedeğini saklar. İstediğin an Ben › Hesabımı sil ile her şey silinir.</p>`, {
    onWire: (o, kapat) => {
      const msg = o.querySelector('#hsMsg');
      const gec = o.querySelector('#hsGec'); if (gec) gec.onclick = kapat;
      o.querySelector('#hsGoogle').onclick = async () => {
        const g = o.querySelector('#hsGoogle'); g.disabled = true; msg.textContent = 'Google penceresi açılıyor…';
        try { await bulut.googleIleGiris(); kapat(); titre('basari'); toast('☁️ Google ile giriş yapıldı, yedekleme açık'); await bulutEsitle(true); benAc(); }
        catch (e) { g.disabled = false; msg.textContent = /denied|iptal|aşımı/i.test(String(e.message)) ? 'Google girişi iptal edildi.' : 'Google ile giriş yapılamadı: ' + (e.message || 'bağlantı hatası'); }
      };
    }
  });
  return m;
}
// Çakışma sorusu: bulut mu, bu cihaz mı?
function bulutSor(b) {
  return new Promise((resolve) => {
    const t = new Date(b.guncelleme).toLocaleString('tr-TR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
    modalAc('Hangi ilerleme kalsın?', `
      <p class="modal-aciklama">Hem bu cihazda hem bulutta farklı değişiklikler var.</p>
      <button class="ayar-sat" id="bsIndir"><span>☁️</span><div><b>Buluttaki yedeği kullan</b><i>${t} · ${b.ozet.kart} kelime kaydı · ${b.ozet.defter} defter · ${b.ozet.test} test (${esc(b.cihaz || '')})</i><i class="bs-uyari">Bu cihazdaki değişiklikler silinir.</i></div></button>
      <button class="ayar-sat" id="bsYukle"><span>📱</span><div><b>Bu cihazdakini kullan</b><i>Bu cihazdaki ilerleme buluta yazılır.</i><i class="bs-uyari">Buluttaki daha yeni yedek üzerine yazılır.</i></div></button>`, {
      onWire: (o, kapat) => {
        o.querySelector('#bsIndir').onclick = () => { kapat(); resolve('indir'); };
        o.querySelector('#bsYukle').onclick = () => { kapat(); resolve('yukle'); };
        o.addEventListener('click', (e) => { if (e.target === o) resolve(null); });
      }
    });
  });
}
async function bulutEsitle(bildir) {
  const r = await bulut.esitle(bulutSor);
  if (r === 'silindi') { toast('☁️ Bulut yedeğin silinmiş; bu cihazda oturum kapatıldı'); benAc(); return r; }
  if (r === 'indir') { toast('☁️ Bulut yedeği yüklendi, yeniden başlatılıyor'); setTimeout(() => location.reload(), 900); return r; }
  if (bildir) { if (r === 'yukle') toast('☁️ Buluta yazıldı'); else if (r === 'esit') toast('☁️ Zaten güncel'); else if (r === 'hata') toast('Bulut hatası: ' + (bulut.durum().hata || 'bağlantı')); }
  return r;
}
window.__bulut = bulut;   // test

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
      <input type="checkbox" id="bildAcik" ${acik ? 'checked' : ''} style="width:22px;height:22px;accent-color:var(--orman)" aria-label="Hatırlatmayı aç"></label>
    <label class="ayar-sat" style="cursor:default"><span>⏰</span><div style="flex:1"><b>Saat</b><i>Hatırlatma vakti</i></div>
      <input type="time" id="bildSaat" value="${saat}" style="padding:8px;border:1px solid var(--hat);border-radius:10px;background:var(--yuzey);color:var(--murekkep);font-size:15px" aria-label="Hatırlatma saati"></label>
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
bulut.donusIsle().then(async (geldi) => {
  if (geldi) { titre('basari'); toast('☁️ Google ile giriş yapıldı, yedekleme açık'); await bulutEsitle(true); sekmeAc('ben'); return; }
  if (bulut.durum().girili) setTimeout(() => bulutEsitle(false), 1500);   // açılışta sessiz eşitleme (bulut yeniyse indirir)
}).catch(e => toast('Google ile giriş yapılamadı: ' + (e.message || 'hata')));
girisEkrani(false);
sekmeAc('bugun');

const _capApp = window.Capacitor?.Plugins?.App;
if (_capApp?.addListener) {
  _capApp.addListener('backButton', () => { if (!geriYonet()) cikisOnay(); });
}
