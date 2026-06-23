const NodeCache = require("node-cache");

// Stores { nonce, message } per wallet — 5-minute TTL
const nonceCache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

// Rate-limit counter per wallet — 60-second TTL
const rateLimitCache = new NodeCache({ stdTTL: 60, checkperiod: 30 });

function storeNonce(wallet, nonce, message) {
  nonceCache.set(wallet, { nonce, message });
}

// Returns the stored message string on success, null on failure.
// Deletes the entry on first valid use (single-use nonce).
function consumeNonce(wallet, nonce) {
  const stored = nonceCache.get(wallet);
  if (!stored || stored.nonce !== nonce) return null;
  nonceCache.del(wallet);
  return stored.message;
}

// Returns true if the request is within limits, false if rate-limited.
function checkRateLimit(wallet, maxPerMinute = 10) {
  const key = `rl:${wallet}`;
  const existing = rateLimitCache.get(key);
  if (existing >= maxPerMinute) return false;
  // Preserve remaining TTL when incrementing
  const ttlMs = rateLimitCache.getTtl(key);
  const remainingSecs = ttlMs ? Math.max(1, Math.ceil((ttlMs - Date.now()) / 1000)) : 60;
  rateLimitCache.set(key, (existing || 0) + 1, remainingSecs);
  return true;
}

module.exports = { nonceCache, storeNonce, consumeNonce, checkRateLimit };
