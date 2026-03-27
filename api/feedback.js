import pg from 'pg'

const { Pool } = pg

let pool

function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 5,
    })
  }
  return pool
}

async function ensureTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS feedback (
      id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      type       TEXT NOT NULL CHECK (type IN ('bug', 'idea')),
      message    TEXT NOT NULL,
      user_id    UUID,
      email      TEXT,
      status     TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewed')),
      source     TEXT NOT NULL DEFAULT 'landing',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `)
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' })

  const { type, message, email } = req.body || {}

  if (!['bug', 'idea'].includes(type)) {
    return res.status(400).json({ error: 'type must be "bug" or "idea"' })
  }

  const msg = typeof message === 'string' ? message.trim() : ''
  if (msg.length < 5) {
    return res.status(400).json({ error: 'message is required (min 5 characters)' })
  }

  const safeEmail = email ? String(email).trim().slice(0, 254) : null

  const db     = getPool()
  const client = await db.connect()
  try {
    await ensureTable(client)
    await client.query(
      `INSERT INTO feedback (id, type, message, email, source, created_at)
       VALUES (gen_random_uuid(), $1, $2, $3, 'landing', NOW())`,
      [type, msg.slice(0, 2000), safeEmail]
    )
    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error('Feedback POST error:', err)
    return res.status(500).json({ error: 'Server error. Please try again.' })
  } finally {
    client.release()
  }
}
