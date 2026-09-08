const { Pool } = require('pg');
const { getOrCreateVisitorId, hashVisitorId } = require('../server/visitor-analytics');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 2,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 10000,
});

module.exports = async function analyticsVisit(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { id, isNew } = getOrCreateVisitorId(req, res);
    const visitorKey = hashVisitorId(id);
    const userAgent = String(req.headers?.['user-agent'] || '').slice(0, 500);
    const path = String(req.body?.path || '/').slice(0, 500);

    const client = await pool.connect();
    try {
      await client.query('begin');
      const existing = await client.query('select visitor_id from site_visitors where visitor_id=$1 for update', [visitorKey]);
      if (!existing.rows.length) {
        await client.query('insert into site_visitors(visitor_id, first_seen_at, last_seen_at, first_path, last_path, user_agent) values($1,now(),now(),$2,$2,$3)', [visitorKey, path, userAgent]);
      } else {
        await client.query('update site_visitors set last_seen_at=now(), last_path=$2, user_agent=$3 where visitor_id=$1', [visitorKey, path, userAgent]);
      }
      await client.query('insert into site_visits(visitor_id, visited_at, path) values($1,now(),$2)', [visitorKey, path]);
      await client.query('commit');
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }

    return res.status(200).json({ ok: true, newVisitor: Boolean(isNew) });
  } catch (error) {
    console.error('[analytics] visit failed:', error);
    return res.status(500).json({ error: 'تعذر تسجيل الزيارة حاليًا.' });
  }
};
