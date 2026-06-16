// mobil/hazirla.mjs — app/ PWA'sını www/'a hazırlar, premium ünite JSON'larını eler.
// Saf Node, bağımlılıksız. Hem yerelde hem CI'da çalışır.
import { cpSync, rmSync, mkdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const buGun = dirname(fileURLToPath(import.meta.url));
const kok = join(buGun, '..');
const kaynak = join(kok, 'app');
const hedef = join(buGun, 'www');

// 1) www/ temizle + app/ kopyala
rmSync(hedef, { recursive: true, force: true });
mkdirSync(hedef, { recursive: true });
cpSync(kaynak, hedef, { recursive: true });

// 2) Geliştirme-only dosyaları at
for (const f of ['sunucu.py', 'baslat.sh', 'js/logic.test.js']) {
  rmSync(join(hedef, f), { force: true });
}
// frames klasörü (varsa) pakete girmesin
rmSync(join(hedef, 'data', 'frames'), { recursive: true, force: true });

// 3) Premium ünite JSON'larını ele (manifest.durum'a göre — otomatik/gelecek-uyumlu)
const manifest = JSON.parse(readFileSync(join(hedef, 'data', 'manifest.json'), 'utf8'));
let elenen = [];
for (const d of manifest.dersler) {
  if (d.durum === 'premium' && d.dosya) {
    const yol = join(hedef, 'data', d.dosya);
    if (existsSync(yol)) { rmSync(yol, { force: true }); elenen.push(d.id); }
  }
}

console.log('www/ hazır. Elenen premium ünite JSON:', elenen.join(',') || '(yok)');
console.log('Pakete giren üniteler:', manifest.dersler.filter(d => d.durum !== 'premium').map(d => d.id).join(','));
