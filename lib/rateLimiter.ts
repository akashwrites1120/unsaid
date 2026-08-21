/**
 * Rate limiter for anonymous, unauthenticated write endpoints.
 *
 * Fixed-window counter per identifier, with bounded memory: the store never
 * holds more than MAX_ENTRIES keys (oldest entries are evicted first), and
 * expired entries are pruned opportunistically.
 *
 * Deployment note: this is in-memory and therefore per server instance. For
 * multi-instance production deployments, back this with a shared store
 * (e.g. Upstash Redis) — the interface below is intentionally the only thing
 * routes depend on.
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const store = new Map<string, RateLimitEntry>();

/** Upper bound on tracked identifiers to prevent memory exhaustion. */
const MAX_ENTRIES = 10_000;

export interface RateLimitConfig {
  /** Time window in milliseconds. */
  windowMs: number;
  /** Maximum requests allowed per window. */
  maxRequests: number;
  /** Namespace so different endpoints don't share buckets. */
  keyPrefix?: string;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  total: number;
}

function pruneExpired(now: number): void {
  for (const [key, entry] of store) {
    if (entry.resetTime <= now) store.delete(key);
    else break; // Map preserves insertion order; older keys expire first
  }
}

/**
 * Check and consume one request slot for `identifier`.
 */
export function checkRateLimit(identifier: string, config: RateLimitConfig): RateLimitResult {
  const key = `${config.keyPrefix ?? 'ratelimit'}:${identifier}`;
  const now = Date.now();

  // Opportunistic cleanup + hard bound on memory usage.
  if (store.size > MAX_ENTRIES / 2) pruneExpired(now);
  if (!store.has(key) && store.size >= MAX_ENTRIES) {
    const oldest = store.keys().next().value;
    if (oldest !== undefined) store.delete(oldest);
  }

  const entry = store.get(key);

  if (!entry || entry.resetTime <= now) {
    const resetTime = now + config.windowMs;
    store.set(key, { count: 1, resetTime });
    return { allowed: true, remaining: config.maxRequests - 1, resetTime, total: config.maxRequests };
  }

  if (entry.count >= config.maxRequests) {
    return { allowed: false, remaining: 0, resetTime: entry.resetTime, total: config.maxRequests };
  }

  entry.count += 1;
  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetTime: entry.resetTime,
    total: config.maxRequests,
  };
}

/**
 * Best-effort client IP extraction from proxy headers.
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }

  return (
    request.headers.get('x-real-ip') ??
    request.headers.get('cf-connecting-ip') ??
    'unknown'
  );
}
