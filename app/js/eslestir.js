// app/js/eslestir.js — "Eşleştirme": EN↔TR eşleştirme oyunu.
// Bölüm = 6 seviye (5 → 8 → 10×60sn → 10×50sn → 10×40sn → 10×30sn), kelimeler kolaydan zora.
// Puan: doğru +10 (seri 3+ → 15, 5+ → 20), yanlış −5, kusursuz seviye +20, süreli seviyede kalan saniye +1'er,
// süre dolarsa −10 ve yeni kelimelerle tekrar. Günün Eşleştirmesi (tarih tohumlu), Düello (kodla), yerel rekorlar.
import { loadEslestir, saveEslestir } from './storage.js';
import { gunStr } from './logic.js';
import { cihazId, skorGonder, liderAl, takmaAdDegistir, ligdenAyril, adGecerli } from './lig.js';

// ======================================================= SAF MANTIK (test edilebilir)
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function tohumluKaristir(arr, rnd) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
export function kisaTR(tr) { return String(tr || '').replace(/\([^)]*\)?/g, ' ').split(/[,;/—·]| - /)[0].replace(/\s+/g, ' ').trim(); }
const turAd = (w) => (String(w.tur || '').toLowerCase().split(/[\s(]/)[0] || 'diğer');

// Havuzu kolaydan zora sırala: Ünite 1 sıklık sırasıyla önce, sonra diğer üniteler; oyuna uygun olmayanlar elenir
export function zorlukSirala(havuz) {
  const uygun = havuz.filter(w => {
    const t = kisaTR(w.tr);
    return w.en && w.en.length >= 2 && t.length >= 2 && t.length <= 24 && !/^-/.test(t) && !/artikel|fiili$/i.test(t);
  });
  // Önce seviye bandı (S1 → S5), bant içinde Ünite 1 sıklık sırası, sonra diğer üniteler; uzun kelime biraz geriye
  const z = new Map();
  const u1 = uygun.filter(w => w.u === 1), diger = uygun.filter(w => w.u !== 1);
  u1.forEach((w, i) => z.set(w, (w.sv || 1) * 10 + i / u1.length + w.en.length / 200));
  diger.forEach(w => z.set(w, (w.sv || 5) * 10 + 1 + ((w.u || 2) - 2) / 13 + w.en.length / 200));
  return [...u1, ...diger].sort((a, b) => z.get(a) - z.get(b));
}

export const SEVIYELER = [{ n: 5, sure: 0 }, { n: 8, sure: 0 }, { n: 10, sure: 60 }, { n: 10, sure: 50 }, { n: 10, sure: 40 }, { n: 10, sure: 30 }];
export const BOLUM_KELIME = 53;
export const PUAN = { dogru: 10, yanlis: 5, kusursuz: 20, sureCeza: 10 };
export const bolumSayisi = (sirali) => Math.ceil(sirali.length / BOLUM_KELIME);

export function bolumKelimeleri(sirali, k) {
  let s = sirali.slice(k * BOLUM_KELIME, (k + 1) * BOLUM_KELIME);
  if (s.length < BOLUM_KELIME) s = sirali.slice(Math.max(0, k * BOLUM_KELIME - (BOLUM_KELIME - s.length)), k * BOLUM_KELIME).concat(s);
  return s;
}
// n kelimelik set: İngilizce ve kısa Türkçe anlam benzersiz; önce adaylar, yetmezse yedek
export function setOlustur(adaylar, n, yedek = []) {
  const out = [], trs = new Set(), ens = new Set();
  for (const w of [...adaylar, ...yedek]) {
    const t = kisaTR(w.tr).toLowerCase(), e = w.en.toLowerCase();
    if (trs.has(t) || ens.has(e)) continue;
    trs.add(t); ens.add(e); out.push(w);
    if (out.length === n) break;
  }
  return out;
}
// Bölümün 6 seviye seti: ilk ikisi en kolaylar; son seviyeler aynı türden (karıştırması zor) kelimelerle
export function seviyeSetleri(sirali, k) {
  const b = bolumKelimeleri(sirali, k);
  const L1 = setOlustur(b, SEVIYELER[0].n, sirali);
  const k1 = b.filter(w => !L1.includes(w));
  const L2 = setOlustur(k1, SEVIYELER[1].n, sirali);
  const rest = k1.filter(w => !L2.includes(w));
  const gruplar = {};
  rest.forEach(w => (gruplar[turAd(w)] ||= []).push(w));
  const sirG = Object.values(gruplar).sort((a, b) => b.length - a.length);
  const kullanilan = new Set();
  const al = (adaylar) => { const s = setOlustur(adaylar.filter(w => !kullanilan.has(w)), 10, rest.filter(w => !kullanilan.has(w)).concat(sirali)); s.forEach(w => kullanilan.add(w)); return s; };
  const L6 = al(sirG[0] || []);
  const L5 = al(sirG[1] || sirG[0] || []);
  const L3 = al(rest);
  const L4 = al(rest);
  return { setler: [L1, L2, L3, L4, L5, L6], havuz: rest };
}
// Tekrar denemesi: bölüm havuzundan tohumlu yeni 10'luk
export function tekrarSeti(bolumHavuz, sirali, seed) {
  return setOlustur(tohumluKaristir(bolumHavuz, mulberry32(seed)), 10, sirali);
}
// Günlük / düello seti: orta zorluk bandından tohumlu 10 kelime
export function ozelSet(sirali, seed) {
  const band = sirali.slice(Math.min(60, sirali.length), Math.min(1800, sirali.length));
  return setOlustur(tohumluKaristir(band, mulberry32(seed)), 10, sirali);
}
export const gunlukTohum = (tarih = gunStr()) => Number(tarih.replace(/-/g, '')) >>> 0;

// Seri (combo): önceki ardışık doğru sayısına göre puan
export const comboPuan = (seriOnce) => seriOnce >= 5 ? 20 : seriOnce >= 3 ? 15 : PUAN.dogru;
// Olay dizisi ('d' doğru / 'y' yanlış) + kalan saniye → seviye puanı dökümü (tamamlanmadıysa bonus yok)
export function puanla(olaylar, kalanSn = 0, tamam = true) {
  let puan = 0, seri = 0, enSeri = 0, dogru = 0, yanlis = 0;
  for (const o of olaylar) {
    if (o === 'd') { puan += comboPuan(seri); seri++; dogru++; enSeri = Math.max(enSeri, seri); }
    else { puan -= PUAN.yanlis; seri = 0; yanlis++; }
  }
  const kusursuz = tamam && yanlis === 0 && dogru > 0 ? PUAN.kusursuz : 0;
  const sureBonus = tamam ? Math.max(0, Math.round(kalanSn)) : 0;
  return { puan: Math.max(0, puan + kusursuz + sureBonus), temel: puan, kusursuz, sureBonus, dogru, yanlis, enSeri };
}
export const seviyeHedef = (sv) => sv.n * PUAN.dogru + PUAN.kusursuz + sv.sure;
export function yildizHesapla(toplam, hedef) { const r = hedef ? toplam / hedef : 0; return r >= 0.8 ? 3 : r >= 0.55 ? 2 : 1; }

export function kodUret(seed, skor) {
  return (seed >>> 0).toString(36).toUpperCase().padStart(5, '0').slice(-5) + '-' + Math.min(1295, Math.max(0, skor | 0)).toString(36).toUpperCase().padStart(2, '0');
}
export function kodCoz(kod) {
  const k = String(kod || '').toUpperCase().replace(/\s/g, '');
  const m = k.match(/^([0-9A-Z]{5})-?([0-9A-Z]{2})$/);
  if (!m) return null;
  return { seed: parseInt(m[1], 36) >>> 0, skor: parseInt(m[2], 36) };
}
export const izgara = (olaylar, n) => olaylar.map(o => o === 'd' ? '🟩' : '🟥').join('') + '⬜'.repeat(Math.max(0, n - olaylar.filter(o => o === 'd').length));

// ======================================================= OYUN MODÜLÜ
export function kurEslestirme(api) {
  const { render, esc, gunKaydet, anaSayfa, ekranModu, paylas, titre, ses, konfeti, toast, havuzYukle, defterdeMi, defterToggle } = api;

  let sirali = null, durum = null, oyun = null, sayac = null;
  const bosDurum = () => ({ surum: 1, bolumler: {}, acikBolum: 0, kayitlar: [], gunluk: {}, duello: [], toplamDogru: 0, toplamYanlis: 0, enIyiSeri: 0, devam: null, lig: null });
  const kaydet = () => saveEslestir(durum);
  async function yukle() {
    if (!sirali) sirali = zorlukSirala(await havuzYukle());
    if (!durum) durum = Object.assign(bosDurum(), loadEslestir() || {});
  }
  const bolumAdet = () => bolumSayisi(sirali);
  const bugun = () => gunStr();

  // Ana sayfa özeti (senkron, havuz gerekmez)
  function ozet() {
    const d = loadEslestir() || {};
    const g = d.gunluk && d.gunluk[bugun()];
    return { bolum: (d.acikBolum || 0) + 1, gunlukOynandi: !!g, devam: d.devam || null, toplamYildiz: Object.values(d.bolumler || {}).reduce((s, b) => s + (b.yildiz || 0), 0) };
  }
  function istat() {
    const d = loadEslestir() || {};
    const bolumler = Object.values(d.bolumler || {});
    return { bitenBolum: bolumler.length, ucYildiz: bolumler.filter(b => b.yildiz === 3).length, gunlukSayi: Object.keys(d.gunluk || {}).length,
      duelloKazanilan: (d.duello || []).filter(x => x.rakip != null && x.skorum > x.rakip).length, enIyiSeri: d.enIyiSeri || 0 };
  }

  // ---------- giriş ----------
  function ac(opts = {}) {
    yukle().then(() => {
      if (opts.gunluk && !durum.gunluk[bugun()]) { gunlukBasla(); return; }
      panelEkrani();
    }).catch(() => { ekranModu('Eşleştirme', anaSayfa); render('<div class="cumle"><div class="tr">Kelime havuzu yüklenemedi.</div></div>'); });
  }
  function panelEkrani() { temizle(); ekranModu('Eşleştirme', anaSayfa); cizPanel(); }

  // ---------- PANEL ----------
  function cizPanel() {
    const t = bugun(), g = durum.gunluk[t];
    const toplamYildiz = Object.values(durum.bolumler).reduce((s, b) => s + (b.yildiz || 0), 0);
    const enIyi = durum.kayitlar.slice().sort((a, b) => b.skor - a.skor)[0];
    const dv = durum.devam;
    const SEZON = 6, adet = bolumAdet(), sezonSay = Math.ceil(adet / SEZON);
    const bantEt = (k) => { const say = {}; for (const w of bolumKelimeleri(sirali, k)) say[w.sv || 0] = (say[w.sv || 0] || 0) + 1; const sv = Object.entries(say).sort((a, b) => b[1] - a[1])[0]?.[0]; return sv && sv !== '0' ? `S${sv}` : ''; };
    const dugum = (k) => {
      const b = durum.bolumler[k], acik = k <= durum.acikBolum, sirada = k === durum.acikBolum && !b;
      const yildiz = b ? '★'.repeat(b.yildiz) + '☆'.repeat(3 - b.yildiz) : '';
      return `<button class="es-dugum ${acik ? 'acik' : 'kilit'} ${b ? 'biten' : ''} ${sirada ? 'sirada' : ''}" data-k="${k}" aria-label="Bölüm ${k + 1}">
        <b>${k + 1}</b>${yildiz ? `<span>${yildiz}</span>` : (acik ? '' : '<span class="kilit-ikon">🔒</span>')}${sirada ? '<em>Oyna</em>' : ''}</button>`;
    };
    const sezonlar = Array.from({ length: sezonSay }, (_, si) => {
      const bas = si * SEZON, bit = Math.min(adet, bas + SEZON);
      const ks = Array.from({ length: bit - bas }, (_, j) => bas + j);
      const biten = ks.filter(k => durum.bolumler[k]).length, yildiz = ks.reduce((t, k) => t + (durum.bolumler[k]?.yildiz || 0), 0);
      const durumu = biten === ks.length ? 'tamam' : (bas <= durum.acikBolum ? 'aktif' : 'kilit');
      const bant = bantEt(bas + Math.floor(ks.length / 2));
      const bas2 = `<div class="es-sezon-bas"><div><b>Sezon ${si + 1}</b><i>Bölüm ${bas + 1}–${bit}${bant ? ` · ${bant} kelimeler` : ''}</i></div><span>${durumu === 'kilit' ? '🔒' : `⭐ ${yildiz}/${ks.length * 3}`}</span></div>`;
      if (durumu === 'kilit') return `<div class="es-sezon kilit" data-s="${si}">${bas2}</div>`;
      return `<div class="es-sezon ${durumu}" data-s="${si}">${bas2}<div class="es-yol">${ks.map(dugum).join('')}</div></div>`;
    }).join('');
    render(`
      <div class="es-hero">
        <div><div class="es-hero-et">🧩 Kelime eşleştir · kolaydan zora</div><div class="es-hero-bas">Eşleştirme</div>
          <div class="es-hero-alt">${Object.keys(durum.bolumler).length}/${bolumAdet()} bölüm · ⭐ ${toplamYildiz}${enIyi ? ` · rekor <b>${enIyi.skor}</b>` : ''}</div></div>
        <div class="es-hero-btnler">
          <button class="es-rekor-btn" id="esRekorlar">🏆<span>Rekorlar</span></button>
          <button class="es-rekor-btn lig" id="esLig">🌍<span>${durum.lig && durum.lig.ad ? 'Lig' : 'Lige katıl'}</span></button>
        </div>
      </div>

      <button class="es-gunluk ${g ? 'oynandi' : ''}" id="esGunluk">
        <div class="es-gunluk-ic"><div class="es-gunluk-et">📅 Günün Eşleştirmesi · ${esc(t.slice(8))}.${esc(t.slice(5, 7))}</div>
          ${g ? `<div class="es-gunluk-izgara">${g.izgara}</div><div class="es-gunluk-alt">${g.skor} puan${g.kalan ? ` · ⏱ ${g.kalan} sn kaldı` : ''} · paylaşmak için dokun</div>`
            : `<div class="es-gunluk-alt">Herkese aynı 10 kelime · 60 sn · günde bir hak. Sonucunu paylaş!</div>`}
        </div><span class="ogren-banner-ok">${g ? '📤' : '›'}</span>
      </button>

      ${dv ? `<button class="es-devam" id="esDevam"><div><div class="hizli-devam-ust">▶ Kaldığın yerden devam et</div><div class="hizli-devam-bas">Bölüm ${dv.bolum + 1} · Seviye ${dv.seviye + 1}/6 · ${dv.puan} puan</div></div><span class="ok">›</span></button>` : ''}

      <div class="es-baslik">Yol <span>her bölüm ${SEVIYELER.length} seviye · 5 → 8 → 10 kelime, sonra süreli</span></div>
      ${sezonlar}

      <div class="es-baslik">Düello <span>aynı kelimeler, kim daha yüksek?</span></div>
      <div class="btn-satir">
        <button class="aksiyon" id="esDuelloBasla">⚔️ Düello başlat</button>
        <button class="aksiyon ikincil" id="esDuelloKod">🔑 Kod gir</button>
      </div>

      <div class="ogr-bilgi"><div class="ogr-bilgi-bas">Puanlama</div>
        <p>Doğru <b>+10</b> (3 seri sonrası <b>15</b>, 5 seri sonrası <b>20</b>), yanlış <b>−5</b>, hatasız seviye <b>+20</b>. Süreli seviyelerde kalan her saniye <b>+1</b>; süre dolarsa <b>−10</b> ve yeni kelimelerle tekrar.</p></div>
    `);
    document.getElementById('esRekorlar').onclick = cizRekorlar;
    document.getElementById('esLig').onclick = () => cizLig('gunluk');
    document.getElementById('esGunluk').onclick = () => g ? gunlukPaylas(g) : gunlukBasla();
    const d = document.getElementById('esDevam'); if (d) d.onclick = devamEt;
    document.querySelectorAll('.es-dugum').forEach(b => b.onclick = () => {
      const k = Number(b.dataset.k);
      if (k > durum.acikBolum) { toast('🔒 Önce önceki bölümü bitir'); titre('hata'); return; }
      bolumBasla(k);
    });
    document.querySelectorAll('.es-sezon.kilit').forEach(b => b.onclick = () => { toast('🔒 Önceki sezonu bitirince açılır'); titre('hata'); });
    const sirada = document.querySelector('.es-dugum.sirada'); if (sirada) sirada.scrollIntoView({ block: 'center' });
    document.getElementById('esDuelloBasla').onclick = () => duelloBasla(null);
    document.getElementById('esDuelloKod').onclick = cizKodGir;
  }

  // ---------- REKORLAR ----------
  function cizRekorlar() {
    ekranModu('Rekorlarım', panelEkrani);
    const simdi = Date.now(), hafta = 7 * 86400000;
    const tum = durum.kayitlar.slice().sort((a, b) => b.skor - a.skor);
    const buHafta = tum.filter(x => simdi - Date.parse(x.t) < hafta);
    const satir = (x, i) => `<div class="es-rekor-satir"><span class="es-rekor-no">${i + 1}</span><div><b>${x.skor} puan</b><i>Bölüm ${x.bolum + 1} · ${'★'.repeat(x.yildiz)} · ${esc(x.t.slice(0, 10))}</i></div></div>`;
    const gunler = Object.keys(durum.gunluk).sort().reverse().slice(0, 7);
    const duel = durum.duello.slice().reverse().slice(0, 8);
    render(`
      <div class="es-baslik">🏆 Tüm zamanlar</div>
      ${tum.length ? tum.slice(0, 10).map(satir).join('') : '<div class="cumle"><div class="tr">Henüz bölüm bitirmedin.</div></div>'}
      <div class="es-baslik">📆 Bu hafta</div>
      ${buHafta.length ? buHafta.slice(0, 5).map(satir).join('') : '<div class="cumle"><div class="tr">Bu hafta kayıt yok.</div></div>'}
      <div class="es-baslik">📅 Günün Eşleştirmesi</div>
      ${gunler.length ? gunler.map(t => `<div class="es-rekor-satir"><span class="es-rekor-no">📅</span><div><b>${durum.gunluk[t].skor} puan</b><i>${esc(t)} · ${durum.gunluk[t].izgara}</i></div></div>`).join('') : '<div class="cumle"><div class="tr">Henüz oynanmadı.</div></div>'}
      <div class="es-baslik">⚔️ Düellolar</div>
      ${duel.length ? duel.map(x => `<div class="es-rekor-satir"><span class="es-rekor-no">${x.rakip == null ? '📤' : x.skorum > x.rakip ? '🏆' : x.skorum === x.rakip ? '🤝' : '😅'}</span><div><b>${x.skorum} puan${x.rakip != null ? ` · rakip ${x.rakip}` : ''}</b><i>Kod ${esc(x.kod)} · ${esc(x.t.slice(0, 10))}</i></div></div>`).join('') : '<div class="cumle"><div class="tr">Henüz düello yok.</div></div>'}
      <div class="btn-satir"><button class="aksiyon" id="esRekorPaylas">📤 Rekorumu paylaş</button></div>
    `);
    document.getElementById('esRekorPaylas').onclick = async () => {
      const toplamYildiz = Object.values(durum.bolumler).reduce((s, b) => s + (b.yildiz || 0), 0);
      const metin = `🏆 YDS Eşleştirme rekorlarım\n${tum[0] ? `En iyi bölüm: ${tum[0].skor} puan (Bölüm ${tum[0].bolum + 1})\n` : ''}⭐ ${toplamYildiz} yıldız · ${Object.keys(durum.bolumler).length} bölüm · 📅 ${gunler.length} günlük bulmaca\n📏 Kelimetre · YDS`;
      const r = await paylas({ baslik: 'Eşleştirme rekorlarım', metin });
      if (r === 'kopyalandi') toast('📋 Panoya kopyalandı');
    };
  }

  // ---------- OYUN KURULUMU ----------
  function bolumBasla(k) {
    const { setler, havuz } = seviyeSetleri(sirali, k);
    oyun = { mod: 'bolum', bolum: k, setler, havuz, seviye: 0, puan: 0, ceza: 0, yanlis: [], seviyePuanlar: [], tekrar: 0 };
    seviyeKur(); cizOyun();
  }
  function devamEt() {
    const dv = durum.devam; if (!dv) return cizPanel();
    const { setler, havuz } = seviyeSetleri(sirali, dv.bolum);
    oyun = { mod: 'bolum', bolum: dv.bolum, setler, havuz, seviye: dv.seviye, puan: dv.puan, ceza: dv.ceza || 0, yanlis: dv.yanlis || [], seviyePuanlar: dv.seviyePuanlar || [], tekrar: 0 };
    seviyeKur(); cizOyun();
  }
  function gunlukBasla() {
    const seed = gunlukTohum();
    oyun = { mod: 'gunluk', seed, set: ozelSet(sirali, seed), sure: 60, puan: 0, yanlis: [] };
    seviyeKur(); cizOyun();
  }
  function duelloBasla(kod) {
    const seed = kod ? kod.seed : (Math.floor(Math.random() * 36 ** 5)) >>> 0;
    oyun = { mod: 'duello', seed, rakip: kod ? kod.skor : null, set: ozelSet(sirali, seed), sure: 60, puan: 0, yanlis: [] };
    seviyeKur(); cizOyun();
  }
  function cizKodGir() {
    ekranModu('Düello kodu', panelEkrani);
    render(`<div class="cumle"><div class="tr">Arkadaşının paylaştığı düello kodunu gir; aynı 10 kelimeyi 60 saniyede eşleştir, skorlar karşılaştırılsın.</div></div>
      <div class="ogr-yazim-alan"><input id="esKod" class="ogr-yazi-input" type="text" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="ör. 1A2B3-4C" maxlength="9">
      <button class="aksiyon" id="esKodBasla">Düelloya başla</button></div>
      <div id="esKodMsg" class="alt-bilgi" style="margin-top:10px;color:var(--kil)"></div>`);
    const inp = document.getElementById('esKod');
    const dene = () => { const k = kodCoz(inp.value); if (!k) { document.getElementById('esKodMsg').textContent = 'Kod geçersiz. Biçim: 5 karakter - 2 karakter (ör. 1A2B3-4C)'; titre('hata'); return; } duelloBasla(k); };
    document.getElementById('esKodBasla').onclick = dene;
    inp.onkeydown = (e) => { if (e.key === 'Enter') dene(); };
    setTimeout(() => inp.focus(), 60);
  }

  // Aktif seviyeyi hazırla: set, süre, sağ sütun sırası, olaylar
  function seviyeKur() {
    const bolumMu = oyun.mod === 'bolum';
    const sv = bolumMu ? SEVIYELER[oyun.seviye] : { n: 10, sure: oyun.sure };
    const set = bolumMu ? (oyun.tekrar ? tekrarSeti(oyun.havuz, sirali, (oyun.bolum + 1) * 1000 + oyun.seviye * 10 + oyun.tekrar + Date.now() % 1000) : oyun.setler[oyun.seviye]) : oyun.set;
    const rnd = mulberry32(bolumMu ? Date.now() >>> 0 : oyun.seed + 7);
    oyun.aktif = { n: set.length, sure: sv.sure, set, sagSira: tohumluKaristir(set.map((_, i) => i), rnd), olaylar: [], eslesen: 0, seri: 0, puan: 0, secSol: null, secSag: null, baslangic: 0, bitti: false };
  }
  const kalanSn = () => { const a = oyun.aktif; return a.sure ? Math.max(0, a.sure - (Date.now() - a.baslangic) / 1000) : 0; };

  // ---------- OYUN EKRANI ----------
  function cizOyun() {
    const a = oyun.aktif, bolumMu = oyun.mod === 'bolum';
    const baslik = bolumMu ? `Bölüm ${oyun.bolum + 1} · Seviye ${oyun.seviye + 1}/6` : oyun.mod === 'gunluk' ? 'Günün Eşleştirmesi' : 'Düello';
    ekranModu(baslik, () => cikis());
    const sol = a.set.map((w, i) => `<button class="es-kart es-en" data-i="${i}">${esc(w.en)}</button>`).join('');
    const sag = a.sagSira.map(i => `<button class="es-kart es-tr" data-i="${i}">${esc(kisaTR(a.set[i].tr))}</button>`).join('');
    render(`
      <div class="es-ust">
        <div class="es-ust-sol"><span class="es-et">${bolumMu ? `Bölüm ${oyun.bolum + 1}` : baslik}</span><b>${bolumMu ? `Seviye ${oyun.seviye + 1}/6 · ${a.n} kelime` : `${a.n} kelime · ${a.sure} sn`}</b></div>
        ${a.sure ? `<div class="es-sure" id="esSure">⏱ ${a.sure}</div>` : '<div class="es-sure sonsuz">∞</div>'}
        <div class="es-puan"><b id="esPuan">${(bolumMu ? oyun.puan - oyun.ceza : 0) + a.puan}</b><span id="esCombo" class="es-combo"></span></div>
      </div>
      <div class="kart-ilerleme"><div class="kart-ilerleme-ic" id="esBar" style="width:0%"></div></div>
      <div class="es-izgara"><div class="es-sutun">${sol}</div><div class="es-sutun">${sag}</div></div>
      <div class="es-ipucu">Soldan bir İngilizce, sağdan Türkçesine dokun</div>
    `);
    document.querySelectorAll('.es-en').forEach(b => b.onclick = () => sec('sol', b));
    document.querySelectorAll('.es-tr').forEach(b => b.onclick = () => sec('sag', b));
    a.baslangic = Date.now();
    temizle();
    if (a.sure) sayac = setInterval(sureTik, 200);
  }
  function sureTik() {
    const a = oyun && oyun.aktif; if (!a || a.bitti) return;
    const k = kalanSn(), el = document.getElementById('esSure');
    if (el) { el.textContent = `⏱ ${Math.ceil(k)}`; el.classList.toggle('az', k <= 10); }
    if (k <= 0) sureDoldu();
  }
  function sec(taraf, btn) {
    const a = oyun.aktif; if (a.bitti || btn.classList.contains('eslesti')) return;
    const i = Number(btn.dataset.i);
    const alan = taraf === 'sol' ? 'secSol' : 'secSag';
    const onceki = document.querySelector(`.es-${taraf === 'sol' ? 'en' : 'tr'}.secili`);
    if (onceki) onceki.classList.remove('secili');
    if (a[alan] === i) { a[alan] = null; return; }
    a[alan] = i; btn.classList.add('secili');
    if (a.secSol != null && a.secSag != null) degerlendir();
  }
  function degerlendir() {
    const a = oyun.aktif;
    const solEl = document.querySelector(`.es-en[data-i="${a.secSol}"]`), sagEl = document.querySelector(`.es-tr[data-i="${a.secSag}"]`);
    const w = a.set[a.secSol];
    if (a.secSol === a.secSag) {
      a.olaylar.push('d'); a.puan += comboPuan(a.seri); a.seri++; a.eslesen++;
      durum.toplamDogru++; durum.enIyiSeri = Math.max(durum.enIyiSeri, a.seri);
      [solEl, sagEl].forEach(el => { el.classList.remove('secili'); el.classList.add('eslesti'); });
      ses('dogru'); titre('hafif'); gunKaydet(1, { dogru: true });
    } else {
      a.olaylar.push('y'); a.puan -= PUAN.yanlis; a.seri = 0;
      durum.toplamYanlis++;
      if (!oyun.yanlis.includes(w.en)) oyun.yanlis.push(w.en);
      [solEl, sagEl].forEach(el => { el.classList.remove('secili'); el.classList.add('hata'); setTimeout(() => el.classList.remove('hata'), 450); });
      ses('yanlis'); titre('hata'); gunKaydet(0, { dogru: false });
    }
    a.secSol = a.secSag = null;
    const bolumMu = oyun.mod === 'bolum';
    document.getElementById('esPuan').textContent = Math.max(0, (bolumMu ? oyun.puan - oyun.ceza : 0) + a.puan);
    const c = document.getElementById('esCombo'); c.textContent = a.seri >= 5 ? '🔥 x2' : a.seri >= 3 ? '🔥 x1.5' : ''; c.classList.toggle('gor', a.seri >= 3);
    document.getElementById('esBar').style.width = Math.round(a.eslesen / a.n * 100) + '%';
    if (a.eslesen === a.n) seviyeBitti();
  }

  // ---------- SEVİYE SONU ----------
  function seviyeBitti() {
    const a = oyun.aktif; a.bitti = true; temizle();
    const sonuc = puanla(a.olaylar, kalanSn(), true);
    const kelimeler = a.set;
    if (oyun.mod === 'bolum') {
      oyun.puan += sonuc.puan; oyun.seviyePuanlar[oyun.seviye] = sonuc.puan;
      durum.devam = { bolum: oyun.bolum, seviye: oyun.seviye + 1, puan: oyun.puan, ceza: oyun.ceza, yanlis: oyun.yanlis, seviyePuanlar: oyun.seviyePuanlar };
      if (oyun.seviye + 1 >= SEVIYELER.length) { durum.devam = null; kaydet(); return bolumBitti(); }
      kaydet();
      cizSeviyeSonuc(sonuc, kelimeler, `Seviye ${oyun.seviye + 1} tamam`, 'Sonraki seviye ›', () => { oyun.seviye++; oyun.tekrar = 0; seviyeKur(); cizOyun(); });
    } else {
      ozelBitti(sonuc, true);
    }
  }
  function sureDoldu() {
    const a = oyun.aktif; if (a.bitti) return; a.bitti = true; temizle();
    ses('yanlis'); titre('guclu');
    if (oyun.mod === 'bolum') {
      oyun.ceza += PUAN.sureCeza; oyun.tekrar++;
      durum.devam = { bolum: oyun.bolum, seviye: oyun.seviye, puan: oyun.puan, ceza: oyun.ceza, yanlis: oyun.yanlis, seviyePuanlar: oyun.seviyePuanlar }; kaydet();
      ekranModu(`Bölüm ${oyun.bolum + 1}`, () => cikis());
      render(`<div class="es-sonuc"><div class="es-sonuc-amblem">⏱</div><div class="es-sonuc-bas">Süre doldu</div>
        <div class="es-sonuc-alt">${a.eslesen}/${a.n} eşleşti · bölüm puanına <b>−${PUAN.sureCeza}</b> yazıldı</div>
        <div class="es-sonuc-not">Aynı seviye <b>yeni kelimelerle</b> tekrar açılıyor. Bu denemenin puanı sayılmadı.</div></div>
        <div class="btn-satir"><button class="aksiyon" id="esTekrar">🔁 Tekrar dene</button><button class="aksiyon ikincil" id="esCik">Panele dön</button></div>`);
      document.getElementById('esTekrar').onclick = () => { seviyeKur(); cizOyun(); };
      document.getElementById('esCik').onclick = panelEkrani;
    } else {
      ozelBitti(puanla(a.olaylar, 0, false), false);
    }
  }
  function yanlisCipler(kelimeler, yanlisEn) {
    const ws = kelimeler.filter(w => yanlisEn.includes(w.en));
    if (!ws.length) return '';
    return `<div class="es-baslik">Karıştırdıkların <span>deftere ekle</span></div><div class="es-cipler">${ws.map(w => `<button class="es-cip ${defterdeMi(w.en) ? 'aktif' : ''}" data-en="${esc(w.en)}">${defterdeMi(w.en) ? '✓' : '📓'} ${esc(w.en)} <i>${esc(kisaTR(w.tr))}</i></button>`).join('')}</div>`;
  }
  function wireCipler(kelimeler) {
    document.querySelectorAll('.es-cip').forEach(b => b.onclick = () => {
      const w = kelimeler.find(x => x.en === b.dataset.en); if (!w) return;
      defterToggle(w); const on = defterdeMi(w.en); b.classList.toggle('aktif', on); b.firstChild.textContent = (on ? '✓ ' : '📓 '); titre('hafif');
    });
  }
  function dokumHTML(s) {
    return `<div class="es-dokum">
      <div><span>✓ ${s.dogru} doğru</span><b>+${s.temel + s.yanlis * PUAN.yanlis}</b></div>
      ${s.yanlis ? `<div><span>✕ ${s.yanlis} yanlış</span><b class="eksi">−${s.yanlis * PUAN.yanlis}</b></div>` : ''}
      ${s.kusursuz ? `<div><span>🌟 Kusursuz</span><b>+${s.kusursuz}</b></div>` : ''}
      ${s.sureBonus ? `<div><span>⏱ Kalan süre</span><b>+${s.sureBonus}</b></div>` : ''}
      ${s.enSeri >= 3 ? `<div><span>🔥 En uzun seri ${s.enSeri}</span><b></b></div>` : ''}
    </div>`;
  }
  function cizSeviyeSonuc(s, kelimeler, bas, devamYazi, devamFn) {
    ekranModu(`Bölüm ${oyun.bolum + 1}`, () => cikis());
    const a = oyun.aktif;
    render(`<div class="es-sonuc"><div class="es-sonuc-amblem">${s.yanlis === 0 ? '🌟' : s.yanlis <= 2 ? '👏' : '💪'}</div><div class="es-sonuc-bas">${esc(bas)}</div>
      <div class="es-sonuc-skor">+${s.puan} puan</div><div class="es-sonuc-alt">Bölüm toplamı: <b>${Math.max(0, oyun.puan - oyun.ceza)}</b></div>${dokumHTML(s)}</div>
      ${yanlisCipler(kelimeler, a.olaylar.includes('y') ? oyun.yanlis : [])}
      <div class="btn-satir"><button class="aksiyon" id="esDevamSv">${devamYazi}</button><button class="aksiyon ikincil" id="esCik">Panele dön</button></div>`);
    document.getElementById('esDevamSv').onclick = devamFn;
    document.getElementById('esCik').onclick = panelEkrani;
    wireCipler(kelimeler);
  }

  // ---------- BÖLÜM SONU ----------
  function bolumBitti() {
    const toplam = Math.max(0, oyun.puan - oyun.ceza);
    const hedef = SEVIYELER.reduce((s, sv) => s + seviyeHedef(sv), 0);
    const yildiz = yildizHesapla(toplam, hedef);
    const k = oyun.bolum, onceki = durum.bolumler[k];
    const rekor = !onceki || toplam > onceki.enIyi;
    durum.bolumler[k] = { enIyi: rekor ? toplam : onceki.enIyi, yildiz: Math.max(yildiz, onceki ? onceki.yildiz : 0), oynama: (onceki ? onceki.oynama : 0) + 1, son: bugun() };
    if (k >= durum.acikBolum) durum.acikBolum = Math.min(k + 1, bolumAdet() - 1);
    durum.kayitlar.push({ t: new Date().toISOString(), bolum: k, skor: toplam, yildiz });
    if (durum.kayitlar.length > 100) durum.kayitlar = durum.kayitlar.slice().sort((a, b) => b.skor - a.skor).slice(0, 100);
    kaydet();
    ligeGonder({ tur: 'bolum', bolum: k, skor: toplam });
    gunKaydet(0, { bitir: true });
    if (rekor) { ses('kutlama'); titre('basari'); konfeti(); } else { ses('seviye'); titre('basari'); }
    const tumKelimeler = oyun.setler.flat().concat(oyun.havuz);
    ekranModu(`Bölüm ${k + 1}`, panelEkrani);
    const sonrakiVar = k + 1 < bolumAdet();
    render(`<div class="es-sonuc"><div class="es-sonuc-amblem">${'⭐'.repeat(yildiz)}</div><div class="es-sonuc-bas">Bölüm ${k + 1} tamamlandı</div>
      <div class="es-sonuc-skor">${toplam} puan</div>
      <div class="es-sonuc-alt">${rekor ? '🏆 Yeni rekor!' : `En iyi: ${durum.bolumler[k].enIyi}`} · ${oyun.ceza ? `süre cezası −${oyun.ceza} · ` : ''}${oyun.yanlis.length} kelime karıştırıldı</div>
      <div class="es-dokum">${oyun.seviyePuanlar.map((p, i) => `<div><span>Seviye ${i + 1} · ${SEVIYELER[i].n} kelime${SEVIYELER[i].sure ? ` · ${SEVIYELER[i].sure} sn` : ''}</span><b>+${p}</b></div>`).join('')}</div></div>
      ${yanlisCipler(tumKelimeler, oyun.yanlis)}
      <div class="btn-satir">
        ${sonrakiVar ? `<button class="aksiyon" id="esSonraki">Bölüm ${k + 2} ›</button>` : ''}
        <button class="aksiyon ikincil" id="esPaylas">📤 Paylaş</button>
        <button class="aksiyon ikincil" id="esTekrarB">Tekrar oyna</button>
      </div>`);
    const sn = document.getElementById('esSonraki'); if (sn) sn.onclick = () => bolumBasla(k + 1);
    document.getElementById('esTekrarB').onclick = () => bolumBasla(k);
    document.getElementById('esPaylas').onclick = async () => {
      const r = await paylas({ baslik: 'Eşleştirme', metin: `🧩 YDS Eşleştirme · Bölüm ${k + 1} tamamlandı\n${'⭐'.repeat(yildiz)} ${toplam} puan · ${oyun.yanlis.length} karıştırma\n📏 Kelimetre · YDS` });
      if (r === 'kopyalandi') toast('📋 Panoya kopyalandı');
    };
    wireCipler(tumKelimeler);
    oyun = null;
  }

  // ---------- GÜNLÜK / DÜELLO SONU ----------
  function ozelBitti(sonuc, tamam) {
    const a = oyun.aktif, mod = oyun.mod, t = bugun();
    const kalan = tamam ? Math.ceil(kalanSn()) : 0;
    const grid = izgara(a.olaylar, a.n);
    gunKaydet(0, { bitir: true });
    let kayit;
    if (mod === 'gunluk') {
      kayit = { skor: sonuc.puan, izgara: grid, kalan, tamam };
      durum.gunluk[t] = kayit; kaydet();
      ligeGonder({ tur: 'gunluk', tarih: t, skor: sonuc.puan });
    } else {
      const kod = kodUret(oyun.seed, sonuc.puan);
      kayit = { kod, skorum: sonuc.puan, rakip: oyun.rakip, t: new Date().toISOString() };
      durum.duello.push(kayit); if (durum.duello.length > 50) durum.duello.shift(); kaydet();
      ligeGonder({ tur: 'duello', skor: sonuc.puan });
    }
    if (tamam && sonuc.yanlis === 0) { ses('kutlama'); konfeti(); } else ses(tamam ? 'seviye' : 'yanlis');
    titre('basari');
    ekranModu(mod === 'gunluk' ? 'Günün Eşleştirmesi' : 'Düello', panelEkrani);
    let bas, alt = '';
    if (mod === 'gunluk') bas = tamam ? 'Günün bulmacası tamam' : 'Süre doldu';
    else if (oyun.rakip == null) { bas = 'Düello hazır'; alt = `Kodu arkadaşına gönder: <b class="es-kod">${kayit.kod}</b>`; }
    else { const f = sonuc.puan - oyun.rakip; bas = f > 0 ? '🏆 Kazandın!' : f === 0 ? '🤝 Berabere' : '😅 Kaybettin'; alt = `Sen <b>${sonuc.puan}</b> · Rakip <b>${oyun.rakip}</b>`; }
    render(`<div class="es-sonuc"><div class="es-sonuc-amblem">${mod === 'gunluk' ? '📅' : '⚔️'}</div><div class="es-sonuc-bas">${bas}</div>
      <div class="es-sonuc-skor">${sonuc.puan} puan</div>${alt ? `<div class="es-sonuc-alt">${alt}</div>` : ''}
      <div class="es-gunluk-izgara buyuk">${grid}</div>${dokumHTML(sonuc)}
      ${mod === 'gunluk' ? '<div class="es-sonuc-not">Yarın yeni bulmaca. Sonucunu paylaş, arkadaşların da denesin!</div>' : ''}</div>
      ${yanlisCipler(a.set, oyun.yanlis)}
      <div class="btn-satir">
        <button class="aksiyon" id="esPaylas">📤 ${mod === 'gunluk' ? 'Sonucu paylaş' : oyun.rakip == null ? 'Kodu paylaş' : 'Sonucu paylaş'}</button>
        ${mod === 'duello' ? '<button class="aksiyon ikincil" id="esYeniDuello">Yeni düello</button>' : ''}
        <button class="aksiyon ikincil" id="esCik">Panele dön</button>
      </div>`);
    document.getElementById('esPaylas').onclick = () => mod === 'gunluk' ? gunlukPaylas(kayit) : duelloPaylas(kayit);
    document.getElementById('esCik').onclick = panelEkrani;
    const yd = document.getElementById('esYeniDuello'); if (yd) yd.onclick = () => duelloBasla(null);
    wireCipler(a.set);
    oyun = null;
  }
  async function gunlukPaylas(g) {
    const t = bugun();
    const metin = `🧩 YDS Günün Eşleştirmesi · ${t.slice(8)}.${t.slice(5, 7)}\n${g.izgara}\n${g.skor} puan${g.kalan ? ` · ⏱ ${g.kalan} sn kaldı` : ''}\n📏 Kelimetre · YDS`;
    const r = await paylas({ baslik: 'Günün Eşleştirmesi', metin });
    if (r === 'kopyalandi') toast('📋 Panoya kopyalandı');
  }
  async function duelloPaylas(k) {
    const metin = k.rakip == null
      ? `⚔️ YDS Eşleştirme Düellosu!\nKod: ${k.kod} · Skorum: ${k.skorum}\nUygulamada Eşleştirme → 🔑 Kod gir → beni geç!\n📏 Kelimetre · YDS`
      : `⚔️ YDS Eşleştirme Düellosu · Kod ${k.kod}\nBen ${k.skorum} · Sen ${k.rakip} → ${k.skorum > k.rakip ? 'kazandım 🏆' : k.skorum === k.rakip ? 'berabere 🤝' : 'sen kazandın 😅'}\n📏 Kelimetre · YDS`;
    const r = await paylas({ baslik: 'Düello', metin });
    if (r === 'kopyalandi') toast('📋 Panoya kopyalandı');
  }

  // ---------- ÇEVRİMİÇİ LİG ----------
  const ligde = () => !!(durum.lig && durum.lig.ad);
  function ligeGonder(kayit) {
    if (!ligde()) return;
    durum.lig.kuyruk = (durum.lig.kuyruk || []).concat([kayit]).slice(-30); kaydet();
    kuyrukBosalt(kayit);
  }
  let _bosaltiyor = false;
  async function kuyrukBosalt(sonKayit) {
    if (_bosaltiyor || !ligde()) return; _bosaltiyor = true;
    const cihaz = cihazId();
    try {
      while (durum.lig.kuyruk && durum.lig.kuyruk.length) {
        const k = durum.lig.kuyruk[0];
        try { await skorGonder({ cihaz, takma_ad: durum.lig.ad, tur: k.tur, bolum: k.bolum ?? null, tarih: k.tarih ?? null, skor: k.skor }); }
        catch (e) { if (!(e && e.status >= 400 && e.status < 500)) throw e; }   // 4xx (tekrar/sahte) → düşür, ağ hatası → bekle
        durum.lig.kuyruk.shift(); kaydet();
      }
      if (sonKayit && (sonKayit.tur === 'gunluk' || sonKayit.tur === 'bolum')) {
        const tur = sonKayit.tur === 'gunluk' ? 'gunluk' : 'hafta';
        const r = await liderAl(tur, cihaz);
        if (r && r.benim) toast(`🌍 ${tur === 'gunluk' ? 'Bugün' : 'Bu hafta'} ${r.benim.sira}. sıradasın (${r.toplam} kişi)`);
      }
    } catch (_) { /* çevrimdışı: kuyruk kalır, sonraki açılışta denenir */ }
    finally { _bosaltiyor = false; }
  }
  function ligKatil(ad) {
    durum.lig = { ad, katilim: new Date().toISOString(), kuyruk: [] };
    // mevcut rekorlar da sayılsın
    for (const [k, b] of Object.entries(durum.bolumler)) durum.lig.kuyruk.push({ tur: 'bolum', bolum: Number(k), skor: b.enIyi });
    const g = durum.gunluk[bugun()]; if (g) durum.lig.kuyruk.push({ tur: 'gunluk', tarih: bugun(), skor: g.skor });
    kaydet(); kuyrukBosalt(null);
  }
  function cizLig(sekme) {
    ekranModu('Çevrimiçi Lig', panelEkrani);
    if (!ligde()) {
      render(`<div class="es-sonuc"><div class="es-sonuc-amblem">🌍</div><div class="es-sonuc-bas">Lige katıl</div>
        <div class="es-sonuc-alt">Takma adınla günün bulmacası, haftalık toplam puan ve en iyi bölüm sıralamalarına gir.</div>
        <div class="es-sonuc-not">Sunucuya yalnızca <b>takma adın, skorların ve rastgele bir cihaz kimliği</b> gider; e-posta, isim veya başka kişisel veri yok. İstediğin an "Ligden ayrıl" ile tüm kayıtların silinir.</div></div>
        <div class="ogr-yazim-alan"><input id="esAd" class="ogr-yazi-input" type="text" maxlength="16" autocomplete="off" placeholder="Takma ad (2–16 karakter)">
        <button class="aksiyon" id="esKatil">🌍 Katıl</button></div>
        <div id="esAdMsg" class="alt-bilgi" style="margin-top:10px;color:var(--kil)"></div>`);
      const inp = document.getElementById('esAd');
      const dene = () => { const ad = adGecerli(inp.value); if (!ad) { document.getElementById('esAdMsg').textContent = '2–16 karakter; harf, rakam, boşluk, _ . - kullanılabilir.'; titre('hata'); return; } ligKatil(ad); toast('🌍 Lige katıldın: ' + ad); cizLig('gunluk'); };
      document.getElementById('esKatil').onclick = dene;
      inp.onkeydown = (e) => { if (e.key === 'Enter') dene(); };
      setTimeout(() => inp.focus(), 60);
      return;
    }
    const sekmeler = [['gunluk', '📅 Bugün'], ['hafta', '📆 Bu hafta'], ['tum', '🏆 Tüm zamanlar']];
    render(`<div class="es-lig-sekmeler">${sekmeler.map(([id, ad]) => `<button class="ogr-liste-cip ${sekme === id ? 'aktif' : ''}" data-s="${id}">${ad}</button>`).join('')}</div>
      <div class="es-lig-aciklama">${sekme === 'gunluk' ? 'Bugünün bulmacasını çözenler (herkese aynı kelimeler)' : sekme === 'hafta' ? 'Bu hafta kazanılan toplam puan (Pazartesi sıfırlanır)' : 'En iyi tek bölüm skoru'}</div>
      <div id="esLigListe"><div class="cumle"><div class="tr">Yükleniyor…</div></div></div>
      <div class="btn-satir"><button class="aksiyon ikincil" id="esAdDegis">✏️ Takma ad: ${esc(durum.lig.ad)}</button><button class="aksiyon ikincil" id="esAyril">🚪 Ligden ayrıl</button></div>`);
    document.querySelectorAll('.es-lig-sekmeler .ogr-liste-cip').forEach(b => b.onclick = () => cizLig(b.dataset.s));
    document.getElementById('esAdDegis').onclick = () => {
      const yeni = adGecerli(prompt('Yeni takma ad (2–16 karakter):', durum.lig.ad));
      if (!yeni) return;
      durum.lig.ad = yeni; kaydet();
      takmaAdDegistir(cihazId(), yeni).then(() => toast('✏️ Takma ad güncellendi')).catch(() => toast('Çevrimdışı — sonraki skorla güncellenir'));
      cizLig(sekme);
    };
    document.getElementById('esAyril').onclick = () => {
      if (!confirm('Ligden ayrılınca sunucudaki tüm skorların silinir. Emin misin?')) return;
      ligdenAyril(cihazId()).catch(() => {});
      durum.lig = null; kaydet(); toast('🚪 Ligden ayrıldın, kayıtların silindi'); panelEkrani();
    };
    const cihaz = cihazId();
    kuyrukBosalt(null).then(() => liderAl(sekme, cihaz)).then(r => {
      const kut = document.getElementById('esLigListe'); if (!kut) return;
      const liste = (r && r.liste) || [];
      kut.innerHTML = (liste.length ? liste.map(x => `<div class="es-rekor-satir ${x.ben ? 'ben' : ''}"><span class="es-rekor-no">${x.sira <= 3 ? ['🥇', '🥈', '🥉'][x.sira - 1] : x.sira}</span><div><b>${esc(x.ad)}${x.ben ? ' <i>(sen)</i>' : ''}</b></div><span class="es-lig-skor">${x.skor}</span></div>`).join('')
        : '<div class="cumle"><div class="tr">Henüz kayıt yok — ilk sen ol!</div></div>')
        + (r && r.benim && r.benim.sira > 50 ? `<div class="es-lig-ben">Sen: ${r.benim.sira}. · ${r.benim.skor} puan · ${r.toplam} kişi</div>` : r && !r.benim ? `<div class="es-lig-ben">Bu listede henüz skorun yok${sekme === 'gunluk' ? ' — günün bulmacasını çöz' : ''}.</div>` : `<div class="es-lig-ben">${r.toplam} kişi</div>`);
    }).catch(() => {
      const kut = document.getElementById('esLigListe'); if (kut) kut.innerHTML = '<div class="cumle"><div class="tr">Lig yüklenemedi — internet bağlantını kontrol et.</div></div>';
    });
  }

  function cikis() {
    temizle();
    if (oyun && oyun.mod === 'bolum' && durum.devam) toast('Bölüm kaydedildi; seviye baştan başlar');
    oyun = null; panelEkrani();
  }
  function temizle() { if (sayac) { clearInterval(sayac); sayac = null; } }

  return { ac, ozet, istat, temizle, rekorlar: () => yukle().then(cizRekorlar), lig: () => yukle().then(() => cizLig('gunluk')) };
}
