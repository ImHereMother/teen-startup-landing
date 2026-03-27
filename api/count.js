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

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Cache-Control', 'public, s-maxage=30')

  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const db = getPool()
  const client = await db.connect()
  try {
    // Table might not exist yet — handle gracefully
    const result = await client.query(`
      SELECT COUNT(*) as count FROM waitlist
    `).catch(() => ({ rows: [{ count: '0' }] }))

    const count = parseInt(result.rows[0].count, 10)
    return res.status(200).json({ count })
  } catch (err) {
    console.error('Count GET error:', err)
    return res.status(200).json({ count: 0 })
  } finally {
    client.release()
  }
}
