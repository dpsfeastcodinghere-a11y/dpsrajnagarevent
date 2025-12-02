import os
import json
import psycopg2
from http.server import BaseHTTPRequestHandler

class handler(BaseHTTPRequestHandler):
    def _cors(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, X-Config-Secret')
        self.send_header('Access-Control-Allow-Methods', 'POST,OPTIONS')

    def do_OPTIONS(self):
        self.send_response(204)
        self._cors(); self.end_headers()

    def do_POST(self):
        try:
            secret = self.headers.get('X-Config-Secret') or ''
            admin_secret = os.environ.get('ADMIN_SECRET', '')
            if not admin_secret or secret != admin_secret:
                self.send_response(401)
                self._cors(); self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'success': False, 'message': 'unauthorized'}).encode('utf-8'))
                return
            conn = psycopg2.connect(os.environ.get('DATABASE_URL'))
            cur = conn.cursor()
            cur.execute('DELETE FROM registrations')
            conn.commit(); cur.close(); conn.close()
            self.send_response(200)
            self._cors(); self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'success': True, 'message': 'all registrations deleted'}).encode('utf-8'))
        except Exception as e:
            self.send_response(500)
            self._cors(); self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'success': False, 'error': str(e)}).encode('utf-8'))
