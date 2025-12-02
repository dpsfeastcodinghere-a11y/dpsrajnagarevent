import http.server
import socketserver
import json
import psycopg2
import os
from urllib.parse import urlparse

PORT = 8000
DB_URL = "postgresql://neondb_owner:npg_zlxSKm3OBQ0r@ep-morning-shape-adilpx1p-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

class MyRequestHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        # Handle redirects similar to Netlify config
        if self.path == '/':
            self.send_response(301)
            self.send_header('Location', '/main/index.html')
            self.end_headers()
            return
        
        if self.path == '/.netlify/functions/list':
            try:
                conn = psycopg2.connect(DB_URL)
                cur = conn.cursor()
                cur.execute("SELECT data FROM registrations ORDER BY id DESC")
                rows = cur.fetchall()
                
                # Extract JSON data from each row
                results = []
                for row in rows:
                    if row[0]:
                        results.append(row[0])
                
                cur.close()
                conn.close()
                
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                response = {'success': True, 'rows': results}
                self.wfile.write(json.dumps(response).encode('utf-8'))
                return
            except Exception as e:
                print(f"Error listing DB: {e}")
                self.send_response(500)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                response = {'success': False, 'error': str(e)}
                self.wfile.write(json.dumps(response).encode('utf-8'))
                return

        return super().do_GET()

    def do_POST(self):
        if self.path == '/.netlify/functions/save_to_db':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            
            try:
                data = json.loads(post_data.decode('utf-8'))
                print(f"Received registration data: {data}")
                
                # Connect to DB
                conn = psycopg2.connect(DB_URL)
                cur = conn.cursor()
                
                # Prepare values
                enrollment_no = data.get('enrollment_no', '')
                name = data.get('name') or data.get('student_name') or data.get('parent_name') or ''
                category = data.get('category', 'Student')
                phone = data.get('phone') or data.get('parent_phone') or ''
                json_data = json.dumps(data)
                
                query = """
                    INSERT INTO registrations (enrollment_no, name, category, phone, data, created_at)
                    VALUES (%s, %s, %s, %s, %s, NOW())
                    RETURNING id
                """
                
                cur.execute(query, (enrollment_no, name, category, phone, json_data))
                new_id = cur.fetchone()[0]
                conn.commit()
                
                cur.close()
                conn.close()
                
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                response = {'success': True, 'id': new_id, 'source': 'postgres (local python)'}
                self.wfile.write(json.dumps(response).encode('utf-8'))
                
            except Exception as e:
                print(f"Error saving to DB: {e}")
                self.send_response(500)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                response = {'success': False, 'error': str(e)}
                self.wfile.write(json.dumps(response).encode('utf-8'))
        else:
            self.send_error(404, "File not found")

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

print(f"Starting local server on port {PORT} with PostgreSQL support...")
with socketserver.TCPServer(("", PORT), MyRequestHandler) as httpd:
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")
