// Shared helpers for serving private Vercel Blob objects through /api/blob.
// Used by the Vercel function (api/blob.js), the Vercel app wrapper
// (api/index.js) and the standalone Express server (server/index.js) so that
// uploaded images keep working in every environment.
const { Readable } = require('stream');
const { get } = require('@vercel/blob');

const BUILD_TAG = 'blob-proxy-diag-4';
// TEMPORARY diagnostics: last blob-proxy errors (sanitized), for finding out
// why reads fail in the Vercel deployment. Remove once resolved.
const lastBlobErrors = [];
function redact(message) {
  return String(message || '')
    .replace(/vercel[_-]?blob[_-][A-Za-z0-9_-]{6,}/gi, '[redacted-token]')
    .replace(/Bearer\s+[A-Za-z0-9._-]{12,}/gi, 'Bearer [redacted]')
    .replace(/[A-Za-z0-9._-]{40,}/g, m => (m.includes('.') ? m.slice(0, 12) + '…' : '[redacted]'))
    .slice(0, 600);
}
function recordBlobError(stage, error) {
  lastBlobErrors.push({ at: new Date().toISOString(), stage, message: redact(error && error.message ? error.message : error) });
  if (lastBlobErrors.length > 25) lastBlobErrors.shift();
}
function recordBlobSuccess(info) {
  lastBlobErrors.push({ at: new Date().toISOString(), stage: 'ok', ...info });
  if (lastBlobErrors.length > 25) lastBlobErrors.shift();
}
function blobDebugInfo() {
  return {
    build: BUILD_TAG,
    node: process.version,
    env: {
      rwToken: Boolean(process.env.BLOB_READ_WRITE_TOKEN && process.env.BLOB_READ_WRITE_TOKEN !== 'oidc-managed'),
      oidcToken: Boolean(process.env.VERCEL_OIDC_TOKEN),
      storeId: Boolean(process.env.BLOB_STORE_ID),
      vercelEnv: process.env.VERCEL_ENV || null,
    },
    recent: lastBlobErrors,
  };
}

const FALLBACK_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="900" height="900"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f6f0e4"/><stop offset="1" stop-color="#d8c08a"/></linearGradient></defs><rect width="900" height="900" fill="url(#g)"/><circle cx="450" cy="430" r="155" fill="#fffdf8" opacity=".82"/><path d="M390 500h120l-18 150H408z" fill="#b8860b" opacity=".9"/><rect x="405" y="455" width="90" height="45" rx="8" fill="#211f1b"/><text x="450" y="425" text-anchor="middle" fill="#211f1b" font-family="Georgia,serif" font-size="64" letter-spacing="10">SAFA</text><text x="450" y="715" text-anchor="middle" fill="#211f1b" opacity=".65" font-family="Arial,sans-serif" font-size="18" letter-spacing="5">BEAUTY, REFINED.</text></svg>';

function fallbackImage(res) {
  try {
    if (res.writableEnded || res.destroyed) return;
    if (!res.headersSent) {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=3600');
    }
    res.end(FALLBACK_SVG);
  } catch {
    try { res.end(); } catch {}
  }
}

// Accepts ?path=..., ?path[]=a&path[]=b (wildcard rewrites) or /api/blob/<pathname>.
function extractPathname(req) {
  const queryPath = req.query ? req.query.path : undefined;
  let raw = '';
  if (Array.isArray(queryPath)) raw = queryPath.filter(Boolean).join('/');
  else if (typeof queryPath === 'string' && queryPath) raw = queryPath;
  else {
    const url = String(req.originalUrl || req.url || '');
    raw = (url.split('/api/blob/')[1] || '').split('?')[0] || '';
  }
  let pathname = String(raw);
  try { pathname = decodeURIComponent(pathname); } catch {}
  return pathname.replace(/^\/+/, '').trim();
}

function blobCredentials() {
  const token = process.env.BLOB_READ_WRITE_TOKEN && process.env.BLOB_READ_WRITE_TOKEN !== 'oidc-managed'
    ? process.env.BLOB_READ_WRITE_TOKEN
    : undefined;
  return {
    access: 'private',
    token,
    oidcToken: process.env.VERCEL_OIDC_TOKEN || undefined,
    storeId: process.env.BLOB_STORE_ID || undefined,
  };
}

async function webStreamToBuffer(stream) {
  if (typeof Readable.fromWeb === 'function') return null; // not needed
  const reader = stream.getReader();
  const chunks = [];
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks);
}

async function serveBlob(req, res) {
  try {
    const pathname = extractPathname(req);
    if (!pathname) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      return res.end(JSON.stringify({ error: 'Blob pathname is required', build: BUILD_TAG }));
    }

    // TEMPORARY diagnostics: probe known blobs + list store contents, and
    // report why reads succeed or fail in this exact function instance.
    // Remove once resolved.
    if (pathname === '__safa_diag__') {
      const creds = blobCredentials();
      const probes = [
        'safa/products/c9b21ae7-f762-435a-938c-fc8341607f85/1788635234597-1002236293.webp',
        'safa/products/7569dbb0-d5f3-4e86-a922-7cad96148080/1788632321814-Screenshot-2026-09-05-142434.png',
        'safa/products/39c8b5a0-1758-4b5f-bfd1-55a9079a1fd0/1788624684967-Screenshot-2026-09-05-142434.png',
        'safa/products/39c8b5a0-1758-4b5f-bfd1-55a9079a1fd0/1788626890297-Screenshot-2026-07-10-194503.png',
      ];
      const results = [];
      for (const p of probes) {
        try {
          const r = await get(p, creds);
          results.push({ p: p.slice(-40), found: Boolean(r && r.blob) });
          try { if (r && r.stream) { if (typeof r.stream.cancel === 'function') await r.stream.cancel(); else if (typeof r.stream.destroy === 'function') r.stream.destroy(); } } catch {}
        } catch (error) {
          results.push({ p: p.slice(-40), error: redact(error && error.message) });
          recordBlobError('probe', error);
        }
      }
      let listing = null;
      try {
        const { list } = require('@vercel/blob');
        const l = await list({ prefix: 'safa', limit: 100, token: creds.token, oidcToken: creds.oidcToken, storeId: creds.storeId });
        listing = { count: l.blobs.length, items: l.blobs.slice(0, 30).map(b => ({ pathname: b.pathname, size: b.size, uploadedAt: b.uploadedAt })) };
      } catch (error) {
        listing = { error: redact(error && error.message) };
        recordBlobError('list', error);
      }
      let writeTest = null;
      try {
        const { put } = require('@vercel/blob');
        const testPath = `safa/__diag_test/${Date.now()}.txt`;
        const w = await put(testPath, Buffer.from('safa-diag'), { access: 'private', contentType: 'text/plain', token: creds.token, oidcToken: creds.oidcToken, storeId: creds.storeId, addRandomSuffix: false });
        let readBack = null;
        try {
          const r = await get(testPath, creds);
          readBack = Boolean(r && r.blob);
          try { if (r && r.stream && typeof r.stream.cancel === 'function') await r.stream.cancel(); } catch {}
        } catch (error) {
          readBack = redact(error && error.message);
        }
        writeTest = { putPathname: w.pathname, putHost: (w.url || '').split('/')[2] || null, readBack };
        try { const { del } = require('@vercel/blob'); await del(testPath, { token: creds.token, oidcToken: creds.oidcToken, storeId: creds.storeId }); } catch {}
      } catch (error) {
        writeTest = { error: redact(error && error.message) };
        recordBlobError('write-test', error);
      }
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      return res.end(JSON.stringify({ ...blobDebugInfo(), probes: results, listing, writeTest }));
    }

    let result = null;
    try {
      result = await get(pathname, blobCredentials());
    } catch (error) {
      console.error('SAFA blob proxy get() error:', (error && error.message) || error);
      recordBlobError('get', error);
      return fallbackImage(res);
    }
    if (!result || !result.blob || !result.stream) { recordBlobError('empty-result', new Error(result ? 'result missing blob/stream' : 'get() returned null (blob not found)')); return fallbackImage(res); }

    res.statusCode = 200;
    res.setHeader('Content-Type', result.blob.contentType || 'application/octet-stream');
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800');

    // Node readable stream: pipe directly.
    if (typeof result.stream.pipe === 'function') {
      result.stream.on('error', (error) => {
        console.error('SAFA blob stream error:', (error && error.message) || error);
        recordBlobError('node-stream', error);
        try { res.end(); } catch {}
      });
      result.stream.on('end', () => recordBlobSuccess({ via: 'node-stream', type: result.blob.contentType }));
      result.stream.pipe(res);
      return;
    }

    // @vercel/blob >= 2.3 returns a Web ReadableStream (undici) which has no
    // .pipe() — convert it before piping. This was the cause of broken images.
    if (typeof Readable.fromWeb === 'function') {
      const nodeStream = Readable.fromWeb(result.stream);
      nodeStream.on('error', (error) => {
        console.error('SAFA blob stream error:', (error && error.message) || error);
        recordBlobError('web-stream', error);
        try { if (!res.headersSent) fallbackImage(res); else res.end(); } catch {}
      });
      nodeStream.on('end', () => recordBlobSuccess({ via: 'web-stream', type: result.blob.contentType }));
      nodeStream.pipe(res);
      return;
    }

    const buffer = await webStreamToBuffer(result.stream);
    recordBlobSuccess({ via: 'buffered', type: result.blob.contentType });
    res.end(buffer);
  } catch (error) {
    console.error('SAFA blob proxy error:', (error && error.message) || error);
    recordBlobError('outer', error);
    fallbackImage(res);
  }
}

// Turn a private Vercel Blob URL into a same-origin proxy URL. Public blob
// URLs and already-proxied values are returned untouched.
function privateBlobProxyUrl(value) {
  if (typeof value !== 'string' || !value) return value;
  if (value.startsWith('/api/blob/') || value.startsWith('/api/blob?')) return value;
  try {
    const url = new URL(value);
    if (!/\.blob\.vercel-storage\.com$/i.test(url.hostname)) return value;
    if (!/\.private\.blob\.vercel-storage\.com$/i.test(url.hostname)) return value;
    const pathname = decodeURIComponent(url.pathname.replace(/^\/+/, ''));
    if (!pathname) return value;
    return `/api/blob/${encodeURIComponent(pathname)}`;
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

// Stable, displayable URL to persist in the database for a freshly uploaded blob.
const blobProxyUrlFor = (pathname) => `/api/blob/${encodeURIComponent(String(pathname || '').replace(/^\/+/, ''))}`;

module.exports = { serveBlob, fallbackImage, extractPathname, privateBlobProxyUrl, mapPrivateBlobUrls, blobProxyUrlFor, blobDebugInfo };
