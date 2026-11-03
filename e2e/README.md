# Uçtan uca testler (Playwright)

Önkoşul: `mobil/node_modules` içinde Playwright kurulu olmalı (`cd mobil && npm install`) ve
Chromium `/opt/pw-browsers/chromium` yolunda olmalı (değilse betiklerdeki `executablePath` değiştirilir).

1. Uygulamayı yerel sunucuda aç: `cd app && python3 sunucu.py 8905`
2. Testleri çalıştır: `BASE=http://localhost:8905/ ./e2e/calistir.sh`

Ekran görüntüleri `SHOT_DIR` ortam değişkenine yazılır (varsayılan `/tmp`).
Bulut testleri Supabase'i yönlendirme (route) ile taklit eder; gerçek sunucuya istek atmaz.
Bilinen beklenen çıktılar: `bulut-test` içinde 403 konsol uyarısı (yanlış kod denemesi).
