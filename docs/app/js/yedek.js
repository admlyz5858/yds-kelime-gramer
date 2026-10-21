// app/js/yedek.js — İlerlemeyi dosya olarak dışa/içe aktarma (telefon değişimi, Android ↔ iPhone PWA).
// Android (Capacitor): dosya önbelleğe yazılır ve paylaşım sayfasıyla Drive/Dosyalar'a gönderilir.
// Tarayıcı/PWA: indirme bağlantısı. İçe aktarma her yerde <input type=file> ile.
import { yedekAl, yedekYukle } from './storage.js';

const dosyaAdi = () => `kelimetre-yedek-${new Date().toISOString().slice(0, 10)}.json`;

export async function disaAktar() {
  const metin = JSON.stringify(yedekAl());
  const P = window.Capacitor?.Plugins;
  if (P?.Filesystem && P?.Share) {
    try {
      const r = await P.Filesystem.writeFile({ path: dosyaAdi(), data: metin, directory: 'CACHE', encoding: 'utf8' });
      await P.Share.share({ title: 'Kelimetre yedeği', files: [r.uri], dialogTitle: 'Yedeği kaydet / gönder' });
      return 'paylasildi';
    } catch (e) { if (e && /cancel/i.test(String(e.message || e))) return 'iptal'; }
  }
  try {
    const blob = new Blob([metin], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = dosyaAdi(); document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 2000);
    return 'indirildi';
  } catch { return false; }
}

// Dosya seçtirip yedeği okur; { ozet, uygula() } döndürür (onay için)
export function iceAktarSec() {
  return new Promise((resolve) => {
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.json,application/json';
    inp.onchange = () => {
      const f = inp.files && inp.files[0]; if (!f) return resolve(null);
      const r = new FileReader();
      r.onload = () => {
        try {
          const obj = JSON.parse(String(r.result));
          if (!obj || obj.uygulama !== 'kelimetre') return resolve({ hata: 'Bu bir Kelimetre yedeği değil.' });
          const v = obj.veri || {};
          const ozet = {
            tarih: obj.tarih ? new Date(obj.tarih).toLocaleDateString('tr-TR') : '?',
            kart: Object.keys((v['yds-srs-v1'] || {}).kartlar || {}).length,
            defter: Object.keys(v['yds-defter-v1'] || {}).length,
            test: Object.keys(v['yds-test-istat-v1'] || {}).length,
            xp: (v['yds-ayar-v1'] || {}).xp || 0,
          };
          resolve({ ozet, uygula: () => yedekYukle(obj) });
        } catch { resolve({ hata: 'Dosya okunamadı.' }); }
      };
      r.readAsText(f);
    };
    inp.click();
  });
}
