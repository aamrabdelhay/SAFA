const { serveBlob } = require('../server/blob-proxy');

// Serves private Vercel Blob objects at /api/blob?path=... and /api/blob/<pathname>.
module.exports = (req, res) => serveBlob(req, res);
