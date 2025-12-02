# Database Configuration Guide

## 1. Where to get a Database URL
You need a hosted database. Here are free options:
- **PostgreSQL**: [Neon.tech](https://neon.tech) or [Supabase](https://supabase.com)
- **MySQL**: [PlanetScale](https://planetscale.com) or [Aiven](https://aiven.io)

## 2. How to set it in Netlify
1. Go to [Netlify Dashboard](https://app.netlify.com)
2. Select your site (`dpsrajnagareventregistration`)
3. Go to **Site configuration** > **Environment variables**
4. Click **Add a variable**
   - Key: `DATABASE_URL` (for Postgres) OR `MYSQL_URL` (for MySQL)
   - Value: `postgres://user:password@host:port/dbname` (The URL you got from Step 1)

## 3. Table Structure (SQL)
Run this SQL command in your database to create the table:

### PostgreSQL
```sql
CREATE TABLE registrations (
  id SERIAL PRIMARY KEY,
  enrollment_no TEXT,
  name TEXT,
  category TEXT,
  phone TEXT,
  data JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### MySQL
```sql
CREATE TABLE registrations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  enrollment_no VARCHAR(255),
  name VARCHAR(255),
  category VARCHAR(255),
  phone VARCHAR(255),
  data JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```
