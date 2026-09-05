const blob = require('@vercel/blob');

// The SAFA Blob store is connected as a private store. New Vercel projects use
// short-lived OIDC credentials instead of BLOB_READ_WRITE_TOKEN.
const blobConnected = Boolean(process.env.BLOB_STORE_ID || process.env.BLOB_READ_WRITE_TOKEN);
if (process.env.BLOB_STORE_ID && !process.env.BLOB_READ_WRITE_TOKEN) {
  // The existing server has a legacy configuration guard that expects this
  // variable. Do not use this value for Blob authentication; the put wrapper
  // below explicitly uses Vercel OIDC.
  process.env.BLOB_READ_WRITE_TOKEN = 'oidc-managed';
}

const realPut = blob.put;
blob.put = (pathname, body, options = {}) => realPut(pathname, body, {
  ...options,
  access: 'private',
  token: undefined,
  oidcToken: process.env.VERCEL_OIDC_TOKEN,
  storeId: process.env.BLOB_STORE_ID,
});

const { get } = blob;
const app = require('../server/index.js');
// Vercel forwards the client IP through X-Forwarded-For/Forwarded.
// Trust the single Vercel proxy hop so express-rate-limit can identify clients correctly.
app.set('trust proxy', 1);

function privateBlobProxyUrl(value) {
  if (typeof value !== 'string') return value;
  try {
    const url = new URL(value);
    if (!url.hostname.endsWith('.private.blob.vercel-storage.com')) return value;
    return `/api/blob/${encodeURIComponent(url.pathname.replace(/^\//, ''))}`;
  } catch {
    return value;
  }
}

function mapPrivateBlobUrls(value) {
  if (typeof value === 'string') return privateBlobProxyUrl(value);
  if (Array.isArray(value)) return value.map(mapPrivateBlobUrls);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, mapPrivateBlobUrls(item)]));
  }
  return value;
}

module.exports = async (req, res) => {
  if (req.url.startsWith('/api/blob/')) {
    if (!blobConnected) return res.status(503).json({ error: 'Vercel Blob is not connected' });
    try {
      const pathname = decodeURIComponent(req.url.split('/api/blob/')[1].split('?')[0]);
      const result = await get(pathname, { access: 'private' });
      res.statusCode = 200;
      res.setHeader('Content-Type', result.blob.contentType || 'application/octet-stream');
      res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800');
      result.stream.pipe(res);
      return;
    } catch (error) {
      return res.status(404).json({ error: 'Blob object not found' });
    }
  }

  const originalJson = res.json.bind(res);
  res.json = (body) => originalJson(mapPrivateBlobUrls(body));
  return app(req, res);
};
