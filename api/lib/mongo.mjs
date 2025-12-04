import 'dotenv/config';

const API_URL = process.env.MONGO_DATA_API_URL;
const API_KEY = process.env.MONGO_DATA_API_KEY;
const CLUSTER = process.env.MONGO_DATA_CLUSTER;
const DEFAULT_DATABASE = process.env.MONGO_DATA_DATABASE || 'registrationDB';
const DEFAULT_COLLECTION = process.env.MONGO_DATA_COLLECTION || 'students';

export async function mongoRequest(action, body = {}, options = {}) {
  if (!API_URL || !API_KEY) {
    throw new Error('Missing MONGO_DATA_API_URL or MONGO_DATA_API_KEY');
  }

  let url = API_URL;
  if (!url.endsWith('/')) url += '/';
  const endpoint = `${url}action/${action}`;

  // Allow overriding database/collection via options, else use env defaults
  const database = options.database || DEFAULT_DATABASE;
  const collection = options.collection || DEFAULT_COLLECTION;

  const payload = {
    dataSource: CLUSTER,
    database,
    collection,
    ...body
  };

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Request-Headers': '*',
        'api-key': API_KEY,
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`MongoDB Data API Error: ${response.status} ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('MongoDB Request Failed:', error);
    throw error;
  }
}
