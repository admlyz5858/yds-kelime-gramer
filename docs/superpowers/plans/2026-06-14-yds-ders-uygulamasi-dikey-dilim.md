# YDS Ders Uygulaması — Dikey Dilim Uygulama Planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tek bir YDS ders videosunu uçtan uca işleyip yapılandırılmış bir `ders-001.json` üretmek ve bu dersi kitap gibi gösteren, flashcard/quiz içeren çalışan bir offline PWA kurmak (dikey dilim).

**Architecture:** İki bağımsız parça. (1) Termux'ta çalışan içerik hattı script'leri: ffmpeg ile ses+kare çıkarır, whisper.cpp ile yazıya çevirir; sonra Claude oturum içinde kareleri okuyup transkriptle birleştirerek `ders-001.json` üretir. (2) Veriyi okuyan, framework'süz (vanilla HTML/CSS/JS ES modules) PWA. Saf mantık `logic.js`'te toplanıp `node:test` ile test edilir; arayüz `app.js`'te DOM render eder.

**Tech Stack:** Termux (bash), ffmpeg/ffprobe, whisper.cpp, Node.js (`node:test`/`node:assert`, ES modules), Python (`http.server`), vanilla JS PWA + service worker.

**Proje kökü:** `/storage/emulated/0/dos/adm`
**Kaynak videolar:** `/storage/emulated/0/İngilizce/*.ts`
**Dikey dilim için seçilen video (değişken):** `2025 İlkbahar YDS&YÖKDİL Hazırlık - 101 - Ders - RH+ Platform.ts` (içerik zengin olduğu doğrulandı; gerekirse değiştirilebilir)

---

## Dosya Yapısı

```
adm/
  pipeline/
    config.sh             # VIDEO yolu, ID, klasör değişkenleri (tek kaynak)
    01-extract-audio.sh   # video -> 16kHz mono wav
    02-transcribe.sh      # wav -> transkript (whisper.cpp) + SÜRE ÖLÇÜMÜ
    03-capture-frames.sh  # video -> sahne-değişimi kareleri
    04-crop-frames.sh     # kareler -> sohbet paneli kırpılmış kareler
    validate-lesson.mjs   # ders-NN.json şema doğrulayıcı (bağımlılıksız)
  app/
    index.html            # tek sayfa kabuk + ekran kapları
    css/style.css         # stiller
    js/logic.js           # saf mantık (arama, ilerleme, flashcard, quiz)
    js/logic.test.js      # node:test birim testleri
    js/storage.js         # localStorage sarmalayıcı
    js/app.js             # router + DOM render (tüm ekranlar)
    sw.js                 # service worker (offline)
    manifest.webmanifest  # PWA manifest
    data/
      manifest.json       # tüm dersler listesi
      lessons/ders-001.json
      frames/001/*.jpg    # (opsiyonel) ders okuma ekranı için kareler
  work/
    001/                  # ara çıktılar (wav, transkript, ham kareler)
```

---

## Task 1: Proje iskeleti ve pipeline config

**Files:**
- Create: `pipeline/config.sh`
- Create: `app/data/.gitkeep`, `work/.gitkeep`

- [ ] **Step 1: Klasörleri oluştur**

Run:
```bash
cd /storage/emulated/0/dos/adm
mkdir -p pipeline app/css app/js app/data/lessons app/data/frames work
touch app/data/.gitkeep work/.gitkeep
```
Expected: Hata yok.

- [ ] **Step 2: `pipeline/config.sh` yaz**

```bash
#!/usr/bin/env bash
# Dikey dilim ayarları — tüm pipeline script'leri bunu source eder.
set -euo pipefail

PROJECT_ROOT="/storage/emulated/0/dos/adm"
VIDEO_DIR="/storage/emulated/0/İngilizce"

# İşlenecek video ve ders ID'si
VIDEO_NAME="2025 İlkbahar YDS&YÖKDİL Hazırlık - 101 - Ders - RH+ Platform.ts"
LESSON_ID="001"

VIDEO_PATH="${VIDEO_DIR}/${VIDEO_NAME}"
WORK_DIR="${PROJECT_ROOT}/work/${LESSON_ID}"
FRAMES_OUT="${PROJECT_ROOT}/app/data/frames/${LESSON_ID}"

mkdir -p "${WORK_DIR}" "${FRAMES_OUT}"
```

- [ ] **Step 3: Video erişimini doğrula**

Run:
```bash
cd /storage/emulated/0/dos/adm
source pipeline/config.sh
ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$VIDEO_PATH"
```
Expected: Saniye cinsinden süre yazdırır (ör. ~3248). Hata verirse VIDEO_NAME'i düzelt.

- [ ] **Step 4: Commit (git deposuysa)**

```bash
cd /storage/emulated/0/dos/adm
git add pipeline/config.sh app/data/.gitkeep work/.gitkeep 2>/dev/null && git commit -m "chore: proje iskeleti ve pipeline config" || echo "git yok, atlandı"
```

---

## Task 2: Ses çıkarma script'i

**Files:**
- Create: `pipeline/01-extract-audio.sh`

- [ ] **Step 1: Script'i yaz**

```bash
#!/usr/bin/env bash
# Videodan whisper için 16kHz mono WAV çıkarır.
set -euo pipefail
cd "$(dirname "$0")/.."
source pipeline/config.sh

OUT="${WORK_DIR}/audio.wav"
echo "Ses çıkarılıyor: ${VIDEO_NAME}"
ffmpeg -y -i "$VIDEO_PATH" -vn -ac 1 -ar 16000 -c:a pcm_s16le "$OUT" -loglevel error
echo "Tamam: $OUT ($(du -h "$OUT" | cut -f1))"
```

- [ ] **Step 2: Çalıştırılabilir yap ve çalıştır**

Run:
```bash
cd /storage/emulated/0/dos/adm
chmod +x pipeline/01-extract-audio.sh
./pipeline/01-extract-audio.sh
```
Expected: `work/001/audio.wav` oluşur. Boyut ~ (süre*32KB/s) ≈ 100 MB civarı, "Tamam:" satırı yazılır.

- [ ] **Step 3: Çıktıyı doğrula**

Run:
```bash
ffprobe -v error -show_entries stream=sample_rate,channels -of default=noprint_wrappers=1 /storage/emulated/0/dos/adm/work/001/audio.wav
```
Expected: `sample_rate=16000`, `channels=1`.

- [ ] **Step 4: Commit**

```bash
cd /storage/emulated/0/dos/adm
git add pipeline/01-extract-audio.sh 2>/dev/null && git commit -m "feat: ses çıkarma script'i" || echo "git yok, atlandı"
```

---

## Task 3: Transkript (whisper.cpp) + SÜRE ÖLÇÜMÜ

> Bu görev planın en kritik ölçüm noktası: tek videonun yerel transkript süresi, 166 video kararını belirleyecek.

**Files:**
- Create: `pipeline/02-transcribe.sh`

- [ ] **Step 1: whisper.cpp kur**

Run:
```bash
pkg install -y whisper.cpp
command -v whisper-cpp || command -v main || ls $PREFIX/bin | grep -i whisper
```
Expected: whisper binary yolu görünür (`whisper-cpp` veya benzeri).
Fallback (paket yoksa): `pkg install -y cmake clang git && git clone https://github.com/ggerganov/whisper.cpp ~/whisper.cpp && cd ~/whisper.cpp && cmake -B build && cmake --build build -j --config Release` → binary `~/whisper.cpp/build/bin/whisper-cli`.

- [ ] **Step 2: Türkçe için model indir (small)**

Run:
```bash
mkdir -p ~/whisper-models
cd ~/whisper-models
curl -L -o ggml-small.bin https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin
ls -lh ggml-small.bin
```
Expected: ~466 MB `ggml-small.bin`. (Daha hızlı/daha az doğru için `ggml-base.bin` ~142 MB; daha doğru/çok yavaş için `ggml-medium.bin`.)

- [ ] **Step 3: Transkript script'ini yaz**

```bash
#!/usr/bin/env bash
# WAV -> Türkçe transkript. Toplam süreyi ölçüp work/001/transcribe-time.txt'e yazar.
set -euo pipefail
cd "$(dirname "$0")/.."
source pipeline/config.sh

WAV="${WORK_DIR}/audio.wav"
MODEL="${HOME}/whisper-models/ggml-small.bin"
OUT_BASE="${WORK_DIR}/transcript"

# Binary'yi otomatik bul
BIN="$(command -v whisper-cpp || command -v whisper-cli || command -v main || echo "${HOME}/whisper.cpp/build/bin/whisper-cli")"
echo "whisper binary: $BIN"

START=$(date +%s)
"$BIN" -m "$MODEL" -f "$WAV" -l tr -otxt -of "$OUT_BASE" -pp
END=$(date +%s)

ELAPSED=$((END - START))
echo "Transkript süresi: ${ELAPSED} sn" | tee "${WORK_DIR}/transcribe-time.txt"
echo "Çıktı: ${OUT_BASE}.txt"
```

- [ ] **Step 4: Çalıştır ve süreyi ölç**

Run:
```bash
cd /storage/emulated/0/dos/adm
chmod +x pipeline/02-transcribe.sh
./pipeline/02-transcribe.sh
```
Expected: `work/001/transcript.txt` oluşur (Türkçe metin), `transcribe-time.txt` süreyi içerir. **Bu süreyi not et** — 166 video kararı için.

- [ ] **Step 5: Transkript kalitesini gözle kontrol et**

Run:
```bash
head -20 /storage/emulated/0/dos/adm/work/001/transcript.txt
wc -l /storage/emulated/0/dos/adm/work/001/transcript.txt
```
Expected: Anlamlı Türkçe cümleler. Bozuksa modeli `base`→`small`→`medium` yönünde değiştir.

- [ ] **Step 6: Commit**

```bash
cd /storage/emulated/0/dos/adm
git add pipeline/02-transcribe.sh 2>/dev/null && git commit -m "feat: whisper.cpp transkript script'i + süre ölçümü" || echo "git yok, atlandı"
```

---

## Task 4: Kare yakalama (sahne değişimi)

**Files:**
- Create: `pipeline/03-capture-frames.sh`

- [ ] **Step 1: Çözünürlüğü öğren**

Run:
```bash
cd /storage/emulated/0/dos/adm
source pipeline/config.sh
ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 "$VIDEO_PATH"
```
Expected: ör. `960,540` (sonraki adımda kırpma için kullanılacak).

- [ ] **Step 2: Script'i yaz**

```bash
#!/usr/bin/env bash
# Sahne değişimi olan kareleri (yeni sayfa/slayt) yakalar.
set -euo pipefail
cd "$(dirname "$0")/.."
source pipeline/config.sh

RAW="${WORK_DIR}/frames_raw"
mkdir -p "$RAW"
echo "Kareler yakalanıyor (sahne değişimi eşiği 0.30)..."
# select: sahne skoru > 0.30 olan kareler; fps fallback yok, sadece sahne değişimleri.
ffmpeg -y -i "$VIDEO_PATH" -vf "select='gt(scene,0.30)',showinfo" -vsync vfr -q:v 3 "${RAW}/frame_%04d.jpg" -loglevel error
COUNT=$(ls -1 "${RAW}"/*.jpg 2>/dev/null | wc -l)
echo "Yakalanan kare: ${COUNT} -> ${RAW}"
```

- [ ] **Step 3: Çalıştır**

Run:
```bash
cd /storage/emulated/0/dos/adm
chmod +x pipeline/03-capture-frames.sh
./pipeline/03-capture-frames.sh
```
Expected: `work/001/frames_raw/frame_XXXX.jpg` dosyaları (onlarca-yüzlerce arası). Çok az (<10) ise eşiği 0.20'ye düşür; çok fazla (>500) ise 0.40'a çıkar ve tekrar çalıştır.

- [ ] **Step 4: Bir kareyi gözle doğrula**

Run:
```bash
ls /storage/emulated/0/dos/adm/work/001/frames_raw/ | head
```
Expected: Kareler listelenir. (İçeriği Claude sonraki görevde okuyacak.)

- [ ] **Step 5: Commit**

```bash
cd /storage/emulated/0/dos/adm
git add pipeline/03-capture-frames.sh 2>/dev/null && git commit -m "feat: sahne-değişimi kare yakalama" || echo "git yok, atlandı"
```

---

## Task 5: Sohbet panelini kırpma

**Files:**
- Create: `pipeline/04-crop-frames.sh`

- [ ] **Step 1: Script'i yaz** (sağdaki sohbet panelini atar — sol %74'ü tutar)

```bash
#!/usr/bin/env bash
# Ham karelerden sağ sohbet panelini kırpar; üst başlık şeridini de kırpar.
set -euo pipefail
cd "$(dirname "$0")/.."
source pipeline/config.sh

RAW="${WORK_DIR}/frames_raw"
OUT="${FRAMES_OUT}"
mkdir -p "$OUT"

# Sol %74 genişlik, üstten %6 başlık şeridi atılır. Gerekirse oranları ayarla.
for f in "${RAW}"/*.jpg; do
  base="$(basename "$f")"
  ffmpeg -y -i "$f" -vf "crop=iw*0.74:ih*0.94:0:ih*0.06" -q:v 3 "${OUT}/${base}" -loglevel error
done
COUNT=$(ls -1 "${OUT}"/*.jpg 2>/dev/null | wc -l)
echo "Kırpılan kare: ${COUNT} -> ${OUT}"
```

- [ ] **Step 2: Çalıştır**

Run:
```bash
cd /storage/emulated/0/dos/adm
chmod +x pipeline/04-crop-frames.sh
./pipeline/04-crop-frames.sh
```
Expected: `app/data/frames/001/*.jpg` oluşur, ham karelerle aynı sayıda.

- [ ] **Step 3: Kırpmayı doğrula (Claude bir kareyi okur)**

Claude bir kareyi (`app/data/frames/001/frame_0001.jpg`) Read ile açar; sağda sohbet paneli kalmamış, ders metni tam görünüyor olmalı. Sohbet hâlâ görünüyorsa `0.74` değerini küçült (ör. 0.70) ve Step 2'yi tekrar çalıştır.

- [ ] **Step 4: Commit**

```bash
cd /storage/emulated/0/dos/adm
git add pipeline/04-crop-frames.sh 2>/dev/null && git commit -m "feat: sohbet paneli kırpma" || echo "git yok, atlandı"
```

---

## Task 6: ders-001.json üretimi (Claude oturum içinde)

> Bu görevde script yok; Claude kareleri okuyup transkriptle birleştirerek BİREBİR ve EKSİKSİZ ders verisi üretir.

**Files:**
- Create: `app/data/lessons/ders-001.json`
- Create: `app/data/manifest.json`

- [ ] **Step 1: Tüm kırpılmış kareleri sırayla oku**

Claude `app/data/frames/001/` altındaki tüm kareleri Read ile sırayla açar. Her karedeki İngilizce cümleleri, Türkçe çevirileri ve hocanın el yazısı notlarını **aynen** kaydeder. **Kural: hiçbir cümle atlanmaz, kısaltılmaz, özetlenmez.**

- [ ] **Step 2: Transkripti oku ve soru çözümlerini eşle**

Claude `work/001/transcript.txt`'i okur; hocanın soru çözdüğü bölümleri bulur, her soru için cevap + `hoca_aciklama` çıkarır (bu bilgi karelerde olmayabilir, sesten gelir).

- [ ] **Step 3: `ders-001.json`'ı şemaya göre yaz**

Tasarımdaki yapıya birebir uy (`docs/superpowers/specs/2026-06-14-yds-ders-uygulamasi-design.md`):
```json
{
  "id": 1,
  "baslik": "YDS&YÖKDİL Hazırlık - 101",
  "kaynak_video": "2025 İlkbahar YDS&YÖKDİL Hazırlık - 101 - Ders - RH+ Platform.ts",
  "sure_dk": 54,
  "konu_ozeti": "...",
  "cumleler": [ { "en": "...", "tr": "...", "not": "..." } ],
  "kelimeler": [ { "en": "...", "tr": "...", "ornek": "..." } ],
  "gramer":   [ { "konu": "...", "aciklama": "...", "ornekler": ["..."] } ],
  "soru_cozumleri": [ { "soru": "...", "secenekler": ["..."], "cevap": "...", "hoca_aciklama": "..." } ],
  "quiz": [ { "soru": "...", "secenekler": ["..."], "cevap": "...", "aciklama": "..." } ]
}
```
Notlar: `not`/`ornek`/`secenekler` opsiyoneldir (yoksa alanı koy ama boş bırakma — ya geçerli değer ya hiç ekleme). `cevap` mutlaka `secenekler` içinden biri olmalı.

- [ ] **Step 4: `manifest.json`'ı yaz**

```json
{
  "uretim_tarihi": "2026-06-14",
  "dersler": [
    { "id": 1, "dosya": "lessons/ders-001.json", "baslik": "YDS&YÖKDİL Hazırlık - 101", "kelime_sayisi": 0, "cumle_sayisi": 0 }
  ]
}
```
`kelime_sayisi`/`cumle_sayisi` gerçek sayılarla doldurulur.

- [ ] **Step 5: Commit**

```bash
cd /storage/emulated/0/dos/adm
git add app/data/lessons/ders-001.json app/data/manifest.json 2>/dev/null && git commit -m "feat: ders-001 verisi (dikey dilim)" || echo "git yok, atlandı"
```

---

## Task 7: Ders JSON şema doğrulayıcı

**Files:**
- Create: `pipeline/validate-lesson.mjs`

- [ ] **Step 1: Doğrulayıcıyı yaz (bağımlılıksız)**

```js
// node pipeline/validate-lesson.mjs app/data/lessons/ders-001.json
import { readFileSync } from 'node:fs';

const path = process.argv[2];
if (!path) { console.error('Kullanım: node validate-lesson.mjs <ders.json>'); process.exit(2); }

const data = JSON.parse(readFileSync(path, 'utf8'));
const errors = [];
const isStr = (v) => typeof v === 'string' && v.length > 0;
const isArr = (v) => Array.isArray(v);

if (typeof data.id !== 'number') errors.push('id sayı olmalı');
if (!isStr(data.baslik)) errors.push('baslik gerekli');
if (!isStr(data.kaynak_video)) errors.push('kaynak_video gerekli');
for (const key of ['cumleler', 'kelimeler', 'gramer', 'soru_cozumleri', 'quiz']) {
  if (!isArr(data[key])) errors.push(`${key} dizi olmalı`);
}
(data.cumleler || []).forEach((c, i) => {
  if (!isStr(c.en)) errors.push(`cumleler[${i}].en gerekli`);
  if (!isStr(c.tr)) errors.push(`cumleler[${i}].tr gerekli`);
});
(data.kelimeler || []).forEach((k, i) => {
  if (!isStr(k.en)) errors.push(`kelimeler[${i}].en gerekli`);
  if (!isStr(k.tr)) errors.push(`kelimeler[${i}].tr gerekli`);
});
const checkQ = (arr, name) => (arr || []).forEach((q, i) => {
  if (!isStr(q.soru)) errors.push(`${name}[${i}].soru gerekli`);
  if (!isArr(q.secenekler) || q.secenekler.length < 2) errors.push(`${name}[${i}].secenekler en az 2 olmalı`);
  if (!isStr(q.cevap)) errors.push(`${name}[${i}].cevap gerekli`);
  else if (isArr(q.secenekler) && !q.secenekler.includes(q.cevap)) errors.push(`${name}[${i}].cevap seçenekler içinde değil`);
});
checkQ(data.soru_cozumleri, 'soru_cozumleri');
checkQ(data.quiz, 'quiz');

if (errors.length) { console.error('GEÇERSİZ:\n- ' + errors.join('\n- ')); process.exit(1); }
console.log(`GEÇERLİ: ${data.baslik} (cümle:${data.cumleler.length}, kelime:${data.kelimeler.length}, quiz:${data.quiz.length})`);
```

- [ ] **Step 2: ders-001.json'ı doğrula**

Run:
```bash
cd /storage/emulated/0/dos/adm
node pipeline/validate-lesson.mjs app/data/lessons/ders-001.json
```
Expected: `GEÇERLİ: ...` satırı, çıkış kodu 0. Hata varsa Task 6'ya dönüp düzelt.

- [ ] **Step 3: Commit**

```bash
cd /storage/emulated/0/dos/adm
git add pipeline/validate-lesson.mjs 2>/dev/null && git commit -m "feat: ders json şema doğrulayıcı" || echo "git yok, atlandı"
```

---

## Task 8: Saf mantık modülü (TDD)

**Files:**
- Create: `app/js/logic.js`
- Test: `app/js/logic.test.js`

- [ ] **Step 1: Başarısız testleri yaz**

```js
// app/js/logic.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { searchLessons, toggleDone, isDone, scoreQuiz, isAnswerCorrect, nextCard } from './logic.js';

test('searchLessons başlığa göre filtreler (büyük/küçük harf duyarsız)', () => {
  const m = [{ id: 1, baslik: 'Hazırlık 101' }, { id: 2, baslik: 'Deneme 5' }];
  assert.deepEqual(searchLessons(m, 'haz').map(x => x.id), [1]);
  assert.deepEqual(searchLessons(m, '').map(x => x.id), [1, 2]);
});

test('toggleDone/isDone ilerlemeyi değiştirir (saf)', () => {
  let p = {};
  p = toggleDone(p, 1);
  assert.equal(isDone(p, 1), true);
  p = toggleDone(p, 1);
  assert.equal(isDone(p, 1), false);
});

test('isAnswerCorrect cevabı karşılaştırır', () => {
  const q = { soru: 'x', secenekler: ['a', 'b'], cevap: 'b' };
  assert.equal(isAnswerCorrect(q, 'b'), true);
  assert.equal(isAnswerCorrect(q, 'a'), false);
});

test('scoreQuiz doğru sayısını verir', () => {
  const quiz = [{ cevap: 'a', secenekler: ['a','b'] }, { cevap: 'b', secenekler: ['a','b'] }];
  assert.deepEqual(scoreQuiz(quiz, ['a', 'a']), { dogru: 1, toplam: 2 });
});

test('nextCard indeksi döngüsel ilerletir', () => {
  assert.equal(nextCard(0, 3), 1);
  assert.equal(nextCard(2, 3), 0);
});
```

- [ ] **Step 2: Testi çalıştır, başarısız olduğunu gör**

Run:
```bash
cd /storage/emulated/0/dos/adm/app
node --test js/logic.test.js
```
Expected: FAIL — `logic.js` veya export'lar bulunamadı.

- [ ] **Step 3: `logic.js`'i yaz**

```js
// app/js/logic.js — saf, DOM'suz, storage'sız mantık
export function searchLessons(lessons, query) {
  const q = (query || '').trim().toLowerCase();
  if (!q) return lessons.slice();
  return lessons.filter(l => (l.baslik || '').toLowerCase().includes(q));
}

export function toggleDone(progress, id) {
  const next = { ...progress };
  if (next[id]) delete next[id]; else next[id] = true;
  return next;
}

export function isDone(progress, id) {
  return Boolean(progress[id]);
}

export function isAnswerCorrect(question, choice) {
  return question.cevap === choice;
}

export function scoreQuiz(quiz, answers) {
  let dogru = 0;
  quiz.forEach((q, i) => { if (q.cevap === answers[i]) dogru++; });
  return { dogru, toplam: quiz.length };
}

export function nextCard(index, total) {
  if (total <= 0) return 0;
  return (index + 1) % total;
}
```

- [ ] **Step 4: Testi çalıştır, geçtiğini gör**

Run:
```bash
cd /storage/emulated/0/dos/adm/app
node --test js/logic.test.js
```
Expected: PASS — 5 test geçer.

- [ ] **Step 5: Commit**

```bash
cd /storage/emulated/0/dos/adm
git add app/js/logic.js app/js/logic.test.js 2>/dev/null && git commit -m "feat: saf mantık modülü + testler" || echo "git yok, atlandı"
```

---

## Task 9: Storage sarmalayıcı

**Files:**
- Create: `app/js/storage.js`

- [ ] **Step 1: `storage.js`'i yaz**

```js
// app/js/storage.js — localStorage üstüne ince sarmalayıcı
const KEY = 'yds-ilerleme-v1';

export function loadProgress() {
  try { return JSON.parse(localStorage.getItem(KEY)) || {}; }
  catch { return {}; }
}

export function saveProgress(progress) {
  localStorage.setItem(KEY, JSON.stringify(progress));
}
```

- [ ] **Step 2: Commit**

```bash
cd /storage/emulated/0/dos/adm
git add app/js/storage.js 2>/dev/null && git commit -m "feat: storage sarmalayıcı" || echo "git yok, atlandı"
```

---

## Task 10: Uygulama kabuğu, stiller ve ana sayfa (ders listesi)

**Files:**
- Create: `app/index.html`
- Create: `app/css/style.css`
- Create: `app/js/app.js`

- [ ] **Step 1: `index.html`'i yaz**

```html
<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="theme-color" content="#1c2b4a">
  <link rel="manifest" href="manifest.webmanifest">
  <title>YDS Ders</title>
  <link rel="stylesheet" href="css/style.css">
</head>
<body>
  <header id="ust-bar">
    <button id="geri" hidden>‹ Geri</button>
    <h1 id="baslik">YDS Ders</h1>
  </header>
  <main id="icerik"></main>
  <nav id="alt-menu" hidden>
    <button data-ekran="oku">📖 Oku</button>
    <button data-ekran="kelime">🎴 Kelime</button>
    <button data-ekran="gramer">📝 Gramer</button>
    <button data-ekran="soru">✅ Sorular</button>
    <button data-ekran="quiz">🧠 Quiz</button>
  </nav>
  <script type="module" src="js/app.js"></script>
</body>
</html>
```

- [ ] **Step 2: `style.css`'i yaz**

```css
:root { --bg:#0f1726; --kart:#1c2b4a; --metin:#e8edf6; --vurgu:#5b8cff; --soluk:#9fb0cc; --yesil:#3ecf8e; --kirmizi:#ff6b6b; }
* { box-sizing: border-box; }
body { margin:0; font-family: system-ui, sans-serif; background:var(--bg); color:var(--metin); }
#ust-bar { display:flex; align-items:center; gap:12px; padding:14px 16px; background:var(--kart); position:sticky; top:0; z-index:10; }
#ust-bar h1 { font-size:18px; margin:0; }
#geri { background:none; border:none; color:var(--vurgu); font-size:16px; }
main { padding:16px; padding-bottom:80px; }
.ders-kart { background:var(--kart); border-radius:12px; padding:14px 16px; margin-bottom:10px; display:flex; justify-content:space-between; align-items:center; }
.ders-kart .ok { color:var(--soluk); }
.rozet { font-size:12px; color:var(--yesil); }
.cumle { background:var(--kart); border-radius:10px; padding:12px 14px; margin-bottom:10px; }
.cumle .en { font-size:16px; }
.cumle .tr { color:var(--soluk); margin-top:4px; }
.cumle .not { color:var(--vurgu); font-size:13px; margin-top:6px; }
.flashcard { background:var(--kart); border-radius:16px; padding:40px 20px; text-align:center; font-size:22px; min-height:160px; display:flex; align-items:center; justify-content:center; }
.btn-satir { display:flex; gap:10px; margin-top:14px; }
button.aksiyon { flex:1; padding:12px; border:none; border-radius:10px; background:var(--vurgu); color:#fff; font-size:15px; }
button.ikincil { background:var(--kart); color:var(--metin); }
.secenek { display:block; width:100%; text-align:left; padding:12px 14px; margin-bottom:8px; border-radius:10px; border:1px solid #2b3c5e; background:var(--kart); color:var(--metin); font-size:15px; }
.secenek.dogru { border-color:var(--yesil); }
.secenek.yanlis { border-color:var(--kirmizi); }
#alt-menu { position:fixed; bottom:0; left:0; right:0; display:flex; background:var(--kart); border-top:1px solid #2b3c5e; }
#alt-menu button { flex:1; padding:10px 4px; background:none; border:none; color:var(--soluk); font-size:11px; }
#alt-menu button.aktif { color:var(--vurgu); }
```

- [ ] **Step 3: `app.js` — router + ana sayfa (ders listesi)**

```js
// app/js/app.js
import { searchLessons, toggleDone, isDone, isAnswerCorrect, scoreQuiz, nextCard } from './logic.js';
import { loadProgress, saveProgress } from './storage.js';

const icerik = document.getElementById('icerik');
const baslikEl = document.getElementById('baslik');
const geriBtn = document.getElementById('geri');
const altMenu = document.getElementById('alt-menu');

let manifest = null;
let aktifDers = null;
let progress = loadProgress();

async function getJSON(url) { const r = await fetch(url); if (!r.ok) throw new Error(url); return r.json(); }

async function anaSayfa() {
  aktifDers = null;
  geriBtn.hidden = true; altMenu.hidden = true;
  baslikEl.textContent = 'YDS Ders';
  if (!manifest) manifest = await getJSON('data/manifest.json');
  render(`
    <input id="ara" class="secenek" placeholder="Ders ara...">
    <div id="liste"></div>
  `);
  const liste = document.getElementById('liste');
  const ciz = (q) => {
    const sonuc = searchLessons(manifest.dersler, q);
    liste.innerHTML = sonuc.map(d => `
      <div class="ders-kart" data-id="${d.id}" data-dosya="${d.dosya}">
        <div><div>${d.baslik}</div><div class="rozet">${isDone(progress, d.id) ? '✓ çalışıldı' : ''}</div></div>
        <span class="ok">›</span>
      </div>`).join('');
    liste.querySelectorAll('.ders-kart').forEach(el =>
      el.onclick = () => dersAc(el.dataset.dosya, Number(el.dataset.id)));
  };
  ciz('');
  document.getElementById('ara').oninput = (e) => ciz(e.target.value);
}

async function dersAc(dosya, id) {
  aktifDers = await getJSON('data/' + dosya);
  aktifDers._id = id;
  geriBtn.hidden = false; altMenu.hidden = false;
  geriBtn.onclick = anaSayfa;
  altMenu.querySelectorAll('button').forEach(b =>
    b.onclick = () => ekranGoster(b.dataset.ekran));
  ekranGoster('oku');
}

function render(html) { icerik.innerHTML = html; window.scrollTo(0, 0); }
function setAktifMenu(ekran) {
  altMenu.querySelectorAll('button').forEach(b =>
    b.classList.toggle('aktif', b.dataset.ekran === ekran));
}

function ekranGoster(ekran) {
  baslikEl.textContent = aktifDers.baslik;
  setAktifMenu(ekran);
  if (ekran === 'oku') return ekranOku();
  if (ekran === 'kelime') return ekranKelime();
  if (ekran === 'gramer') return ekranGramer();
  if (ekran === 'soru') return ekranSoru();
  if (ekran === 'quiz') return ekranQuiz();
}

window.ekranGoster = ekranGoster; // diğer ekran modülleri için
window.__app = { get aktifDers(){return aktifDers;}, render, progress, saveProgress, toggleDone,
  isAnswerCorrect, scoreQuiz, nextCard };

anaSayfa();
```

> Not: Sonraki görevler (11–15) `ekranOku/ekranKelime/...` fonksiyonlarını `app.js`'e ekler.

- [ ] **Step 4: Sunucuyu başlat ve ana sayfayı doğrula**

Run:
```bash
cd /storage/emulated/0/dos/adm/app
python -m http.server 8080 >/tmp/srv.log 2>&1 &
sleep 1
curl -s http://localhost:8080/data/manifest.json | head -c 200
```
Expected: manifest.json içeriği döner. Telefon tarayıcısında `http://localhost:8080` açılınca ders listesi ve arama kutusu görünür.

- [ ] **Step 5: Commit**

```bash
cd /storage/emulated/0/dos/adm
git add app/index.html app/css/style.css app/js/app.js 2>/dev/null && git commit -m "feat: uygulama kabuğu + ana sayfa (ders listesi)" || echo "git yok, atlandı"
```

---

## Task 11: Ders okuma ekranı (kitap görünümü)

**Files:**
- Modify: `app/js/app.js` (yeni fonksiyon `ekranOku` ekle)

- [ ] **Step 1: `ekranOku`'yu `app.js`'e ekle** (`anaSayfa();` çağrısından önce)

```js
function ekranOku() {
  const d = aktifDers;
  const html = d.cumleler.map(c => `
    <div class="cumle">
      <div class="en">${esc(c.en)}</div>
      <div class="tr">${esc(c.tr)}</div>
      ${c.not ? `<div class="not">${esc(c.not)}</div>` : ''}
    </div>`).join('');
  const ust = `<div class="cumle"><div class="tr">${esc(d.konu_ozeti || '')}</div></div>`;
  const tamamBtn = `<div class="btn-satir"><button class="aksiyon" id="tamamla">${isDone(progress, d._id) ? '✓ Çalışıldı (geri al)' : 'Çalışıldı işaretle'}</button></div>`;
  render(ust + html + tamamBtn);
  document.getElementById('tamamla').onclick = () => {
    progress = toggleDone(progress, d._id);
    saveProgress(progress);
    ekranOku();
  };
}

function esc(s) { return String(s ?? '').replace(/[&<>]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[m])); }
```

- [ ] **Step 2: Doğrula**

Telefon/tarayıcıda bir ders aç → "📖 Oku" sekmesinde tüm cümleler en/tr/not ile sırayla görünür; "Çalışıldı işaretle" basınca rozet değişir ve sayfa yenilenince korunur (localStorage).

- [ ] **Step 3: Commit**

```bash
cd /storage/emulated/0/dos/adm
git add app/js/app.js 2>/dev/null && git commit -m "feat: ders okuma ekranı" || echo "git yok, atlandı"
```

---

## Task 12: Flashcard (kelime) ekranı

**Files:**
- Modify: `app/js/app.js` (fonksiyon `ekranKelime` ekle)

- [ ] **Step 1: `ekranKelime`'yi ekle**

```js
let _kartIdx = 0, _kartAcik = false;
function ekranKelime() {
  _kartIdx = 0; _kartAcik = false;
  cizKart();
}
function cizKart() {
  const k = aktifDers.kelimeler;
  if (!k.length) { render('<div class="cumle"><div class="tr">Bu derste kelime yok.</div></div>'); return; }
  const kart = k[_kartIdx];
  const yuz = _kartAcik
    ? `<div><div>${esc(kart.tr)}</div>${kart.ornek ? `<div class="not">${esc(kart.ornek)}</div>` : ''}</div>`
    : `<div>${esc(kart.en)}</div>`;
  render(`
    <div class="cumle"><div class="tr">${_kartIdx + 1} / ${k.length}</div></div>
    <div class="flashcard" id="kart">${yuz}</div>
    <div class="btn-satir">
      <button class="aksiyon ikincil" id="cevir">${_kartAcik ? 'Kapat' : 'Çevir'}</button>
      <button class="aksiyon" id="sonraki">Sonraki ›</button>
    </div>`);
  document.getElementById('kart').onclick = () => { _kartAcik = !_kartAcik; cizKart(); };
  document.getElementById('cevir').onclick = () => { _kartAcik = !_kartAcik; cizKart(); };
  document.getElementById('sonraki').onclick = () => { _kartIdx = nextCard(_kartIdx, k.length); _kartAcik = false; cizKart(); };
}
```

- [ ] **Step 2: Doğrula**

"🎴 Kelime" sekmesinde kelime kartı görünür; karta/Çevir'e basınca Türkçe + örnek görünür; "Sonraki" döngüsel ilerler ve sayaç (n/m) güncellenir.

- [ ] **Step 3: Commit**

```bash
cd /storage/emulated/0/dos/adm
git add app/js/app.js 2>/dev/null && git commit -m "feat: flashcard ekranı" || echo "git yok, atlandı"
```

---

## Task 13: Gramer ekranı

**Files:**
- Modify: `app/js/app.js` (fonksiyon `ekranGramer` ekle)

- [ ] **Step 1: `ekranGramer`'i ekle**

```js
function ekranGramer() {
  const g = aktifDers.gramer;
  if (!g.length) { render('<div class="cumle"><div class="tr">Bu derste gramer notu yok.</div></div>'); return; }
  render(g.map(x => `
    <div class="cumle">
      <div class="en">${esc(x.konu)}</div>
      <div class="tr">${esc(x.aciklama)}</div>
      ${(x.ornekler || []).map(o => `<div class="not">• ${esc(o)}</div>`).join('')}
    </div>`).join(''));
}
```

- [ ] **Step 2: Doğrula**

"📝 Gramer" sekmesinde konu + açıklama + örnekler görünür.

- [ ] **Step 3: Commit**

```bash
cd /storage/emulated/0/dos/adm
git add app/js/app.js 2>/dev/null && git commit -m "feat: gramer ekranı" || echo "git yok, atlandı"
```

---

## Task 14: Soru çözümleri ekranı

**Files:**
- Modify: `app/js/app.js` (fonksiyon `ekranSoru` ekle)

- [ ] **Step 1: `ekranSoru`'yu ekle** (cevap + hoca açıklaması "Göster" ile açılır)

```js
function ekranSoru() {
  const s = aktifDers.soru_cozumleri;
  if (!s.length) { render('<div class="cumle"><div class="tr">Bu derste soru çözümü yok.</div></div>'); return; }
  render(s.map((q, i) => `
    <div class="cumle" data-i="${i}">
      <div class="en">${i + 1}. ${esc(q.soru)}</div>
      ${(q.secenekler || []).map(o => `<div class="tr">• ${esc(o)}</div>`).join('')}
      <button class="secenek goster" data-i="${i}" style="margin-top:8px">Cevabı göster</button>
      <div class="cozum" id="cozum-${i}" hidden>
        <div class="not">Cevap: ${esc(q.cevap)}</div>
        ${q.hoca_aciklama ? `<div class="tr">${esc(q.hoca_aciklama)}</div>` : ''}
      </div>
    </div>`).join(''));
  icerik.querySelectorAll('.goster').forEach(b => b.onclick = () => {
    document.getElementById('cozum-' + b.dataset.i).hidden = false;
    b.hidden = true;
  });
}
```

- [ ] **Step 2: Doğrula**

"✅ Sorular" sekmesinde sorular + seçenekler görünür; "Cevabı göster" basınca cevap + hoca açıklaması açılır.

- [ ] **Step 3: Commit**

```bash
cd /storage/emulated/0/dos/adm
git add app/js/app.js 2>/dev/null && git commit -m "feat: soru çözümleri ekranı" || echo "git yok, atlandı"
```

---

## Task 15: Quiz ekranı

**Files:**
- Modify: `app/js/app.js` (fonksiyon `ekranQuiz` ekle)

- [ ] **Step 1: `ekranQuiz`'i ekle**

```js
let _quizCevap = [];
function ekranQuiz() {
  const q = aktifDers.quiz;
  if (!q.length) { render('<div class="cumle"><div class="tr">Bu derste quiz yok.</div></div>'); return; }
  _quizCevap = new Array(q.length).fill(null);
  cizQuiz();
}
function cizQuiz() {
  const q = aktifDers.quiz;
  const html = q.map((soru, i) => `
    <div class="cumle">
      <div class="en">${i + 1}. ${esc(soru.soru)}</div>
      ${soru.secenekler.map(o => {
        let sinif = 'secenek';
        if (_quizCevap[i] != null) {
          if (o === soru.cevap) sinif += ' dogru';
          else if (o === _quizCevap[i]) sinif += ' yanlis';
        }
        return `<button class="${sinif}" data-i="${i}" data-o="${esc(o)}" ${_quizCevap[i] != null ? 'disabled' : ''}>${esc(o)}</button>`;
      }).join('')}
      ${_quizCevap[i] != null && soru.aciklama ? `<div class="not">${esc(soru.aciklama)}</div>` : ''}
    </div>`).join('');
  const bitti = _quizCevap.every(x => x != null);
  const skor = bitti ? (() => { const r = scoreQuiz(q, _quizCevap); return `<div class="cumle"><div class="en">Sonuç: ${r.dogru} / ${r.toplam}</div></div>`; })() : '';
  render(html + skor);
  icerik.querySelectorAll('.secenek:not([disabled])').forEach(b => b.onclick = () => {
    _quizCevap[Number(b.dataset.i)] = b.dataset.o;
    cizQuiz();
  });
}
```

- [ ] **Step 2: Doğrula**

"🧠 Quiz" sekmesinde seçenek seçince doğru yeşil, yanlış kırmızı olur ve açıklama görünür; tüm sorular bitince skor görünür.

- [ ] **Step 3: Commit**

```bash
cd /storage/emulated/0/dos/adm
git add app/js/app.js 2>/dev/null && git commit -m "feat: quiz ekranı" || echo "git yok, atlandı"
```

---

## Task 16: PWA — manifest + service worker (offline)

**Files:**
- Create: `app/manifest.webmanifest`
- Create: `app/sw.js`
- Modify: `app/js/app.js` (service worker kaydı)

- [ ] **Step 1: `manifest.webmanifest`'i yaz**

```json
{
  "name": "YDS Ders",
  "short_name": "YDS",
  "start_url": "./index.html",
  "display": "standalone",
  "background_color": "#0f1726",
  "theme_color": "#1c2b4a",
  "icons": [
    { "src": "icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

- [ ] **Step 2: Basit ikonlar üret**

Run:
```bash
cd /storage/emulated/0/dos/adm/app
ffmpeg -y -f lavfi -i color=c=0x1c2b4a:s=512x512 -frames:v 1 icon-512.png -loglevel error
ffmpeg -y -i icon-512.png -vf scale=192:192 icon-192.png -loglevel error
ls icon-*.png
```
Expected: `icon-192.png`, `icon-512.png` oluşur.

- [ ] **Step 3: `sw.js`'i yaz**

```js
// app/sw.js — basit önbellek (offline)
const CACHE = 'yds-v1';
const ASSETS = [
  './', './index.html', './css/style.css',
  './js/app.js', './js/logic.js', './js/storage.js',
  './manifest.webmanifest',
  './data/manifest.json', './data/lessons/ders-001.json'
];
self.addEventListener('install', e =>
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', e =>
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request))));
```

- [ ] **Step 4: `app.js` sonuna SW kaydı ekle**

```js
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
```

- [ ] **Step 5: Doğrula**

Telefon tarayıcısında `http://localhost:8080` aç → "Ana ekrana ekle" çıkar. Sunucuyu durdurup (uçak modu/sunucu kapalı) tekrar açınca uygulama yine açılır (önbellekten).

Run (sunucu kapalı test):
```bash
curl -s http://localhost:8080/sw.js | head -c 80
```
Expected: sw.js içeriği döner (sunucu açıkken).

- [ ] **Step 6: Commit**

```bash
cd /storage/emulated/0/dos/adm
git add app/manifest.webmanifest app/sw.js app/icon-192.png app/icon-512.png app/js/app.js 2>/dev/null && git commit -m "feat: PWA manifest + service worker (offline)" || echo "git yok, atlandı"
```

---

## Task 17: Uçtan uca doğrulama (dikey dilim kapanışı)

- [ ] **Step 1: Tüm testleri çalıştır**

Run:
```bash
cd /storage/emulated/0/dos/adm/app
node --test js/logic.test.js
node ../pipeline/validate-lesson.mjs data/lessons/ders-001.json
```
Expected: Testler PASS, ders GEÇERLİ.

- [ ] **Step 2: Manuel kabul kontrolü (telefon tarayıcısı)**

`http://localhost:8080` aç ve sırayla doğrula:
- Ana sayfa: ders listede, arama çalışıyor
- Oku: tüm cümleler en/tr/not ile, **eksiksiz**, sayfa sırasıyla
- Kelime: flashcard çevirme + sonraki
- Gramer: notlar görünüyor
- Sorular: cevap + hoca açıklaması açılıyor
- Quiz: doğru/yanlış renkleri + skor
- "Çalışıldı" işareti yeniden açışta korunuyor
- Offline: sunucu kapalıyken PWA açılıyor

- [ ] **Step 3: Kullanıcı onayı**

Kullanıcıya dersi göster. "Birebir ve eksiksiz mi, beğendin mi?" onayını al. Onaylanırsa dikey dilim biter; sıradaki aşama (166 video otomasyonu) ayrı planlanır.

---

## Self-Review Notları (yazım sonrası)

- **Spec kapsamı:** Birebir/eksiksiz kural (Task 6 Step 1), kitap okuma (Task 11), flashcard (12), gramer (13), soru çözümleri+ses (Task 3+14), quiz (15), offline PWA (16), ilerleme (9/11), manifest (6). 166 video otomasyonu kapsam dışı — Task 17 Step 3'te sonraki aşamaya devredildi.
- **Transkript süre ölçümü:** Task 3 Step 4 — 166 video kararının dayanağı.
- **Tip tutarlılığı:** `logic.js` export'ları (`searchLessons/toggleDone/isDone/isAnswerCorrect/scoreQuiz/nextCard`) test ve `app.js` ile aynı.
- **Bağımlılık yok:** Doğrulayıcı ve testler saf Node; ffmpeg/whisper.cpp dışında kurulum gerekmez.
