import os
import json
import psycopg2
from http.server import BaseHTTPRequestHandler

class handler(BaseHTTPRequestHandler):
    def _cors(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, X-Config-Secret')
        self.send_header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')

    def ensure(self, cur):
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS roster (
              id SERIAL PRIMARY KEY,
              enrollment_no VARCHAR(50) UNIQUE,
              name VARCHAR(255),
              student_class VARCHAR(50),
              created_at TIMESTAMP DEFAULT NOW()
            );
            """
        )

    def do_OPTIONS(self):
        self.send_response(204)
        self._cors(); self.end_headers()

    def do_GET(self):
        try:
            conn = psycopg2.connect(os.environ.get('DATABASE_URL'))
            cur = conn.cursor(); self.ensure(cur)
            cur.execute('SELECT enrollment_no, name, student_class FROM roster ORDER BY id DESC')
            rows = [
                {'Enrollment No': r[0] or '', 'Name': r[1] or '', 'Class': r[2] or ''}
                for r in cur.fetchall()
            ]
            cur.close(); conn.close()
            self.send_response(200)
            self._cors(); self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'success': True, 'rows': rows}).encode('utf-8'))
        except Exception as e:
            self.send_response(500)
            self._cors(); self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'success': False, 'error': str(e)}).encode('utf-8'))

    def do_POST(self):
        try:
            length = int(self.headers.get('Content-Length', '0'))
            data = json.loads(self.rfile.read(length).decode('utf-8') or '{}')
            conn = psycopg2.connect(os.environ.get('DATABASE_URL'))
            cur = conn.cursor(); self.ensure(cur)
            enr = (data.get('enrollment_no') or '').strip()
            nm = (data.get('name') or '').strip()
            cls = (data.get('student_class') or '').strip()
            if not enr or not nm:
                self.send_response(400)
                self._cors(); self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'success': False, 'message': 'enrollment_no and name required'}).encode('utf-8'))
                return
            cur.execute(
                'INSERT INTO roster (enrollment_no, name, student_class) VALUES (%s, %s, %s) 
                 ON CONFLICT (enrollment_no) DO UPDATE SET name = EXCLUDED.name, student_class = EXCLUDED.student_class',
                (enr, nm, cls)
            )
            conn.commit(); cur.close(); conn.close()
            self.send_response(200)
            self._cors(); self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'success': True}).encode('utf-8'))
        except Exception as e:
            self.send_response(500)
            self._cors(); self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'success': False, 'error': str(e)}).encode('utf-8'))
