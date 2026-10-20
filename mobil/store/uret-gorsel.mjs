// mobil/store/uret-gorsel.mjs — Play mağaza görsellerini üretir (sharp ile).
// Çıktı: cikti/ikon-512.png (512x512) + cikti/feature-1024x500.png
// sharp, @capacitor/assets bağımlılığı olarak node_modules'ta mevcuttur.
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, 'cikti');
mkdirSync(out, { recursive: true });

// 1) 512x512 mağaza ikonu — kaynak logo.svg'den
const logo = join(here, '..', 'kaynak', 'logo.svg');
await sharp(logo).resize(512, 512, { fit: 'cover' }).png().toFile(join(out, 'ikon-512.png'));

// 2) 1024x500 öne çıkan grafik (feature graphic)
const feature = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="500" viewBox="0 0 1024 500">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1c1f26"/><stop offset="1" stop-color="#2a2140"/></linearGradient></defs>
  <rect width="1024" height="500" fill="url(#g)"/>
  <!-- sol: ikon işareti -->
  <g transform="translate(40 -10) scale(0.5)">
    <path d="M150 560 Q512 500 880 560 L880 700 Q512 640 150 700 Z" fill="#ffe08a" opacity=".95"/>
    <text x="512" y="672" font-family="DejaVu Serif, Georgia, serif" font-size="330" font-weight="700" fill="#fffdf6" text-anchor="middle" letter-spacing="-8">YDS</text>
    <rect x="330" y="760" width="364" height="22" rx="11" fill="#d24f2b"/>
    <rect x="412" y="806" width="200" height="22" rx="11" fill="#0d7d72"/>
  </g>
  <!-- sağ: metin -->
  <text x="560" y="190" font-family="DejaVu Serif, Georgia, serif" font-size="58" font-weight="700" fill="#fffdf6">YDS Kelime</text>
  <text x="560" y="262" font-family="DejaVu Serif, Georgia, serif" font-size="58" font-weight="700" fill="#fffdf6">ve Gramer</text>
  <rect x="560" y="292" width="300" height="12" rx="6" fill="#ffe08a"/>
  <text x="560" y="345" font-family="DejaVu Sans, sans-serif" font-size="26" fill="#fffdf6">2300+ Kelime · Eşleştirme Oyunu</text>
  <text x="560" y="385" font-family="DejaVu Sans, sans-serif" font-size="22" fill="rgba(255,255,255,.75)">Aralıklı Tekrar · Çevrimdışı · YDS &amp; YÖKDİL</text>
</svg>`;
await sharp(Buffer.from(feature)).png().toFile(join(out, 'feature-1024x500.png'));

console.log('Görseller üretildi: ikon-512.png, feature-1024x500.png');
