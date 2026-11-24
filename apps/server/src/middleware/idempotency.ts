import type { Request, Response, NextFunction } from 'express';

interface CachedResponse {
  statusCode: number;
  body: unknown;
  expiresAt: number;
}

const cache = new Map<string, CachedResponse>();

function getTtlMs(): number {
  const ttlSeconds = parseInt(process.env.IDEMPOTENCY_KEY_TTL_SECONDS ?? '86400', 10);
  return ttlSeconds * 1000;
}

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of cache.entries()) {
    if (entry.expiresAt <= now) {
      cache.delete(key);
    }
  }
}, 60_000);

export function idempotencyCheck(req: Request, res: Response, next: NextFunction): void {
  const idempotencyKey = req.headers['idempotency-key'] as string | undefined;

  if (!idempotencyKey) {
    next();
    return;
  }

  const cacheEntry = cache.get(idempotencyKey);
  if (cacheEntry && cacheEntry.expiresAt > Date.now()) {
    res.status(cacheEntry.statusCode).json(cacheEntry.body);
    return;
  }

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
