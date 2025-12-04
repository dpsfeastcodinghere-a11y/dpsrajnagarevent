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
    const { enrollmentId } = req.query;

    if (!enrollmentId) {
      return res.status(400).json({ success: false, message: 'Enrollment ID required' });
    }

    const result = await mongoRequest('findOne', {
      filter: { enrollmentId }
    }, { database: DATABASE, collection: COLLECTION });

    if (!result.document) {
      return res.status(404).json({ success: false, message: 'Enrollment not found' });
    }

    return res.status(200).json({
      success: true,
      message: 'Enrollment found',
      data: result.document
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: error.message });
  }
}
