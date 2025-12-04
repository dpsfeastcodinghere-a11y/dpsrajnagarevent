import { getGoogleCreds, getGoogleAccessToken, readSheet } from '../lib/google.mjs';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // 1. Get Sheet ID
  let sheetId = process.env.GOOGLE_SHEETS_ID || process.env.GOOGLE_SHEET_ID;
  // Allow override via query (GET) or body (POST)
  const idParam = req.query.sheetId || (req.body && req.body.sheetId);
  if (idParam) {
    const match = idParam.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (match) sheetId = match[1];
    else sheetId = idParam;
  }

  if (!sheetId) {
    return res.status(400).json({ success: false, message: 'No Sheet ID configured' });
  }

  try {
    const creds = getGoogleCreds();
    if (!creds) throw new Error('Service Account Credentials Missing');
    const token = await getGoogleAccessToken(creds, 'https://www.googleapis.com/auth/spreadsheets');
    if (!token) throw new Error('Failed to get Google Access Token');

    // Read Range A:H
    const rows = await readSheet(sheetId, 'Sheet1!A:H', token);
    
    // Convert to Object Array for Frontend
    // Headers assumed from index.mjs:
    // 0: Enrollment ID, 1: Name, 2: Phone, 3: Email, 4: Sector, 5: EmpNo, 6: Timestamp
    const data = rows.map(r => ({
      enrollmentId: r[0],
      studentName: r[1],
      phone: r[2],
      email: r[3],
      sector: r[4],
      employeeNumber: r[5],
      timestamp: r[6]
    }));

    return res.status(200).json({
      success: true,
      message: 'Data retrieved from Sheets',
      data: data
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: error.message });
  }
}
