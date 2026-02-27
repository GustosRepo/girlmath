// ══════════════════════════════════════════════════════════
// Per-user daily rate limiter (in-memory)
// Key = deviceId, Value = { count, resetDate }
// ══════════════════════════════════════════════════════════

const limits = new Map(); // deviceId -> { count: number, date: string }

const MAX_PER_DAY = parseInt(process.env.MAX_CHECKS_PER_USER_PER_DAY || '3', 10);

function today() {
  // Use UTC on the server (Railway runs UTC) — consistent for all users
  return new Date().toISOString().slice(0, 10); // "2026-02-25"
}

/**
 * Check if the device is allowed another price check today.
 * Returns { allowed: boolean, remaining: number }
 */
function checkRate(deviceId) {
  const d = today();
  const entry = limits.get(deviceId);

  if (!entry || entry.date !== d) {
    // New day or new user — reset
    limits.set(deviceId, { count: 1, date: d });
    return { allowed: true, remaining: MAX_PER_DAY - 1 };
  }

  if (entry.count >= MAX_PER_DAY) {
    return { allowed: false, remaining: 0 };
  }

  entry.count += 1;
  limits.set(deviceId, entry);
  return { allowed: true, remaining: MAX_PER_DAY - entry.count };
}

// Clean up old entries every hour to prevent memory leak
setInterval(() => {
  const d = today();
  for (const [key, val] of limits) {
    if (val.date !== d) limits.delete(key);
  }
}, 60 * 60 * 1000);

module.exports = { checkRate };
