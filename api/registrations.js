const { Pool } = require('pg')
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

function send(res, status, data) {
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Pin')
  res.status(status).end(JSON.stringify(data))
}

const pool = process.env.DATABASE_URL
  ? new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
  : null

async function ensureTable() {
  if (!pool) return
  await pool.query(`
    CREATE TABLE IF NOT EXISTS registrations (
      id SERIAL PRIMARY KEY,
      reg_no TEXT,
      type TEXT,
      enrollment_no TEXT,
      name TEXT,
      phone TEXT,
      age TEXT,
      employee_no TEXT,
      last_class TEXT,
      org_name TEXT,
      org_addr TEXT,
      parent_name TEXT,
      parent_phone TEXT,
      student_name TEXT,
      student_class TEXT,
      competitions JSONB,
      timestamp TEXT
    )
  `)
}

function eq(a, b) { return String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase() }

function getGoogleCreds() {
  try {
    const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
    if (raw) return JSON.parse(raw)
  } catch (_) {}
  try {
    const email = process.env.GOOGLE_SA_EMAIL
    const key = process.env.GOOGLE_SA_PRIVATE_KEY
    if (email && key) return { client_email: email, private_key: key, token_uri: process.env.GOOGLE_TOKEN_URI || 'https://oauth2.googleapis.com/token' }
  } catch (_) {}
  try {
    const p = process.env.GOOGLE_SERVICE_ACCOUNT_PATH || path.join(__dirname, '..', 'gen-lang-client-0927596805-8c112733fbb6.json')
    if (fs.existsSync(p)) {
      const json = JSON.parse(fs.readFileSync(p, 'utf8'))
      return json
    }
  } catch (_) {}
  return null
}

function b64url(buf) { return Buffer.from(buf).toString('base64').replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_') }

async function getGoogleAccessToken(creds, scope) {
  try {
    const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
    const now = Math.floor(Date.now() / 1000)
    const aud = creds.token_uri || 'https://oauth2.googleapis.com/token'
    const claim = b64url(JSON.stringify({ iss: creds.client_email, scope, aud, iat: now, exp: now + 3600 }))
    const toSign = `${header}.${claim}`
    const sig = crypto.createSign('RSA-SHA256').update(toSign).sign(creds.private_key, 'base64').replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_')
    const assertion = `${toSign}.${sig}`
    const res = await fetch(aud, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${assertion}` })
    if (!res.ok) return null
    const json = await res.json().catch(() => ({}))
    return json.access_token || null
  } catch (_) {
    return null
  }
}

async function appendToSheet(sheetId, range, values, token) {
  try {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(sheetId)}/values/${encodeURIComponent(range)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ values }) })
    return res.ok
  } catch (_) { return false }
}

async function appendRegistrationToSheets(payload) {
  const sheetId = process.env.GOOGLE_SHEETS_ID || process.env.GOOGLE_SHEET_ID || 'YOUR_SHEET_ID'
  if (!sheetId) return false
  const creds = getGoogleCreds()
  if (!creds) return false
  const token = await getGoogleAccessToken(creds, 'https://www.googleapis.com/auth/spreadsheets')
  if (!token) return false
  const range = process.env.GOOGLE_SHEETS_RANGE || 'Sheet1!A:Q'
  const comps = Array.isArray(payload.competitions) ? payload.competitions.join(';') : (payload.competitions || '')
  const row = [
    payload.reg_no || '',
    payload.timestamp || new Date().toISOString(),
    payload.type || '',
    payload.enrollment_no || '',
    payload.name || '',
    payload.phone || payload.parent_phone || '',
    payload.age || '',
    payload.employee_no || '',
    payload.last_class || '',
    payload.org_name || '',
    payload.org_addr || '',
    payload.parent_name || '',
    payload.parent_phone || '',
    payload.student_name || '',
    payload.student_class || '',
    comps
  ]
  return await appendToSheet(sheetId, range, [row], token)
}

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') return send(res, 200, { ok: true })

  try {
    await ensureTable()
    if (req.method === 'GET') {
      if (!pool) return send(res, 200, { success: true, rows: [] })
      const r = await pool.query('SELECT * FROM registrations ORDER BY id DESC LIMIT 500')
      return send(res, 200, { success: true, rows: r.rows })
    }
    if (req.method === 'POST') {
      const body = req.body || {}
      const fields = [
        'reg_no','type','enrollment_no','name','phone','age','employee_no','last_class','org_name','org_addr','parent_name','parent_phone','student_name','student_class','competitions','timestamp'
      ]
      const payload = {}
      for (const f of fields) payload[f] = body[f]
      if (!pool) return send(res, 200, { success: false, duplicate: false, message: 'DB not configured' })

      const q = `SELECT * FROM registrations WHERE 
        (enrollment_no IS NOT NULL AND $1 <> '' AND LOWER(enrollment_no) = LOWER($1)) OR
        (phone IS NOT NULL AND $2 <> '' AND LOWER(phone) = LOWER($2)) OR
        (parent_phone IS NOT NULL AND $3 <> '' AND LOWER(parent_phone) = LOWER($3)) OR
        (employee_no IS NOT NULL AND $4 <> '' AND LOWER(employee_no) = LOWER($4)) OR
        (($5 <> '' AND $6 <> '' AND LOWER(COALESCE(name,'')) = LOWER($5) AND LOWER(COALESCE(last_class,'')) = LOWER($6)) OR
         ($7 <> '' AND $8 <> '' AND LOWER(COALESCE(student_name,'')) = LOWER($7) AND LOWER(COALESCE(student_class,'')) = LOWER($8)))
        LIMIT 1`
      const dup = await pool.query(q, [
        payload.enrollment_no || '',
        payload.phone || '',
        payload.parent_phone || '',
        payload.employee_no || '',
        payload.name || '',
        payload.last_class || '',
        payload.student_name || '',
        payload.student_class || ''
      ])
      if (dup.rows.length) return send(res, 200, { success: false, duplicate: true, existingRegNo: dup.rows[0].reg_no || '' })

      const ins = `INSERT INTO registrations(${fields.join(',')}) VALUES(${fields.map((_, i) => `$${i+1}`).join(',')}) RETURNING id`
      const vals = fields.map(f => f === 'competitions' ? (payload[f] ? JSON.stringify(payload[f]) : null) : (payload[f] || null))
      await pool.query(ins, vals)
      try { await appendRegistrationToSheets(payload) } catch (_) {}
      return send(res, 200, { success: true })
    }
    return send(res, 405, { success: false, message: 'Method not allowed' })
  } catch (e) {
    return send(res, 500, { success: false, message: e.message })
  }
}
