const { Pool } = require('pg');
const jwt = require('jsonwebtoken');

// Keep admin category auth compatible with the passwordless admin token issued by api/index.js.
if (!process.env.SESSION_SECRET) process.env.SESSION_SECRET = 'safa-passwordless-admin-session';

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false });

function auth(req, res) {
  try {
    const token = (req.headers.authorization || '').replace(/^Bearer\s+/, '');
    if (!token) throw new Error();
    jwt.verify(token, process.env.SESSION_SECRET);
    return true;
  } catch {
    res.status(401).json({ error: 'Authentication required' });
    return false;
  }
}

const slugify = value => String(value || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `category-${Date.now()}`;
const clean = value => String(value ?? '').trim();

module.exports = async (req, res) => {
  if (!auth(req, res)) return;
  const method = req.method.toUpperCase();
  try {
    if (method === 'GET') {
      const rows = (await pool.query('select * from categories order by position,name_en')).rows;
      return res.json(rows);
    }
    if (method === 'POST') {
      const body = req.body || {};
      const nameEn = clean(body.nameEn);
      const nameAr = clean(body.nameAr) || nameEn;
      if (nameEn.length < 2) return res.status(400).json({ error: 'English category name is required' });
      const base = slugify(body.slug || nameEn);
      let slug = base;
      for (let i = 2; (await pool.query('select 1 from categories where slug=$1', [slug])).rows[0]; i++) slug = `${base}-${i}`;
      const row = (await pool.query('insert into categories(name_en,name_ar,slug,description_en,description_ar,image_url,position,active) values($1,$2,$3,$4,$5,$6,$7,$8) returning *', [nameEn,nameAr,slug,clean(body.descriptionEn),clean(body.descriptionAr),clean(body.imageUrl) || null,Number(body.position || 0),body.active !== false])).rows[0];
      return res.status(201).json(row);
    }
    if (method === 'PATCH') {
      const body = req.body || {};
      if (!body.id) return res.status(400).json({ error: 'Category id is required' });
      const fields = [], values = [];
      const map = { nameEn:'name_en', nameAr:'name_ar', slug:'slug', descriptionEn:'description_en', descriptionAr:'description_ar', imageUrl:'image_url', position:'position', active:'active' };
      for (const [key, column] of Object.entries(map)) {
        if (!(key in body)) continue;
        fields.push(`${column}=$${values.length + 1}`);
        let value = body[key];
        if (key === 'nameEn' || key === 'nameAr') value = clean(value);
        if (key === 'position') value = Number(value || 0);
        if (key === 'imageUrl') value = clean(value) || null;
        if (key === 'slug') value = slugify(value);
        values.push(value);
      }
      if (!fields.length) return res.status(400).json({ error: 'No changes' });
      values.push(body.id);
      const row = (await pool.query(`update categories set ${fields.join(',')},updated_at=now() where id=$${values.length} returning *`, values)).rows[0];
      if (!row) return res.status(404).json({ error: 'Category not found' });
      return res.json(row);
    }
    if (method === 'DELETE') {
      const id = bodyId(req);
      if (!id) return res.status(400).json({ error: 'Category id is required' });
      await pool.query('delete from categories where id=$1', [id]);
      return res.status(204).end();
    }
    res.setHeader('Allow', 'GET,POST,PATCH,DELETE');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('SAFA category API error:', error?.message || error);
    return res.status(400).json({ error: error?.code === '23505' ? 'Category slug already exists' : (error?.message || 'Category operation failed') });
  }
};

function bodyId(req) {
  return req.body?.id || req.query?.id;
}
