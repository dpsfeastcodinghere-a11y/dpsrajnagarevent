const { Client } = require('pg');
const mysql = require('mysql2/promise');

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: 'Method Not Allowed' };
  }

  try {
    const data = JSON.parse(event.body);
    
    // 1. Try PostgreSQL if configured
    if (process.env.DATABASE_URL) {
      const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
      });
      await client.connect();
      
      const query = `
        INSERT INTO registrations (enrollment_no, name, category, phone, data, created_at)
        VALUES ($1, $2, $3, $4, $5, NOW())
        RETURNING id
      `;
      const values = [
        data.enrollment_no || '',
        data.name || data.student_name || data.parent_name || '',
        data.category || 'Student',
        data.phone || data.parent_phone || '',
        JSON.stringify(data)
      ];
      
      await client.query(query, values);
      await client.end();
      return { statusCode: 200, headers, body: JSON.stringify({ success: true, source: 'postgres' }) };
    }

    // 2. Try MySQL if configured
    if (process.env.MYSQL_URL) {
      const connection = await mysql.createConnection(process.env.MYSQL_URL);
      const [rows] = await connection.execute(
        'INSERT INTO registrations (enrollment_no, name, category, phone, data, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
        [
          data.enrollment_no || '',
          data.name || data.student_name || data.parent_name || '',
          data.category || 'Student',
          data.phone || data.parent_phone || '',
          JSON.stringify(data)
        ]
      );
      await connection.end();
      return { statusCode: 200, headers, body: JSON.stringify({ success: true, source: 'mysql' }) };
    }

    return { 
      statusCode: 200, 
      headers, 
      body: JSON.stringify({ 
        success: false, 
        message: 'No database configured. Please set DATABASE_URL (Postgres) or MYSQL_URL (MySQL) in Netlify.' 
      }) 
    };

  } catch (error) {
    console.error('Database Error:', error);
    return { 
      statusCode: 500, 
      headers, 
      body: JSON.stringify({ success: false, error: error.message }) 
    };
  }
};
