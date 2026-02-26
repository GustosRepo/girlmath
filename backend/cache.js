// ══════════════════════════════════════════════════════════
// Simple in-memory URL cache
// Same product URL → same result for CACHE_TTL_HOURS
// ══════════════════════════════════════════════════════════

const CACHE_TTL_MS =
  (parseInt(process.env.CACHE_TTL_HOURS || '12', 10)) * 60 * 60 * 1000;

const cache = new Map(); // url -> { result, expiresAt }

function get(url) {
  const entry = cache.get(url);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(url);
    return null;
  }
  return entry.result;
}

function set(url, result) {
  cache.set(url, { result, expiresAt: Date.now() + CACHE_TTL_MS });
}

// Prune expired entries every 30 min
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of cache) {
    if (now > val.expiresAt) cache.delete(key);
  }
}, 30 * 60 * 1000);

module.exports = { get, set };
