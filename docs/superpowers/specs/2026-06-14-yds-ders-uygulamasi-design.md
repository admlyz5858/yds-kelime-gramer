# YDS Video → Ders Uygulaması — Tasarım Dokümanı

**Tarih:** 2026-06-14
**Durum:** Onaylandı (tasarım), uygulama planı bekliyor

## Amaç

Kullanıcının elinde, telefonda yüklü **167 adet ~1 saatlik YDS/YÖKDİL ders videosu** (`.ts`, toplam ~61 GB, "RH+ Platform" canlı dersleri) var. Bu videoları tek tek izlemek yerine, her videoyu **kitap gibi okunup çalışılabilen yapılandırılmış bir derse** dönüştürmek isteniyor. Çalışma, telefonda açılan bir uygulama üzerinden yapılacak.

## Videoların Yapısı (incelendi)

Bir kareye bakıldı (`Hazırlık - 101`, süre ~54 dk). Ekranda:
- **Ortada:** Temiz dijital İngilizce cümleler + hocanın üzerine **elle yazdığı Türkçe çeviriler ve notlar**, altını çizdiği yerler.
- **Sağda:** Canlı öğrenci sohbet paneli (kırpılıp atılacak).
- **Ses:** Hocanın anlatımı; özellikle **soru çözümleri** burada (kitapta cevaplar yok).

İçeriğin kaynağı videoların kendisi. Basılı kitap kullanıcıda var; PDF'i web'de aranabilir ama **şart değil** (ekran metni zaten temiz dijital).

## Temel Kurallar

1. **BİREBİR ve EKSİKSİZ:** Ekrandaki/kitaptaki tüm cümleler, kelimeler, çeviriler ve hocanın notları **aynen** aktarılır. Özetleme, seçme, kısaltma, atlama **yapılmaz**. Sıralama sayfadaki sırayla korunur.
2. Yapay zekânın görevi yorumlamak değil, **sayfadaki her şeyi sadık ve tam biçimde JSON'a aktarmaktır.**
3. **Önce 1 video:** 167 video baştan işlenmez. Tek video uçtan uca işlenir, kullanıcı sonucu onaylar, sonra kalan 166 için ölçeklenir.

## Genel Mimari

```
[167 .ts video] ─► İÇERİK HATTI (bir kez) ─► [ders-NN.json] ─► PWA UYGULAMA
                   (Termux script'leri)        (her video=1 ders)  (offline çalışma)
```

İki parça bağımsızdır: hat veriyi üretir, uygulama yalnızca üretilen veriyi gösterir. Uygulama veriden ayrı geliştirilip test edilebilir.

## Bileşen 1 — İçerik Hattı (per video)

| # | Adım | Araç | Çıktı |
|---|------|------|-------|
| 1 | Ses çıkar | ffmpeg | 16kHz mono ses |
| 2 | Yazıya çevir | whisper.cpp (yerel, ücretsiz, Türkçe) | zaman damgalı transkript |
| 3 | Kare yakala | ffmpeg (sahne değişimi algılama) | her yeni sayfa/slayt için 1 temiz kare |
| 4 | Sohbeti kırp | ffmpeg (sağ panel kesilir) | sadece ders içeriği görseli |
| 5 | Sayfa metnini çıkar | görsel anlayan yapay zekâ (Claude) | İngilizce cümleler + hocanın Türkçe notları (el yazısı dahil) |
| 6 | Derse dönüştür | yapay zekâ (Claude) | yapılandırılmış `ders-NN.json` |

**Notlar:**
- Adım 5'te el yazısı Türkçe notlar olduğu için sıradan OCR (tesseract) yetersiz; **görsel anlayan yapay zekâ** kullanılır.
- İlk videoda adım 1–4 script ile otomatik, adım 5–6 oturum içinde Claude tarafından yapılır.
- **Transkript hız riski (dürüstçe):** 167 saat yerel whisper.cpp = günlerce CPU işlemi. İlk videoda (~54 dk) gerçek süre ölçülecek; sonuca göre 166 video için yöntem (gece batch / alternatif) yeniden değerlendirilecek. Kullanıcı ücretsiz/yerel tercihini bilerek seçti.
- 166 videonun tam otomasyonu (adım 5–6 dahil), ilk video kalitesi onaylandıktan sonra ayrı tasarlanacak (maliyet/hız dengesi).

## Bileşen 2 — Ders JSON Yapısı

```jsonc
{
  "id": 101,
  "baslik": "YDS&YÖKDİL Hazırlık - 101",
  "kaynak_video": "...Hazırlık - 101 - Ders.ts",
  "sure_dk": 54,
  "konu_ozeti": "(ek kolaylık; asıl içerik tam metnin kendisi)",

  "cumleler": [
    { "en": "He has been passionate about environmental issues since his childhood.",
      "tr": "O, çocukluğundan beri çevresel sorunlar hakkında tutkuludur.",
      "not": "'since + geçmiş nokta' → present perfect ile kullanılır" }
  ],
  "kelimeler": [
    { "en": "passionate", "tr": "tutkulu", "ornek": "He is passionate about painting." }
  ],
  "gramer": [
    { "konu": "Present Perfect Continuous",
      "aciklama": "...",
      "ornekler": ["As the years passed, his passion grew stronger."] }
  ],
  "soru_cozumleri": [
    { "soru": "While working on the project, they ____ several challenges.",
      "secenekler": ["encountered", "encounter", "have encountered", "encountering"],
      "cevap": "encountered",
      "hoca_aciklama": "Ana cümle past olduğu için eş zamanlı eylem de past..." }
  ],
  "quiz": [
    { "soru": "Until he ____, I won't consider speaking to him again.",
      "secenekler": ["apologizes", "apologized", "will apologize", "apologize"],
      "cevap": "apologizes",
      "aciklama": "Zaman bağlacı 'until' + present simple" }
  ]
}
```

- `cumleler` → kitap gibi okuma ekranı (**tam, birebir**)
- `kelimeler` → flashcard destesi
- `gramer` → gramer notları
- `soru_cozumleri` → hocanın sesten gelen çözümleri (kitapta olmayan kısım)
- `quiz` → pekiştirme testi
- Ayrıca tüm dersleri listeleyen bir `manifest.json` (ders adı, ilerleme için).

## Bileşen 3 — PWA Uygulaması

| Ekran | İşlev |
|-------|-------|
| Ana sayfa | 167 dersin listesi + ilerleme + arama |
| Ders okuma | Kitap gibi: tüm cümleler + Türkçe anlam + hoca notları, sayfa sırasıyla; istenirse orijinal kareler |
| Flashcard | Dersin kelimeleri; çevir-göster, bildim/bilemedim, basit tekrar |
| Gramer | Dersin gramer notları |
| Soru çözümleri | Hocanın çözdüğü sorular + cevap + açıklama |
| Quiz | Çoktan seçmeli test, anında geri bildirim |

**Teknik:**
- Sade HTML/CSS/JS (ağır framework yok) → telefonda hızlı.
- Veri = üretilen JSON dosyaları.
- İlerleme (biten ders, bilinen kelime) `localStorage`'da yerel saklanır.
- Service worker → tam **offline** çalışır, ana ekrana eklenebilir.

## Kapsam Dışı (YAGNI)

- Bulut senkronizasyonu, çoklu kullanıcı, hesap sistemi yok.
- Video oynatma yok (amaç videoyu izlememek).
- İlk sürümde gelişmiş aralıklı tekrar (SM-2) yerine basit "bildim/bilemedim" yeterli.

## İlk Adım (Dikey Dilim)

1. Seçilen tek bir videoyu adım 1–6 ile işle, `ders-NN.json` üret.
2. O tek dersi gösteren minimal PWA'yı kur (tüm ekranlar, tek ders verisiyle).
3. Kullanıcı kaliteyi onaylar.
4. Sonra: 166 video için otomasyon + uygulamaya toplu veri yükleme tasarlanır.
