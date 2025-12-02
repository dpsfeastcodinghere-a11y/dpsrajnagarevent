import os
import json
import psycopg2
from flask import Flask, request, jsonify, send_from_directory, redirect

DB_URL = os.environ.get('DATABASE_URL')

app = Flask(__name__, static_folder='')

def db_conn():
    if not DB_URL:
        raise RuntimeError('DATABASE_URL is not configured')
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

@app.after_request
def add_cors_headers(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
    return response

def run():
    port = int(os.environ.get('PORT', '8000'))
    app.run(host='0.0.0.0', port=port)

if __name__ == '__main__':
    run()
