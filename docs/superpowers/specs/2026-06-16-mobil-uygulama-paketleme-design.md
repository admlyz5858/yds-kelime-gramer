# YDS Ders — Mobil Uygulama Paketleme Tasarımı

**Tarih:** 2026-06-16
**Durum:** Onaylandı (kullanıcı, 2026-06-16)

## Amaç

Mevcut offline PWA'yı (`app/`) **hiç bozmadan** Google Play Store'a yüklenebilir bir Android uygulamasına dönüştürmek. İlk sürümde yalnızca **Ünite 1 (En Sık Kullanılan 1000 Kelime)** açık olacak; Ünite 2-11 uygulamada **"🔒 Premium — yakında"** kilitli kart olarak görünecek ama içerikleri pakete girmeyecek. Mimari, ileride yeni içerik üniteleri ve native özellikler (premium satın alma, bildirim, bulut senkron) eklemeye uygun olacak.

## Kısıtlar ve Kararlar

- **Build ortamı: GitHub Actions** (`ubuntu-latest`). Termux'ta Android SDK/Gradle build'i güvenilmez (noexec, bozuk coreutils, aarch64 araç eksikliği). Bulut runner'da Android SDK/JDK/Gradle hazır gelir → güvenilir imzalı **AAB** üretimi. Termux yalnızca düzenleme + `git push` için kullanılır.
- **Paketleme: Capacitor.** Web varlıklarını uygulama içine gömer, `https://localhost` üzerinden sunar → tam offline çalışır, PWA'nın göreli `fetch()` çağrıları (`data/manifest.json`, `data/<dosya>`, `data/gunun.json`) CORS'a takılmadan çalışır. Gelecekte native plugin eklemek kolay.
- **PWA dokunulmazlığı:** `app/` kanonik kaynak kalır. `python sunucu.py` dev akışı, SW-kill kodu, offline fontlar aynen korunur. `app/` içindeki **tek** değişiklik premium-kilit özelliğidir (aşağıda) — bu PWA'da da tutarlı görünür, bir bozulma değil ekleme.
- **Çıktı biçimi: AAB** (Play Store yeni uygulamalar için zorunlu). Artifact olarak indirilip Play Console'a (önce iç test kanalı) elle yüklenir.
- **gh:** `admlyz5858` hesabıyla girişli. Repo **private** olacak.

## Mimari

İki bağımsız katman korunur (mevcut proje ilkesiyle uyumlu — [[yds-ders-uygulamasi-proje]]):

```
adm/
├── app/                      # KANONİK PWA (offline, vanilla JS) — dokunulmaz
│   ├── index.html, css/, js/, fonts/, sw.js
│   └── data/
│       ├── manifest.json     # 11 ünite; 2-11 durum:"premium" işaretlenir
│       ├── gunun.json
│       └── uniteler/unite-01.json … unite-11.json
├── mobil/                    # Capacitor sarmalayıcı (YENİ)
│   ├── package.json
│   ├── capacitor.config.json # appId, appName, webDir: "www"
│   ├── hazirla.mjs           # staging: app/ → www/, premium eleme, ikon
│   ├── www/                  # build çıktısı (gitignore) — hazirla.mjs üretir
│   ├── kaynak/               # ikon kaynak görseli, splash
│   └── android/              # `npx cap add android` ile üretilen Gradle projesi
└── .github/workflows/android.yml   # build + imzalama + AAB artifact (YENİ)
```

### Bileşen 1 — Premium kilit özelliği (PWA içinde)

**Veri (`app/data/manifest.json`):** Ünite 2-11 girdilerinde `durum` alanı `"premium"` olur (şu an `"hazir"`/`"yakinda"`). Anlamsal, taşınabilir; UI'dan bağımsız kalır.

**Mantık (`app/js/app.js`):** Üniteler listesi çizilirken `durum === "premium"` olan kartlar:
- 🔒 rozet + "Premium — yakında" etiketi ile **kilitli** görünür,
- tıklanınca açılmaz; bunun yerine kısa bir bilgilendirme (modal/`modalAc`) gösterir: "Bu ünite yakında premium ile açılacak."
- `dersAc` premium ünite için erken döner (içerik fetch edilmez → eksik JSON çökme yapmaz).

Bu, hem PWA hem mobil sürümde aynı davranır. İçerik JSON'u olmadığında da güvenli.

### Bileşen 2 — Staging script (`mobil/hazirla.mjs`, Node)

Yerelde ve CI'da çalışan saf Node script. Adımlar:
1. `mobil/www/` temizle, `app/`'ı kopyala.
2. **Premium eleme:** `www/data/uniteler/` içinde yalnızca pakete girecek üniteleri bırak. Hangilerinin gireceği `manifest.json`'daki `durum` alanından **otomatik** belirlenir: `durum !== "premium"` olanların JSON'u kalır, premium olanların gerçek JSON'u silinir/boş stub yapılır. → İleride bir ünite premium olmaktan çıkıp `"hazir"` olduğunda **script değişmeden** otomatik pakete girer (gelecek-uyumlu).
3. **Store-manifest:** `www/data/manifest.json` zaten premium bayraklarını taşır; ek dönüşüme gerek yok.
4. **İkon/splash:** `mobil/kaynak/` içindeki kaynak görselden gerekli boyutları üret (veya Capacitor `@capacitor/assets` ile android ikon/splash üret).
5. `cap copy`/`cap sync` öncesi `www/` hazır olur.

### Bileşen 3 — Capacitor yapılandırması

- `capacitor.config.json`: `appId: "com.admlyz.ydsders"`, `appName: "YDS Ders"`, `webDir: "www"`, `server.androidScheme: "https"` (localhost https → güvenli bağlam, fetch çalışır).
- `android/` projesi `npx cap add android` ile bir kez üretilir ve repoya commit edilir (CI'da yeniden üretmeye gerek kalmaz; `cap sync` yeterli).
- `versionCode: 1`, `versionName: "1.0.0"` (`android/app/build.gradle`).

### Bileşen 4 — İmzalama

- Release keystore (`upload-keystore.jks`) bir kez üretilir (CI içinde tek seferlik bir job veya kullanıcı tarafından). 
- Base64'ü `ANDROID_KEYSTORE_BASE64`, şifreler `ANDROID_KEYSTORE_PASSWORD` / `ANDROID_KEY_ALIAS` / `ANDROID_KEY_PASSWORD` olarak **GitHub Secrets**'a konur.
- Workflow keystore'u secret'tan çözer ve `bundleRelease`'i imzalar.
- **Kritik:** Keystore + şifreler kullanıcıya ayrıca güvenli şekilde teslim edilir ve yedeklenir (kaybolursa Play'de uygulama güncellenemez). Play App Signing açıksa upload key kaybı kurtarılabilir; yine de yedek şart.

### Bileşen 5 — GitHub Actions workflow (`.github/workflows/android.yml`)

`push` (main) ve `workflow_dispatch` ile tetiklenir:
1. `checkout`
2. `setup-node` (LTS) → `cd mobil && npm ci`
3. `setup-java` (Temurin 17)
4. `node hazirla.mjs` → `www/` hazırla
5. `npx cap sync android`
6. Keystore'u secret'tan yaz (`android/keystore.jks`), `gradle.properties`/`build.gradle` imza yapılandırması
7. `cd android && ./gradlew bundleRelease`
8. `upload-artifact`: `app-release.aab`

İsteğe bağlı (sonraki faz, YAGNI): fastlane ile Play Console'a otomatik yükleme. İlk sürümde **elle yükleme**.

### Bileşen 6 — Repo bootstrap (git)

Klasör şu an git deposu değil. Kök `.gitignore` ile **yalnızca** `app/`, `mobil/` (üretilen `www/` ve `node_modules` hariç), `.github/`, `docs/`, kök config izlenir. Ağır/yerel dizinler (`work/`, `_probe/`, `u3-kareler/`, `app/data/frames/`, `*.ts`, `srv.log`, `pipeline/` çıktı kareleri) hariç tutulur. Private repo oluşturulup push edilir.

## Gelecek-uyumluluk (kullanıcı şartı)

- **Yeni içerik:** Bir ünite hazır olunca `manifest.json`'da `durum: "premium"` → `"hazir"` yapmak + ilgili JSON'u doldurmak yeterli; `hazirla.mjs` ve workflow değişmeden onu pakete alır. Sürüm artışı `versionCode`/`versionName` güncellemesi.
- **Premium satın alma:** Capacitor olduğu için ileride `@capacitor-community/in-app-purchases` (veya RevenueCat) eklenip premium ünitelerin kilidi gerçek satın almayla açılabilir. Kilit mantığı tek noktada (`app.js` premium kontrolü).
- **Kalıcılık/bulut senkron:** Tüm localStorage erişimi `storage.js`'te soyut; ileride buluta taşınacak tek nokta korunur.
- **Saf mantık** `logic.js`'te DOM'suz kalır.

## Riskler

- **Capacitor `android/` ilk üretimi** Termux'ta `npx cap add android` gerektirir (node var). Gerekirse bu adım da CI'da bir kez yapılıp sonuç commit edilir.
- **İmza secret'ları** doğru kurulmazsa `bundleRelease` imzasız çıkar → Play reddeder. Workflow'da imza doğrulaması (apksigner verify) eklenir.
- **Play Console hesabı** ($25 tek seferlik) kullanıcıda olmalı; iç test kanalıyla başlanır.
- **AAB boyutu:** Ünite 1 JSON ~1.4 MB; sorun değil.

## Başarı Ölçütü

- GitHub Actions yeşil → imzalı `app-release.aab` artifact iner.
- AAB bir cihazda (bundletool/Play iç test) kurulunca: açılış ekranı, Ünite 1 tam çalışır (oku/kelime/quiz/defter/yanlışlarım), offline; Ünite 2-11 kilitli "Premium — yakında" görünür ve açılmaz.
- `app/` PWA'sı `python sunucu.py` ile hâlâ eskisi gibi çalışır (premium kartlar kilitli görünür — kabul edilen tek davranış değişikliği).
