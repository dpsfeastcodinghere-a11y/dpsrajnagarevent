import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

export function getGoogleCreds() {
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
    // Fallback to local file for dev
    const p = process.env.GOOGLE_SERVICE_ACCOUNT_PATH || path.join(process.cwd(), 'gen-lang-client-0927596805-8c112733fbb6.json')
    if (fs.existsSync(p)) {
      const json = JSON.parse(fs.readFileSync(p, 'utf8'))
      return json
    }
  } catch (_) {}
  return null
}

function b64url(buf) { return Buffer.from(buf).toString('base64').replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_') }

export async function getGoogleAccessToken(creds, scope) {
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

// Append rows to a sheet
export async function appendToSheet(sheetId, range, values, token) {
  try {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(sheetId)}/values/${encodeURIComponent(range)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ values }) })
    return res.ok
  } catch (_) { return false }
}

// Clear sheet and write all rows (Overwrite)
export async function overwriteSheet(sheetId, range, values, token) {
  try {
    // 1. Clear
    const clearUrl = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(sheetId)}/values/${encodeURIComponent(range)}:clear`
    await fetch(clearUrl, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } })
    
    // 2. Update
    const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(sheetId)}/values/${encodeURIComponent(range)}?valueInputOption=RAW`
    const res = await fetch(updateUrl, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ values }) })
    return res.ok
  } catch (_) { return false }
}
