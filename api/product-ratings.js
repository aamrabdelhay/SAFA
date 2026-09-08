const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 5,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 10000,
});

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { rows } = await pool.query(`
      WITH purchases AS (
        SELECT
          oi.product_id,
          COUNT(DISTINCT regexp_replace(o.phone1, '\\D', '', 'g'))::int AS purchase_count
        FROM order_items oi
        INNER JOIN orders o ON o.id = oi.order_id
        WHERE oi.product_id IS NOT NULL
          AND o.status <> 'cancelled'
          AND regexp_replace(o.phone1, '\\D', '', 'g') <> ''
        GROUP BY oi.product_id
      )
      SELECT
        p.id,
        p.name_en,
        COALESCE(pu.purchase_count, 0)::int AS purchase_count,
        CASE
          WHEN COALESCE(pu.purchase_count, 0) = 0 THEN 0
          WHEN pu.purchase_count = 1 THEN 3.0
          WHEN pu.purchase_count BETWEEN 2 AND 4 THEN 3.5
          WHEN pu.purchase_count BETWEEN 5 AND 9 THEN 4.0
          WHEN pu.purchase_count BETWEEN 10 AND 19 THEN 4.5
          ELSE 5.0
        END::numeric(2,1) AS purchase_rating
      FROM products p
      LEFT JOIN purchases pu ON pu.product_id = p.id
      WHERE p.active = true
      ORDER BY p.created_at DESC
    `);

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json(rows);
  } catch (error) {
    console.error('Product ratings error:', error);
    return res.status(500).json({ error: 'Product ratings unavailable' });
  }
};
