// app/js/gun.js — Gün planı: havuz üretimde 20'şerlik günlere bölünür (kelime.g), burada
//  • Günler ızgarası (Kelimeler › Günler): her gün için durum + kademe renkli ilerleme barı
//  • Gün detay: hero (Kelime Çalış), kelime listesi, test satırları (tek oturumluk mod/yön), hızlı kartlar
//  • Bugün hero kartı: "Sıradaki gün · 7/20 · Başla"
// Kademe ve gün hesapları kademe.js'te (saf). "Kaldığın gün" ayar.sonGunKelime olarak (kelime) saklanır:
// içerik yeniden üretilip günler kaysa da kullanıcı aynı kelimenin gününe düşer.
import { srs } from './durum.js';
import { KADEME_AD, gunlereBol, gunDurumu, siradakiGun, tamamlananGun } from './kademe.js';

export function kurGun(api) {
  const { render, esc, havuzYukle, altEkran, sekmeKok, calis, listeAc, akisAc, ayar, ayarKaydet } = api;
  let gunler = null;   // Map<g, kelimeler[]>
  let acik = 0;        // açık gün detayı (0 = ızgara); sekmeye dönüşte aynı gün açılır
  let ust = '';        // ızgaranın üstüne segment HTML'i (Kelimeler sekmesi)

  const icerik = () => document.getElementById('icerik');
  const kartlar = () => srs.kartlar || {};
  const ustHTML = () => (typeof ust === 'function' ? ust() : ust) || '';

  async function hazirla() {
    if (gunler) return gunler;
    gunler = gunlereBol(await havuzYukle());
    return gunler;
  }
  const gunSayisi = () => (gunler ? gunler.size : 0);

  // ---- kaldığın gün (kelime olarak saklanır) ----
  function sonGun() {
    const k = String(ayar().sonGunKelime || '').toLowerCase();
    if (!k || !gunler) return 0;
    for (const [g, ws] of gunler) if (ws.some(w => String(w.en).toLowerCase() === k)) return g;
    return 0;
  }
  function sonGunYaz(g) {
    const ws = gunler && gunler.get(g);
    if (!ws || !ws.length) return;
    const a = ayar();
    if (a.sonGunKelime === ws[0].en) return;
    a.sonGunKelime = ws[0].en; ayarKaydet();
  }
  const siradaki = () => (gunler ? siradakiGun(gunler, kartlar(), sonGun()) : 0);

  // ---- parçalar ----
  function barHTML(d, cls = '') {
    const seg = [1, 2, 3, 4, 5].filter(k => d.hist[k]).map(k => `<i class="k${k}" style="width:${(d.hist[k] / d.toplam * 100).toFixed(1)}%"></i>`).join('');
    return `<span class="gp-bar kademe ${cls}" role="progressbar" aria-valuenow="${d.n}" aria-valuemin="0" aria-valuemax="${d.toplam}" aria-label="${d.n} / ${d.toplam} kelime çalışıldı">${seg}</span>`;
  }
  function durumMetni(d) {
    if (d.durum === 'tamam') return '✓ Tamam';
    if (d.durum === 'devam') return `${d.n}/${d.toplam}`;
    return 'Başlanmadı';
  }
  function legendHTML(d) {
    const parca = [5, 4, 3, 2, 1].filter(k => d.hist[k]).map(k => `<li><i class="k${k}"></i>${KADEME_AD[k]} ${d.hist[k]}</li>`);
    if (d.hist[0]) parca.push(`<li><i class="k0"></i>Yeni ${d.hist[0]}</li>`);
    return `<ul class="gp-legend">${parca.join('')}</ul>`;
  }
  function satirHTML(id, ikon, baslik, alt, opt = {}) {
    return `<button class="gp-satir ${opt.pasif ? 'pasif' : ''}" id="${id}" ${opt.pasif ? 'disabled' : ''}>
      <span class="gp-kutu" aria-hidden="true">${ikon}</span>
      <span class="gp-satir-ic"><b>${esc(baslik)}</b><i>${esc(alt)}</i></span>
      <span class="gp-satir-ok" aria-hidden="true">${opt.sag || '›'}</span>
    </button>`;
  }

  // ---- Bugün hero ----
  function heroHTML() {
    if (!gunler || !gunler.size) return '';
    const g = siradaki();
    if (!g) {
      return `<div class="gp-hero tamam"><div class="gp-hero-govde"><span class="gp-hero-et">GÜN PLANI</span><span class="gp-hero-bas">Bütün günler tamam 🎉</span><span class="gp-hero-alt"><span>${gunSayisi()} günün hepsine en az bir kez çalıştın. Tekrarlar seni Kelimeler › Öğren'de bekliyor.</span></span></div></div>`;
    }
    const d = gunDurumu(gunler.get(g), kartlar());
    const devam = d.durum === 'devam';
    return `<div class="gp-hero">
      <button class="gp-hero-govde" id="gpHeroGovde" aria-label="${g}. Gün, ${d.n} / ${d.toplam} kelime çalışıldı. Gün detayını aç">
        <span class="gp-hero-et">${devam ? 'KALDIĞIN GÜN' : 'SIRADAKİ GÜN'}</span>
        <span class="gp-hero-bas">${g}. Gün</span>
        <span class="gp-hero-alt"><span>${d.n} / ${d.toplam} kelime çalışıldı</span><span>${gunSayisi()} günden ${g}.</span></span>
        ${barHTML(d, 'hero')}
      </button>
      <button class="gp-hero-btn" id="gpHeroBasla">${devam ? 'Devam et' : 'Başla'}</button>
    </div>`;
  }
  function heroBagla() {
    const g = siradaki(); if (!g) return;
    const gov = document.getElementById('gpHeroGovde'); if (gov) gov.onclick = () => detay(g);
    const bas = document.getElementById('gpHeroBasla'); if (bas) bas.onclick = () => { sonGunYaz(g); calis(gunler.get(g), { donus: () => detay(g) }); };
  }

  // ---- Günler ızgarası ----
  function ac(opts = {}) {
    if (opts.ustHTML !== undefined) ust = opts.ustHTML;
    hazirla().then(() => (acik && gunler.has(acik) ? detay(acik) : izgara())).catch(() => {
      sekmeKok(); render(`${ustHTML()}<div class="cumle"><div class="tr">Kelime havuzu yüklenemedi. İnternet/önbelleği kontrol et.</div></div>`);
    });
  }
  function izgara() {
    acik = 0; sekmeKok();
    if (!gunler.size) { render(`${ustHTML()}<div class="gp-bos"><div class="gp-kutu">📅</div><h3>Gün planı yok</h3><p>Kelime havuzu gün bilgisi olmadan üretilmiş. Uygulamayı güncelleyince günler burada görünür.</p></div>`); return; }
    const sira = siradaki(), tamam = tamamlananGun(gunler, kartlar());
    const kartlarHTML = [...gunler].map(([g, ws]) => {
      const d = gunDurumu(ws, kartlar());
      return `<button class="gp-kart ${g === sira ? 'aktif' : ''}" data-g="${g}" aria-label="${g}. Gün, ${ws.length} kelime, ${durumMetni(d).replace('✓ ', '')}" ${g === sira ? 'aria-current="true"' : ''}>
        <span class="gp-kart-ust"><b>${g}. Gün</b><span class="gp-kart-d ${d.durum}">${durumMetni(d)}</span></span>
        <span class="gp-kart-m">${ws.length} kelime</span>
        ${barHTML(d)}
      </button>`;
    }).join('');
    render(`${ustHTML()}
      <div class="gp-ozet"><b>${tamam} / ${gunler.size} gün tamam</b><span>Her gün 20 kelime; seviye ve sınav sıklığı sırasıyla. Bir güne dokun, kartlarla çalış.</span></div>
      <div class="gp-izgara">${kartlarHTML}</div>`);
    icerik().querySelectorAll('.gp-kart').forEach(b => { b.onclick = () => detay(+b.dataset.g); });
    const ak = icerik().querySelector('.gp-kart.aktif');
    if (ak && sira > 6) ak.scrollIntoView({ block: 'center' });
  }

  // ---- Gün detay ----
  function detay(g) {
    hazirla().then(() => {
      if (!gunler.has(g)) return izgara();
      acik = g;   // yalnızca çalışma başlayınca sıradaki gün ilerler (detay açmak ilerletmez)
      altEkran(`${g}. Gün`, izgara);
      const ws = gunler.get(g), d = gunDurumu(ws, kartlar());
      const ilk = ws.slice(0, 3).map(w => w.en).join(', ');
      render(`
        <div class="gp-hero">
          <div class="gp-hero-govde">
            <span class="gp-hero-et">GÜN ${g} / ${gunler.size}</span>
            <span class="gp-hero-bas">${ws.length} kelime</span>
            <span class="gp-hero-alt"><span>${d.durum === 'tamam' ? 'Hepsi en az bir kez çalışıldı' : d.n ? `${d.n} çalışıldı · ${d.toplam - d.n} yeni` : 'Henüz başlanmadı'}</span><span>${esc(ilk)}…</span></span>
            ${barHTML(d, 'hero')}
          </div>
          <button class="gp-hero-btn" id="gpCalis">${d.durum === 'baslanmadi' ? 'Kelime Çalış' : 'Tekrar Çalış'}</button>
        </div>
        ${legendHTML(d)}
        <div class="plan-baslik">Kelimeler</div>
        ${satirHTML('gpListe', '≡', 'Kelime Listesi', `${ws.length} kelime, anlam ve örnek cümleyle`)}
        ${satirHTML('gpAkis', '🎬', 'Hızlı kartlar', 'Kaydır, dinle, deftere al')}
        <div class="plan-baslik">Testler</div>
        ${satirHTML('gpEn2tr', '🔤', 'İngilizce → Türkçe', 'Kelimeyi gör, anlamı seç')}
        ${satirHTML('gpTr2en', '🔁', 'Türkçe → İngilizce', 'Anlamı gör, kelimeyi seç')}
        ${satirHTML('gpYazim', '⌨️', 'Yazım', 'Anlamı gör, kelimeyi yaz')}
        ${satirHTML('gpBosluk', '📝', 'Boşluk doldurma', 'Örnek cümlede eksik kelimeyi tamamla')}
        ${satirHTML('gpKarisik', '🎲', 'Karışık', 'Akıllı mod: kelimenin olgunluğuna göre soru tipi')}
      `);
      const bagla = (id, fn) => { const el = document.getElementById(id); if (el) el.onclick = fn; };
      bagla('gpCalis', () => { sonGunYaz(g); calis(ws, { donus: () => detay(g) }); });
      bagla('gpListe', () => listeAc(g, ws));
      bagla('gpAkis', () => akisAc(ws, `${g}. Gün`));
      bagla('gpEn2tr', () => calis(ws, { mod: 'coktan', yon: 'en2tr' }));
      bagla('gpTr2en', () => calis(ws, { mod: 'coktan', yon: 'tr2en' }));
      bagla('gpYazim', () => calis(ws, { mod: 'yazim', yon: 'tr2en' }));
      bagla('gpBosluk', () => calis(ws, { mod: 'bosluk' }));
      bagla('gpKarisik', () => calis(ws, { mod: 'akilli', yon: 'karisik' }));
    });
  }

  return { ac, detay, hazirla, heroHTML, heroBagla, siradaki, gunSayisi };
}
