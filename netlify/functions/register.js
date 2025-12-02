const { getStore } = require('@netlify/blobs')

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'OPTIONS,POST',
    'Content-Type': 'application/json'
  }
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers }
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ success: false, message: 'Method not allowed' }) }
  }
  try {
    const payload = JSON.parse(event.body || '{}')
    const store = getStore('registrations')
    const key = `reg_${Date.now()}_${Math.random().toString(36).slice(2,8)}`
    await store.set(key, JSON.stringify(payload))
    // Also append to index list
    let idxRaw = await store.get('index')
    let idx = []
    if (idxRaw) { try { idx = JSON.parse(idxRaw) } catch (_) { idx = [] } }
    idx.push({ key, timestamp: payload.timestamp || new Date().toISOString() })
    await store.set('index', JSON.stringify(idx))
    return { statusCode: 200, headers, body: JSON.stringify({ success: true }) }
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ success: false, message: 'Server error' }) }
  }
}
