import { query } from '../lib/db.mjs';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // 1. Ensure table exists (in case GET is called before POST)
    await query(`
      CREATE TABLE IF NOT EXISTS registrations (
        id SERIAL PRIMARY KEY,
        data JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // 2. Fetch All
    const result = await query('SELECT data, created_at FROM registrations ORDER BY created_at DESC');
    
    // 3. Flatten Data
    const rawRows = result.rows.map(row => {
      const d = row.data || {};
      // Ensure common fields are at top level for the frontend table
      return {
        ...d,
        enrollmentId: d.enrollment_no || d.enrollmentId || '',
        studentName: d.name || d.student_name || d.studentName || '',
        phone: d.phone || d.parent_phone || '',
        email: d.email || '',
        sector: d.sector || d.type || '',
        employeeNumber: d.employee_no || d.employeeNumber || '',
        timestamp: row.created_at
      };
    });

    // 4. Deduplicate
    // Priority: Enrollment ID -> Employee No -> Phone
    const seen = new Set();
    const uniqueRows = [];

    for (const row of rawRows) {
      let key = null;
      if (row.enrollmentId) key = `student:${row.enrollmentId}`;
      else if (row.employeeNumber) key = `employee:${row.employeeNumber}`;
      else if (row.phone) key = `phone:${row.phone}`;
      else if (row.studentName && row.sector) key = `name:${row.studentName}:${row.sector}`; // Fallback

      if (key) {
        key = key.trim().toLowerCase();
        if (seen.has(key)) continue; // Skip duplicate
        seen.add(key);
      }
      uniqueRows.push(row);
    }

    return res.status(200).json({
      success: true,
      data: uniqueRows
    });

  } catch (error) {
    console.error('DB Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}
