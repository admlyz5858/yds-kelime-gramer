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
  <g transform="translate(40 -50) scale(0.56)">
    <path d="M120 570 Q512 505 904 570 L904 720 Q512 655 120 720 Z" fill="#ffe08a" opacity=".95"/>
    <g stroke="#14171b" stroke-width="9" stroke-linecap="round" opacity=".5"><line x1="190" y1="676" x2="190" y2="642"/><line x1="250" y1="668" x2="250" y2="648"/><line x1="310" y1="660" x2="310" y2="626"/><line x1="370" y1="654" x2="370" y2="634"/><line x1="430" y1="650" x2="430" y2="616"/><line x1="490" y1="648" x2="490" y2="628"/><line x1="550" y1="648" x2="550" y2="614"/><line x1="610" y1="650" x2="610" y2="630"/><line x1="670" y1="654" x2="670" y2="620"/><line x1="730" y1="660" x2="730" y2="640"/><line x1="790" y1="668" x2="790" y2="634"/><line x1="850" y1="676" x2="850" y2="656"/></g>
    <text x="512" y="735" font-family="DejaVu Serif, Georgia, serif" font-size="640" font-weight="700" fill="#fffdf6" text-anchor="middle">K</text>
  </g>
  <text x="590" y="205" font-family="DejaVu Serif, Georgia, serif" font-size="78" font-weight="700" fill="#fffdf6">Kelimetre</text>
  <rect x="592" y="228" width="360" height="12" rx="6" fill="#ffe08a"/>
  <text x="592" y="290" font-family="DejaVu Sans, sans-serif" font-size="28" fill="#fffdf6">YDS &amp; YÖKDİL Kelime</text>
  <text x="592" y="335" font-family="DejaVu Sans, sans-serif" font-size="21" fill="rgba(255,255,255,.75)">2300+ kelime · eşleştirme · aralıklı tekrar</text>
</svg>`;
await sharp(Buffer.from(feature)).png().toFile(join(out, 'feature-1024x500.png'));

console.log('Görseller üretildi: ikon-512.png, feature-1024x500.png');
