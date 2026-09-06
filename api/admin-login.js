const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

if (!process.env.SESSION_SECRET) throw new Error('SESSION_SECRET is required');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 3,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 10000,
});

const setSessionCookie = (res, token) => {
  res.setHeader(
    'Set-Cookie',
    `safa_admin_session=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=28800${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`
  );
};

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

    let admin = (await pool.query('select * from admins where email=$1 limit 1', [email])).rows[0];
    const configuredPassword = process.env.ADMIN_PASSWORD;
    let valid = Boolean(admin && await bcrypt.compare(password, admin.password_hash));

    // Vercel ADMIN_PASSWORD is the authoritative configured access code.
    // When it matches, synchronize the database hash so changing the env value takes effect immediately.
    if (configuredPassword && password === configuredPassword) {
      const hash = await bcrypt.hash(configuredPassword, 12);
      if (admin) {
        admin = (await pool.query(
          'update admins set password_hash=$1 where id=$2 returning *',
          [hash, admin.id]
        )).rows[0];
      } else {
        admin = (await pool.query(
          'insert into admins(email,password_hash) values($1,$2) returning *',
          [email, hash]
        )).rows[0];
      }
      valid = true;
    }

    if (!valid || !admin) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: admin.id, email: admin.email }, process.env.SESSION_SECRET, { expiresIn: '8h' });
    setSessionCookie(res, token);
    return res.json({ ok: true });
  } catch (error) {
    console.error('SAFA admin login error:', error?.message || error);
    return res.status(500).json({ error: 'Login failed' });
  }
};
