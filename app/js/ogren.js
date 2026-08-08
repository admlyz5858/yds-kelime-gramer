// app/js/ogren.js — "Kelime Öğren": tüm ünitelerin kelimeleriyle aralıklı-tekrar (SRS) çalışma bölümü.
//
// Öğrenme bilimi (araştırma temelli):
//  • Aralıklı tekrar (SM-2 türevi): her kelime, unutulmaya yakın anda tekrar gösterilir.
//  • Aktif hatırlama: cevabı görmeden önce üret (kart çevir / çoktan seçme / yazım).
//  • Kademeli zorluk: yeni kelime → tanıma; olgunlaşınca → çoktan seçme → yazım (üretim).
//  • Harmanlama (interleaving): oturumda kelimeler ve modlar karışık gelir.
//  • Günlük hedef + seri: her gün en az 20 yeni kelime + biriken tekrarlar.
import { loadSRS, saveSRS } from './storage.js';

const GUN_MS = 86400000;
const bugunGun = () => Math.floor(Date.now() / GUN_MS);
const bugunStr = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const shuffle = (a) => a.map(v => [Math.random(), v]).sort((x, y) => x[0] - y[0]).map(x => x[1]);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const PEKISME = 21;              // gün: bu aralığa ulaşan kelime "pekişmiş" sayılır
const YENI_HEDEF_VARSAYILAN = 20;

// SRS deposu — ilk açılışta oluştur
function bosSRS() {
  return { surum: 1, kartlar: {}, gun: { tarih: '', yeni: 0, tekrar: 0 }, gec: [], ayar: { yeniHedef: YENI_HEDEF_VARSAYILAN } };
}

export function kurKelimeOgren(api) {
  // api: { render, esc, ornekHTML, wireOrnekler, gunKaydet, anaSayfa, ekranModu }
  const { render, esc, ornekHTML, wireOrnekler, gunKaydet, anaSayfa, ekranModu } = api;

  let havuz = null;             // [{en,tur,tr,ornek_tr,ornek_tokenlar,u}]
  let havuzIndex = null;        // enLower -> kelime
  let srs = null;
  let oturum = null;            // { kuyruk:[{w,mod,yeniMi}], i, dogru, yanlis }
  let sabitMod = 'akilli';      // panel'den seçilen mod

  // ---- yükleme ----
  async function yukle() {
    if (havuz) return;
    const r = await fetch('data/kelime-havuz.json');
    if (!r.ok) throw new Error('kelime-havuz.json yüklenemedi');
    const j = await r.json();
    havuz = j.kelimeler || [];
    havuzIndex = new Map(havuz.map(k => [k.en.toLowerCase(), k]));
    srs = loadSRS() || bosSRS();
    if (!srs.ayar) srs.ayar = { yeniHedef: YENI_HEDEF_VARSAYILAN };
    if (!srs.gun) srs.gun = { tarih: '', yeni: 0, tekrar: 0 };
    if (!srs.gec) srs.gec = [];
    gunSifirla();
  }

  function kaydet() { saveSRS(srs); }

  // Gün değiştiyse günlük sayaçları sıfırla
  function gunSifirla() {
    const t = bugunStr();
    if (srs.gun.tarih !== t) { srs.gun = { tarih: t, yeni: 0, tekrar: 0 }; kaydet(); }
  }

  // ---- SRS çekirdeği (SM-2 türevi) ----
  function kartDurum(en) { return srs.kartlar[en.toLowerCase()]; }
  function yeniMi(en) { return !srs.kartlar[en.toLowerCase()]; }

  // q: 0=tekrar(yanlış) 1=zor 2=kolay
  function derecelendir(w, q) {
    const key = w.en.toLowerCase();
    let c = srs.kartlar[key];
    const ilk = !c;
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
    c.d = bugunGun() + c.i;
    c.s = bugunGun();
    srs.kartlar[key] = c;
    // günlük + geçmiş
    if (ilk) srs.gun.yeni++; else srs.gun.tekrar++;
    gecKaydet(q > 0);
    kaydet();
    gunKaydet(1);   // global seri/hedef sayacına da işle
    return ilk;
  }

  function gecKaydet(dogruMu) {
    const t = bugunStr();
    let g = srs.gec.find(x => x.t === t);
    if (!g) { g = { t, y: 0, r: 0, d: 0, w: 0 }; srs.gec.push(g); if (srs.gec.length > 21) srs.gec.shift(); }
    g.y = srs.gun.yeni; g.r = srs.gun.tekrar;
    if (dogruMu) g.d++; else g.w++;
  }

  // ---- istatistik ----
  function istat() {
    const t = bugunGun();
    let pekisti = 0, ogreniliyor = 0, dueSay = 0;
    for (const k in srs.kartlar) {
      const c = srs.kartlar[k];
      if (c.i >= PEKISME) pekisti++; else ogreniliyor++;
      if (c.d <= t) dueSay++;
    }
    const toplam = havuz.length;
    const gorulen = Object.keys(srs.kartlar).length;
    const yeniKalan = toplam - gorulen;
    const yeniHedef = srs.ayar.yeniHedef || YENI_HEDEF_VARSAYILAN;
    const bugunYeni = srs.gun.yeni, bugunTekrar = srs.gun.tekrar;
    const yeniBugunKalan = Math.max(0, Math.min(yeniHedef - bugunYeni, yeniKalan));
    return { toplam, gorulen, pekisti, ogreniliyor, yeniKalan, dueSay, yeniHedef, bugunYeni, bugunTekrar, yeniBugunKalan };
  }

  // ---- oturum kurulumu ----
  function oturumKur() {
    const t = bugunGun();
    const s = istat();
    // Vadesi gelen (görülmüş) kelimeler
    const due = [];
    for (const k in srs.kartlar) {
      if (srs.kartlar[k].d <= t) { const w = havuzIndex.get(k); if (w) due.push(w); }
    }
    // Yeni kelimeler — havuz sırasında (Ünite 1 = en sık; en değerli önce)
    const yeniler = [];
    for (const w of havuz) {
      if (yeniler.length >= s.yeniBugunKalan) break;
      if (yeniMi(w.en)) yeniler.push(w);
    }
    // Oturumu makul tut: en çok 80 tekrar + hedef kadar yeni
    const dueSec = shuffle(due).slice(0, 80);
    const kuyruk = shuffle([
      ...dueSec.map(w => ({ w, yeniMi: false })),
      ...yeniler.map(w => ({ w, yeniMi: true })),
    ]).map(x => ({ ...x, mod: modSec(x.w) }));
    oturum = { kuyruk, i: 0, dogru: 0, yanlis: 0 };
    return kuyruk.length;
  }

  // Karta uygun çalışma modu (akıllı = kademeli zorluk)
  function modSec(w) {
    if (sabitMod !== 'akilli') return sabitMod;
    const c = kartDurum(w.en);
    const r = c ? c.r : 0;
    if (r >= 3) return 'yazim';
    if (r >= 1) return 'coktan';
    return 'kart';
  }

  // ---- telaffuz (Web Speech API; yoksa sessizce atla) ----
  function seslendir(text) {
    try {
      if (!window.speechSynthesis) return;
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'en-US'; u.rate = 0.92;
      speechSynthesis.cancel(); speechSynthesis.speak(u);
    } catch (_) {}
  }
  const sesVar = () => !!window.speechSynthesis;

  // ======================================================= PANEL (dashboard)
  function panel() {
    ekranModu('Kelime Öğren', anaSayfa);
    yukle().then(cizPanel).catch(() => {
      render('<div class="cumle"><div class="tr">Kelime havuzu yüklenemedi. İnternet/önbelleği kontrol et.</div></div>');
    });
  }

  function cizPanel() {
    gunSifirla();
    const s = istat();
    const oturumAdet = s.dueSay + s.yeniBugunKalan;
    const r = 34, cevre = 2 * Math.PI * r;
    const hedefTop = s.yeniHedef;
    const bugunToplam = s.bugunYeni;                       // bugün öğrenilen yeni
    const oran = clamp(hedefTop ? bugunToplam / hedefTop : 0, 0, 1);
    const dolu = cevre * oran, tamam = bugunToplam >= hedefTop;
    const ilerlemeYuzde = s.toplam ? Math.round(s.pekisti / s.toplam * 100) : 0;

    const modlar = [
      ['akilli', '✨', 'Akıllı'], ['kart', '🎴', 'Kart'], ['coktan', '🔤', 'Test'],
      ['yazim', '⌨️', 'Yazım'], ['dinle', '🔊', 'Dinle'],
    ];
    const modCipler = modlar.map(([id, ik, ad]) =>
      `<button class="ogr-mod-cip ${sabitMod === id ? 'aktif' : ''}" data-mod="${id}">${ik} ${ad}</button>`).join('');

    // 7 günlük mini grafik
    const sonGunler = grafikVeri(7);
    const enUst = Math.max(1, ...sonGunler.map(g => g.toplam));
    const grafik = sonGunler.map(g => {
      const h = Math.round(g.toplam / enUst * 46);
      return `<div class="ogr-bar-sut"><div class="ogr-bar${g.bugun ? ' bugun' : ''}" style="height:${Math.max(3, h)}px" title="${g.toplam} kelime"></div><span>${g.et}</span></div>`;
    }).join('');

    render(`
      <div class="ogr-hero">
        <div class="ogr-hero-sol">
          <div class="ogr-hero-et">🌱 Aralıklı tekrarla kalıcı öğren</div>
          <div class="ogr-hero-bas">Kelime Öğren</div>
          <div class="ogr-hero-alt">${s.gorulen} / ${s.toplam} kelime çalışıldı · <b>${s.pekisti}</b> pekişti</div>
        </div>
        <div class="ogr-ring ${tamam ? 'tamam' : ''}">
          <svg viewBox="0 0 80 80" width="82" height="82">
            <circle class="ogr-ring-arka" cx="40" cy="40" r="${r}"/>
            <circle class="ogr-ring-on" cx="40" cy="40" r="${r}" stroke-dasharray="${dolu.toFixed(1)} ${cevre.toFixed(1)}" transform="rotate(-90 40 40)"/>
          </svg>
          <div class="ogr-ring-yazi">${tamam ? '<b class="ogr-tik">✓</b>' : `<b>${bugunToplam}</b>`}<span>${tamam ? 'hedef!' : '/' + hedefTop + ' yeni'}</span></div>
        </div>
      </div>

      <div class="ogr-ilerleme-cizgi"><div class="ogr-ilerleme-ic" style="width:${ilerlemeYuzde}%"></div></div>
      <div class="ogr-ilerleme-et">Toplam ustalık: %${ilerlemeYuzde}</div>

      <div class="ogr-stat">
        <div class="ogr-stat-cip"><b>${s.pekisti}</b><span>🌳 Pekişti</span></div>
        <div class="ogr-stat-cip"><b>${s.ogreniliyor}</b><span>🌿 Öğreniliyor</span></div>
        <div class="ogr-stat-cip"><b>${s.dueSay}</b><span>🔁 Tekrar</span></div>
        <div class="ogr-stat-cip"><b>${s.yeniKalan}</b><span>✨ Yeni</span></div>
      </div>

      <button class="ogr-basla ${oturumAdet ? '' : 'bitti'}" id="ogrBasla">
        ${oturumAdet
        ? `<span class="ogr-basla-bas">Bugünkü oturuma başla</span><span class="ogr-basla-alt">${s.dueSay} tekrar · ${s.yeniBugunKalan} yeni · ${oturumAdet} kelime</span>`
        : `<span class="ogr-basla-bas">Bugünlük tamam 🎉</span><span class="ogr-basla-alt">${s.bugunYeni} yeni + ${s.bugunTekrar} tekrar bugün · yarın yine gel</span>`}
      </button>

      <div class="ogr-mod-baslik">Çalışma modu</div>
      <div class="ogr-mod-cipler">${modCipler}</div>

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
        <p>Her kelimeyi <b>tam unutmadan önce</b> tekrar gösteririm (aralıklı tekrar). Doğru bildikçe tekrar aralığı uzar: 1 → 3 → 7 → 14 → 30 gün. Kelime olgunlaştıkça mod da zorlaşır: önce <b>tanıma</b> (kart), sonra <b>çoktan seçme</b>, en sonda <b>yazarak üretme</b>. Böylece kelimeler kalıcı belleğe yerleşir.</p>
      </div>
    `);

    document.getElementById('ogrBasla').onclick = () => { if (oturumKur() > 0) cizOturum(); else cizPanel(); };
    document.querySelectorAll('.ogr-mod-cip').forEach(b => b.onclick = () => { sabitMod = b.dataset.mod; cizPanel(); });
    document.querySelectorAll('.ogr-hedef-btn').forEach(b => b.onclick = () => {
      const ops = [10, 20, 30, 40, 50];
      let idx = ops.indexOf(srs.ayar.yeniHedef);
      if (idx < 0) idx = 1;
      idx = clamp(idx + (b.dataset.h === '+' ? 1 : -1), 0, ops.length - 1);
      srs.ayar.yeniHedef = ops[idx]; kaydet(); cizPanel();
    });
  }

  function grafikVeri(gunSayisi) {
    const out = [];
    const bugun = bugunStr();
    const gunAdi = ['Pz', 'Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct'];
    for (let off = gunSayisi - 1; off >= 0; off--) {
      const d = new Date(); d.setDate(d.getDate() - off);
      const t = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      const g = srs.gec.find(x => x.t === t);
      out.push({ et: gunAdi[d.getDay()], toplam: g ? (g.y + g.r) : 0, bugun: t === bugun });
    }
    return out;
  }

  // ======================================================= OTURUM
  let _acik = false, _cevap = null;   // kart çevrik mi / kullanıcı cevabı

  function cizOturum() {
    if (!oturum || oturum.i >= oturum.kuyruk.length) return cizBitis();
    const item = oturum.kuyruk[oturum.i];
    _acik = false; _cevap = null;
    const mod = item.mod;
    if (mod === 'kart' || mod === 'dinle') cizKart(item, mod);
    else if (mod === 'coktan') cizCoktan(item);
    else cizYazim(item);
  }

  function ustBar() {
    const n = oturum.kuyruk.length, i = oturum.i;
    const yuzde = Math.round(i / n * 100);
    return `<button class="aksiyon ikincil" id="ogrCik" style="margin-bottom:12px">‹ Panele dön</button>
      <div class="kart-sayac">Oturum · ${i + 1} / ${n} · ✓ ${oturum.dogru} ✕ ${oturum.yanlis}</div>
      <div class="kart-ilerleme"><div class="kart-ilerleme-ic" style="width:${yuzde}%"></div></div>`;
  }
  function rozet(item) {
    return item.yeniMi ? '<span class="ogr-rozet yeni">✨ Yeni</span>' : '<span class="ogr-rozet tekrar">🔁 Tekrar</span>';
  }
  function wireCik() { const b = document.getElementById('ogrCik'); if (b) b.onclick = () => cizPanel(); }

  // --- Mod: Kart (tanıma) / Dinle ---
  function cizKart(item, mod) {
    const w = item.w;
    const dinle = mod === 'dinle';
    const onYuz = dinle
      ? `<div class="ogr-kart-on">
           <button class="ogr-ses buyuk" id="ogrSes">🔊</button>
           <div class="ogr-kart-ipucu">Dinle · kelimeyi hatırla, sonra göster</div>
         </div>`
      : `<div class="ogr-kart-on">
           ${w.tur ? `<div class="kart-tur">${esc(w.tur)}</div>` : ''}
           <div class="kart-on">${esc(w.en)} ${sesVar() ? '<button class="ogr-ses" id="ogrSes">🔊</button>' : ''}</div>
           <div class="ogr-kart-ipucu">Anlamı düşün, sonra göster</div>
         </div>`;
    const arkaYuz = `
      <div class="ogr-kart-arka">
        ${w.tur ? `<div class="kart-arka-tur">${esc(w.tur)} · ${esc(w.en)} ${sesVar() ? '<button class="ogr-ses" id="ogrSes2">🔊</button>' : ''}</div>` : ''}
        <div class="kart-anlam"><span>${esc(w.tr)}</span></div>
        ${w.ornek_tokenlar ? `<div class="kart-ornek-etiket">Örnek · kelimeye dokun, çeviri için kaydır</div>${ornekHTML({ tokenlar: w.ornek_tokenlar, tr: w.ornek_tr })}` : ''}
      </div>`;
    render(`${ustBar()}
      <div class="ogr-kart-ustet">${rozet(item)}</div>
      <div class="ogr-calisma-kart">${_acik ? arkaYuz : onYuz}</div>
      ${_acik ? derecelendirmeBtnleri() : `<div class="btn-satir"><button class="aksiyon" id="ogrGoster">Göster</button></div>`}`);
    wireCik();
    const ses1 = document.getElementById('ogrSes'); if (ses1) ses1.onclick = () => seslendir(w.en);
    const ses2 = document.getElementById('ogrSes2'); if (ses2) ses2.onclick = () => seslendir(w.en);
    if (dinle && !_acik) seslendir(w.en);
    if (!_acik) {
      const g = document.getElementById('ogrGoster'); if (g) g.onclick = () => { _acik = true; cizKart(item, mod); };
    } else {
      if (w.ornek_tokenlar) wireOrnekler(document.getElementById('icerik'));
      wireDerece(item);
    }
  }
  function derecelendirmeBtnleri() {
    return `<div class="ogr-derece">
      <button class="ogr-d-btn tekrar" data-q="0">Tekrar<span>&lt; 1 dk</span></button>
      <button class="ogr-d-btn zor" data-q="1">Zor<span>zorlandım</span></button>
      <button class="ogr-d-btn kolay" data-q="2">Kolay<span>bildim</span></button>
    </div>`;
  }
  function wireDerece(item) {
    document.querySelectorAll('.ogr-d-btn').forEach(b => b.onclick = () => {
      const q = Number(b.dataset.q);
      derecelendir(item.w, q);
      if (q === 0) oturum.yanlis++; else oturum.dogru++;
      ilerle();
    });
  }

  // --- Mod: Çoktan seçme (EN → TR) ---
  function cizCoktan(item) {
    const w = item.w;
    const yanlislar = shuffle(havuz.filter(x => x.en !== w.en && x.tr && x.tr !== w.tr)).slice(0, 3).map(x => x.tr);
    if (!item._sec) item._sec = shuffle([w.tr, ...yanlislar]);
    const sec = item._sec;
    const harf = ['A', 'B', 'C', 'D'];
    const cevaplandi = _cevap != null;
    const dogruMu = cevaplandi && _cevap === w.tr;
    const sikler = sec.map((o, idx) => {
      let cls = 'q-secenek', im = '';
      if (cevaplandi) {
        if (o === w.tr) { cls += ' dogru'; im = '<span class="q-isaret">✓</span>'; }
        else if (o === _cevap) { cls += ' yanlis'; im = '<span class="q-isaret">✕</span>'; }
      }
      return `<button class="${cls}" data-o="${esc(o)}" ${cevaplandi ? 'disabled' : ''}>
        <span class="q-harf">${harf[idx]}</span><span class="q-sik-metin">${esc(o)}</span>${im}</button>`;
    }).join('');
    let alt = '';
    if (cevaplandi) {
      alt = `<div class="q-sonuc-rozet ${dogruMu ? 'dogru' : 'yanlis'}">${dogruMu ? '✓ Doğru' : '✕ Doğrusu: ' + esc(w.tr)}</div>`;
      if (w.ornek_tokenlar) alt += `<div class="q-ornek"><div class="q-ornek-etiket">Örnek · kelimeye dokun, çeviri için kaydır</div>${ornekHTML({ tokenlar: w.ornek_tokenlar, tr: w.ornek_tr })}</div>`;
      alt += `<div class="btn-satir"><button class="aksiyon" id="ogrDevam">Devam ›</button></div>`;
    }
    render(`${ustBar()}
      <div class="ogr-kart-ustet">${rozet(item)} <span class="ogr-mod-et">🔤 Anlamı seç</span></div>
      <div class="soru-kart"><div class="soru-etiket">Bu kelimenin anlamı?</div>
        <div class="soru-cumle ogr-soru-kelime">${esc(w.en)} ${sesVar() ? '<button class="ogr-ses" id="ogrSes">🔊</button>' : ''}</div></div>
      <div class="q-secenekler">${sikler}</div>${alt}`);
    wireCik();
    const ses = document.getElementById('ogrSes'); if (ses) ses.onclick = () => seslendir(w.en);
    if (!cevaplandi) {
      document.querySelectorAll('.q-secenek').forEach(b => b.onclick = () => {
        _cevap = b.dataset.o;
        const dogru = _cevap === w.tr;
        derecelendir(w, dogru ? 2 : 0);
        if (dogru) oturum.dogru++; else oturum.yanlis++;
        cizCoktan(item);
      });
    } else {
      if (w.ornek_tokenlar) wireOrnekler(document.getElementById('icerik'));
      document.getElementById('ogrDevam').onclick = ilerle;
    }
  }

  // --- Mod: Yazım (TR → EN üretim) ---
  const normYaz = (s) => String(s || '').toLowerCase().trim().replace(/^to\s+/, '').replace(/[.,!?;:"'’]+$/g, '');
  function cizYazim(item) {
    const w = item.w;
    const cevaplandi = _cevap != null;
    const dogruMu = cevaplandi && normYaz(_cevap) === normYaz(w.en);
    let alt = '';
    if (cevaplandi) {
      alt = `<div class="q-sonuc-rozet ${dogruMu ? 'dogru' : 'yanlis'}">${dogruMu ? '✓ Doğru: ' + esc(w.en) : '✕ Doğrusu: ' + esc(w.en) + (normYaz(_cevap) ? ' · yazdığın: ' + esc(_cevap) : '')}</div>`;
      if (w.ornek_tokenlar) alt += `<div class="q-ornek"><div class="q-ornek-etiket">Örnek · kelimeye dokun, çeviri için kaydır</div>${ornekHTML({ tokenlar: w.ornek_tokenlar, tr: w.ornek_tr })}</div>`;
      alt += `<div class="btn-satir"><button class="aksiyon" id="ogrDevam">Devam ›</button></div>`;
    }
    render(`${ustBar()}
      <div class="ogr-kart-ustet">${rozet(item)} <span class="ogr-mod-et">⌨️ İngilizcesini yaz</span></div>
      <div class="soru-kart"><div class="soru-etiket">Türkçesi verildi — İngilizcesini yaz</div>
        <div class="soru-cumle ogr-soru-tr">${esc(w.tr)}</div>
        ${w.tur ? `<div class="ogr-yazim-ipucu">${esc(w.tur)}</div>` : ''}</div>
      <div class="ogr-yazim-alan">
        <input id="ogrYazi" class="ogr-yazi-input" type="text" autocomplete="off" autocapitalize="none" autocorrect="off" spellcheck="false"
          placeholder="İngilizce yaz…" ${cevaplandi ? 'disabled' : ''} value="${cevaplandi ? esc(_cevap) : ''}">
        ${cevaplandi ? '' : '<button class="aksiyon" id="ogrKontrol">Kontrol et</button>'}
        ${cevaplandi ? '' : '<button class="aksiyon ikincil" id="ogrBilmiyorum">Bilmiyorum</button>'}
      </div>${alt}`);
    wireCik();
    if (!cevaplandi) {
      const inp = document.getElementById('ogrYazi');
      const onayla = (deger) => {
        _cevap = deger;
        const dogru = normYaz(deger) === normYaz(w.en);
        derecelendir(w, dogru ? 2 : 0);
        if (dogru) oturum.dogru++; else oturum.yanlis++;
        cizYazim(item);
      };
      document.getElementById('ogrKontrol').onclick = () => onayla(inp.value);
      document.getElementById('ogrBilmiyorum').onclick = () => onayla('');
      inp.onkeydown = (e) => { if (e.key === 'Enter' && inp.value.trim()) onayla(inp.value); };
      setTimeout(() => inp.focus(), 60);
    } else {
      if (w.ornek_tokenlar) wireOrnekler(document.getElementById('icerik'));
      document.getElementById('ogrDevam').onclick = ilerle;
    }
  }

  function ilerle() { oturum.i++; cizOturum(); }

  // ======================================================= BİTİŞ
  function cizBitis() {
    const topl = oturum.dogru + oturum.yanlis;
    const yuzde = topl ? Math.round(oturum.dogru / topl * 100) : 0;
    const s = istat();
    const kalan = s.dueSay + s.yeniBugunKalan;
    // Bir sonraki tekrar ne zaman?
    let enYakin = null;
    const t = bugunGun();
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
        ${yakinGun != null ? `<div class="ogr-bitis-not">🔁 Sonraki tekrar ${yakinGun === 0 ? 'bugün' : yakinGun + ' gün sonra'}.</div>` : ''}
      </div>
      <div class="btn-satir">
        ${kalan ? `<button class="aksiyon" id="ogrDevamOturum">Devam et (${kalan} kelime)</button>` : ''}
        <button class="aksiyon ikincil" id="ogrPanel">Panele dön</button>
      </div>`);
    const dv = document.getElementById('ogrDevamOturum');
    if (dv) dv.onclick = () => { if (oturumKur() > 0) cizOturum(); else cizPanel(); };
    document.getElementById('ogrPanel').onclick = () => cizPanel();
  }

  return { ac: panel };
}
