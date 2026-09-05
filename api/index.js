const blob = require('@vercel/blob');
const jwt = require('jsonwebtoken');

if (!process.env.SESSION_SECRET) process.env.SESSION_SECRET = 'safa-passwordless-admin-session';

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

function issuePasswordlessAdminToken() {
  return jwt.sign({ id: 'safa-owner', email: 'admin@safa.local', passwordless: true }, process.env.SESSION_SECRET, { expiresIn: '8h' });
}

module.exports = async (req, res) => {
  const pathname = req.url.split('?')[0];

  if (pathname === '/api/admin/guest-token') {
    try { return res.status(200).json({ token: issuePasswordlessAdminToken() }); }
    catch { return res.status(500).json({ error: 'Admin session could not be created' }); }
  }

  // Private blob delivery (also reachable here when rewrites fall through).
  if (pathname === '/api/blob' || pathname.startsWith('/api/blob/')) {
    if (!blobConnected) return res.status(503).json({ error: 'Vercel Blob is not connected' });
    return serveBlob(req, res);
  }

  // Private blob URLs in JSON payloads are rewritten by the Express app itself.
  return app(req, res);
};
