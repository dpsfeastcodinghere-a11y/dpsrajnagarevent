import { query } from '../lib/db.mjs';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const payload = req.body;
  if (!payload) {
    return res.status(400).json({ success: false, message: 'No data' });
  }

  try {
    // 1. Ensure table exists
    await query(`
      CREATE TABLE IF NOT EXISTS registrations (
        id SERIAL PRIMARY KEY,
        data JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // 2. Insert Data
    // We store the entire payload as JSON for flexibility
    const result = await query(
      'INSERT INTO registrations (data) VALUES ($1) RETURNING id',
      [JSON.stringify(payload)]
    );

    return res.status(200).json({ success: true, id: result.rows[0].id });

  } catch (error) {
    console.error('DB Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}
