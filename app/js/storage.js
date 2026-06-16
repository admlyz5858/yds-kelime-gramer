// app/js/storage.js — localStorage üstüne ince sarmalayıcı
const KEY = 'yds-ilerleme-v1';

export function loadProgress() {
  try { return JSON.parse(localStorage.getItem(KEY)) || {}; }
  catch { return {}; }
}

export function saveProgress(progress) {
  localStorage.setItem(KEY, JSON.stringify(progress));
}

// ===== Kelime Defteri (kişisel) — { en(küçük): kelimeObj } =====
const DKEY = 'yds-defter-v1';

export function loadDefter() {
  try { return JSON.parse(localStorage.getItem(DKEY)) || {}; }
  catch { return {}; }
}

export function saveDefter(defter) {
  localStorage.setItem(DKEY, JSON.stringify(defter));
}

// ===== Test istatistikleri — { "unitId#testIdx": {dogru, toplam, tamam} } (en iyi skor) =====
const IKEY = 'yds-test-istat-v1';

export function loadIstat() {
  try { return JSON.parse(localStorage.getItem(IKEY)) || {}; }
  catch { return {}; }
}

export function saveIstat(istat) {
  localStorage.setItem(IKEY, JSON.stringify(istat));
}

// ===== Yanlışlarım — [{ key, soru, unite }] tüm üniteler boyunca birikir =====
const YKEY = 'yds-yanlis-v1';

export function loadYanlis() {
  try { return JSON.parse(localStorage.getItem(YKEY)) || []; }
  catch { return []; }
}

export function saveYanlis(yanlis) {
  localStorage.setItem(YKEY, JSON.stringify(yanlis));
}

// ===== Uygulama ayarları / bayraklar — { girisGoruldu, ... } =====
const AKEY = 'yds-ayar-v1';

export function loadAyar() {
  try { return JSON.parse(localStorage.getItem(AKEY)) || {}; }
  catch { return {}; }
}

export function saveAyar(ayar) {
  localStorage.setItem(AKEY, JSON.stringify(ayar));
}
