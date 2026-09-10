const { Pool } = require('pg');
const jwt = require('jsonwebtoken');

if (!process.env.SESSION_SECRET) throw new Error('SESSION_SECRET is required');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 5,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 10000,
});

function readCookie(req, name) {
  const raw = req.headers.cookie || '';
  for (const part of raw.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return decodeURIComponent(rest.join('='));
  }
  return '';
}
function auth(req, res) {
  try {
    const bearer = (req.headers.authorization || '').replace(/^Bearer\s+/, '');
    const token = bearer || readCookie(req, 'safa_admin_session');
    if (!token) throw Error();
    jwt.verify(token, process.env.SESSION_SECRET);
    return true;
  } catch {
    res.status(401).json({ error: 'Authentication required' });
    return false;
  }
}

const itemsSql = `coalesce((select json_agg(json_build_object(
  'id',oi.id,'productId',oi.product_id,'name',oi.product_name_snapshot,
  'quantity',oi.quantity,'unitPrice',oi.price_snapshot,'discount',oi.discount_snapshot,
  'total',oi.total,'specification',oi.selected_specification,
  'image',coalesce((select pi.url from product_images pi where pi.product_id=oi.product_id order by pi.position,pi.id limit 1),'')
)) from order_items oi where oi.order_id=o.id),'[]'::json) items`;

module.exports = async (req, res) => {
  if (!auth(req, res)) return;
  const method = (req.method || 'GET').toUpperCase();
  try {
    await pool.query('alter table orders add column if not exists archived_at timestamptz');
    if (method === 'GET') {
      const rows = (await pool.query(`select o.*,${itemsSql} from orders o where o.archived_at is null order by o.created_at desc`)).rows;
      return res.json(rows);
    }
    if (method === 'PATCH') {
      const status = String(req.body?.status || '');
      if (!['new','confirmed','preparing','shipped','delivered','cancelled'].includes(status)) {
        return res.status(400).json({ error: 'Invalid order update' });
      }
      const row = (await pool.query(
        `update orders set status=$1,archived_at=case when $1 in ('delivered','cancelled') then now() else null end,updated_at=now() where id=$2 returning *`,
        [status, req.query?.id || req.url.split('/').pop()]
      )).rows[0];
      if (!row) return res.status(404).json({ error: 'Order not found' });
      return res.json(row);
    }
    res.setHeader('Allow', 'GET,PATCH');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('SAFA admin orders error:', error?.message || error);
    return res.status(400).json({ error: error?.message || 'Orders operation failed' });
  }
};
