const pg = require('pg');

function normalizeJsonValue(value) {
  if (value === undefined || value === null || value === '') return '[]';
  if (typeof value === 'string') {
    try { JSON.parse(value); return value; } catch { throw new TypeError('Invalid JSON value for specifications'); }
  }
  if (Array.isArray(value) || (value && typeof value === 'object')) return JSON.stringify(value);
  throw new TypeError('Invalid JSON value for specifications');
}

function patchQuery(proto) {
  const original = proto.query;
  if (original.__safaJsonSafe) return;
  function wrapped(config, values, callback) {
    let text = typeof config === 'string' ? config : config?.text;
    let currentValues = typeof config === 'string' ? values : config?.values;
    if (typeof text === 'string' && Array.isArray(currentValues) && /\bspecifications\b/i.test(text)) {
      const indexes = new Set();
      for (const match of text.matchAll(/specifications\s*=\s*\$(\d+)/gi)) indexes.add(Number(match[1]) - 1);
      if (/insert\s+into\s+products\s*\([^)]*\bspecifications\b/i.test(text)) {
        const cols = text.match(/insert\s+into\s+products\s*\(([^)]*)\)/i)?.[1]?.split(',').map(s => s.trim().toLowerCase()) || [];
        const idx = cols.indexOf('specifications');
        if (idx >= 0) indexes.add(idx);
      }
      if (indexes.size) {
        currentValues = currentValues.slice();
        for (const idx of indexes) currentValues[idx] = normalizeJsonValue(currentValues[idx]);
        if (typeof config === 'string') values = currentValues;
        else config = { ...config, values: currentValues };
      }
    }
    return original.call(this, config, values, callback);
  }
  wrapped.__safaJsonSafe = true;
  proto.query = wrapped;
}

patchQuery(pg.Client.prototype);
patchQuery(pg.Pool.prototype);
