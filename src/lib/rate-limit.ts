// Simple in-memory rate limiter.
// Note: with PM2 cluster mode each worker has its own store, so the effective
// limit is (limit x workers) in the worst case. That is acceptable for
// brute-force protection on auth endpoints and requires no external services.
interface Window { count: number; resetAt: number }
const store = new Map<string, Window>();

// Periodic cleanup of expired windows
const CLEANUP_INTERVAL = 5 * 60 * 1000;
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of store) if (now > v.resetAt) store.delete(k);
}, CLEANUP_INTERVAL).unref?.();

/** Returns true if the request should be ALLOWED. */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = store.get(key);
  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= limit) return false;
  entry.count++;
  return true;
}

/**
 * Async wrapper kept for backwards compatibility with existing callers
 * (register / forgot-password / reset-password routes).
 */
export async function rateLimitAsync(
  key: string,
  limit: number,
  windowMs: number,
): Promise<boolean> {
  return rateLimit(key, limit, windowMs);
}
