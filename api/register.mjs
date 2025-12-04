import { mongoRequest } from './lib/mongo.mjs';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const { enrollmentId, phone, sector, employeeNumber } = req.body || {};

    // Validation
    if (!enrollmentId || !phone || !sector || !employeeNumber) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields: enrollmentId, phone, sector, employeeNumber' 
      });
    }

    // Insert
    const result = await mongoRequest('insertOne', {
      document: {
        enrollmentId,
        phone,
        sector,
        employeeNumber,
        createdAt: new Date()
      }
    });

    return res.status(200).json({
      success: true,
      message: 'Registration saved',
      id: result.insertedId
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: error.message });
  }
}
