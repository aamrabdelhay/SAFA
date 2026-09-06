const blob = require('@vercel/blob');

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

module.exports = async (req, res) => {
  const pathname = req.url.split('?')[0];

  if (pathname === '/api/blob' || pathname.startsWith('/api/blob/')) {
    if (!blobConnected) return res.status(503).json({ error: 'Vercel Blob is not connected' });
    return serveBlob(req, res);
  }

  return app(req, res);
};
