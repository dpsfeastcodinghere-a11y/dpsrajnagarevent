const { getStore } = require('@netlify/blobs')

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'OPTIONS,GET,DELETE',
    'Content-Type': 'application/json'
  }
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers }
  try {
    const store = getStore('registrations')
    if (event.httpMethod === 'DELETE') {
      let idxRaw = await store.get('index')
      let idx = []
      if (idxRaw) { try { idx = JSON.parse(idxRaw) } catch (_) { idx = [] } }
      for (const item of idx) { try { await store.delete(item.key) } catch (_) {} }
      await store.delete('index')
      return { statusCode: 200, headers, body: JSON.stringify({ success: true }) }
    }
    let idxRaw = await store.get('index')
    let idx = []
    if (idxRaw) { try { idx = JSON.parse(idxRaw) } catch (_) { idx = [] } }
    const rows = []
    for (const item of idx) {
      const rRaw = await store.get(item.key)
      if (rRaw) { try { rows.push(JSON.parse(rRaw)) } catch (_) {} }
    }
    return { statusCode: 200, headers, body: JSON.stringify({ success: true, rows }) }
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ success: false, message: 'Server error' }) }
  }
}
