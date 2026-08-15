// app/js/ogren.js — "Kelime Öğren": tüm ünitelerin kelimeleriyle aralıklı-tekrar (SRS) çalışma bölümü.
//
// Öğrenme bilimi (araştırma temelli):
//  • Aralıklı tekrar (SM-2 türevi): her kelime, unutulmaya yakın anda tekrar gösterilir.
//  • Aktif hatırlama: cevabı görmeden önce üret (kart / çoktan seçme / yazım / cümle-içi boşluk).
//  • Kademeli zorluk: yeni kelime → tanıma; olgunlaşınca → çoktan seçme → yazım/bağlam (üretim).
//  • Harmanlama (interleaving): oturumda kelimeler, modlar ve yön (EN↔TR) karışık gelir.
//  • Zor kelime (leech) takibi: çok yanlış yapılan kelimeler işaretlenir, odaklı tekrar edilir.
//  • Kapsam seçimi: tüm havuz, tek ünite veya "zorlandıklarım".
//  • Günlük hedef + seri: her gün en az 20 yeni kelime + biriken tekrarlar.
import { loadSRS, saveSRS } from './storage.js';

const GUN_MS = 86400000;
const bugunGun = () => Math.floor(Date.now() / GUN_MS);
const bugunStr = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const shuffle = (a) => a.map(v => [Math.random(), v]).sort((x, y) => x[0] - y[0]).map(x => x[1]);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const PEKISME = 21;              // gün: bu aralığa ulaşan kelime "pekişmiş" sayılır
const LEECH = 4;                 // bu kadar kez yanlış yapılan kelime "zor" (leech) sayılır
const YENI_HEDEF_VARSAYILAN = 20;
const UNITE_ADI = {
  1: 'En Sık 1000 Kelime', 2: 'Edatlar', 3: 'Present Tenses', 4: 'Past Tenses', 5: 'Future Tenses',
  6: 'Zaman Tekrarı', 7: 'Modallar', 8: 'Modal Tekrarı', 9: 'Fiilimsiler', 10: 'Etken-Edilgen',
  11: 'Koşul Cümleleri', 12: 'İsim Cümlecikleri', 13: 'Sıfat Cümlecikleri', 14: 'Bağlaçlar',
};

function bosSRS() {
  return { surum: 1, kartlar: {}, favori: {}, gun: { tarih: '', yeni: 0, tekrar: 0 }, gec: [],
    ayar: { yeniHedef: YENI_HEDEF_VARSAYILAN, kapsam: 'tum', yon: 'karisik', mod: 'akilli' } };
}

export function kurKelimeOgren(api) {
  const { render, esc, ornekHTML, wireOrnekler, gunKaydet, anaSayfa, ekranModu } = api;

  let havuz = null, havuzIndex = null, srs = null, oturum = null;
  let listeDurum = { q: '', filtre: 'tum' };

  // ---- yükleme ----
  async function yukle() {
    if (havuz) return;
    const r = await fetch('data/kelime-havuz.json');
    if (!r.ok) throw new Error('kelime-havuz.json yüklenemedi');
    const j = await r.json();
    havuz = j.kelimeler || [];
    havuzIndex = new Map(havuz.map(k => [k.en.toLowerCase(), k]));
    srs = loadSRS() || bosSRS();
    // eski kayıtları güvenle tamamla
    srs.ayar = Object.assign({ yeniHedef: YENI_HEDEF_VARSAYILAN, kapsam: 'tum', yon: 'karisik', mod: 'akilli' }, srs.ayar || {});
    if (!srs.gun) srs.gun = { tarih: '', yeni: 0, tekrar: 0 };
    if (!srs.gec) srs.gec = [];
    if (!srs.favori) srs.favori = {};
    gunSifirla();
  }
  function kaydet() { saveSRS(srs); }
  function gunSifirla() {
    const t = bugunStr();
    if (srs.gun.tarih !== t) { srs.gun = { tarih: t, yeni: 0, tekrar: 0 }; kaydet(); }
  }

  // ---- SRS çekirdeği (SM-2 türevi) ----
  function kartDurum(en) { return srs.kartlar[en.toLowerCase()]; }
  function yeniMi(en) { return !srs.kartlar[en.toLowerCase()]; }
  function leechMi(en) { const c = kartDurum(en); return !!c && c.l >= LEECH && (c.i || 0) < PEKISME; }
  function durum(en) {   // 'yeni' | 'ogreniliyor' | 'pekisti'
    const c = kartDurum(en); if (!c) return 'yeni';
    return (c.i || 0) >= PEKISME ? 'pekisti' : 'ogreniliyor';
  }

  function derecelendir(w, q) {
    const key = w.en.toLowerCase();
    let c = srs.kartlar[key]; const ilk = !c;
    if (!c) c = { b: 0, e: 2.5, i: 0, d: 0, r: 0, l: 0 };
    if (q === 0) {
      c.l++; c.r = 0; c.e = clamp(c.e - 0.2, 1.3, 2.7); c.i = 0; c.b = Math.max(1, c.b - 1);
    } else {
      c.e = clamp(c.e + (q === 2 ? 0.05 : -0.15), 1.3, 2.7);
      c.r++; c.b++;
      if (c.r === 1) c.i = 1;
      else if (c.r === 2) c.i = q === 1 ? 3 : 4;
      else c.i = Math.max(1, Math.round(c.i * (q === 1 ? 1.2 : c.e)));
    }
    c.d = bugunGun() + c.i; c.s = bugunGun();
    srs.kartlar[key] = c;
    if (ilk) srs.gun.yeni++; else srs.gun.tekrar++;
    gecKaydet(q > 0); kaydet(); gunKaydet(1);
    return ilk;
  }
  function gecKaydet(dogruMu) {
    const t = bugunStr();
    let g = srs.gec.find(x => x.t === t);
    if (!g) { g = { t, y: 0, r: 0, d: 0, w: 0 }; srs.gec.push(g); if (srs.gec.length > 21) srs.gec.shift(); }
    g.y = srs.gun.yeni; g.r = srs.gun.tekrar;
    if (dogruMu) g.d++; else g.w++;
  }

  // ---- kapsam (tüm / ünite / zor) ----
  function kapsamHavuz() {
    const k = srs.ayar.kapsam || 'tum';
    if (k === 'tum') return havuz;
    if (k === 'zor') return havuz.filter(w => leechMi(w.en));
    const uid = Number(k);
    return havuz.filter(w => w.u === uid);
  }
  function leechSayisi() { let n = 0; for (const w of havuz) if (leechMi(w.en)) n++; return n; }

  // ---- istatistik ----
  function istat() {
    const t = bugunGun();
    let pekisti = 0, ogreniliyor = 0, dueSay = 0;
    for (const k in srs.kartlar) {
      const c = srs.kartlar[k];
      if ((c.i || 0) >= PEKISME) pekisti++; else ogreniliyor++;
      if (c.d <= t) dueSay++;
    }
    const toplam = havuz.length, gorulen = Object.keys(srs.kartlar).length;
    const yeniHedef = srs.ayar.yeniHedef || YENI_HEDEF_VARSAYILAN;
    const yeniBugunKalan = Math.max(0, Math.min(yeniHedef - srs.gun.yeni, toplam - gorulen));
    return { toplam, gorulen, pekisti, ogreniliyor, yeniKalan: toplam - gorulen, dueSay, zor: leechSayisi(),
      yeniHedef, bugunYeni: srs.gun.yeni, bugunTekrar: srs.gun.tekrar, yeniBugunKalan };
  }
  // Seçili kapsam için oturum önizleme (due + yeni sayısı)
  function kapsamOnizle() {
    const k = srs.ayar.kapsam || 'tum';
    const t = bugunGun();
    if (k === 'zor') { const n = leechSayisi(); return { due: n, yeni: 0, toplam: Math.min(n, 40) }; }
    const pool = kapsamHavuz();
    const poolSet = new Set(pool.map(w => w.en.toLowerCase()));
    let due = 0;
    for (const kk in srs.kartlar) if (srs.kartlar[kk].d <= t && poolSet.has(kk)) due++;
    const s = istat();
    let yeniVar = 0;
    for (const w of pool) { if (yeniVar >= s.yeniBugunKalan) break; if (yeniMi(w.en)) yeniVar++; }
    return { due, yeni: yeniVar, toplam: Math.min(due, 80) + yeniVar };
  }

  // ---- oturum kurulumu ----
  function kuyruktanOturum(kuyruk) {
    return { kuyruk: kuyruk.map(x => ({ ...x, mod: modSec(x.w), yon: yonSec(x.w) })), i: 0, dogru: 0, yanlis: 0 };
  }
  function oturumKur() {
    const t = bugunGun(), k = srs.ayar.kapsam || 'tum';
    if (k === 'zor') {
      const leech = havuz.filter(w => leechMi(w.en));
      const kuyruk = shuffle(leech).slice(0, 40).map(w => ({ w, yeniMi: false }));
      oturum = kuyruktanOturum(kuyruk); return kuyruk.length;
    }
    const pool = kapsamHavuz();
    const poolSet = new Set(pool.map(w => w.en.toLowerCase()));
    const due = [];
    for (const kk in srs.kartlar) if (srs.kartlar[kk].d <= t && poolSet.has(kk)) { const w = havuzIndex.get(kk); if (w) due.push(w); }
    const s = istat();
    const yeniler = [];
    for (const w of pool) { if (yeniler.length >= s.yeniBugunKalan) break; if (yeniMi(w.en)) yeniler.push(w); }
    // zor kelimeler öne alınır (önce onlar pekişsin)
    due.sort((a, b) => (leechMi(b.en) ? 1 : 0) - (leechMi(a.en) ? 1 : 0));
    const dueSec = due.slice(0, 80);
    const kuyruk = shuffle([...dueSec.map(w => ({ w, yeniMi: false })), ...yeniler.map(w => ({ w, yeniMi: true }))]);
    oturum = kuyruktanOturum(kuyruk); return kuyruk.length;
  }
  // Belirli kelime listesinden oturum (kelime listesinden "çalış")
  function listedenOturum(words) {
    const kuyruk = shuffle(words).slice(0, 60).map(w => ({ w, yeniMi: yeniMi(w.en) }));
    oturum = kuyruktanOturum(kuyruk);
    if (kuyruk.length) cizOturum();
  }

  // Karta uygun çalışma modu ve yön
  function clozeHazir(w) { return Array.isArray(w.ornek_tokenlar) && w.ornek_tokenlar.some(t => t.vurgu); }
  function modSec(w) {
    const m = srs.ayar.mod || 'akilli';
    if (m !== 'akilli') {
      if (m === 'bosluk' && !clozeHazir(w)) return 'coktan';   // örnek yoksa çoktan seçmeye düş
      return m;
    }
    const c = kartDurum(w.en); const r = c ? c.r : 0;
    if (r >= 3) return (clozeHazir(w) && Math.random() < 0.5) ? 'bosluk' : 'yazim';
    if (r >= 1) return 'coktan';
    return 'kart';
  }
  function yonSec(w) {
    const y = srs.ayar.yon || 'karisik';
    if (y !== 'karisik') return y;
    return Math.random() < 0.5 ? 'en2tr' : 'tr2en';
  }

  // ---- telaffuz ----
  function seslendir(text) {
    try {
      if (!window.speechSynthesis) return;
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'en-US'; u.rate = 0.92;
      speechSynthesis.cancel(); speechSynthesis.speak(u);
    } catch (_) {}
  }
  const sesVar = () => !!window.speechSynthesis;

  // ======================================================= PANEL
  function panel() {
    ekranModu('Kelime Öğren', anaSayfa);
    yukle().then(cizPanel).catch(() => {
      render('<div class="cumle"><div class="tr">Kelime havuzu yüklenemedi. İnternet/önbelleği kontrol et.</div></div>');
    });
  }

  function cizPanel() {
    gunSifirla();
    const s = istat();
    const on = kapsamOnizle();
    const oturumAdet = on.toplam;
    const r = 34, cevre = 2 * Math.PI * r;
    const bugunToplam = s.bugunYeni;
    const oran = clamp(s.yeniHedef ? bugunToplam / s.yeniHedef : 0, 0, 1);
    const dolu = cevre * oran, tamam = bugunToplam >= s.yeniHedef;
    const ilerlemeYuzde = s.toplam ? Math.round(s.pekisti / s.toplam * 100) : 0;

    const modlar = [['akilli', '✨', 'Akıllı'], ['kart', '🎴', 'Kart'], ['coktan', '🔤', 'Test'], ['yazim', '⌨️', 'Yazım'], ['bosluk', '📝', 'Boşluk'], ['dinle', '🔊', 'Dinle']];
    const modCipler = modlar.map(([id, ik, ad]) => `<button class="ogr-mod-cip ${srs.ayar.mod === id ? 'aktif' : ''}" data-mod="${id}">${ik} ${ad}</button>`).join('');
    const yonlar = [['karisik', '🔀 Karışık'], ['en2tr', 'EN → TR'], ['tr2en', 'TR → EN']];
    const yonCipler = yonlar.map(([id, ad]) => `<button class="ogr-mod-cip ${srs.ayar.yon === id ? 'aktif' : ''}" data-yon="${id}">${ad}</button>`).join('');

    // Kapsam seçenekleri
    const uniteler = [...new Set(havuz.map(w => w.u))].sort((a, b) => a - b);
    const kapsamOps = [`<option value="tum">📚 Tüm kelimeler (${s.toplam})</option>`]
      .concat(uniteler.map(u => `<option value="${u}">Ünite ${u} — ${esc(UNITE_ADI[u] || '')}</option>`))
      .concat([`<option value="zor">🔥 Zorlandıklarım (${s.zor})</option>`]).join('');
    const kapsamDeger = String(srs.ayar.kapsam);

    const sonGunler = grafikVeri(7);
    const enUst = Math.max(1, ...sonGunler.map(g => g.toplam));
    const grafik = sonGunler.map(g => {
      const h = Math.round(g.toplam / enUst * 46);
      return `<div class="ogr-bar-sut"><div class="ogr-bar${g.bugun ? ' bugun' : ''}" style="height:${Math.max(3, h)}px" title="${g.toplam} kelime"></div><span>${g.et}</span></div>`;
    }).join('');

    const kaps = srs.ayar.kapsam;
    const kapsamEt = kaps === 'tum' ? '' : kaps === 'zor' ? ' · 🔥 zor kelimeler' : ` · Ünite ${kaps}`;

    render(`
      <div class="ogr-hero">
        <div class="ogr-hero-sol">
          <div class="ogr-hero-et">🌱 Aralıklı tekrarla kalıcı öğren</div>
          <div class="ogr-hero-bas">Kelime Öğren</div>
          <div class="ogr-hero-alt">${s.gorulen} / ${s.toplam} kelime · <b>${s.pekisti}</b> pekişti</div>
        </div>
        <div class="ogr-ring ${tamam ? 'tamam' : ''}">
          <svg viewBox="0 0 80 80" width="82" height="82">
            <circle class="ogr-ring-arka" cx="40" cy="40" r="${r}"/>
            <circle class="ogr-ring-on" cx="40" cy="40" r="${r}" stroke-dasharray="${dolu.toFixed(1)} ${cevre.toFixed(1)}" transform="rotate(-90 40 40)"/>
          </svg>
          <div class="ogr-ring-yazi">${tamam ? '<b class="ogr-tik">✓</b>' : `<b>${bugunToplam}</b>`}<span>${tamam ? 'hedef!' : '/' + s.yeniHedef + ' yeni'}</span></div>
        </div>
      </div>

      <div class="ogr-ilerleme-cizgi"><div class="ogr-ilerleme-ic" style="width:${ilerlemeYuzde}%"></div></div>
      <div class="ogr-ilerleme-et">Toplam ustalık: %${ilerlemeYuzde}</div>

      <div class="ogr-stat">
        <div class="ogr-stat-cip"><b>${s.pekisti}</b><span>🌳 Pekişti</span></div>
        <div class="ogr-stat-cip"><b>${s.ogreniliyor}</b><span>🌿 Öğreniliyor</span></div>
        <button class="ogr-stat-cip tikla" data-git="zor"><b>${s.zor}</b><span>🔥 Zor</span></button>
        <div class="ogr-stat-cip"><b>${s.yeniKalan}</b><span>✨ Yeni</span></div>
      </div>

      <div class="ogr-kapsam-satir">
        <label class="ogr-kapsam-et">🎯 Kapsam</label>
        <select id="ogrKapsam" class="ogr-kapsam-sec">${kapsamOps}</select>
      </div>

      <button class="ogr-basla ${oturumAdet ? '' : 'bitti'}" id="ogrBasla">
        ${oturumAdet
        ? `<span class="ogr-basla-bas">Oturuma başla${kapsamEt}</span><span class="ogr-basla-alt">${on.due} tekrar · ${on.yeni} yeni · ${oturumAdet} kelime</span>`
        : `<span class="ogr-basla-bas">${kaps === 'zor' ? 'Zor kelime yok 👍' : 'Bu kapsamda çalışılacak yok'}</span><span class="ogr-basla-alt">${kaps === 'tum' ? `${s.bugunYeni} yeni + ${s.bugunTekrar} tekrar bugün` : 'başka kapsam seç veya yarın gel'}</span>`}
      </button>

      <button class="ogr-liste-btn" id="ogrListeAc"><span>📋 Kelime Listesi & Arama</span><span class="ogr-liste-btn-alt">${s.toplam} kelimeyi gez, ara, çalış</span><span class="ogren-banner-ok">›</span></button>

      <div class="ogr-mod-baslik">Çalışma modu</div>
      <div class="ogr-mod-cipler">${modCipler}</div>
      <div class="ogr-mod-baslik">Yön</div>
      <div class="ogr-mod-cipler">${yonCipler}</div>

      <div class="ogr-hedef-satir">
        <div><b>🎯 Günlük yeni kelime hedefi</b><i>Her gün en az ${s.yeniHedef} yeni kelime</i></div>
        <div class="ogr-hedef-btnler">
          <button class="ogr-hedef-btn" data-h="-">−</button>
          <span class="ogr-hedef-deger">${s.yeniHedef}</span>
          <button class="ogr-hedef-btn" data-h="+">+</button>
        </div>
      </div>

      <div class="ogr-grafik-baslik">Son 7 gün</div>
      <div class="ogr-grafik">${grafik}</div>

      <div class="ogr-bilgi">
        <div class="ogr-bilgi-bas">🧠 Nasıl çalışır?</div>
        <p>Her kelimeyi <b>tam unutmadan önce</b> tekrar gösteririm (aralıklı tekrar). Doğru bildikçe aralık uzar: 1 → 3 → 7 → 14 → 30 gün. Kelime olgunlaştıkça mod da zorlaşır: <b>tanıma</b> → <b>çoktan seçme</b> → <b>yazım</b>/<b>cümle-içi boşluk</b>. Çok yanlış yaptıkların <b>🔥 zor</b> işaretlenip sık tekrar edilir.</p>
      </div>
    `);

    document.getElementById('ogrBasla').onclick = () => { if (oturumKur() > 0) cizOturum(); else cizPanel(); };
    document.getElementById('ogrListeAc').onclick = () => kelimeListesi();
    const kapsamSec = document.getElementById('ogrKapsam');
    kapsamSec.value = kapsamDeger;
    kapsamSec.onchange = () => { srs.ayar.kapsam = kapsamSec.value; kaydet(); cizPanel(); };
    document.querySelector('.ogr-stat-cip[data-git="zor"]').onclick = () => { srs.ayar.kapsam = 'zor'; kaydet(); cizPanel(); };
    document.querySelectorAll('.ogr-mod-cip[data-mod]').forEach(b => b.onclick = () => { srs.ayar.mod = b.dataset.mod; kaydet(); cizPanel(); });
    document.querySelectorAll('.ogr-mod-cip[data-yon]').forEach(b => b.onclick = () => { srs.ayar.yon = b.dataset.yon; kaydet(); cizPanel(); });
    document.querySelectorAll('.ogr-hedef-btn').forEach(b => b.onclick = () => {
      const ops = [10, 20, 30, 40, 50]; let idx = ops.indexOf(srs.ayar.yeniHedef); if (idx < 0) idx = 1;
      idx = clamp(idx + (b.dataset.h === '+' ? 1 : -1), 0, ops.length - 1);
      srs.ayar.yeniHedef = ops[idx]; kaydet(); cizPanel();
    });
  }

  function grafikVeri(gunSayisi) {
    const out = [], bugun = bugunStr(), gunAdi = ['Pz', 'Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct'];
    for (let off = gunSayisi - 1; off >= 0; off--) {
      const d = new Date(); d.setDate(d.getDate() - off);
      const t = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      const g = srs.gec.find(x => x.t === t);
      out.push({ et: gunAdi[d.getDay()], toplam: g ? (g.y + g.r) : 0, bugun: t === bugun });
    }
    return out;
  }

  // ======================================================= KELİME LİSTESİ
  function kelimeListesi() {
    ekranModu('Kelime Listesi', () => cizPanel());
    cizListe();
  }
  function listeFiltreli() {
    const q = listeDurum.q.trim().toLowerCase();
    const f = listeDurum.filtre;
    let arr = havuz;
    if (f === 'yeni') arr = arr.filter(w => durum(w.en) === 'yeni');
    else if (f === 'ogreniliyor') arr = arr.filter(w => durum(w.en) === 'ogreniliyor');
    else if (f === 'pekisti') arr = arr.filter(w => durum(w.en) === 'pekisti');
    else if (f === 'favori') arr = arr.filter(w => srs.favori[w.en.toLowerCase()]);
    else if (f === 'zor') arr = arr.filter(w => leechMi(w.en));
    if (q) arr = arr.filter(w => w.en.toLowerCase().includes(q) || (w.tr || '').toLowerCase().includes(q));
    return arr;
  }
  function cizListe() {
    const filtreler = [['tum', 'Tümü'], ['yeni', '✨ Yeni'], ['ogreniliyor', '🌿 Öğreniliyor'], ['pekisti', '🌳 Pekişti'], ['favori', '⭐ Favori'], ['zor', '🔥 Zor']];
    const cipler = filtreler.map(([id, ad]) => `<button class="ogr-liste-cip ${listeDurum.filtre === id ? 'aktif' : ''}" data-f="${id}">${ad}</button>`).join('');
    const arr = listeFiltreli();
    const GOSTER = 250;
    const gosterilen = arr.slice(0, GOSTER);
    const durumNokta = { yeni: '<span class="ogr-durum yeni"></span>', ogreniliyor: '<span class="ogr-durum ogreniliyor"></span>', pekisti: '<span class="ogr-durum pekisti"></span>' };
    const satirlar = gosterilen.map(w => {
      const key = w.en.toLowerCase(), fav = srs.favori[key], lc = leechMi(w.en);
      return `<div class="ogr-liste-oge" data-en="${esc(w.en)}">
        ${durumNokta[durum(w.en)]}
        <div class="ogr-liste-ic"><div class="ogr-liste-en">${esc(w.en)}${lc ? ' <span class="ogr-liste-zor">🔥</span>' : ''}</div><div class="ogr-liste-tr">${esc(w.tr)}</div></div>
        ${sesVar() ? `<button class="ogr-liste-ses" data-ses="${esc(w.en)}" aria-label="Seslendir">🔊</button>` : ''}
        <button class="ogr-liste-yildiz ${fav ? 'aktif' : ''}" data-fav="${esc(w.en)}" aria-label="Favori">${fav ? '★' : '☆'}</button>
      </div>`;
    }).join('');
    const calisBtn = arr.length ? `<button class="ogr-basla" id="ogrListeCalis"><span class="ogr-basla-bas">Bu listeyi çalış</span><span class="ogr-basla-alt">${Math.min(arr.length, 60)} kelime · karışık mod</span></button>` : '';
    render(`
      <div class="ogr-liste-ara-satir"><input id="ogrAra" class="ogr-liste-ara" type="text" placeholder="Kelime veya anlam ara…" value="${esc(listeDurum.q)}"></div>
      <div class="ogr-liste-cipler">${cipler}</div>
      <div class="ogr-liste-say">${arr.length} kelime${arr.length > GOSTER ? ` · ilk ${GOSTER} gösteriliyor (aramayla daralt)` : ''}</div>
      ${calisBtn}
      <div class="ogr-liste">${satirlar || '<div class="cumle"><div class="tr">Bu filtrede kelime yok.</div></div>'}</div>
    `);
    const ara = document.getElementById('ogrAra');
    ara.oninput = () => { listeDurum.q = ara.value; cizListeSadeceListe(); };
    document.querySelectorAll('.ogr-liste-cip').forEach(b => b.onclick = () => { listeDurum.filtre = b.dataset.f; cizListe(); });
    const cb = document.getElementById('ogrListeCalis');
    if (cb) cb.onclick = () => listedenOturum(arr);
    wireListeSatir();
  }
  // Arama sırasında yalnız liste + sayaç güncellensin (input odağı kaybolmasın)
  function cizListeSadeceListe() {
    const arr = listeFiltreli();
    const GOSTER = 250, gosterilen = arr.slice(0, GOSTER);
    const durumNokta = { yeni: '<span class="ogr-durum yeni"></span>', ogreniliyor: '<span class="ogr-durum ogreniliyor"></span>', pekisti: '<span class="ogr-durum pekisti"></span>' };
    const kut = document.querySelector('.ogr-liste');
    const say = document.querySelector('.ogr-liste-say');
    if (say) say.textContent = `${arr.length} kelime${arr.length > GOSTER ? ` · ilk ${GOSTER} gösteriliyor (aramayla daralt)` : ''}`;
    if (!kut) return;
    kut.innerHTML = gosterilen.map(w => {
      const key = w.en.toLowerCase(), fav = srs.favori[key], lc = leechMi(w.en);
      return `<div class="ogr-liste-oge" data-en="${esc(w.en)}">
        ${durumNokta[durum(w.en)]}
        <div class="ogr-liste-ic"><div class="ogr-liste-en">${esc(w.en)}${lc ? ' <span class="ogr-liste-zor">🔥</span>' : ''}</div><div class="ogr-liste-tr">${esc(w.tr)}</div></div>
        ${sesVar() ? `<button class="ogr-liste-ses" data-ses="${esc(w.en)}" aria-label="Seslendir">🔊</button>` : ''}
        <button class="ogr-liste-yildiz ${fav ? 'aktif' : ''}" data-fav="${esc(w.en)}" aria-label="Favori">${fav ? '★' : '☆'}</button>
      </div>`;
    }).join('') || '<div class="cumle"><div class="tr">Bu filtrede kelime yok.</div></div>';
    wireListeSatir();
  }
  function wireListeSatir() {
    document.querySelectorAll('.ogr-liste-ses').forEach(b => b.onclick = (e) => { e.stopPropagation(); seslendir(b.dataset.ses); });
    document.querySelectorAll('.ogr-liste-yildiz').forEach(b => b.onclick = (e) => {
      e.stopPropagation();
      const key = b.dataset.fav.toLowerCase();
      if (srs.favori[key]) delete srs.favori[key]; else srs.favori[key] = true;
      kaydet();
      b.classList.toggle('aktif'); b.textContent = srs.favori[key] ? '★' : '☆';
    });
    document.querySelectorAll('.ogr-liste-oge').forEach(o => o.onclick = () => {
      const w = havuzIndex.get(o.dataset.en.toLowerCase()); if (w) kelimeDetay(w);
    });
  }
  function kelimeDetay(w) {
    const c = kartDurum(w.en);
    const durBilgi = c ? `${durum(w.en) === 'pekisti' ? '🌳 Pekişti' : '🌿 Öğreniliyor'} · ${c.r} doğru üst üste · sonraki tekrar ${Math.max(0, (c.d - bugunGun()))} gün sonra${c.l ? ` · ${c.l} kez yanlış` : ''}` : '✨ Henüz çalışılmadı';
    render(`
      <button class="aksiyon ikincil" id="ogrDetGeri" style="margin-bottom:14px">‹ Listeye dön</button>
      <div class="ogr-detay-kart">
        <div class="ogr-detay-tur">${esc(w.tur || '')}${w.u ? ` · Ünite ${w.u}` : ''}</div>
        <div class="ogr-detay-en">${esc(w.en)} ${sesVar() ? '<button class="ogr-ses" id="ogrDetSes">🔊</button>' : ''}</div>
        <div class="ogr-detay-tr">${esc(w.tr)}</div>
        <div class="ogr-detay-durum">${durBilgi}</div>
      </div>
      ${w.ornek_tokenlar ? `<div class="kart-ornek-etiket">Örnek · kelimeye dokun, çeviri için kaydır</div>${ornekHTML({ tokenlar: w.ornek_tokenlar, tr: w.ornek_tr })}` : ''}
      <div class="btn-satir">
        <button class="aksiyon ${srs.favori[w.en.toLowerCase()] ? '' : 'ikincil'}" id="ogrDetFav">${srs.favori[w.en.toLowerCase()] ? '★ Favoride' : '☆ Favoriye ekle'}</button>
        <button class="aksiyon" id="ogrDetCalis">Bu kelimeyi çalış ›</button>
      </div>`);
    document.getElementById('ogrDetGeri').onclick = () => cizListe();
    const ses = document.getElementById('ogrDetSes'); if (ses) ses.onclick = () => seslendir(w.en);
    if (w.ornek_tokenlar) wireOrnekler(document.getElementById('icerik'));
    document.getElementById('ogrDetFav').onclick = () => {
      const key = w.en.toLowerCase(); if (srs.favori[key]) delete srs.favori[key]; else srs.favori[key] = true; kaydet(); kelimeDetay(w);
    };
    document.getElementById('ogrDetCalis').onclick = () => listedenOturum([w]);
  }

  // ======================================================= OTURUM
  let _acik = false, _cevap = null;

  function cizOturum() {
    if (!oturum || oturum.i >= oturum.kuyruk.length) return cizBitis();
    const item = oturum.kuyruk[oturum.i];
    _acik = false; _cevap = null;
    const mod = item.mod;
    if (mod === 'kart' || mod === 'dinle') cizKart(item, mod);
    else if (mod === 'coktan') cizCoktan(item);
    else if (mod === 'bosluk') cizBosluk(item);
    else cizYazim(item);
  }
  function ustBar() {
    const n = oturum.kuyruk.length, i = oturum.i, yuzde = Math.round(i / n * 100);
    return `<button class="aksiyon ikincil" id="ogrCik" style="margin-bottom:12px">‹ Panele dön</button>
      <div class="kart-sayac">Oturum · ${i + 1} / ${n} · ✓ ${oturum.dogru} ✕ ${oturum.yanlis}</div>
      <div class="kart-ilerleme"><div class="kart-ilerleme-ic" style="width:${yuzde}%"></div></div>`;
  }
  function rozet(item) {
    const zor = leechMi(item.w.en) ? '<span class="ogr-rozet zor">🔥 Zor</span>' : '';
    return (item.yeniMi ? '<span class="ogr-rozet yeni">✨ Yeni</span>' : '<span class="ogr-rozet tekrar">🔁 Tekrar</span>') + zor;
  }
  function wireCik() { const b = document.getElementById('ogrCik'); if (b) b.onclick = () => cizPanel(); }

  // --- Kart (tanıma) / Dinle — çift yönlü ---
  function cizKart(item, mod) {
    const w = item.w, dinle = mod === 'dinle';
    const trOn = item.yon === 'tr2en' && !dinle;   // ön yüzde Türkçe göster, İngilizceyi hatırlat
    const onYuz = dinle
      ? `<div class="ogr-kart-on"><button class="ogr-ses buyuk" id="ogrSes">🔊</button><div class="ogr-kart-ipucu">Dinle · kelimeyi hatırla, sonra göster</div></div>`
      : trOn
        ? `<div class="ogr-kart-on">${w.tur ? `<div class="kart-tur">${esc(w.tur)}</div>` : ''}<div class="kart-on ogr-on-tr">${esc(w.tr)}</div><div class="ogr-kart-ipucu">İngilizcesini düşün, sonra göster</div></div>`
        : `<div class="ogr-kart-on">${w.tur ? `<div class="kart-tur">${esc(w.tur)}</div>` : ''}<div class="kart-on">${esc(w.en)} ${sesVar() ? '<button class="ogr-ses" id="ogrSes">🔊</button>' : ''}</div><div class="ogr-kart-ipucu">Anlamı düşün, sonra göster</div></div>`;
    const arkaAna = trOn ? `${esc(w.en)} ${sesVar() ? '<button class="ogr-ses" id="ogrSes2">🔊</button>' : ''}` : esc(w.tr);
    const arkaYuz = `<div class="ogr-kart-arka">
        <div class="kart-arka-tur">${esc(w.tur || '')}${trOn ? '' : ` · ${esc(w.en)} ${sesVar() ? '<button class="ogr-ses" id="ogrSes2">🔊</button>' : ''}`}</div>
        <div class="kart-anlam"><span>${arkaAna}</span></div>
        ${w.ornek_tokenlar ? `<div class="kart-ornek-etiket">Örnek · kelimeye dokun, çeviri için kaydır</div>${ornekHTML({ tokenlar: w.ornek_tokenlar, tr: w.ornek_tr })}` : ''}
      </div>`;
    render(`${ustBar()}<div class="ogr-kart-ustet">${rozet(item)}</div>
      <div class="ogr-calisma-kart">${_acik ? arkaYuz : onYuz}</div>
      ${_acik ? derecelendirmeBtnleri() : `<div class="btn-satir"><button class="aksiyon" id="ogrGoster">Göster</button></div>`}`);
    wireCik();
    ['ogrSes', 'ogrSes2'].forEach(id => { const el = document.getElementById(id); if (el) el.onclick = () => seslendir(w.en); });
    if (dinle && !_acik) seslendir(w.en);
    if (!_acik) { const g = document.getElementById('ogrGoster'); if (g) g.onclick = () => { _acik = true; cizKart(item, mod); }; }
    else { if (w.ornek_tokenlar) wireOrnekler(document.getElementById('icerik')); wireDerece(item); }
  }
  function derecelendirmeBtnleri() {
    return `<div class="ogr-derece">
      <button class="ogr-d-btn tekrar" data-q="0">Tekrar<span>bilemedim</span></button>
      <button class="ogr-d-btn zor" data-q="1">Zor<span>zorlandım</span></button>
      <button class="ogr-d-btn kolay" data-q="2">Kolay<span>bildim</span></button>
    </div>`;
  }
  function wireDerece(item) {
    document.querySelectorAll('.ogr-d-btn').forEach(b => b.onclick = () => {
      const q = Number(b.dataset.q); derecelendir(item.w, q);
      if (q === 0) oturum.yanlis++; else oturum.dogru++; ilerle();
    });
  }

  // --- Çoktan seçme — çift yönlü (EN→TR veya TR→EN) ---
  function cizCoktan(item) {
    const w = item.w, tr2en = item.yon === 'tr2en';
    const dogruCevap = tr2en ? w.en : w.tr;
    const alan = (x) => tr2en ? x.en : x.tr;
    if (!item._sec) {
      const yanlislar = shuffle(havuz.filter(x => x.en !== w.en && alan(x) && alan(x) !== dogruCevap)).slice(0, 3).map(alan);
      item._sec = shuffle([dogruCevap, ...yanlislar]);
    }
    const harf = ['A', 'B', 'C', 'D'], cevaplandi = _cevap != null, dogruMu = cevaplandi && _cevap === dogruCevap;
    const sikler = item._sec.map((o, idx) => {
      let cls = 'q-secenek', im = '';
      if (cevaplandi) { if (o === dogruCevap) { cls += ' dogru'; im = '<span class="q-isaret">✓</span>'; } else if (o === _cevap) { cls += ' yanlis'; im = '<span class="q-isaret">✕</span>'; } }
      return `<button class="${cls}" data-o="${esc(o)}" ${cevaplandi ? 'disabled' : ''}><span class="q-harf">${harf[idx]}</span><span class="q-sik-metin">${esc(o)}</span>${im}</button>`;
    }).join('');
    let alt = '';
    if (cevaplandi) {
      alt = `<div class="q-sonuc-rozet ${dogruMu ? 'dogru' : 'yanlis'}">${dogruMu ? '✓ Doğru' : '✕ Doğrusu: ' + esc(dogruCevap)}</div>`;
      if (w.ornek_tokenlar) alt += `<div class="q-ornek"><div class="q-ornek-etiket">Örnek · kelimeye dokun, çeviri için kaydır</div>${ornekHTML({ tokenlar: w.ornek_tokenlar, tr: w.ornek_tr })}</div>`;
      alt += `<div class="btn-satir"><button class="aksiyon" id="ogrDevam">Devam ›</button></div>`;
    }
    const soru = tr2en ? esc(w.tr) : `${esc(w.en)} ${sesVar() ? '<button class="ogr-ses" id="ogrSes">🔊</button>' : ''}`;
    render(`${ustBar()}<div class="ogr-kart-ustet">${rozet(item)} <span class="ogr-mod-et">${tr2en ? '🔤 İngilizcesini seç' : '🔤 Anlamını seç'}</span></div>
      <div class="soru-kart"><div class="soru-etiket">${tr2en ? 'Bu Türkçenin İngilizcesi?' : 'Bu kelimenin anlamı?'}</div><div class="soru-cumle ${tr2en ? 'ogr-soru-tr' : 'ogr-soru-kelime'}">${soru}</div></div>
      <div class="q-secenekler">${sikler}</div>${alt}`);
    wireCik();
    const ses = document.getElementById('ogrSes'); if (ses) ses.onclick = () => seslendir(w.en);
    if (!cevaplandi) {
      document.querySelectorAll('.q-secenek').forEach(b => b.onclick = () => {
        _cevap = b.dataset.o; const dogru = _cevap === dogruCevap;
        derecelendir(w, dogru ? 2 : 0); if (dogru) oturum.dogru++; else oturum.yanlis++; cizCoktan(item);
      });
    } else { if (w.ornek_tokenlar) wireOrnekler(document.getElementById('icerik')); document.getElementById('ogrDevam').onclick = ilerle; }
  }

  // --- Yazım (TR → EN üretim) ---
  const normYaz = (s) => String(s || '').toLowerCase().trim().replace(/^to\s+/, '').replace(/[.,!?;:"'’]+$/g, '');
  function cizYazim(item) {
    const w = item.w, cevaplandi = _cevap != null, dogruMu = cevaplandi && normYaz(_cevap) === normYaz(w.en);
    let alt = '';
    if (cevaplandi) {
      alt = `<div class="q-sonuc-rozet ${dogruMu ? 'dogru' : 'yanlis'}">${dogruMu ? '✓ Doğru: ' + esc(w.en) : '✕ Doğrusu: ' + esc(w.en) + (normYaz(_cevap) ? ' · yazdığın: ' + esc(_cevap) : '')}</div>`;
      if (w.ornek_tokenlar) alt += `<div class="q-ornek"><div class="q-ornek-etiket">Örnek · kelimeye dokun, çeviri için kaydır</div>${ornekHTML({ tokenlar: w.ornek_tokenlar, tr: w.ornek_tr })}</div>`;
      alt += `<div class="btn-satir"><button class="aksiyon" id="ogrDevam">Devam ›</button></div>`;
    }
    render(`${ustBar()}<div class="ogr-kart-ustet">${rozet(item)} <span class="ogr-mod-et">⌨️ İngilizcesini yaz</span></div>
      <div class="soru-kart"><div class="soru-etiket">Türkçesi verildi — İngilizcesini yaz</div><div class="soru-cumle ogr-soru-tr">${esc(w.tr)}</div>${w.tur ? `<div class="ogr-yazim-ipucu">${esc(w.tur)}</div>` : ''}</div>
      <div class="ogr-yazim-alan">
        <input id="ogrYazi" class="ogr-yazi-input" type="text" autocomplete="off" autocapitalize="none" autocorrect="off" spellcheck="false" placeholder="İngilizce yaz…" ${cevaplandi ? 'disabled' : ''} value="${cevaplandi ? esc(_cevap) : ''}">
        ${cevaplandi ? '' : '<button class="aksiyon" id="ogrKontrol">Kontrol et</button><button class="aksiyon ikincil" id="ogrBilmiyorum">Bilmiyorum</button>'}
      </div>${alt}`);
    wireCik();
    if (!cevaplandi) {
      const inp = document.getElementById('ogrYazi');
      const onayla = (deger) => { _cevap = deger; const dogru = normYaz(deger) === normYaz(w.en); derecelendir(w, dogru ? 2 : 0); if (dogru) oturum.dogru++; else oturum.yanlis++; cizYazim(item); };
      document.getElementById('ogrKontrol').onclick = () => onayla(inp.value);
      document.getElementById('ogrBilmiyorum').onclick = () => onayla('');
      inp.onkeydown = (e) => { if (e.key === 'Enter' && inp.value.trim()) onayla(inp.value); };
      setTimeout(() => inp.focus(), 60);
    } else { if (w.ornek_tokenlar) wireOrnekler(document.getElementById('icerik')); document.getElementById('ogrDevam').onclick = ilerle; }
  }

  // --- Cümle-içi boşluk (bağlamdan üretim) ---
  function cizBosluk(item) {
    const w = item.w, toks = w.ornek_tokenlar || [];
    // vurgulu token grubunu boşluğa çevir (hedef = birleşik vurgu tokenları)
    const hedefToks = toks.filter(t => t.vurgu);
    const dogru = hedefToks.map(t => t.k).join(' ');
    const cevaplandi = _cevap != null;
    const dogruMu = cevaplandi && (normYaz(_cevap) === normYaz(dogru) || normYaz(_cevap) === normYaz(w.en));
    let govde;
    if (cevaplandi) {
      govde = ornekHTML({ tokenlar: toks, tr: w.ornek_tr });
    } else {
      let boslukKondu = false;
      const parcalar = [];
      for (const t of toks) {
        if (t.vurgu) { if (!boslukKondu) { parcalar.push('<span class="q-bosluk"></span>'); boslukKondu = true; } }
        else { boslukKondu = false; parcalar.push(esc(t.k)); }
      }
      govde = `<div class="soru-cumle">${parcalar.join(' ')}</div>`;
    }
    let alt = '';
    if (cevaplandi) {
      alt = `<div class="q-sonuc-rozet ${dogruMu ? 'dogru' : 'yanlis'}">${dogruMu ? '✓ Doğru: ' + esc(dogru) : '✕ Doğrusu: ' + esc(dogru) + (normYaz(_cevap) ? ' · yazdığın: ' + esc(_cevap) : '')}</div>`;
      alt += `<div class="btn-satir"><button class="aksiyon" id="ogrDevam">Devam ›</button></div>`;
    }
    render(`${ustBar()}<div class="ogr-kart-ustet">${rozet(item)} <span class="ogr-mod-et">📝 Boşluğu doldur (${esc(w.tr)})</span></div>
      <div class="soru-kart"><div class="soru-etiket">Cümledeki boşluğa uygun İngilizce kelimeyi yaz</div>${govde}</div>
      <div class="ogr-yazim-alan">
        <input id="ogrYazi" class="ogr-yazi-input" type="text" autocomplete="off" autocapitalize="none" autocorrect="off" spellcheck="false" placeholder="Boşluğa gelen kelime…" ${cevaplandi ? 'disabled' : ''} value="${cevaplandi ? esc(_cevap) : ''}">
        ${cevaplandi ? '' : '<button class="aksiyon" id="ogrKontrol">Kontrol et</button><button class="aksiyon ikincil" id="ogrBilmiyorum">Bilmiyorum</button>'}
      </div>${alt}`);
    wireCik();
    if (!cevaplandi) {
      const inp = document.getElementById('ogrYazi');
      const onayla = (deger) => { _cevap = deger; const d = normYaz(deger) === normYaz(dogru) || normYaz(deger) === normYaz(w.en); derecelendir(w, d ? 2 : 0); if (d) oturum.dogru++; else oturum.yanlis++; cizBosluk(item); };
      document.getElementById('ogrKontrol').onclick = () => onayla(inp.value);
      document.getElementById('ogrBilmiyorum').onclick = () => onayla('');
      inp.onkeydown = (e) => { if (e.key === 'Enter' && inp.value.trim()) onayla(inp.value); };
      setTimeout(() => inp.focus(), 60);
    } else { wireOrnekler(document.getElementById('icerik')); document.getElementById('ogrDevam').onclick = ilerle; }
  }

  function ilerle() { oturum.i++; cizOturum(); }

  // ======================================================= BİTİŞ
  function cizBitis() {
    const topl = oturum.dogru + oturum.yanlis, yuzde = topl ? Math.round(oturum.dogru / topl * 100) : 0;
    const s = istat();
    const on = kapsamOnizle();
    let enYakin = null; const t = bugunGun();
    for (const k in srs.kartlar) { const d = srs.kartlar[k].d; if (d > t && (enYakin == null || d < enYakin)) enYakin = d; }
    const yakinGun = enYakin != null ? enYakin - t : null;
    render(`
      <div class="ogr-bitis">
        <div class="ogr-bitis-amblem">${yuzde >= 80 ? '🌟' : yuzde >= 50 ? '👏' : '💪'}</div>
        <div class="ogr-bitis-bas">Oturum tamam</div>
        <div class="ogr-bitis-skor">${oturum.dogru} / ${topl} doğru · %${yuzde}</div>
        <div class="ogr-bitis-ozet">
          <div><b>${srs.gun.yeni}</b><span>bugün yeni</span></div>
          <div><b>${srs.gun.tekrar}</b><span>bugün tekrar</span></div>
          <div><b>${s.pekisti}</b><span>pekişmiş</span></div>
        </div>
        ${s.zor ? `<div class="ogr-bitis-not">🔥 ${s.zor} zor kelime var — "Zorlandıklarım" kapsamıyla odaklan.</div>` : ''}
        ${yakinGun != null ? `<div class="ogr-bitis-not">🔁 Sonraki tekrar ${yakinGun === 0 ? 'bugün' : yakinGun + ' gün sonra'}.</div>` : ''}
      </div>
      <div class="btn-satir">
        ${on.toplam ? `<button class="aksiyon" id="ogrDevamOturum">Devam et (${on.toplam} kelime)</button>` : ''}
        <button class="aksiyon ikincil" id="ogrPanel">Panele dön</button>
      </div>`);
    const dv = document.getElementById('ogrDevamOturum');
    if (dv) dv.onclick = () => { if (oturumKur() > 0) cizOturum(); else cizPanel(); };
    document.getElementById('ogrPanel').onclick = () => cizPanel();
  }

  return { ac: panel };
}
