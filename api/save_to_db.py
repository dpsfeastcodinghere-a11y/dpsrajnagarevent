import os
import json
import psycopg2
from http.server import BaseHTTPRequestHandler

class handler(BaseHTTPRequestHandler):
    def _cors(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')

    def do_OPTIONS(self):
        self.send_response(204)
        self._cors()
        self.end_headers()

    def do_POST(self):
        try:
            length = int(self.headers.get('Content-Length', '0'))
            body = self.rfile.read(length)
            data = json.loads(body.decode('utf-8') or '{}')

            conn = psycopg2.connect(os.environ.get('DATABASE_URL'))
            cur = conn.cursor()

            enrollment_no = data.get('enrollment_no', '')
            name = data.get('name') or data.get('student_name') or data.get('parent_name') or ''
            category = data.get('category', 'Student')
            phone = data.get('phone') or data.get('parent_phone') or ''
            employee_no = data.get('employee_no') or ''
            last_class = data.get('last_class') or ''
            json_data = json.dumps(data)

            conditions = []
            params = []
            if enrollment_no:
                conditions.append("enrollment_no = %s"); params.append(enrollment_no)
            if phone:
                conditions.append("phone = %s"); params.append(phone)
            if employee_no:
                conditions.append("data->>'employee_no' = %s"); params.append(employee_no)
            if last_class and name:
                conditions.append("(data->>'last_class' = %s AND name = %s)"); params.extend([last_class, name])
            duplicate = False
            if conditions:
                q = "SELECT id FROM registrations WHERE " + " OR ".join(conditions) + " LIMIT 1"
                cur.execute(q, params)
                row = cur.fetchone()
                duplicate = bool(row)
            if duplicate:
                self.send_response(409)
                self._cors()
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'success': False, 'message': 'duplicate'}).encode('utf-8'))
                cur.close(); conn.close()
                return

            cur.execute(
                'INSERT INTO registrations (enrollment_no, name, category, phone, data, created_at) VALUES (%s, %s, %s, %s, %s, NOW()) RETURNING id',
                (enrollment_no, name, category, phone, json_data)
            )
            new_id = cur.fetchone()[0]
            conn.commit()
            cur.close(); conn.close()

            self.send_response(200)
            self._cors()
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'success': True, 'id': new_id, 'source': 'vercel-python'}).encode('utf-8'))
        except Exception as e:
            self.send_response(500)
            self._cors()
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'success': False, 'error': str(e)}).encode('utf-8'))
