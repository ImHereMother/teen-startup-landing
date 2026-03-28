import pg from 'pg'

const { Pool } = pg

// Reuse pool across warm invocations
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
    CREATE TABLE IF NOT EXISTS waitlist (
      id         SERIAL PRIMARY KEY,
      email      TEXT UNIQUE NOT NULL,
      type       TEXT NOT NULL DEFAULT 'waitlist',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `)
  // Add type column to existing tables that don't have it yet
  await client.query(`
    ALTER TABLE waitlist ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'waitlist'
  `)
}

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { email, type } = req.body || {}
  const signupType = type === 'early_access' ? 'early_access' : 'waitlist'

  // Basic validation
  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'Email is required' })
  }

  const trimmed = email.trim().toLowerCase()
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(trimmed)) {
    return res.status(400).json({ error: 'Invalid email address' })
  }

  const db = getPool()
  const client = await db.connect()
  try {
    await ensureTable(client)

    // Try to insert — unique constraint handles duplicates
    try {
      await client.query(
        'INSERT INTO waitlist (email, type) VALUES ($1, $2)',
        [trimmed, signupType]
      )
    } catch (err) {
      if (err.code === '23505') {
        // Duplicate email
        const countResult = await client.query('SELECT COUNT(*) as count FROM waitlist')
        const count = parseInt(countResult.rows[0].count, 10)
        return res.status(409).json({ error: 'Already on the waitlist', count })
      }
      throw err
    }

    // Return new total
    const countResult = await client.query('SELECT COUNT(*) as count FROM waitlist')
    const count = parseInt(countResult.rows[0].count, 10)

    return res.status(200).json({ success: true, count })
  } catch (err) {
    console.error('Waitlist POST error:', err)
    return res.status(500).json({ error: 'Server error. Please try again.' })
  } finally {
    client.release()
  }
}
