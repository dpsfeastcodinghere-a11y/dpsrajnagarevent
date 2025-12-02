import psycopg2
import sys

DB_URL = "postgresql://neondb_owner:npg_zlxSKm3OBQ0r@ep-morning-shape-adilpx1p-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

def check_db():
    try:
        print("Connecting to database...")
        conn = psycopg2.connect(DB_URL)
        cur = conn.cursor()
        
        print("Querying 'registrations' table...")
        cur.execute("SELECT id, enrollment_no, name, category, created_at FROM registrations ORDER BY id DESC")
        rows = cur.fetchall()
        
        if not rows:
            print("Database is empty.")
        else:
            print(f"Found {len(rows)} registrations:")
            print("-" * 80)
            print(f"{'ID':<5} {'Enrollment':<20} {'Name':<30} {'Category':<15} {'Date':<20}")
            print("-" * 80)
            for row in rows:
                # handle potential None values
                rid = row[0]
                enroll = row[1] or ""
                name = row[2] or ""
                cat = row[3] or ""
                date = str(row[4])
                print(f"{rid:<5} {enroll:<20} {name:<30} {cat:<15} {date:<20}")
            print("-" * 80)
            
        conn.close()
        
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    check_db()
