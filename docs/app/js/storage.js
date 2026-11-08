// app/js/storage.js — localStorage üstüne ince sarmalayıcı
// Her save*() bir kayıt bildirimi yayar (bulut eşitleme bunu dinler): kayitDinle(fn) → fn(anahtar)
const dinleyiciler = [];
export function kayitDinle(fn) { dinleyiciler.push(fn); }
function kaydet(anahtar, deger) {
  const yeni = JSON.stringify(deger);
  if (localStorage.getItem(anahtar) === yeni) return;   // içerik değişmediyse yazma ve bildirim yok (açılışta sahte "kirli" üretmez)
  localStorage.setItem(anahtar, yeni);
  for (const f of dinleyiciler) { try { f(anahtar); } catch {} }
}
const KEY = 'yds-ilerleme-v1';

export function loadProgress() {
  try { return JSON.parse(localStorage.getItem(KEY)) || {}; }
  catch { return {}; }
}

export function saveProgress(progress) {
  kaydet(KEY, progress);
}

// ===== Kelime Defteri (kişisel) — { en(küçük): kelimeObj } =====
const DKEY = 'yds-defter-v1';

export function loadDefter() {
  try { return JSON.parse(localStorage.getItem(DKEY)) || {}; }
  catch { return {}; }
}

export function saveDefter(defter) {
  kaydet(DKEY, defter);
}

// ===== Öğrenilen kelimeler — { en(küçük): kelimeObj } (Akış'ta "biliyorum") =====
const OGKEY = 'yds-ogrenilen-v1';

export function loadOgrenilen() {
  try { return JSON.parse(localStorage.getItem(OGKEY)) || {}; }
  catch { return {}; }
}

export function saveOgrenilen(o) {
  kaydet(OGKEY, o);
}

// ===== Kelime Öğren — aralıklı tekrar (SRS) durumu =====
// { surum, kartlar:{ enLower:{b,e,i,d,r,l,s} }, gun:{tarih,yeni,tekrar}, gec:[{t,y,r,d,w}], ayar:{yeniHedef} }
const SKEY = 'yds-srs-v1';

export function loadSRS() {
  try { return JSON.parse(localStorage.getItem(SKEY)) || null; }
  catch { return null; }
}

export function saveSRS(srs) {
  kaydet(SKEY, srs);
}

// ===== Uygulama ayarları / bayraklar — { girisGoruldu, ... } =====
const AKEY = 'yds-ayar-v1';

export function loadAyar() {
  let a;
  try { a = JSON.parse(localStorage.getItem(AKEY)) || {}; } catch { a = {}; }
  // Bozuk sayısal alanlar (ör. "x") ekranda NaN üretmesin
  for (const k of ['seri', 'dondurma', 'hedef', 'enUzunSeri']) if (a[k] !== undefined && !Number.isFinite(Number(a[k]))) a[k] = 0;
  if (a.hedef !== undefined) a.hedef = Math.min(50, Math.max(5, Number(a.hedef) || 20));
  if (a.dondurma !== undefined) a.dondurma = Math.min(3, Math.max(0, Number(a.dondurma) || 0));
  return a;
}

export function saveAyar(ayar) {
  kaydet(AKEY, ayar);
}

// ===== Eşleştirme oyunu — bölüm ilerlemesi, rekorlar, günlük bulmaca, düello =====
const EKEY = 'yds-eslestir-v1';

export function loadEslestir() {
  try { return JSON.parse(localStorage.getItem(EKEY)) || null; }
  catch { return null; }
}

export function saveEslestir(d) {
  kaydet(EKEY, d);
}

// ===== Kullanıcının kendi kelimeleri — [{ en, tr, tur, ornek_tokenlar?, ornek_tr?, t }] =====
const OZKEY = 'yds-ozel-v1';
// ===== Cevap olay günlüğü (Faz 2) — kimlikli, yalnızca eklenen kayıtlar =====
const OLKEY = 'yds-olay-v1';
export function loadOlay() {
  try { const v = JSON.parse(localStorage.getItem(OLKEY)); return Array.isArray(v) ? v : []; }
  catch { return []; }
}
export function saveOlay(v) { kaydet(OLKEY, v); }
// Bildirimsiz yazım: olay eklemek "kirli" işaretlemez; senkronda birleşim olarak ele alınır
export function olayYazSessiz(v) { localStorage.setItem(OLKEY, JSON.stringify(v)); }

export function loadOzel() {
  try { return JSON.parse(localStorage.getItem(OZKEY)) || []; }
  catch { return []; }
}
export function saveOzel(v) { kaydet(OZKEY, v); }

// ===== Hafıza ipuçları — { en(küçük): metin } =====
const NKEY = 'yds-not-v1';
export function loadNot() {
  try { return JSON.parse(localStorage.getItem(NKEY)) || {}; }
  catch { return {}; }
}
export function saveNot(v) { kaydet(NKEY, v); }

// ===== Kelime oyunları (Harf Avı, Karışık Harfler) — { av: { kolay: { en: puan, tur: sayi } }, karisik: {...} } =====
const OYKEY = 'yds-oyunlar-v1';
export function loadOyunlar() {
  try { return JSON.parse(localStorage.getItem(OYKEY)) || {}; }
  catch { return {}; }
}
export function saveOyunlar(v) { kaydet(OYKEY, v); }

// ===== Kaldırılan test özelliklerinden kalan veri (Soru Bankası, mini deneme, ünite testleri/alıştırmaları, Yanlışlarım) =====
// Artık kullanılmaz; yedeğe girmez ve açılışta silinir.
const ESKI_TEST_ANAHTARLARI = ['yds-test-istat-v1', 'yds-yanlis-v1', 'yds-alistirma-v1', 'yds-banka-v1', 'yds-deneme-v1', 'yds-deneme-devam-v1'];
export function eskiTestVerisiniTemizle() { for (const k of ESKI_TEST_ANAHTARLARI) { try { localStorage.removeItem(k); } catch {} } }

// ===== Yedek: tüm yds-* anahtarları tek nesnede =====
export function yedekAl() {
  const veri = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith('yds-') && !ESKI_TEST_ANAHTARLARI.includes(k)) { try { veri[k] = JSON.parse(localStorage.getItem(k)); } catch { veri[k] = localStorage.getItem(k); } }
  }
  return { uygulama: 'kelimetre', surum: 1, tarih: new Date().toISOString(), veri };
}
// Yedeği yükle: yalnızca yds-* anahtarları; mevcut veriler üzerine yazılır. Döndürür: yazılan anahtar sayısı
export function yedekYukle(obj) {
  if (!obj || obj.uygulama !== 'kelimetre' || typeof obj.veri !== 'object') throw new Error('Geçersiz yedek dosyası');
  let n = 0;
  for (const [k, v] of Object.entries(obj.veri)) {
    if (!k.startsWith('yds-') || ESKI_TEST_ANAHTARLARI.includes(k)) continue;
    localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v)); n++;   // bildirimsiz (buluttan indirme)
  }
  return n;
}
