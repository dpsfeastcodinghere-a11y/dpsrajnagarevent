const { Client } = require('pg');

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'OPTIONS,GET,DELETE',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers };
  }

  try {
    if (process.env.DATABASE_URL) {
      const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
      });
      await client.connect();

      const result = await client.query('SELECT data FROM registrations ORDER BY id DESC');
      
      const rows = result.rows.map(row => row.data);
      
      await client.end();
      return { statusCode: 200, headers, body: JSON.stringify({ success: true, rows }) };
    }
    
    return { 
      statusCode: 200, 
      headers, 
      body: JSON.stringify({ success: false, message: 'No database configured', rows: [] }) 
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
