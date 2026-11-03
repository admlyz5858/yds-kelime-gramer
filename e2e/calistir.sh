#!/usr/bin/env bash
# Uçtan uca testleri çalıştırır. Önce uygulamayı sunucuda aç:
#   cd app && python3 sunucu.py 8905     (ya da herhangi bir port; BASE ile belirt)
# Kullanım: BASE=http://localhost:8905/ ./e2e/calistir.sh
set -u
cd "$(dirname "$0")"
for t in faz0-test faz1-test bulut-test faz2-test faz3-test faz4-test kart-test f5-test v2-test faz5-sifirla; do
  echo "=== $t"
  node "$t.mjs" 2>&1 | grep -E "✗|SONUÇ|HATALAR|TimeoutError" | head -6
done
