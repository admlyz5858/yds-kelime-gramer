# Supabase kurulumu (lig + e-posta hesabı / bulut yedek)

Proje: `yds-lig` (id `thftjeecotladgnuqwhd`, eu-central-1). Uygulama SDK'sız REST kullanır; publishable anahtar herkese açıktır, tüm yazma kuralları RLS ile sunucuda.

## Tablolar
- `skorlar` — Eşleştirme ligi (cihaz kimliği + takma ad + skor). RPC: `lider`, `takma_ad_degistir`, `ligden_ayril`.
- `yedekler` — Bulut yedek: kullanıcı başına tek satır (`kullanici` = auth.users.id, `veri` jsonb, `guncelleme`, `cihaz`). RLS: yalnızca sahibi okur/yazar/siler. Tetikleyici: 2 MB sınırı.

## Yapılması gereken dashboard ayarları (bir kez)

### 1. E-posta kodu şablonları (zorunlu)
Uygulama şifresiz giriş için **6 haneli kod** kullanır (`/auth/v1/otp` + `/auth/v1/verify type=email`). Varsayılan şablonlar bağlantı (magic link) gönderir; kodu içermeleri için iki şablon düzenlenmeli:

Authentication → Email Templates:
- **Magic Link** (mevcut kullanıcı girişi) ve **Confirm signup** (ilk kayıt) şablonlarının gövdesini şununla değiştirin:

```html
<h2>Kelimetre giriş kodun</h2>
<p>Uygulamadaki kutuya şu kodu yaz:</p>
<p style="font-size:28px;letter-spacing:6px;font-weight:bold">{{ .Token }}</p>
<p>Kod 1 saat geçerlidir. Bu isteği sen yapmadıysan bu e-postayı yok sayabilirsin.</p>
```

Konu satırı önerisi: `Kelimetre giriş kodun: {{ .Token }}`

### 2. Gönderici e-posta (yayından önce zorunlu)
Supabase'in yerleşik e-posta servisi yalnızca deneme içindir: saatte birkaç e-posta ile sınırlıdır ve gönderici "noreply@mail.app.supabase.io" olur. Yayın öncesi **Project Settings → Authentication → SMTP Settings** altında kendi SMTP'nizi tanımlayın (ücretsiz seçenekler: Resend 3.000 e-posta/ay, Brevo 300/gün). Gönderici adı: "Kelimetre".

### 3. Auth ayarları
Authentication → Providers → Email: **Enable email provider** açık, **Confirm email** açık kalabilir (kod doğrulaması zaten e-postayı onaylar). Authentication → Rate Limits: e-posta gönderimi varsayılan (saatte 30) yeterli.

### 3b. Google ile giriş (1.4.0+, "Google ile devam et" düğmesi)
Uygulama SDK'sız OAuth kullanır: `/auth/v1/authorize?provider=google&redirect_to=…` adresine gider, Supabase Google'dan dönüşte tokenları `redirect_to` adresinin `#` parçasında geri yollar. Üç adım:

1. **Google Cloud Console** (console.cloud.google.com, ücretsiz) → yeni proje "Kelimetre" → **APIs & Services → OAuth consent screen**: External, uygulama adı Kelimetre, destek e-postası; scope eklemeye gerek yok (email/profile varsayılan). Yayın durumu "In production" yapın (Testing'de yalnızca eklediğiniz test kullanıcıları girebilir).
2. **Credentials → Create credentials → OAuth client ID → Web application**. Authorized redirect URI: `https://thftjeecotladgnuqwhd.supabase.co/auth/v1/callback`. Oluşan **Client ID** ve **Client secret**'ı kopyalayın. (Android/iOS tipi istemci, SHA-1 vb. GEREKMEZ; giriş sistem tarayıcısında yapılır.)
3. **Supabase → Authentication → Providers → Google**: Enable açık, Client ID + Client Secret yapıştır, kaydet. Ardından **Authentication → URL Configuration**:
   - Site URL: `https://admlyz5858.github.io/yds-kelime-gramer/app/`
   - Additional Redirect URLs (her satır ayrı): `kelimetre://auth` · `https://admlyz5858.github.io/yds-kelime-gramer/**` · geliştirme için `http://localhost:8901/**`

`kelimetre://auth` Android uygulamasının derin bağlantısıdır (AndroidManifest intent-filter). Giriş Chrome Custom Tab'da açılır, Google hesap seçildikten sonra uygulamaya döner. iPhone PWA'da ve web'de aynı sekmede Google'a gidilir ve geri dönülür.

Aynı e-posta hem Google hem kod ile girerse Supabase ikisini tek hesapta birleştirir (Google e-postayı doğrulanmış gönderir), yedek de tek olur.

### 4. Hesap silme RPC'si (önerilir)
Uygulamadaki "Hesabımı ve bulut yedeğimi sil" önce `hesabimi_sil` RPC'sini dener; yoksa yalnızca yedek satırını silip çıkış yapar (e-posta kaydı auth tablosunda kalır). Tam silme için SQL Editor'da bir kez çalıştırın:

```sql
create or replace function public.hesabimi_sil() returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'oturum yok'; end if;
  delete from public.yedekler where kullanici = auth.uid();
  delete from auth.users where id = auth.uid();
end $$;
revoke all on function public.hesabimi_sil() from public;
grant execute on function public.hesabimi_sil() to authenticated;
```

## İstemci akışı (app/js/bulut.js)
- Oturum `yds-hesap-v1` anahtarında (yedeğe girmez). Erişim belirteci süresi dolunca `refresh_token` ile yenilenir.
- Her yerel kayıt → "bekleyen" bayrağı (kalıcı) → 20 sn sonra ya da uygulama arka plana geçince buluta yazım (`upsert`).
- Açılışta: bulut daha yeniyse ve bekleyen değişiklik yoksa bulut indirilir ve uygulama yeniden başlar; ikisi de değişmişse kullanıcıya sorulur.
- "Hesabımı sil" → RPC; "Çıkış yap" → oturum kapanır, cihazdaki veri kalır.
