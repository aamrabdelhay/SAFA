const { get } = require('@vercel/blob');

module.exports = async (req, res) => {
  try {
    const queryPath = req.query?.path;
    const raw = queryPath || req.url.split('/api/blob/')[1]?.split('?')[0] || '';
    const pathname = decodeURIComponent(String(raw));
    if (!pathname) return res.status(400).json({ error: 'Blob pathname is required' });
    const result = await get(pathname, {
      access: 'private',
      token: process.env.BLOB_READ_WRITE_TOKEN || undefined,
      oidcToken: process.env.VERCEL_OIDC_TOKEN,
      storeId: process.env.BLOB_STORE_ID,
    });
    res.statusCode = 200;
    res.setHeader('Content-Type', result.blob.contentType || 'application/octet-stream');
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800');
    result.stream.pipe(res);
  } catch (error) {
    console.error('SAFA blob proxy error:', error?.message || error);
    res.status(404).json({ error: 'Blob object not found' });
  }
};
