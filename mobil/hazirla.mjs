// mobil/hazirla.mjs — app/ PWA'sını www/'a hazırlar, premium ünite JSON'larını eler.
// Saf Node, bağımlılıksız. Hem yerelde hem CI'da çalışır.
import { cpSync, rmSync, mkdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { havuzYaz } from './kelime-havuz.mjs';

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

// 3) İÇERİK KAPSAMI: mağaza sürümünde TÜM üniteler ÜCRETSİZ ve açık (kilit yok).
//    Kilitlemek istenirse aşağıdaki UCRETSIZ listesini daralt (ör. [1]) — o zaman
//    listede olmayan üniteler premium/kilitli olur ve (TUMU=1 değilse) paketten elenir.
// TUMU=1 → premium (varsa) içerik pakete GİRER ama kilitli kalır (kodla açılır).
const TUMU = process.env.TUMU === '1';
const manifestYol = join(hedef, 'data', 'manifest.json');
const manifest = JSON.parse(readFileSync(manifestYol, 'utf8'));
const UCRETSIZ = manifest.dersler.map(d => d.id);   // hepsi ücretsiz
for (const d of manifest.dersler) {
  d.durum = UCRETSIZ.includes(d.id) ? 'hazir' : 'premium';   // hepsi açık (kaynakta premium olsa bile)
}
// Store manifest'ini (kilitli durumlarla) www'a geri yaz — uygulama bunu okuyup kilitli kart çizer
writeFileSync(manifestYol, JSON.stringify(manifest, null, 2) + '\n');

// Premium ünite JSON'larını paketten ele (TEST build'inde elenmez → kodla açılınca içerik var)
let elenen = [];
if (!TUMU) {
  for (const d of manifest.dersler) {
    if (d.durum === 'premium' && d.dosya) {
      const yol = join(hedef, 'data', d.dosya);
      if (existsSync(yol)) { rmSync(yol, { force: true }); elenen.push(d.id); }
    }
  }
}

// 4) Kelime Öğren havuzunu pakete GİREN ünitelerden yeniden üret.
//    Üretim build'inde premium üniteler silindiği için havuz kendiliğinden sadece
//    ücretsiz kelimeleri içerir; TEST build'inde (TUMU=1) tüm üniteler kalır → tüm havuz.
const havuzDir = join(hedef, 'data', 'uniteler');
const havuzCikti = join(hedef, 'data', 'kelime-havuz.json');
if (existsSync(havuzDir)) {
  const h = havuzYaz(havuzDir, havuzCikti);
  console.log('Kelime havuzu (paket):', h.toplam, 'kelime · üniteler', h.uniteler.join(','));
}

console.log('www/ hazır.', TUMU ? '[TEST build — tüm içerik dahil, kilitli]' : '[ÜRETİM build]', 'Ücretsiz üniteler:', UCRETSIZ.join(','));
console.log('Elenen premium ünite JSON:', elenen.join(',') || '(yok)');
console.log('Pakete giren üniteler:', manifest.dersler.filter(d => d.durum !== 'premium').map(d => d.id).join(','));
