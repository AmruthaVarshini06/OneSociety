import type { Request, Response, NextFunction } from 'express';

interface CachedResponse {
  statusCode: number;
  body: unknown;
  expiresAt: number;
}

// In-memory cache; replace with Redis in production for multi-instance deployments
const cache = new Map<string, CachedResponse>();

function getTtlMs(): number {
  const ttlSeconds = parseInt(process.env.IDEMPOTENCY_KEY_TTL_SECONDS ?? '86400', 10);
  return ttlSeconds * 1000;
}

// Periodic cleanup to avoid memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of cache.entries()) {
    if (entry.expiresAt <= now) {
      cache.delete(key);
    }
  }
}, 60_000); // Every minute

export function idempotencyCheck(req: Request, res: Response, next: NextFunction): void {
  const idempotencyKey = req.headers['idempotency-key'] as string | undefined;

  if (!idempotencyKey) {
    // No key — proceed normally
    next();
    return;
  }

  const cacheEntry = cache.get(idempotencyKey);
  if (cacheEntry && cacheEntry.expiresAt > Date.now()) {
    // Return the cached response
    res.status(cacheEntry.statusCode).json(cacheEntry.body);
    return;
  }

  // Intercept res.json to cache the result
  const originalJson = res.json.bind(res);
  res.json = (body: unknown): Response => {
    cache.set(idempotencyKey, {
      statusCode: res.statusCode,
      body,
      expiresAt: Date.now() + getTtlMs(),
    });
    return originalJson(body);
  };

  next();
}
