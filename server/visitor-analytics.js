const crypto = require('crypto');

function hashVisitorId(visitorId) {
  return crypto.createHash('sha256').update(String(visitorId)).digest('hex');
}

function getCookie(req, name) {
  const cookieHeader = String(req.headers?.cookie || '');
  for (const part of cookieHeader.split(';')) {
    const [key, ...value] = part.trim().split('=');
    if (key === name) return decodeURIComponent(value.join('='));
  }
  return '';
}

function getOrCreateVisitorId(req, res) {
  const existing = getCookie(req, 'safa_visitor_id');
  if (existing) return { id: existing, isNew: false };
  const id = crypto.randomUUID();
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `safa_visitor_id=${encodeURIComponent(id)}; Path=/; Max-Age=31536000; SameSite=Lax${secure}`);
  return { id, isNew: true };
}

module.exports = { getOrCreateVisitorId, hashVisitorId };
