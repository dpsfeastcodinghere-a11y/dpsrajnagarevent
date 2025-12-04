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

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const result = await mongoRequest('find', {
      filter: {}
    });

    const documents = result.documents || [];
    
    // Format output as requested
    const formatted = documents.map(doc => ({
      enrollmentId: doc.enrollmentId,
      phone: doc.phone,
      sector: doc.sector,
      employeeNumber: doc.employeeNumber
    }));

    return res.status(200).json({
      success: true,
      message: 'Registrations retrieved',
      data: formatted
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: error.message });
  }
}
