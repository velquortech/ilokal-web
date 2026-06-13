// Lightweight in-memory fixed-window rate limiter.
//
// ⚠️ SCOPE / LIMITATION: state lives in a module-level Map, so the budget is
// per-runtime-instance. On a single self-hosted Node process this works well.
// On serverless/edge (e.g. Vercel) each isolate has its own Map and instances
// are short-lived, so the effective global limit is looser than configured —
// treat this as a *baseline flood guard*, not a precise quota. For a real
// distributed limit, swap the store for Upstash Redis / Vercel KV
// (`@upstash/ratelimit`) behind the same `rateLimit()` signature.
//
// Counting is keyed by caller identity (IP for public, user id for protected);
// callers build the key. Windows are fixed (not sliding) for cheapness.

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

// Bound memory: sweep expired buckets opportunistically when the map grows.
const MAX_BUCKETS = 50_000;

function sweep(now: number) {
  for (const [k, b] of buckets) {
    if (b.resetAt <= now) buckets.delete(k);
  }
}

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  /** Seconds until the window resets (for a Retry-After header). */
  retryAfterSec: number;
};

/**
 * Returns whether `key` is within `limit` requests per `windowMs`.
 * Increments the counter as a side effect when allowed.
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();

  if (buckets.size > MAX_BUCKETS) sweep(now);

  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, retryAfterSec: 0 };
  }

  if (existing.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSec: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }

  existing.count += 1;
  return {
    allowed: true,
    remaining: limit - existing.count,
    retryAfterSec: 0,
  };
}

/** Best-effort client IP from forwarding headers (first hop wins). */
export function clientIp(req: { headers: Headers }): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return req.headers.get('x-real-ip')?.trim() || 'unknown';
}
