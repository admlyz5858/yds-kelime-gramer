# Kapalı test sonrası yapılan değişiklikler — Kelimetre

Bu not, kapalı test sürecinde gelen geri bildirimler doğrultusunda uygulamada yaptığımız değişiklikleri özetler. Play Console başvurusunda, sürüm notlarında ve "hangi değişiklikleri yaptınız?" gibi sorularda kaynak olarak kullanılabilir.

> **Kullanırken dikkat:** Aşağıdaki "Ne yaptık" bölümleri uygulamada gerçekten yapılmış değişikliklerdir. Hangi test kullanıcısının ne söylediğini bu dosyaya **bilerek yazmadık**. Her başlığın yanındaki `[geri bildirim: ...]` alanına, o değişikliği tetikleyen gerçek geri bildirimi (kim söyledi gerekmez, ne söylendiği yeter) kendiniz yazın. Yazmadığınız bir geri bildirimi başvuruda iddia etmeyin.

---

## 1. Play Console için hazır metinler

### Kısa cevap (300 karakter sınırı için, 265 karakter)

> Test kullanıcılarının geri bildirimleri doğrultusunda uygulamayı oyun odaklı hâle getirdik: testleri kaldırıp Harf Avı ve Karışık Harfler oyunlarını ekledik, lig ve puan sistemini sadeleştirdik, girişi Google'a indirdik, hata ve erişilebilirlik düzeltmeleri yaptık.

### Orta uzunluk (paragraf)

> Kapalı test sürecinde gelen geri bildirimleri dikkate alarak uygulamayı üç yönde geliştirdik. Birincisi, öğrenmeyi oyunlaştırdık: test odaklı bölümleri kaldırıp mevcut eşleştirme oyununun yanına Harf Avı ve Karışık Harfler oyunlarını ekledik. İkincisi, uygulamayı sadeleştirdik: lig, XP ve başarım sistemlerini ve e-posta girişini kaldırdık; yalnızca Google ile giriş kaldı. Üçüncüsü, güvenilirliği artırdık: bulut yedeği eşitleme hatalarını giderdik, hesap silmeyi tam çalışır hâle getirdik, kelime kartlarındaki hataları ve tekrar eden örnek cümleleri düzelttik, erişilebilirlik denetimi yaptık.

---

## 2. Ne yaptık (ayrıntılı)

### A. Öğrenmeyi oyunlarla teşvik ettik
**[geri bildirim: ]**
- **Yeni oyun — Harf Avı:** Türkçe anlamı verilen İngilizce kelimeyi harf harf bulma oyunu. Kolay, orta ve zor seviye; 6 yanlış hakkı; ipucu seçeneği.
- **Yeni oyun — Karışık Harfler:** Karışık harfleri doğru sırayla dizerek kelimeyi oluşturma; ipucu ve 3 deneme hakkı.
- **Eşleştirme oyunu** korundu; Oyun sekmesinde üç oyun tek yerde, kolay geçişli.
- Tüm oyunlar günlük hedefe ve günlük görevlere sayılır; en iyi puanlar saklanır.
- **Kaldırıldı:** Soru Bankası, mini deneme, ünite testleri ve alıştırmaları, Yanlışlarım. Öğrenme artık kelime kartları, aralıklı tekrar ve oyunlar üzerinden ilerliyor.
- **Müfredat** sadeleştirildi: yalnızca gramer anlatımı (Oku) ve çeviri çalışması kaldı.

### B. Uygulamayı sadeleştirdik
**[geri bildirim: ]**
- Lig, XP, seviye, başarım ve ısı haritası kaldırıldı; ekranlar daha az kalabalık.
- Giriş yalnızca **Google hesabıyla**; e-posta kodu ile giriş kaldırıldı (daha az adım, daha az hata).
- Günlük planda ilk günler en temel (S1) kelimelerle başlar.
- "Tüm ilerlemeyi sıfırla" seçeneği eklendi; defter ve öğrenilen kelimeler dahil temizler, ayarlar ve kendi eklediğin kelimeler kalır.

### C. Güvenilirlik ve veri güvenliği
**[geri bildirim: ]**
- Bulut yedeği eşitlemesinde veri kaybına ve tekrar tekrar giriş istemeye yol açabilen hatalar giderildi; çakışmalarda artık kullanıcıya sorulur.
- Günlük sayaçlar (bugünkü aktivite, görevler) tek bir kayıt günlüğünden hesaplanır; iki cihazda aynı rakamlar görünür.
- **Hesap silme** tam çalışır: yedek ve hesap kaydı birlikte silinir.
- Gizlilik politikası ve mağaza metinleri güncel işleyişe göre yeniden yazıldı.

### D. İçerik kalitesi
**[geri bildirim: ]**
- 91 kelime kartında tekrar eden örnek cümleler yeni, doğal cümlelerle değiştirildi.
- Hatalı çeviri ve vurgulama düzeltmeleri yapıldı (ör. bazı kartların anlamları ve örnek cümlelerindeki vurgulu kelimeler).
- Gün planı ve kelime sırası düzenlendi.

### E. Erişilebilirlik ve kullanılabilirlik
**[geri bildirim: ]**
- Otomatik erişilebilirlik taraması (axe-core) ile ana ekranlar açık ve koyu temada denetlendi; kontrast ve etiket sorunları giderildi.
- Giriş alanları ve ses düğmeleri ekran okuyucular için etiketlendi.
- Dokunma hedefleri büyütüldü; küçük ekranlarda taşmalar düzeltildi.

---

## 3. Sorulara hazır kısa cevaplar

**"Geri bildirimleri nasıl değerlendirdiniz?"**
> Gelen her geri bildirimi tek tek not aldık, uygulamayı sadeleştiren ve öğrenmeyi oyunlaştıran değişikliklere dönüştürdük, ardından her değişikliği otomatik testlerle (birim ve uçtan uca) doğruladık.

**"Hangi sorunları giderdiniz?"**
> Bulut yedeği eşitleme hataları, hesap silme akışı, tekrar eden örnek cümleler ve erişilebilirlik eksikleri giderildi.

**"Uygulamayı neden değiştirdiniz?"**
> Kullanıcılar için öğrenmeyi daha eğlenceli ve daha az yorucu hâle getirmek; gereksiz ekranları azaltmak ve giriş akışını basitleştirmek için.

---

## 4. Sürüm geçmişi (kısaca)
- **1.4.0** — Google ile giriş, bulut yedeği, mini deneme, metin tarayıcı.
- **1.5.0** — Lig/XP/başarım sadeleştirmesi, sıfırlama, kart ve soru düzeltmeleri, Faz 2 sayaçlar.
- **1.6.0** — Test özellikleri kaldırıldı; Harf Avı ve Karışık Harfler eklendi; müfredat sadeleştirildi.
