// app/js/sozluk.js — "Kelimeler": 2331 kelimelik tek sözlük. Seviye (S1–S5) · tür · ünite · durum filtreleri,
// arama, parça parça yüklenen liste, kelime detayı. Durum (yeni/öğreniliyor/pekişti) ve Defter durum.js'ten.
import { ogrenmeDurumu, defterdeMi, defterToggle, pekistir, pekistiMi } from './durum.js';

export const SEVIYE_AD = { 1: 'Temel', 2: 'Sık', 3: 'Orta', 4: 'İleri', 5: 'Akademik' };
export const UNITE_ADI = {
  1: 'En Sık 1000 Kelime', 2: 'Edatlar', 3: 'Present Tenses', 4: 'Past Tenses', 5: 'Future Tenses',
  6: 'Zaman Tekrarı', 7: 'Modallar', 8: 'Modal Tekrarı', 9: 'Fiilimsiler', 10: 'Etken-Edilgen',
  11: 'Koşul Cümleleri', 12: 'İsim Cümlecikleri', 13: 'Sıfat Cümlecikleri', 14: 'Bağlaçlar',
};
// "İsim / Fiil" → "isim"; "Edat (preposition)" → "edat"
export const turAna = (w) => (String(w.tur || '').split(/[\s(/]/)[0] || 'diğer').toLocaleLowerCase('tr-TR');
const TUR_SIRA = ['isim', 'fiil', 'sıfat', 'zarf', 'edat', 'bağlaç', 'zamir', 'modal'];

// Saf filtre/sıralama (test edilebilir). f: { q, sv, tur, unite, durum, sira }
export function filtrele(havuz, f, durumFn = ogrenmeDurumu, defterFn = defterdeMi) {
  const q = (f.q || '').trim().toLocaleLowerCase('tr-TR');
  let arr = havuz;
  if (f.sv) arr = arr.filter(w => w.sv === f.sv);
  if (f.tur) arr = arr.filter(w => turAna(w) === f.tur);
  if (f.unite) arr = arr.filter(w => w.u === f.unite);
  if (f.durum === 'defter') arr = arr.filter(w => defterFn(w.en));
  else if (f.durum) arr = arr.filter(w => durumFn(w.en) === f.durum);
  if (q) arr = arr.filter(w => w.en.toLowerCase().includes(q) || (w.tr || '').toLocaleLowerCase('tr-TR').includes(q));
  if (f.sira === 'alfabe') arr = arr.slice().sort((a, b) => a.en.localeCompare(b.en, 'en'));
  else if (f.sira === 'tur') arr = arr.slice().sort((a, b) => (TUR_SIRA.indexOf(turAna(a)) + 99) % 99 - (TUR_SIRA.indexOf(turAna(b)) + 99) % 99 || a.sv - b.sv);
  return arr;   // 'seviye': havuz sırası zaten sv + sıklık
}

export function kurSozluk(api) {
  const { render, esc, ornekHTML, wireOrnekler, havuzYukle, seslendir, titre, toast, altEkran, calis, akisBaslat } = api;
  let havuz = null, ust = '', geriKok = null;
  const f = { q: '', sv: 0, tur: '', unite: 0, durum: '', sira: 'seviye' };
  const PARCA = 60;
  let gozlemci = null, gosterilen = 0, sonuc = [];

  async function ac(opts = {}) {
    havuz = await havuzYukle();
    Object.assign(f, { q: '', sv: 0, tur: '', unite: 0, durum: '' }, opts.filtre || {});
    ust = opts.ustHTML || ''; geriKok = opts.geri || null;
    ciz();
  }

  const DURUM_NOKTA = { yeni: '✨', ogreniliyor: '🌿', pekisti: '🌳' };
  function satirHTML(w) {
    const d = ogrenmeDurumu(w.en);
    return `<button class="sz-satir" data-en="${esc(w.en)}">
      <span class="sz-sv s${w.sv}">S${w.sv}</span>
      <span class="sz-ic"><b>${esc(w.en)}</b><i>${esc(w.tr)}</i></span>
      <span class="sz-sag">${defterdeMi(w.en) ? '📓' : ''}<span class="sz-durum" title="${d}">${DURUM_NOKTA[d]}</span></span>
    </button>`;
  }
  function cipler() {
    const turler = TUR_SIRA.filter(t => havuz.some(w => turAna(w) === t));
    return `
      <div class="sz-cipler">
        <button class="sz-cip ${!f.sv ? 'aktif' : ''}" data-sv="0">Tümü</button>
        ${[1, 2, 3, 4, 5].map(s => `<button class="sz-cip sv s${s} ${f.sv === s ? 'aktif' : ''}" data-sv="${s}">S${s} <small>${SEVIYE_AD[s]}</small></button>`).join('')}
      </div>
      <div class="sz-cipler">
        <button class="sz-cip ${!f.tur ? 'aktif' : ''}" data-tur="">tüm türler</button>
        ${turler.map(t => `<button class="sz-cip ${f.tur === t ? 'aktif' : ''}" data-tur="${t}">${t}</button>`).join('')}
      </div>
      <div class="sz-cipler">
        <button class="sz-cip ${!f.durum ? 'aktif' : ''}" data-durum="">hepsi</button>
        <button class="sz-cip ${f.durum === 'yeni' ? 'aktif' : ''}" data-durum="yeni">✨ yeni</button>
        <button class="sz-cip ${f.durum === 'ogreniliyor' ? 'aktif' : ''}" data-durum="ogreniliyor">🌿 öğreniliyor</button>
        <button class="sz-cip ${f.durum === 'pekisti' ? 'aktif' : ''}" data-durum="pekisti">🌳 öğrendim</button>
        <button class="sz-cip ${f.durum === 'defter' ? 'aktif' : ''}" data-durum="defter">📓 defterim</button>
      </div>`;
  }
  function ciz() {
    if (gozlemci) { gozlemci.disconnect(); gozlemci = null; }
    sonuc = filtrele(havuz, f); gosterilen = 0;
    const uniteEt = f.unite ? `<button class="sz-cip aktif" id="szUniteKaldir">📚 ${esc(UNITE_ADI[f.unite] || 'Ünite ' + f.unite)} ✕</button>` : '';
    render(`${typeof ust === 'function' ? ust() : ust}
      <div class="sz-ara-satir"><span class="sz-ara-ikon">🔍</span><input id="szAra" class="sz-ara" type="search" placeholder="Kelime veya anlam ara…" value="${esc(f.q)}" autocomplete="off"></div>
      ${cipler()}
      ${uniteEt ? `<div class="sz-cipler">${uniteEt}</div>` : ''}
      <div class="sz-ust">
        <span class="sz-say" id="szSay">${sayMetni()}</span>
        <select id="szSira" class="sz-sira"><option value="seviye" ${f.sira === 'seviye' ? 'selected' : ''}>seviyeye göre</option><option value="alfabe" ${f.sira === 'alfabe' ? 'selected' : ''}>A → Z</option><option value="tur" ${f.sira === 'tur' ? 'selected' : ''}>türe göre</option></select>
      </div>
      <div class="sz-eylem" id="szEylem"></div>
      <div class="sz-liste" id="szListe"></div>
      <div class="sz-sentinel" id="szSentinel"></div>`);
    const ara = document.getElementById('szAra');
    ara.oninput = () => { f.q = ara.value; listeYenile(); };
    document.querySelectorAll('.sz-cip[data-sv]').forEach(b => b.onclick = () => { f.sv = Number(b.dataset.sv); ciz(); });
    document.querySelectorAll('.sz-cip[data-tur]').forEach(b => b.onclick = () => { f.tur = b.dataset.tur; ciz(); });
    document.querySelectorAll('.sz-cip[data-durum]').forEach(b => b.onclick = () => { f.durum = b.dataset.durum; ciz(); });
    const uk = document.getElementById('szUniteKaldir'); if (uk) uk.onclick = () => { f.unite = 0; ciz(); };
    document.getElementById('szSira').onchange = (e) => { f.sira = e.target.value; ciz(); };
    listeYenile();
  }
  function sayMetni() { return `${sonuc.length} kelime`; }
  function listeYenile() {
    sonuc = filtrele(havuz, f); gosterilen = 0;
    const kut = document.getElementById('szListe'), say = document.getElementById('szSay'), ey = document.getElementById('szEylem');
    if (!kut) return;
    say.textContent = sayMetni();
    kut.innerHTML = '';
    ey.innerHTML = sonuc.length
      ? `<button class="aksiyon" id="szCalis">🌱 Bu listeyi çalış <small>${Math.min(sonuc.length, 60)} kelime</small></button><button class="aksiyon ikincil" id="szAkis">🎬 Akışta gez</button>`
      : `<div class="cumle"><div class="tr">${f.durum === 'defter' ? 'Defterin boş. Akışta 📓 Kaydet\'e dokun ya da örnek cümlede kelimeye dokunup "Öğren" de.' : 'Bu filtrede kelime yok.'}</div></div>`;
    const c = document.getElementById('szCalis'); if (c) c.onclick = () => calis(sonuc.slice(0, 60));
    const a = document.getElementById('szAkis'); if (a) a.onclick = () => akisBaslat(sonuc, 'Kelime Akışı');
    dahaGoster();
    if (gozlemci) gozlemci.disconnect();
    gozlemci = new IntersectionObserver((es) => { if (es.some(e => e.isIntersecting)) dahaGoster(); }, { rootMargin: '500px' });
    const s = document.getElementById('szSentinel'); if (s) gozlemci.observe(s);
  }
  function dahaGoster() {
    const kut = document.getElementById('szListe'); if (!kut || gosterilen >= sonuc.length) return;
    const parca = sonuc.slice(gosterilen, gosterilen + PARCA);
    kut.insertAdjacentHTML('beforeend', parca.map(satirHTML).join(''));
    gosterilen += parca.length;
    kut.querySelectorAll('.sz-satir:not([data-wired])').forEach(b => { b.dataset.wired = '1'; b.onclick = () => { const w = havuz.find(x => x.en === b.dataset.en); if (w) detay(w); }; });
  }

  function detay(w) {
    altEkran(w.en, () => { altEkranKapat(); ciz(); });
    const d = ogrenmeDurumu(w.en);
    const durumYazi = d === 'pekisti' ? '🌳 Öğrendin — tekrarlar seyrek gelir' : d === 'ogreniliyor' ? '🌿 Öğreniliyor — aralıklı tekrarda' : '✨ Henüz çalışılmadı';
    render(`
      <div class="sz-detay">
        <div class="sz-detay-ust"><span class="sz-sv s${w.sv}">S${w.sv} ${SEVIYE_AD[w.sv] || ''}</span><span class="sz-rozet">${esc(w.tur || '')}</span>${w.u ? `<span class="sz-rozet">📚 ${esc(UNITE_ADI[w.u] || 'Ünite ' + w.u)}</span>` : ''}</div>
        <div class="sz-detay-en">${esc(w.en)} <button class="ogr-ses" id="szSes" aria-label="Seslendir">🔊</button></div>
        <div class="sz-detay-tr">${esc(w.tr)}</div>
        <div class="sz-detay-durum">${durumYazi}</div>
      </div>
      ${w.ornek_tokenlar ? `<div class="kart-ornek-etiket">Örnek · kelimeye dokun, çeviri için kaydır</div>${ornekHTML({ tokenlar: w.ornek_tokenlar, tr: w.ornek_tr })}` : ''}
      <div class="btn-satir">
        <button class="aksiyon ${defterdeMi(w.en) ? '' : 'ikincil'}" id="szDefter">${defterdeMi(w.en) ? '📓 Defterde ✓' : '📓 Deftere ekle'}</button>
        <button class="aksiyon ${pekistiMi(w.en) ? '' : 'ikincil'}" id="szBiliyorum">${pekistiMi(w.en) ? '✅ Biliyorum' : '🎓 Biliyorum'}</button>
      </div>
      <div class="btn-satir"><button class="aksiyon" id="szCalisTek">🌱 Bu kelimeyi çalış ›</button></div>`);
    document.getElementById('szSes').onclick = () => seslendir(w.en);
    if (w.ornek_tokenlar) wireOrnekler(document.getElementById('icerik'));
    document.getElementById('szDefter').onclick = () => { defterToggle(w); titre('hafif'); detay(w); };
    document.getElementById('szBiliyorum').onclick = () => { if (!pekistiMi(w.en)) { pekistir(w); titre('basari'); toast('🎓 Öğrendim olarak işaretlendi'); } detay(w); };
    document.getElementById('szCalisTek').onclick = () => calis([w]);
  }
  function altEkranKapat() { if (geriKok) geriKok(); }

  return { ac, filtrele: (ff) => filtrele(havuz || [], ff) };
}
