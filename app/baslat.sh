#!/usr/bin/env bash
# YDS Çalışma uygulamasını başlatır (önbelleksiz sunucu — sabit port).
# Termux'ta:  bash app/baslat.sh
# Tarayıcıda aç:  http://localhost:8100
cd "$(dirname "$0")"
PORT="${1:-8100}"
echo "YDS Çalışma başlatılıyor..."
echo "Tarayıcıda aç:  http://localhost:${PORT}"
echo "Durdurmak için: Ctrl+C"
exec python sunucu.py "$PORT"
