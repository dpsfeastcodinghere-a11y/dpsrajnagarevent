import { mongoRequest } from './lib/mongo.mjs';
import { getGoogleCreds, getGoogleAccessToken, overwriteSheet } from './lib/google.mjs';

const DATABASE = 'school_portal';
const COLLECTION = 'enrollment_data';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // 1. Fetch all data from Mongo
    const result = await mongoRequest('find', {
      filter: {},
      sort: { timestamp: -1 }
    }, { database: DATABASE, collection: COLLECTION });

    const docs = result.documents || [];

    // 2. Prepare Sheet Data
    // Headers: Enrollment ID | Student Name | Phone | Email | Sector | Employee No | Timestamp
    const headers = ['Enrollment ID', 'Student Name', 'Phone', 'Email', 'Sector', 'Employee No', 'Timestamp'];
    
    const rows = docs.map(doc => [
      doc.enrollmentId || '',
      doc.studentName || '',
      doc.phone || '',
      doc.email || '',
      doc.sector || '',
      doc.employeeNumber || '',
      doc.timestamp || ''
    ]);

    const allValues = [headers, ...rows];

    // 3. Overwrite Sheet
    const sheetId = process.env.GOOGLE_SHEETS_ID || process.env.GOOGLE_SHEET_ID;
    if (!sheetId) {
      return res.status(500).json({ success: false, message: 'GOOGLE_SHEETS_ID not set' });
    }

    const creds = getGoogleCreds();
    if (!creds) {
      return res.status(500).json({ success: false, message: 'Google Credentials missing' });
    }

    const token = await getGoogleAccessToken(creds, 'https://www.googleapis.com/auth/spreadsheets');
    if (!token) {
      return res.status(500).json({ success: false, message: 'Google Auth Failed' });
    }

    // Overwrite Sheet1!A:G
    const ok = await overwriteSheet(sheetId, 'Sheet1!A:G', allValues, token);

    if (!ok) {
      return res.status(500).json({ success: false, message: 'Failed to overwrite Google Sheet' });
    }

    return res.status(200).json({
      success: true,
      message: 'Sync successful',
      count: docs.length
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: error.message });
  }
}
