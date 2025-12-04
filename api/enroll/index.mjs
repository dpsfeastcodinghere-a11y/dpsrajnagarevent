import { getGoogleCreds, getGoogleAccessToken, appendToSheet } from '../lib/google.mjs';

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

  // 1. Get Sheet ID (From Env or Body)
  // Priority: Body (Admin Override) -> Env (Server Config)
  let sheetId = process.env.GOOGLE_SHEETS_ID || process.env.GOOGLE_SHEET_ID;
  if (payload.sheetId) {
    const match = payload.sheetId.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (match) sheetId = match[1];
    else sheetId = payload.sheetId;
  }

  if (!sheetId) {
    // Fallback: If no sheet ID, we can't save centrally.
    // Return success so the client can save to LocalStorage at least.
    // But warn in logs.
    console.warn('No GOOGLE_SHEETS_ID configured. Data not saved to Sheets.');
    return res.status(200).json({ success: false, message: 'Server Config Missing: GOOGLE_SHEETS_ID' });
  }

  // 2. Prepare Row
  // Headers assumed: Enrollment ID | Student Name | Phone | Email | Sector | Employee No | Timestamp | Raw Data
  const row = [
    payload.enrollmentId || payload.enrollment_no || '',
    payload.studentName || payload.name || payload.student_name || payload.parent_name || '',
    payload.phone || payload.parent_phone || '',
    payload.email || '',
    payload.sector || payload.type || '',
    payload.employeeNumber || payload.employee_no || '',
    new Date().toISOString(),
    JSON.stringify(payload)
  ];

  try {
    const creds = getGoogleCreds();
    if (!creds) throw new Error('Service Account Credentials Missing');
    const token = await getGoogleAccessToken(creds, 'https://www.googleapis.com/auth/spreadsheets');
    if (!token) throw new Error('Failed to get Google Access Token');

    const ok = await appendToSheet(sheetId, 'Sheet1!A:H', [row], token);
    if (ok) {
      return res.status(200).json({ success: true });
    } else {
      throw new Error('Failed to append to Sheet');
    }
  } catch (error) {
    console.error('Sheet Save Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}
