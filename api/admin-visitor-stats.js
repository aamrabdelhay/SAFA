const { Pool } = require('pg');
const jwt = require('jsonwebtoken');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 2,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 10000,
});

function readCookie(req, name) {
  const raw = String(req.headers?.cookie || '');
  for (const part of raw.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return decodeURIComponent(rest.join('='));
  }
  return '';
}

function requireAdmin(req, res) {
  try {
    const bearer = String(req.headers?.authorization || '').replace(/^Bearer\s+/i, '');
    const token = bearer || readCookie(req, 'safa_admin_session');
    if (!token || !process.env.SESSION_SECRET) throw new Error();
    req.admin = jwt.verify(token, process.env.SESSION_SECRET);
    return true;
  } catch {
    res.status(401).json({ error: 'Authentication required' });
    return false;
  }
}

module.exports = async function adminVisitorStats(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  if (!requireAdmin(req, res)) return;

  try {
    const result = await pool.query(`
      select
        (select count(*) from site_visitors) as total_visitors,
        (select count(*) from site_visits) as total_visits,
        (select count(*) from site_visitors where first_seen_at >= current_date) as new_visitors_today,
        (select count(*) from site_visitors where last_seen_at >= current_date) as visitors_today
    `);
    const row = result.rows[0] || {};
    return res.status(200).json({
      totalVisitors: Number(row.total_visitors || 0),
      totalVisits: Number(row.total_visits || 0),
      newVisitorsToday: Number(row.new_visitors_today || 0),
      visitorsToday: Number(row.visitors_today || 0),
    });
  } catch (error) {
    console.error('[analytics] stats failed:', error);
    return res.status(500).json({ error: 'تعذر تحميل إحصائيات الزوار حاليًا.' });
  }
};
