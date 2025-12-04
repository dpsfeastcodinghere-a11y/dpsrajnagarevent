import { mongoRequest } from '../lib/mongo.mjs';

const DATABASE = 'school_portal';
const COLLECTION = 'enrollment_data';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const result = await mongoRequest('find', {
      filter: {},
      sort: { timestamp: -1 } // Newest first
    }, { database: DATABASE, collection: COLLECTION });

    return res.status(200).json({
      success: true,
      message: 'Enrollments retrieved',
      data: result.documents || []
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: error.message });
  }
}
