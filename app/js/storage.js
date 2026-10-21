// app/js/storage.js — localStorage üstüne ince sarmalayıcı
// Her save*() bir kayıt bildirimi yayar (bulut eşitleme bunu dinler): kayitDinle(fn) → fn(anahtar)
const dinleyiciler = [];
export function kayitDinle(fn) { dinleyiciler.push(fn); }
function kaydet(anahtar, deger) { localStorage.setItem(anahtar, JSON.stringify(deger)); for (const f of dinleyiciler) { try { f(anahtar); } catch {} } }
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

// ===== Test istatistikleri — { "unitId#testIdx": {dogru, toplam, tamam} } (en iyi skor) =====
const IKEY = 'yds-test-istat-v1';

export function loadIstat() {
  try { return JSON.parse(localStorage.getItem(IKEY)) || {}; }
  catch { return {}; }
}

export function saveIstat(istat) {
  kaydet(IKEY, istat);
}

// ===== Yanlışlarım — [{ key, soru, unite }] tüm üniteler boyunca birikir =====
const YKEY = 'yds-yanlis-v1';

export function loadYanlis() {
  try { return JSON.parse(localStorage.getItem(YKEY)) || []; }
  catch { return []; }
}

export function saveYanlis(yanlis) {
  kaydet(YKEY, yanlis);
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
  try { return JSON.parse(localStorage.getItem(AKEY)) || {}; }
  catch { return {}; }
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

// ===== Ünite alıştırmaları — { uniteId: { yapilan, dogru, zayif:{etiket: yanlisSayisi} } } =====
const ALKEY = 'yds-alistirma-v1';

export function loadAlistirma() {
  try { return JSON.parse(localStorage.getItem(ALKEY)) || {}; }
  catch { return {}; }
}

export function saveAlistirma(a) {
  kaydet(ALKEY, a);
}

// ===== Soru Bankası istatistikleri — { "konu/alt": { yapilan, dogru, yanlisId: [] } } =====
const BKEY = 'yds-banka-v1';
export function loadBanka() {
  try { return JSON.parse(localStorage.getItem(BKEY)) || {}; }
  catch { return {}; }
}
export function saveBanka(v) { kaydet(BKEY, v); }

// ===== Kullanıcının kendi kelimeleri — [{ en, tr, tur, ornek_tokenlar?, ornek_tr?, t }] =====
const OZKEY = 'yds-ozel-v1';
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

// ===== Mini deneme geçmişi — [{ tarih, dogru, yanlis, bos, puan, sure, kirilim }] =====
const DNKEY = 'yds-deneme-v1';
export function loadDeneme() {
  try { return JSON.parse(localStorage.getItem(DNKEY)) || []; }
  catch { return []; }
}
export function saveDeneme(v) { kaydet(DNKEY, v); }

// ===== Yedek: tüm yds-* anahtarları tek nesnede =====
export function yedekAl() {
  const veri = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith('yds-')) { try { veri[k] = JSON.parse(localStorage.getItem(k)); } catch { veri[k] = localStorage.getItem(k); } }
  }
  return { uygulama: 'kelimetre', surum: 1, tarih: new Date().toISOString(), veri };
}
// Yedeği yükle: yalnızca yds-* anahtarları; mevcut veriler üzerine yazılır. Döndürür: yazılan anahtar sayısı
export function yedekYukle(obj) {
  if (!obj || obj.uygulama !== 'kelimetre' || typeof obj.veri !== 'object') throw new Error('Geçersiz yedek dosyası');
  let n = 0;
  for (const [k, v] of Object.entries(obj.veri)) {
    if (!k.startsWith('yds-')) continue;
    localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v)); n++;   // bildirimsiz (buluttan indirme)
  }
  return n;
}
