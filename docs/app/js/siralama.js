// app/js/siralama.js — Misafir sıralaması: kayıt gerektirmeden oyun puanlarını arkadaşlarla karşılaştırır.
// Kimlik: cihazda rastgele gizli anahtar (yds-siralama-v1); sunucu yalnızca özetini tutar. Misafir adını sunucu üretir
// (serbest metin yok). Skorlar sırayla gönderilir; çevrimdışıyken bekler (en fazla BEKLEYEN_UST), sonra gönderilir.
// Sunucu: docs/supabase-siralama.sql (oyuncu_kaydet, skor_gonder, siralama, ad_yenile, siralamadan_cik).
import { loadSiralama, saveSiralama } from './storage.js';

export const BEKLEYEN_UST = 30;
export const DONEMLER = { gun: '📅 Bugün', hafta: '🗓️ Bu hafta' };

// 24 rastgele bayt → 48 onaltılık karakter (sunucu ^[0-9a-f]{32,64}$ bekler)
export function anahtarUret(rastgele = (n) => crypto.getRandomValues(new Uint8Array(n))) {
  return [...rastgele(24)].map(b => b.toString(16).padStart(2, '0')).join('');
}
// Bekleyen skor kuyruğu: en eskiler atılır, en fazla `ust` kayıt
export function bekleyeneEkle(liste, kayit, ust = BEKLEYEN_UST) {
  const l = [...(liste || []), kayit];
  return l.length > ust ? l.slice(l.length - ust) : l;
}
export const madalya = (sira) => (sira === 1 ? '🥇' : sira === 2 ? '🥈' : sira === 3 ? '🥉' : String(sira));

export function kurSiralama(api) {
  const { rpc } = api;
  const depo = api.depo || { oku: loadSiralama, yaz: saveSiralama };
  const bos = () => ({ anahtar: '', ad: '', kapali: false, bekleyen: [] });
  const durum = () => Object.assign(bos(), depo.oku() || {});
  const yaz = (v) => depo.yaz(v);
  let bosaltiliyor = null;

  // Anahtar ve misafir adı yoksa oluşturur (ağ gerekir). Kapalıysa hiçbir şey göndermez.
  async function hazirla() {
    let s = durum();
    if (s.kapali) return s;
    if (!s.anahtar) { s.anahtar = anahtarUret(); yaz(s); }
    if (!s.ad) {
      const ad = await rpc('oyuncu_kaydet', { p_anahtar: s.anahtar });
      s = durum(); s.ad = String(ad || ''); yaz(s);
    }
    return durum();
  }
  // Oyun bitince çağrılır; ağ hatası oyunu etkilemez (skor kuyrukta bekler)
  function gonder(oyun, puan) {
    const s = durum();
    if (s.kapali) return Promise.resolve();
    s.bekleyen = bekleyeneEkle(s.bekleyen, { oyun, puan: Math.max(0, Math.round(Number(puan) || 0)) });
    yaz(s);
    return bosalt();
  }
  // Kuyruğu sırayla gönderir. Sunucu reddetse de (sınır, hız) kayıt kuyruktan çıkar; yalnızca ağ hatasında bekler.
  function bosalt() {
    if (bosaltiliyor) return bosaltiliyor;
    if (!durum().bekleyen.length || durum().kapali) return Promise.resolve();
    bosaltiliyor = (async () => {
      try {
        const s = await hazirla();
        for (let k = 0; k < BEKLEYEN_UST; k++) {
          const g = durum();
          if (g.kapali || !g.bekleyen.length) break;
          const kayit = g.bekleyen[0];
          await rpc('skor_gonder', { p_anahtar: s.anahtar, p_oyun: kayit.oyun, p_puan: kayit.puan });
          const g2 = durum(); g2.bekleyen = g2.bekleyen.slice(1); yaz(g2);
        }
      } catch { /* çevrimdışı ya da sunucu hatası: bekleyenler sonraki açılışta gönderilir */ }
      finally { bosaltiliyor = null; }
    })();
    return bosaltiliyor;
  }
  async function liste(donem) {
    await bosalt();
    const s = await hazirla();
    const satirlar = await rpc('siralama', { p_anahtar: s.kapali ? null : s.anahtar, p_donem: donem });
    return Array.isArray(satirlar) ? satirlar : [];
  }
  async function adYenile() {
    const s = await hazirla();
    const ad = await rpc('ad_yenile', { p_anahtar: s.anahtar });
    const s2 = durum(); if (ad) s2.ad = String(ad); yaz(s2);
    return s2.ad;
  }
  // Sunucudaki ad ve tüm skorlar silinir; başarısızsa (çevrimdışı) hata fırlatır ve yerel durum değişmez
  async function cik() {
    const s = durum();
    if (s.anahtar) await rpc('siralamadan_cik', { p_anahtar: s.anahtar });
    yaz({ ...bos(), kapali: true });
  }
  async function katil() { yaz(bos()); return hazirla(); }

  // ---------- Ekran (Oyun › Sıralama) ----------
  let donem = 'gun', cizimNo = 0;
  function ac() {
    api.ekranModu('Oyun', api.anaSayfa);
    ciz();
  }
  const ust = () => (typeof api.ustHTML === 'function' ? api.ustHTML() : '');
  const NOT = '<p class="giris-not sr-not">Skorların bu misafir adıyla herkese açık sıralamada görünür; kayıt gerekmez. İstemezsen Ben › Sıralama\'dan çıkabilirsin, adın ve skorların silinir.</p>';
  function ciz() {
    const { render, esc } = api;
    const s = durum(), no = ++cizimNo;
    if (s.kapali) {
      render(`${ust()}<div class="og-hero"><div class="og-hero-ikon" aria-hidden="true">🏆</div><div><div class="og-hero-bas">Sıralamaya katılmıyorsun</div>
        <div class="og-hero-alt">Katılırsan sana bir misafir adı verilir ve oyun puanların arkadaşlarınla aynı listede görünür. Kayıt gerekmez.</div></div></div>
        <div class="btn-satir"><button class="aksiyon" id="srKatil">Sıralamaya katıl</button></div>`);
      document.getElementById('srKatil').onclick = () => katil().then(() => { api.toast?.('🏆 Sıralamaya katıldın'); ciz(); }).catch(() => api.toast?.('Bağlantı yok, sonra tekrar dene'));
      return;
    }
    const cipler = Object.entries(DONEMLER).map(([id, ad]) => `<button class="sz-cip ${id === donem ? 'aktif' : ''}" data-d="${id}" aria-pressed="${id === donem}">${ad}</button>`).join('');
    render(`${ust()}
      <div class="sr-ben"><div><small>Misafir adın</small><b id="srAd">${s.ad ? esc(s.ad) : '…'}</b></div>
        <button class="aksiyon ikincil" id="srAdYenile" aria-label="Yeni misafir adı çek">🎲 Yeni ad</button></div>
      <div class="sz-cipler sr-donem">${cipler}</div>
      <div class="sr-alt">${donem === 'gun' ? 'Günün Eşleştirmesi · herkes aynı 10 kelime' : 'Pazartesiden beri tüm oyunların toplam puanı'}</div>
      <div id="srListe" class="sr-liste" aria-live="polite"><div class="sr-bos">Yükleniyor…</div></div>
      ${NOT}`);
    document.querySelectorAll('.sr-donem .sz-cip').forEach(b => b.onclick = () => { donem = b.dataset.d; ciz(); });
    document.getElementById('srAdYenile').onclick = async (e) => {
      const b = e.currentTarget; b.disabled = true;
      try { const ad = await adYenile(); const el = document.getElementById('srAd'); if (el) el.textContent = ad; ciz(); }
      catch { api.toast?.('Bağlantı yok, sonra tekrar dene'); b.disabled = false; }
    };
    liste(donem).then((satirlar) => {
      if (no !== cizimNo) return;   // bu sırada başka bir ekran çizildi
      const el = document.getElementById('srListe'); if (!el) return;
      const ad = durum().ad; const adEl = document.getElementById('srAd'); if (adEl && ad) adEl.textContent = ad;
      if (!satirlar.length) {
        el.innerHTML = `<div class="sr-bos">${donem === 'gun' ? 'Bugün henüz kimse Günün Eşleştirmesi\'ni oynamadı. İlk sen ol!' : 'Bu hafta henüz skor yok. Bir oyun oyna, ilk sen ol!'}</div>
          <div class="btn-satir"><button class="aksiyon" id="srOyna">${donem === 'gun' ? '🧩 Günün Eşleştirmesi' : '🔤 Harf Avı oyna'}</button></div>`;
        document.getElementById('srOyna').onclick = () => (donem === 'gun' ? api.gunlukOyna?.() : api.oyunOyna?.());
        return;
      }
      let onceki = 0;
      const li = satirlar.map(r => {
        const ara = r.sira > onceki + 1 && onceki >= 20 ? '<li class="sr-ara" aria-hidden="true">⋯</li>' : '';
        onceki = r.sira;
        return `${ara}<li class="sr-satir ${r.ben ? 'ben' : ''}"><span class="sr-sira">${madalya(r.sira)}</span><span class="sr-ad">${esc(r.ad)}${r.ben ? ' <em>(sen)</em>' : ''}</span><b>${Number(r.puan) || 0}</b></li>`;
      }).join('');
      const toplam = satirlar[0]?.toplam || satirlar.length;
      el.innerHTML = `<ol class="sr-ol">${li}</ol><div class="sr-alt">${toplam} oyuncu</div>`;
    }).catch(() => {
      if (no !== cizimNo) return;
      const el = document.getElementById('srListe'); if (!el) return;
      el.innerHTML = '<div class="sr-bos">Sıralama yüklenemedi. İnternet bağlantını kontrol et.</div><div class="btn-satir"><button class="aksiyon ikincil" id="srTekrar">Tekrar dene</button></div>';
      document.getElementById('srTekrar').onclick = ciz;
    });
  }

  return { durum, hazirla, gonder, bosalt, liste, adYenile, cik, katil, ac };
}
