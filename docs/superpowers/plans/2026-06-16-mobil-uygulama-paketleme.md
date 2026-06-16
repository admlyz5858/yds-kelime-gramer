# YDS Kelime ve Gramer — Mobil Uygulama Paketleme Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mevcut offline PWA'yı (`app/`) bozmadan, yalnızca Ünite 1 açık (2-11 "🔒 Premium — yakında" kilitli) olacak şekilde GitHub Actions'ta imzalı bir Android **AAB**'ye paketleyip Play Store'a yüklemeye hazır hale getirmek.

**Architecture:** PWA kanonik kaynak kalır. Premium-kilit, `logic.js`'e saf bir yardımcıya + `app.js` render/guard'ına eklenen küçük bir özelliktir. Capacitor web varlıklarını uygulamaya gömer (`https://localhost`, offline, göreli `fetch` çalışır). `mobil/hazirla.mjs` premium üniteleri pakete almaz (manifest `durum`'una göre otomatik). GitHub Actions (`ubuntu-latest`) `bundleRelease` ile imzalı AAB üretir; Termux sadece düzenleme + push için.

**Tech Stack:** Vanilla JS (PWA), Node `node:test`, Capacitor 6, Gradle (CI), GitHub Actions, apksigner/jarsigner.

---

## Dosya Yapısı

**Değişen (PWA, `app/`):**
- `app/js/logic.js` — `dersKilitli`, `dersDurumEtiket` saf yardımcıları (Değişiklik)
- `app/js/logic.test.js` — yeni yardımcılar için test (Değişiklik)
- `app/data/manifest.json` — Ünite 2-11 `durum: "premium"` (Değişiklik)
- `app/js/app.js` — `cekmeceAc` render'ı + tıklama + `dersAc` guard (Değişiklik)
- `app/css/style.css` — premium rozet/kilit stili (Değişiklik)

**Yeni (mobil, `mobil/`):**
- `mobil/package.json` — Capacitor bağımlılıkları + scriptler
- `mobil/capacitor.config.json` — appId/appName/webDir/scheme
- `mobil/hazirla.mjs` — staging: `app/` → `www/`, premium eleme
- `mobil/kaynak/logo.svg` — ikon kaynağı (CI ikon üretir)
- `mobil/android/` — `npx cap add android` ile üretilir, commit edilir (build dizinleri gitignore)

**Yeni (CI/altyapı):**
- `.github/workflows/android.yml` — build + imza + AAB artifact
- `docs/MOBIL-YAYIN.md` — keystore yedeği + Play Console yükleme rehberi

**Test komutu (PWA):** `cd app && node --test js/logic.test.js`
**Dev sunucu (regresyon kontrolü):** `bash app/baslat.sh` → http://localhost:8100

---

## FAZ A — PWA premium-kilit özelliği

### Task 1: `logic.js` premium yardımcıları (TDD)

**Files:**
- Modify: `app/js/logic.js`
- Test: `app/js/logic.test.js`

- [ ] **Step 1: Başarısız testleri yaz**

`app/js/logic.test.js` dosyasının başındaki import satırına `dersKilitli, dersDurumEtiket` ekle:

```js
import { searchLessons, toggleDone, isDone, scoreQuiz, isAnswerCorrect, nextCard, dersKilitli, dersDurumEtiket } from './logic.js';
```

Dosyanın sonuna şu testleri ekle:

```js
test('dersKilitli premium ve yakinda için true, hazir için false', () => {
  assert.equal(dersKilitli({ durum: 'premium' }), true);
  assert.equal(dersKilitli({ durum: 'yakinda' }), true);
  assert.equal(dersKilitli({ durum: 'hazir' }), false);
  assert.equal(dersKilitli({}), false);
  assert.equal(dersKilitli(null), false);
});

test('dersDurumEtiket duruma göre etiket verir', () => {
  assert.equal(dersDurumEtiket({ durum: 'premium' }), 'Premium — yakında');
  assert.equal(dersDurumEtiket({ durum: 'yakinda' }), 'Yakında');
  assert.equal(dersDurumEtiket({ durum: 'hazir' }), '');
});
```

- [ ] **Step 2: Testin başarısız olduğunu doğrula**

Run: `cd /storage/emulated/0/dos/adm/app && node --test js/logic.test.js`
Expected: FAIL — `dersKilitli is not a function` / import hatası.

- [ ] **Step 3: Minimal implementasyonu yaz**

`app/js/logic.js` sonuna ekle:

```js
export function dersKilitli(ders) {
  const d = ders && ders.durum;
  return d === 'premium' || d === 'yakinda';
}

export function dersDurumEtiket(ders) {
  const d = ders && ders.durum;
  if (d === 'premium') return 'Premium — yakında';
  if (d === 'yakinda') return 'Yakında';
  return '';
}
```

- [ ] **Step 4: Testin geçtiğini doğrula**

Run: `cd /storage/emulated/0/dos/adm/app && node --test js/logic.test.js`
Expected: PASS — tüm testler (7 test) geçer.

- [ ] **Step 5: Commit**

```bash
cd /storage/emulated/0/dos/adm
git add app/js/logic.js app/js/logic.test.js
git commit -m "feat: dersKilitli/dersDurumEtiket premium yardımcıları"
```

---

### Task 2: `manifest.json` — Ünite 2-11 premium işaretle

**Files:**
- Modify: `app/data/manifest.json`

- [ ] **Step 1: Manifest'i node ile güncelle**

Run:
```bash
cd /storage/emulated/0/dos/adm
node -e "
const fs=require('fs');
const p='app/data/manifest.json';
const m=JSON.parse(fs.readFileSync(p,'utf8'));
for (const d of m.dersler) { if (d.id !== 1) d.durum = 'premium'; }
fs.writeFileSync(p, JSON.stringify(m, null, 2) + '\n');
console.log('Premium yapılan:', m.dersler.filter(d=>d.durum==='premium').map(d=>d.id).join(','));
"
```
Expected: `Premium yapılan: 2,3,4,5,6,7,8,9,10,11`

- [ ] **Step 2: Doğrula**

Run: `node -e "const m=require('/storage/emulated/0/dos/adm/app/data/manifest.json'); console.log(m.dersler.map(d=>d.id+':'+d.durum).join(' '));"`
Expected: `1:hazir 2:premium 3:premium ... 11:premium`

- [ ] **Step 3: Commit**

```bash
cd /storage/emulated/0/dos/adm
git add app/data/manifest.json
git commit -m "feat: Ünite 2-11 premium olarak işaretlendi"
```

---

### Task 3: `app.js` — kilitli kart render + tıklama + `dersAc` guard

**Files:**
- Modify: `app/js/app.js` (import satırı, `cekmeceAc` render bloğu, `dersAc`)

- [ ] **Step 1: Import satırına yardımcıları ekle**

`app/js/app.js` içinde `logic.js`'ten import yapılan satırı bul (`from './logic.js'` ya da `from "./logic.js"`). `dersKilitli` ve `dersDurumEtiket`'i import listesine ekle. Örnek (mevcut import isimlerini KORU, sadece ikisini ekle):

```js
import { searchLessons, isDone, scoreQuiz, isAnswerCorrect, nextCard, toggleDone, dersKilitli, dersDurumEtiket } from './logic.js';
```

> Not: Mevcut import satırındaki isim listesi farklı olabilir — var olan isimleri silmeden sona `, dersKilitli, dersDurumEtiket` ekle.

- [ ] **Step 2: `cekmeceAc` render bloğunu güncelle**

`app/js/app.js` içinde şu bloğu bul:

```js
    liste.innerHTML = searchLessons(manifest.dersler, q).map(d => {
      const bilgi = d.durum === 'yakinda' ? 'Yakında'
        : [d.kelime_sayisi ? `${d.kelime_sayisi} kelime` : '', d.bolum_sayisi ? `${d.bolum_sayisi} bölüm` : ''].filter(Boolean).join(' · ');
      const ad = d.baslik.replace(/^Ünite\s*\d+\s*[—-]\s*/i, '');
      return `<button class="cek-ders ${d.durum === 'yakinda' ? 'yakinda' : ''}" data-id="${d.id}" data-dosya="${d.dosya}" ${d.durum === 'yakinda' ? 'disabled' : ''}>
        <div class="cek-no">${d.id}</div>
        <div class="cek-ic"><div class="cek-bas">${esc(ad)}</div><div class="cek-alt">${esc(bilgi)}${isDone(progress, d.id) ? ' · ✓ çalışıldı' : ''}</div></div>
        ${d.durum === 'yakinda' ? '<span class="cek-kilit">🔒</span>' : '<span class="ok">›</span>'}
      </button>`;
    }).join('');
```

ve tamamını şununla değiştir:

```js
    liste.innerHTML = searchLessons(manifest.dersler, q).map(d => {
      const kilitli = dersKilitli(d);
      const bilgi = kilitli ? dersDurumEtiket(d)
        : [d.kelime_sayisi ? `${d.kelime_sayisi} kelime` : '', d.bolum_sayisi ? `${d.bolum_sayisi} bölüm` : ''].filter(Boolean).join(' · ');
      const ad = d.baslik.replace(/^Ünite\s*\d+\s*[—-]\s*/i, '');
      return `<button class="cek-ders ${kilitli ? 'kilitli' : ''} ${d.durum === 'premium' ? 'premium' : ''}" data-id="${d.id}" data-dosya="${d.dosya}" data-durum="${d.durum || ''}">
        <div class="cek-no">${d.id}</div>
        <div class="cek-ic"><div class="cek-bas">${esc(ad)}</div><div class="cek-alt">${esc(bilgi)}${isDone(progress, d.id) ? ' · ✓ çalışıldı' : ''}</div></div>
        ${kilitli ? '<span class="cek-kilit">🔒</span>' : '<span class="ok">›</span>'}
      </button>`;
    }).join('');
```

> Değişiklik: `disabled` özniteliği kaldırıldı (kilitli kartlar artık tıklanıp bilgilendirme gösterecek), `kilitli`/`premium` sınıfları ve `data-durum` eklendi.

- [ ] **Step 3: Tıklama bağlamasını güncelle**

Aynı fonksiyonda (bu render'ın hemen altında) şu satırları bul:

```js
    liste.querySelectorAll('.cek-ders:not([disabled])').forEach(el =>
      el.onclick = () => { kapat(); dersAc(el.dataset.dosya, Number(el.dataset.id)); });
```

ve şununla değiştir:

```js
    liste.querySelectorAll('.cek-ders').forEach(el =>
      el.onclick = () => {
        const dd = manifest.dersler.find(x => x.id === Number(el.dataset.id));
        if (dersKilitli(dd)) {
          modalAc('Premium — yakında', `
            <p class="modal-aciklama">Bu ünite yakında <b>premium</b> ile açılacak. Şimdilik <b>Ünite 1 — En Sık Kullanılan 1000 Kelime</b> ücretsiz çalışabilirsin.</p>`);
          return;
        }
        kapat();
        dersAc(el.dataset.dosya, Number(el.dataset.id));
      });
```

- [ ] **Step 4: `dersAc`'a guard ekle (eksik premium JSON'da çökmeyi önle)**

`app/js/app.js` içinde `async function dersAc(dosya, id) {` satırını bul ve gövdenin EN BAŞINA (ilk satır olarak) şunu ekle:

```js
  const _ders = manifest.dersler.find(x => x.id === Number(id));
  if (dersKilitli(_ders)) {
    modalAc('Premium — yakında', `<p class="modal-aciklama">Bu ünite yakında premium ile açılacak.</p>`);
    return;
  }
```

> Bu, "kaldığın yerden devam" gibi yolların premium üniteye düşmesi hâlinde eksik JSON fetch'ini ve çökmeyi engeller.

- [ ] **Step 5: Manuel doğrulama (dev sunucu)**

Run (arka planda): `bash /storage/emulated/0/dos/adm/app/baslat.sh`
Tarayıcıda http://localhost:8100 → Müfredat çekmecesini (☰) aç.
Expected:
- Ünite 1 normal, `›` ile açılabilir.
- Ünite 2-11 `🔒` ve altında "Premium — yakında"; tıklayınca "Premium — yakında" modalı açılır, ünite içeriği açılmaz.

(Playwright varsa `webapp-testing` skill'i ile otomatik doğrula; yoksa kullanıcıdan görsel onay iste.)

- [ ] **Step 6: Birim testleri tekrar koştur**

Run: `cd /storage/emulated/0/dos/adm/app && node --test js/logic.test.js`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
cd /storage/emulated/0/dos/adm
git add app/js/app.js
git commit -m "feat: kilitli üniteleri premium kart olarak göster + dersAc guard"
```

---

### Task 4: `style.css` — premium kart stili

**Files:**
- Modify: `app/css/style.css`

- [ ] **Step 1: Mevcut `.cek-ders.yakinda` / `.cek-kilit` stillerini bul**

Run: `node -e "const s=require('fs').readFileSync('/storage/emulated/0/dos/adm/app/css/style.css','utf8'); const i=s.indexOf('cek-kilit'); console.log(i<0?'YOK':s.slice(s.lastIndexOf('.cek',i)-2, i+160));"`
Expected: mevcut kilit/yakinda stilini gösterir (referans için).

- [ ] **Step 2: Premium stilini ekle**

`app/css/style.css` SONUNA ekle:

```css
/* Premium kilitli ünite kartı */
.cek-ders.kilitli { opacity: .72; }
.cek-ders.kilitli .cek-no { background: #d9cdb0; color: #6b5d44; }
.cek-ders.premium .cek-alt {
  color: #c2542f; font-weight: 600;
}
.cek-ders.kilitli .cek-kilit { font-size: 18px; opacity: .85; }
.modal-aciklama { margin: 4px 2px 8px; line-height: 1.5; }
```

- [ ] **Step 3: Görsel doğrula**

Dev sunucu açıkken http://localhost:8100 → çekmece. Premium kartların soluk göründüğünü, "Premium — yakında" etiketinin terracotta renkte olduğunu doğrula.

- [ ] **Step 4: Commit**

```bash
cd /storage/emulated/0/dos/adm
git add app/css/style.css
git commit -m "style: premium kilitli ünite kartı görünümü"
```

---

## FAZ B — Capacitor mobil projesi

### Task 5: `mobil/` iskelet (package.json + capacitor.config.json)

**Files:**
- Create: `mobil/package.json`
- Create: `mobil/capacitor.config.json`

- [ ] **Step 1: package.json oluştur**

`mobil/package.json`:

```json
{
  "name": "yds-kelime-gramer-mobil",
  "version": "1.0.0",
  "private": true,
  "description": "YDS Kelime ve Gramer — Capacitor mobil sarmalayıcı",
  "scripts": {
    "hazirla": "node hazirla.mjs",
    "sync": "node hazirla.mjs && cap sync android"
  },
  "dependencies": {
    "@capacitor/android": "^6.1.2",
    "@capacitor/core": "^6.1.2"
  },
  "devDependencies": {
    "@capacitor/cli": "^6.1.2",
    "@capacitor/assets": "^3.0.5"
  }
}
```

- [ ] **Step 2: capacitor.config.json oluştur**

`mobil/capacitor.config.json`:

```json
{
  "appId": "com.admlyz.ydsders",
  "appName": "YDS Kelime ve Gramer",
  "webDir": "www",
  "server": {
    "androidScheme": "https"
  },
  "android": {
    "backgroundColor": "#f4ecdb"
  }
}
```

- [ ] **Step 3: Commit**

```bash
cd /storage/emulated/0/dos/adm
git add mobil/package.json mobil/capacitor.config.json
git commit -m "feat: Capacitor mobil iskelet (package + config)"
```

---

### Task 6: `mobil/hazirla.mjs` — staging script (premium eleme)

**Files:**
- Create: `mobil/hazirla.mjs`

- [ ] **Step 1: Script'i yaz**

`mobil/hazirla.mjs`:

```js
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
```

- [ ] **Step 2: Çalıştır ve doğrula**

Run:
```bash
cd /storage/emulated/0/dos/adm/mobil && node hazirla.mjs
```
Expected:
```
www/ hazır. Elenen premium ünite JSON: 2,3,4,5,6,7,8,9,10,11
Pakete giren üniteler: 1
```

- [ ] **Step 3: İçeriği denetle**

Run:
```bash
ls /storage/emulated/0/dos/adm/mobil/www/data/uniteler/
ls /storage/emulated/0/dos/adm/mobil/www/js/
```
Expected: `uniteler/` içinde yalnızca `unite-01.json` var (02-11 yok). `js/` içinde `logic.test.js` YOK; `app.js logic.js storage.js` var.

- [ ] **Step 4: Commit**

```bash
cd /storage/emulated/0/dos/adm
git add mobil/hazirla.mjs
git commit -m "feat: hazirla.mjs staging script (premium eleme)"
```

---

### Task 7: İkon kaynağı (`mobil/kaynak/logo.svg`)

**Files:**
- Create: `mobil/kaynak/logo.svg`

- [ ] **Step 1: SVG ikonu oluştur**

`mobil/kaynak/logo.svg` (1024×1024, sıcak-kâğıt teması):

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <rect width="1024" height="1024" fill="#f4ecdb"/>
  <rect x="232" y="300" width="560" height="430" rx="28" fill="#fffaf0" stroke="#c2542f" stroke-width="18"/>
  <line x1="512" y1="318" x2="512" y2="712" stroke="#c2542f" stroke-width="14"/>
  <g stroke="#3a3327" stroke-width="12" stroke-linecap="round">
    <line x1="300" y1="392" x2="464" y2="392"/>
    <line x1="300" y1="452" x2="464" y2="452"/>
    <line x1="300" y1="512" x2="430" y2="512"/>
    <line x1="560" y1="392" x2="724" y2="392"/>
    <line x1="560" y1="452" x2="724" y2="452"/>
    <line x1="560" y1="512" x2="690" y2="512"/>
  </g>
  <text x="512" y="855" font-family="Georgia, 'Times New Roman', serif" font-size="170" font-weight="700" fill="#c2542f" text-anchor="middle">YDS</text>
</svg>
```

- [ ] **Step 2: Geçerli SVG mi kontrol et**

Run: `node -e "const s=require('fs').readFileSync('/storage/emulated/0/dos/adm/mobil/kaynak/logo.svg','utf8'); console.log(s.includes('</svg>') ? 'OK' : 'BOZUK');"`
Expected: `OK`

- [ ] **Step 3: Commit**

```bash
cd /storage/emulated/0/dos/adm
git add mobil/kaynak/logo.svg
git commit -m "feat: uygulama ikonu kaynak SVG"
```

> Not: İkon PNG/adaptive üretimi CI'da `npx @capacitor/assets generate` ile yapılır (Termux'ta sharp native modülü sorun çıkarabilir — bu yüzden yerelde üretilmez).

---

### Task 8: Android platformunu üret (`npx cap add android`)

**Files:**
- Create: `mobil/android/` (Capacitor template — commit edilir)

- [ ] **Step 1: Bağımlılıkları kur**

Run:
```bash
cd /storage/emulated/0/dos/adm/mobil && npm install
```
Expected: `node_modules/` oluşur, hata yok. (Sürerse birkaç dakika sürebilir.)

- [ ] **Step 2: www/ hazırla (cap add www bekler)**

Run: `cd /storage/emulated/0/dos/adm/mobil && node hazirla.mjs`
Expected: "www/ hazır ..." çıktısı.

- [ ] **Step 3: Android platformunu ekle**

Run:
```bash
cd /storage/emulated/0/dos/adm/mobil && npx cap add android
```
Expected: `android/` dizini oluşur ("[success] android platform added"). Bu adım sadece dosya kopyalar; derleme yapmaz, Termux'ta çalışır.

- [ ] **Step 4: Doğrula**

Run: `ls /storage/emulated/0/dos/adm/mobil/android/ && cat /storage/emulated/0/dos/adm/mobil/android/app/src/main/res/values/strings.xml`
Expected: `app/ build.gradle gradlew settings.gradle ...` ve strings.xml içinde `app_name`/`title_activity_main` "YDS Kelime ve Gramer".

- [ ] **Step 5: Commit**

```bash
cd /storage/emulated/0/dos/adm
git add mobil/android
git commit -m "feat: Capacitor android platformu eklendi"
```

> `.gitignore` zaten `mobil/android/app/build/`, `.gradle/`, `local.properties` vb. dışlar.

---

### Task 9: Sürüm + imza yapılandırması (`build.gradle`)

**Files:**
- Modify: `mobil/android/app/build.gradle`

- [ ] **Step 1: versionName'i doğrula/ayarla**

`mobil/android/app/build.gradle` içinde `defaultConfig` bloğunu bul. `versionCode 1` ve `versionName "1.0.0"` olduğundan emin ol (Capacitor varsayılanı genelde böyledir; değilse düzelt).

- [ ] **Step 2: Release imza yapılandırması ekle**

`mobil/android/app/build.gradle` içinde `android {` bloğuna, `buildTypes`'tan ÖNCE şu `signingConfigs` bloğunu ekle:

```gradle
    signingConfigs {
        release {
            def ksPath = System.getenv("ANDROID_KEYSTORE_PATH")
            if (ksPath != null) {
                storeFile file(ksPath)
                storePassword System.getenv("ANDROID_KEYSTORE_PASSWORD")
                keyAlias System.getenv("ANDROID_KEY_ALIAS")
                keyPassword System.getenv("ANDROID_KEY_PASSWORD")
            }
        }
    }
```

Ardından `buildTypes { release { ... } }` içine `signingConfig signingConfigs.release` satırını ekle. Sonuç şuna benzemeli:

```gradle
    buildTypes {
        release {
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
            signingConfig signingConfigs.release
        }
    }
```

> Env değişkeni yoksa (yerel) `storeFile` atanmaz; release imzasız kalır ama yerelde build denemeyeceğiz. CI env'leri sağlar.

- [ ] **Step 3: Commit**

```bash
cd /storage/emulated/0/dos/adm
git add mobil/android/app/build.gradle
git commit -m "feat: release imza yapılandırması (env tabanlı)"
```

---

## FAZ C — GitHub deposu, imzalama, CI

### Task 10: Keystore üret + base64'le (yerel, Termux'ta keytool yoksa CI'da)

**Files:**
- Create: `docs/MOBIL-YAYIN.md` (keystore bilgisi + yedek talimatı)

- [ ] **Step 1: keytool var mı kontrol et**

Run: `command -v keytool || echo "keytool YOK"`

- [ ] **Step 2A: keytool VARSA — keystore üret**

Run (parolaları kendin belirle, GÜVENLİ sakla):
```bash
cd /storage/emulated/0/dos/adm
keytool -genkeypair -v -keystore upload-keystore.jks -alias upload \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -storepass "DEGISTIR_PAROLA" -keypass "DEGISTIR_PAROLA" \
  -dname "CN=YDS Kelime ve Gramer, OU=adm, O=adm, L=, S=, C=TR"
base64 -w0 upload-keystore.jks > upload-keystore.b64
echo "base64 hazır: upload-keystore.b64"
```

- [ ] **Step 2B: keytool YOKSA — kur veya CI'da üret**

Termux'ta: `pkg install openjdk-17` deneyip Step 2A'yı tekrarla. Kurulamıyorsa keystore'u GitHub Actions'ta tek seferlik bir `workflow_dispatch` job ile üretip artifact olarak indir (bkz. Task 12 notu), sonra Step 3'e geç.

- [ ] **Step 3: docs/MOBIL-YAYIN.md yaz**

`docs/MOBIL-YAYIN.md`:

```markdown
# Mobil Yayın Rehberi — YDS Kelime ve Gramer

## Keystore (KRİTİK — yedekle)
- Dosya: `upload-keystore.jks` (repoya GİRMEZ; .gitignore'da `*.jks`).
- Alias: `upload`
- Parola: <gizli, parola yöneticisinde sakla>
- **Kaybolursa**: Play App Signing açıksa Google'dan upload key sıfırlanabilir; yine de bu dosyayı + parolayı güvenli iki yerde yedekle.

## GitHub Secrets (repo → Settings → Secrets → Actions)
- `ANDROID_KEYSTORE_BASE64` = `upload-keystore.b64` içeriği
- `ANDROID_KEYSTORE_PASSWORD` = store parolası
- `ANDROID_KEY_ALIAS` = `upload`
- `ANDROID_KEY_PASSWORD` = key parolası

## AAB üretimi
- GitHub → Actions → "Android Build" → Run workflow.
- Biten run'da `app-release-aab` artifact'ını indir → `app-release.aab`.

## Play Console
1. play.google.com/console → Uygulama oluştur ("YDS Kelime ve Gramer", appId com.admlyz.ydsders).
2. Test → İç test → Yeni sürüm → AAB yükle.
3. Play App Signing'i kabul et.
4. Mağaza girişi: açıklama, ekran görüntüleri, gizlilik politikası, içerik derecelendirme.
5. İç testten yayına yükselt.
```

- [ ] **Step 4: Commit**

```bash
cd /storage/emulated/0/dos/adm
git add docs/MOBIL-YAYIN.md
git commit -m "docs: mobil yayın ve keystore rehberi"
```

---

### Task 11: GitHub private repo oluştur + push

**Files:** (yok — git/gh işlemi)

- [ ] **Step 1: gh oturumunu doğrula**

Run: `gh auth status`
Expected: `Logged in to github.com account admlyz5858`.

- [ ] **Step 2: Çalışma ağacının temiz ve doğru olduğunu kontrol et**

Run: `cd /storage/emulated/0/dos/adm && git status --short && echo "---" && git ls-files | head -40`
Expected: Yalnızca `app/`, `mobil/` (build hariç), `.github/` (henüz yok), `docs/`, `.gitignore` izleniyor; `work/ _probe/ u3-kareler/ *.ts` görünmüyor.

- [ ] **Step 3: Private repo oluştur + push**

Run:
```bash
cd /storage/emulated/0/dos/adm
gh repo create yds-kelime-gramer --private --source=. --remote=origin --push
```
Expected: Repo oluşturulur ve `main` push edilir. Hata olursa (repo adı doluysa) farklı ad kullan.

- [ ] **Step 4: Doğrula**

Run: `gh repo view --web 2>/dev/null; gh repo view --json nameWithOwner,visibility`
Expected: `"visibility":"PRIVATE"`.

---

### Task 12: GitHub Secrets'ı ayarla

**Files:** (yok — gh secret)

- [ ] **Step 1: Secret'ları ekle**

Run (parolaları Task 10'daki gerçek değerlerle değiştir):
```bash
cd /storage/emulated/0/dos/adm
gh secret set ANDROID_KEYSTORE_BASE64 < upload-keystore.b64
gh secret set ANDROID_KEYSTORE_PASSWORD --body "DEGISTIR_PAROLA"
gh secret set ANDROID_KEY_ALIAS --body "upload"
gh secret set ANDROID_KEY_PASSWORD --body "DEGISTIR_PAROLA"
```

- [ ] **Step 2: Doğrula**

Run: `gh secret list`
Expected: dört secret listelenir.

> Keystore'u CI'da üretmek gerekiyorsa (Task 10 Step 2B): `.github/workflows/keystore.yml` adında geçici bir `workflow_dispatch` workflow'u `keytool -genkeypair ...` çalıştırıp `.jks`'i artifact yapar; indir, base64'le, yukarıdaki secret'ları kur, sonra o workflow'u sil.

---

### Task 13: GitHub Actions build workflow

**Files:**
- Create: `.github/workflows/android.yml`

- [ ] **Step 1: Workflow'u yaz**

`.github/workflows/android.yml`:

```yaml
name: Android Build

on:
  workflow_dispatch:
  push:
    branches: [ main ]
    paths:
      - 'app/**'
      - 'mobil/**'
      - '.github/workflows/android.yml'

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: '17'

      - name: Android SDK
        uses: android-actions/setup-android@v3

      - name: NPM kur
        working-directory: mobil
        run: npm install

      - name: www hazırla (premium eleme)
        working-directory: mobil
        run: node hazirla.mjs

      - name: İkon/splash üret
        working-directory: mobil
        run: npx @capacitor/assets generate --android --assetPath kaynak || echo "asset üretimi atlandı"

      - name: Capacitor sync
        working-directory: mobil
        run: npx cap sync android

      - name: Keystore yaz
        working-directory: mobil/android
        run: echo "${{ secrets.ANDROID_KEYSTORE_BASE64 }}" | base64 -d > upload-keystore.jks

      - name: AAB derle (imzalı)
        working-directory: mobil/android
        env:
          ANDROID_KEYSTORE_PATH: ${{ github.workspace }}/mobil/android/upload-keystore.jks
          ANDROID_KEYSTORE_PASSWORD: ${{ secrets.ANDROID_KEYSTORE_PASSWORD }}
          ANDROID_KEY_ALIAS: ${{ secrets.ANDROID_KEY_ALIAS }}
          ANDROID_KEY_PASSWORD: ${{ secrets.ANDROID_KEY_PASSWORD }}
        run: ./gradlew bundleRelease --no-daemon

      - name: İmzayı doğrula
        working-directory: mobil/android
        run: |
          AAB=app/build/outputs/bundle/release/app-release.aab
          ls -la $AAB
          $ANDROID_HOME/build-tools/34.0.0/apksigner verify --print-certs $AAB || jarsigner -verify $AAB

      - name: AAB artifact yükle
        uses: actions/upload-artifact@v4
        with:
          name: app-release-aab
          path: mobil/android/app/build/outputs/bundle/release/app-release.aab
          if-no-files-found: error
```

- [ ] **Step 2: Commit + push**

```bash
cd /storage/emulated/0/dos/adm
git add .github/workflows/android.yml
git commit -m "ci: GitHub Actions Android AAB build workflow"
git push
```

---

### Task 14: Build'i tetikle ve AAB'yi doğrula

**Files:** (yok)

- [ ] **Step 1: Workflow'u çalıştır**

Run:
```bash
cd /storage/emulated/0/dos/adm
gh workflow run "Android Build"
sleep 5 && gh run list --workflow="Android Build" --limit 1
```

- [ ] **Step 2: Bitmesini izle**

Run: `gh run watch $(gh run list --workflow="Android Build" --limit 1 --json databaseId -q '.[0].databaseId')`
Expected: tüm adımlar yeşil. Hata olursa `gh run view --log-failed` ile logu incele, ilgili Task'a dön, düzelt, push, tekrar tetikle.

- [ ] **Step 3: AAB'yi indir**

Run:
```bash
cd /storage/emulated/0/dos/adm
gh run download $(gh run list --workflow="Android Build" --limit 1 --json databaseId -q '.[0].databaseId') -n app-release-aab -D ./cikti
ls -la ./cikti/
```
Expected: `cikti/app-release.aab` indi (birkaç MB).

- [ ] **Step 4: AAB içeriğini doğrula (içerik kilidi)**

Run:
```bash
cd /storage/emulated/0/dos/adm/cikti
unzip -l app-release.aab | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const u=[...s.matchAll(/unite-\d+\.json/g)].map(m=>m[0]); console.log('AAB içindeki üniteler:', [...new Set(u)].join(',')||'(unzip listede yok — base/assets içinde olabilir)');})"
```
Expected: yalnızca `unite-01.json` (premium üniteler yok). (AAB'de assets `base/assets/public/...` altındadır; görünmezse `bundletool` ile açılıp kontrol edilebilir — opsiyonel.)

- [ ] **Step 5: Commit (varsa düzeltmeler zaten commit'lendi)**

Bu task'ta kod değişmez; sadece doğrulama. Düzeltme gerektiyse ilgili task'ın commit'i kullanılır.

---

## FAZ D — Yayın hazırlığı

### Task 15: Play Console yükleme (kullanıcı aksiyonu) + final doğrulama

**Files:** (yok — rehber `docs/MOBIL-YAYIN.md`)

- [ ] **Step 1: PWA regresyon kontrolü**

Run: `bash /storage/emulated/0/dos/adm/app/baslat.sh` → http://localhost:8100
Expected: PWA eskisi gibi çalışır; Ünite 1 tam, 2-11 kilitli "Premium — yakında". Bu, "PWA bozulmadı" final kanıtı.

- [ ] **Step 2: Cihazda AAB testi (opsiyonel ama önerilir)**

`docs/MOBIL-YAYIN.md`'deki adımlarla AAB Play Console **İç test**'e yüklenir; test cihazına kurulup açılış + Ünite 1 + offline + premium kilit doğrulanır.

- [ ] **Step 3: Mağaza listesi + yayın**

Play Console'da mağaza girişi (açıklama, ekran görüntüleri, gizlilik politikası, içerik derecelendirme) doldurulup iç testten yükseltilir. (Kullanıcı aksiyonu.)

---

## Self-Review Notları

- **Spec kapsamı:** Build ortamı (Task 10-14), Capacitor paketleme (Task 5-9), premium kilit/eleme (Task 1-4, 6), imzalama (Task 9-13), gelecek-uyumluluk (Task 6 manifest-tabanlı otomatik eleme + Capacitor plugin zemini), PWA dokunulmazlığı (Task 15 Step 1 regresyon). Tümü kapsanıyor.
- **Tip tutarlılığı:** `dersKilitli`/`dersDurumEtiket` Task 1'de tanımlanır, Task 3'te kullanılır. `durum: "premium"` Task 2'de set edilir, Task 1/3/6'da okunur. `webDir: "www"` (config) ↔ `hazirla.mjs` hedefi `www/` tutarlı. Env değişken adları Task 9 (build.gradle) ↔ Task 13 (workflow) ↔ Task 12 (secrets) birebir aynı.
- **Placeholder taraması:** TBD/TODO yok; her kod adımı tam içerik taşıyor. Parolalar `DEGISTIR_PAROLA` kullanıcı tarafından doldurulacak gerçek gizli değerlerdir (placeholder değil, kasıtlı kullanıcı girdisi).
