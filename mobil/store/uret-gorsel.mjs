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
  <rect width="1024" height="500" fill="#f4ecdb"/>
  <!-- sol: kitap amblemi -->
  <g transform="translate(70,110)">
    <rect x="0" y="0" width="300" height="280" rx="20" fill="#fffaf0" stroke="#c2542f" stroke-width="12"/>
    <line x1="150" y1="14" x2="150" y2="266" stroke="#c2542f" stroke-width="9"/>
    <g stroke="#3a3327" stroke-width="8" stroke-linecap="round">
      <line x1="36" y1="64" x2="128" y2="64"/>
      <line x1="36" y1="104" x2="128" y2="104"/>
      <line x1="36" y1="144" x2="110" y2="144"/>
      <line x1="172" y1="64" x2="264" y2="64"/>
      <line x1="172" y1="104" x2="264" y2="104"/>
      <line x1="172" y1="144" x2="246" y2="144"/>
    </g>
  </g>
  <!-- sağ: metin -->
  <text x="430" y="205" font-family="DejaVu Serif, Georgia, serif" font-size="62" font-weight="700" fill="#c2542f">YDS Kelime</text>
  <text x="430" y="280" font-family="DejaVu Serif, Georgia, serif" font-size="62" font-weight="700" fill="#c2542f">ve Gramer</text>
  <text x="432" y="345" font-family="DejaVu Sans, sans-serif" font-size="30" fill="#3a3327">1000 Kelime · Akıllı Kartlar · Testler</text>
  <text x="432" y="392" font-family="DejaVu Sans, sans-serif" font-size="26" fill="#6b5d44">Çevrimdışı · YDS &amp; YÖKDİL</text>
</svg>`;
await sharp(Buffer.from(feature)).png().toFile(join(out, 'feature-1024x500.png'));

console.log('Görseller üretildi: ikon-512.png, feature-1024x500.png');
