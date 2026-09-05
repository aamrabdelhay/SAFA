const { Pool } = require('pg');

module.exports = async function handler(req, res) {
  const result = { ok: true, database: false, blob: Boolean(process.env.BLOB_READ_WRITE_TOKEN) };
  if (!process.env.DATABASE_URL) {
    return res.status(503).json({ ...result, ok: false, database: false, error: 'DATABASE_URL is not configured' });
  }
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }, max: 1, connectionTimeoutMillis: 5000 });
  try {
    await pool.query('select 1');
    result.database = true;
    res.status(200).json(result);
  } catch (error) {
    res.status(503).json({ ...result, ok: false, error: 'Neon connection failed' });
  } finally {
    await pool.end().catch(() => {});
  }
};
