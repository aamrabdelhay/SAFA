require('../server/pg-json-safety');
const blob = require('@vercel/blob');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');

if (!process.env.SESSION_SECRET) throw new Error('SESSION_SECRET is required');

const blobConnected = Boolean(process.env.BLOB_STORE_ID || process.env.BLOB_READ_WRITE_TOKEN);
if (process.env.BLOB_STORE_ID && !process.env.BLOB_READ_WRITE_TOKEN) process.env.BLOB_READ_WRITE_TOKEN = 'oidc-managed';

const realPut = blob.put;
blob.put = (pathname, body, options = {}) => realPut(pathname, body, {
  access: 'public',
  ...options,
  token: undefined,
  oidcToken: process.env.VERCEL_OIDC_TOKEN,
  storeId: process.env.BLOB_STORE_ID,
});

const { serveBlob } = require('../server/blob-proxy');
const app = require('../server/index.js');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 5,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 10000,
});

function readCookie(req,name){const raw=req.headers.cookie||'';for(const part of raw.split(';')){const [k,...rest]=part.trim().split('=');if(k===name)return decodeURIComponent(rest.join('='));}return ''}
function adminAuth(req,res){try{const bearer=(req.headers.authorization||'').replace(/^Bearer\s+/,'');const token=bearer||readCookie(req,'safa_admin_session');if(!token)throw Error();jwt.verify(token,process.env.SESSION_SECRET);return true}catch{res.status(401).json({error:'Authentication required'});return false}}
async function ensureOrderArchive(){
  await pool.query('alter table orders add column if not exists archived_at timestamptz');
  await pool.query("update orders set archived_at=now(),updated_at=now() where archived_at is null and status in ('delivered','cancelled')");
}
function readJson(req){return new Promise((resolve,reject)=>{let raw='';req.on('data',chunk=>{raw+=chunk.toString()});req.on('end',()=>{try{resolve(raw?JSON.parse(raw):{})}catch{reject(Error('Invalid JSON'))}});req.on('error',reject)})}
const orderItemsJson=`coalesce((select json_agg(json_build_object('id',oi.id,'productId',oi.product_id,'name',oi.product_name_snapshot,'quantity',oi.quantity,'unitPrice',oi.price_snapshot,'discount',oi.discount_snapshot,'total',oi.total,'specification',oi.selected_specification,'image',coalesce((select pi.url from product_images pi where pi.product_id=oi.product_id order by pi.position,pi.id limit 1),''))) from order_items oi where oi.order_id=o.id),'[]'::json)`;

module.exports = async (req, res) => {
  const pathname = (req.url || '').split('?')[0];

  if (pathname === '/api/blob' || pathname.startsWith('/api/blob/')) {
    if (!blobConnected) return res.status(503).json({ error: 'Vercel Blob is not connected' });
    return serveBlob(req, res);
  }

  if (pathname === '/api/admin/orders' || /^\/api\/admin\/orders\/[^/]+$/.test(pathname) || pathname === '/api/admin/stats') {
    if (!adminAuth(req,res)) return;
    try {
      await ensureOrderArchive();
      if (pathname === '/api/admin/stats' && (req.method||'GET').toUpperCase()==='GET') {
        const row=(await pool.query("select (select count(*) from orders where archived_at is null) orders,(select count(*) from products where active) products,(select count(*) from categories where active) categories,(select count(*) from offers where active and (start_date is null or start_date<=now()) and (end_date is null or end_date>=now())) offers,(select coalesce(sum(total),0) from orders where status<>'cancelled') revenue")).rows[0];
        return res.json(row);
      }
      if (pathname === '/api/admin/orders' && (req.method||'GET').toUpperCase()==='GET') {
        const rows=(await pool.query(`select o.*,${orderItemsJson} items from orders o where o.archived_at is null order by o.created_at desc`)).rows;
        return res.json(rows);
      }
      if ((req.method||'GET').toUpperCase()==='PATCH') {
        const body=await readJson(req); const status=String(body.status||'');
        if(!['new','confirmed','preparing','shipped','delivered','cancelled'].includes(status))return res.status(400).json({error:'Invalid order update'});
        const id=pathname.split('/').pop();
        const row=(await pool.query(`update orders set status=$1,archived_at=case when $1 in ('delivered','cancelled') then now() else null end,updated_at=now() where id=$2 returning *`,[status,id])).rows[0];
        if(!row)return res.status(404).json({error:'Order not found'});
        return res.json(row);
      }
      res.setHeader('Allow','GET,PATCH'); return res.status(405).json({error:'Method not allowed'});
    } catch(error) {
      console.error('SAFA archive-aware order API error:',error?.message||error);
      return res.status(400).json({error:error?.message||'Order operation failed'});
    }
  }

  return app(req, res);
};
