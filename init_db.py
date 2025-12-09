import psycopg2
import os

DB_URL = "postgresql://neondb_owner:npg_zlxSKm3OBQ0r@ep-morning-shape-adilpx1p-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

def init_db():
    try:
        conn = psycopg2.connect(DB_URL)
        cur = conn.cursor()
        print("Creating table 'registrations' if not exists...")
        cur.execute("""
            CREATE TABLE IF NOT EXISTS registrations (
                id SERIAL PRIMARY KEY,
                enrollment_no TEXT,
                name TEXT,
                category TEXT,
                phone TEXT,
                data JSONB,
                created_at TIMESTAMP DEFAULT NOW()
            )
        """)
        conn.commit()
        cur.close()
        conn.close()
        print("Table 'registrations' ready.")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    init_db()
