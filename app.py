import os
import json
import psycopg2
from flask import Flask, request, jsonify, send_from_directory, redirect

DB_URL = os.environ.get('DATABASE_URL', 'postgresql://neondb_owner:npg_zlxSKm3OBQ0r@ep-morning-shape-adilpx1p-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require')

app = Flask(__name__, static_folder='')

def db_conn():
    return psycopg2.connect(DB_URL)


@app.route('/')
def home():
    return redirect('/main/index.html', code=302)

@app.route('/main/<path:path>')
def serve_main(path):
    return send_from_directory('main', path)

@app.route('/admin/<path:path>')
def serve_admin(path):
    return send_from_directory('admin', path)

@app.route('/.netlify/functions/save_to_db', methods=['POST', 'OPTIONS'])
def save_to_db():
    if request.method == 'OPTIONS':
        return ('', 204, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Allow-Methods': 'POST, OPTIONS'
        })
    try:
        data = request.get_json(force=True) or {}
        conn = db_conn()
        cur = conn.cursor()
        enrollment_no = data.get('enrollment_no', '')
        name = data.get('name') or data.get('student_name') or data.get('parent_name') or ''
        category = data.get('category', 'Student')
        phone = data.get('phone') or data.get('parent_phone') or ''
        employee_no = data.get('employee_no') or ''
        last_class = data.get('last_class') or ''
        json_data = json.dumps(data)
        # Duplicate check
        conditions = []
        params = []
        if enrollment_no:
            conditions.append("enrollment_no = %s")
            params.append(enrollment_no)
        if phone:
            conditions.append("phone = %s")
            params.append(phone)
        if employee_no:
            conditions.append("data->>'employee_no' = %s")
            params.append(employee_no)
        if last_class and name:
            conditions.append("(data->>'last_class' = %s AND name = %s)")
            params.extend([last_class, name])
        duplicate = False
        if conditions:
            q = "SELECT id FROM registrations WHERE " + " OR ".join(conditions) + " LIMIT 1"
            cur.execute(q, params)
            row = cur.fetchone()
            duplicate = bool(row)
        if duplicate:
            cur.close(); conn.close()
            return (jsonify({'success': False, 'message': 'duplicate'}), 409)
        cur.execute(
            'INSERT INTO registrations (enrollment_no, name, category, phone, data, created_at) VALUES (%s, %s, %s, %s, %s, NOW()) RETURNING id',
            (enrollment_no, name, category, phone, json_data)
        )
        new_id = cur.fetchone()[0]
        conn.commit()
        cur.close()
        conn.close()
        return jsonify({'success': True, 'id': new_id, 'source': 'python'})
    except Exception as e:
        return (jsonify({'success': False, 'error': str(e)}), 500)

@app.route('/.netlify/functions/list', methods=['GET', 'OPTIONS'])
def list_rows():
    if request.method == 'OPTIONS':
        return ('', 204, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Allow-Methods': 'GET, OPTIONS'
        })
    try:
        conn = db_conn()
        cur = conn.cursor()
        cur.execute('SELECT data FROM registrations ORDER BY id DESC')
        rows = [r[0] for r in cur.fetchall() if r and r[0]]
        cur.close()
        conn.close()
        return jsonify({'success': True, 'rows': rows})
    except Exception as e:
        return (jsonify({'success': False, 'error': str(e)}), 500)

def run():
    port = int(os.environ.get('PORT', '8000'))
    app.run(host='0.0.0.0', port=port)

if __name__ == '__main__':
    run()
@app.after_request
def add_cors_headers(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
    return response
