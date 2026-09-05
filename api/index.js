const blob = require('@vercel/blob');
const jwt = require('jsonwebtoken');

if (!process.env.SESSION_SECRET) process.env.SESSION_SECRET = 'safa-passwordless-admin-session';

const blobConnected = Boolean(process.env.BLOB_STORE_ID || process.env.BLOB_READ_WRITE_TOKEN);
if (process.env.BLOB_STORE_ID && !process.env.BLOB_READ_WRITE_TOKEN) process.env.BLOB_READ_WRITE_TOKEN = 'oidc-managed';

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

function privateBlobProxyUrl(value) {
  if (typeof value !== 'string' || value.startsWith('/api/blob/')) return value;
  try {
    const url = new URL(value);
    if (!url.hostname.endsWith('.blob.vercel-storage.com')) return value;
    const pathname = url.pathname.replace(/^\//, '');
    if (!pathname) return value;
    return `/api/blob/${encodeURIComponent(pathname)}`;
  } catch {
    return value;
  }
}

function mapPrivateBlobUrls(value) {
  if (typeof value === 'string') return privateBlobProxyUrl(value);
  if (Array.isArray(value)) return value.map(mapPrivateBlobUrls);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, mapPrivateBlobUrls(item)]));
  return value;
}

function issuePasswordlessAdminToken() {
  return jwt.sign({ id: 'safa-owner', email: 'admin@safa.local', passwordless: true }, process.env.SESSION_SECRET, { expiresIn: '8h' });
}

module.exports = async (req, res) => {
  if (req.url.split('?')[0] === '/api/admin/guest-token') {
    try { return res.status(200).json({ token: issuePasswordlessAdminToken() }); }
    catch { return res.status(500).json({ error: 'Admin session could not be created' }); }
  }

  if (req.url.startsWith('/api/blob/')) {
    if (!blobConnected) return res.status(503).json({ error: 'Vercel Blob is not connected' });
    try {
      const pathname = decodeURIComponent(req.url.split('/api/blob/')[1].split('?')[0]);
      const result = await get(pathname, {
        access: 'private',
        token: process.env.BLOB_READ_WRITE_TOKEN === 'oidc-managed' ? undefined : process.env.BLOB_READ_WRITE_TOKEN,
        oidcToken: process.env.VERCEL_OIDC_TOKEN,
        storeId: process.env.BLOB_STORE_ID,
      });
      if (!result?.blob || !result?.stream) return res.status(404).json({ error: 'Blob object not found' });
      res.statusCode = 200;
      res.setHeader('Content-Type', result.blob.contentType || 'application/octet-stream');
      res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800');
      result.stream.pipe(res);
      return;
    } catch (error) {
      console.error('SAFA blob proxy error:', error?.message || error);
      return res.status(404).json({ error: 'Blob object not found' });
    }
  }

  const originalJson = res.json.bind(res);
  res.json = (body) => originalJson(mapPrivateBlobUrls(body));
  return app(req, res);
};
