import { mongoRequest } from '../lib/mongo.mjs';
import { getGoogleCreds, getGoogleAccessToken, appendToSheet } from '../lib/google.mjs';

const DATABASE = 'school_portal';
const COLLECTION = 'enrollment_data';

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

  try {
    const { enrollmentId, studentName, phone, email, sector, employeeNumber } = req.body || {};

    // Validation
    if (!enrollmentId || !studentName || !phone || !email || !sector || !employeeNumber) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    if (!/^\d{10}$/.test(phone)) {
      return res.status(400).json({ success: false, message: 'Phone must be 10 digits' });
    }

    // Check Uniqueness
    const existing = await mongoRequest('findOne', {
      filter: { enrollmentId }
    }, { database: DATABASE, collection: COLLECTION });

    if (existing.document) {
      return res.status(409).json({ success: false, message: 'Enrollment ID already exists' });
    }

    const timestamp = new Date().toISOString();
    const newDoc = {
      enrollmentId,
      studentName,
      phone,
      email,
      sector,
      employeeNumber,
      timestamp
    };

    // Insert into Mongo
    await mongoRequest('insertOne', {
      document: newDoc
    }, { database: DATABASE, collection: COLLECTION });

    // Append to Google Sheets
    let sheetWarning = null;
    try {
      const sheetId = process.env.GOOGLE_SHEETS_ID || process.env.GOOGLE_SHEET_ID;
      if (sheetId) {
        const creds = getGoogleCreds();
        if (creds) {
          const token = await getGoogleAccessToken(creds, 'https://www.googleapis.com/auth/spreadsheets');
          if (token) {
            const row = [
              enrollmentId,
              studentName,
              phone,
              email,
              sector,
              employeeNumber,
              timestamp
            ];
            // Append to Sheet1!A:G
            const ok = await appendToSheet(sheetId, 'Sheet1!A:G', [row], token);
            if (!ok) sheetWarning = 'Failed to write to Google Sheets';
          } else sheetWarning = 'Google Auth Failed';
        } else sheetWarning = 'Google Credentials missing';
      } else sheetWarning = 'GOOGLE_SHEETS_ID not set';
    } catch (e) {
      sheetWarning = 'Google Sheets Error: ' + e.message;
    }

    return res.status(200).json({
      success: true,
      message: 'Enrollment successful',
      data: newDoc,
      warning: sheetWarning
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: error.message });
  }
}
