# Mobil Yayın Rehberi — YDS Kelime ve Gramer

Uygulama: **YDS Kelime ve Gramer** · appId **com.admlyz.ydsders** · sürüm **1.0.0** (versionCode 1)
Depo: `admlyz5858/yds-kelime-gramer` (private)

## Keystore (KRİTİK — mutlaka yedekle)
- Dosya: `upload-keystore.jks` (depoya GİRMEZ; `.gitignore`'da `*.jks`).
- Alias: `upload`
- Parola: **<parola yöneticisinde sakla — bu dosyaya YAZMA>**
- **Kaybolursa**: Play App Signing açıksa Google'dan upload key sıfırlanabilir; yine de keystore dosyasını + parolayı iki ayrı güvenli yerde yedekle. Bu key olmadan uygulamayı güncelleyemezsin.

## GitHub Secrets (repo → Settings → Secrets and variables → Actions)
| Secret | Değer |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | `upload-keystore.jks`'in base64'ü (`base64 -w0 upload-keystore.jks`) |
| `ANDROID_KEYSTORE_PASSWORD` | store parolası |
| `ANDROID_KEY_ALIAS` | `upload` |
| `ANDROID_KEY_PASSWORD` | key parolası (genelde store ile aynı) |

## AAB üretimi (GitHub Actions)
1. GitHub → repo → **Actions** → **Android Build** → **Run workflow** (veya `main`'e push otomatik tetikler).
2. Run yeşil olunca alttaki **Artifacts → `app-release-aab`**'yi indir → içinde `app-release.aab`.
3. Yerelden tetiklemek için: `gh workflow run "Android Build"`.

## Play Console (ilk yükleme)
1. https://play.google.com/console → **Uygulama oluştur**: ad "YDS Kelime ve Gramer", paket `com.admlyz.ydsders`.
2. **Test → İç test → Yeni sürüm oluştur** → `app-release.aab` yükle.
3. **Play App Signing**'i kabul et (Google imza anahtarını yönetir; bizimki upload key olur).
4. Mağaza girişi: kısa/uzun açıklama, en az 2 telefon ekran görüntüsü, 512×512 ikon, 1024×500 öne çıkan grafik, gizlilik politikası URL'si, içerik derecelendirme anketi, hedef kitle.
5. İç testten **Üretim**'e yükselt.

## Sürüm güncelleme (ileride)
- Yeni içerik: ilgili ünitenin `app/data/manifest.json` `durum`'unu `premium` → `hazir` yap + JSON'unu doldur. `hazirla.mjs` ve workflow değişmeden onu pakete alır.
- `mobil/android/app/build.gradle` içinde `versionCode`'u +1 artır, `versionName`'i güncelle.
- Push → Actions → yeni AAB → Play Console'a yeni sürüm.
