#!/usr/bin/env python3
# YDS Çalışma — önbelleksiz statik sunucu.
# Her yanıta "no-store" başlığı ekler; böylece tarayıcı hiçbir şeyi önbelleğe almaz
# ve her yenilemede en güncel sürüm gelir. Port sabit kalabilir.
import http.server
import socketserver
import os
import sys

os.chdir(os.path.dirname(os.path.abspath(__file__)))
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else int(os.environ.get('PORT', '8100'))


class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def log_message(self, *args):
        pass


socketserver.TCPServer.allow_reuse_address = True
with socketserver.TCPServer(('127.0.0.1', PORT), Handler) as httpd:
    print('YDS Çalışma: http://localhost:%d  (önbelleksiz — her yenileme güncel)' % PORT)
    httpd.serve_forever()
