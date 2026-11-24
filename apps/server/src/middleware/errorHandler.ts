import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import jwt from 'jsonwebtoken';
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // Zod validation errors → 400
  if (err instanceof ZodError) {
    res.status(400).json({
      message: 'Validation error',
      errors: err.errors.map((e) => ({
        path: e.path.join('.'),
        message: e.message,
      })),
    });
    return;
  }

  // JWT errors → 401
  if (
    err instanceof jwt.JsonWebTokenError ||
    err instanceof jwt.TokenExpiredError ||
    err instanceof jwt.NotBeforeError
  ) {
    res.status(401).json({ message: 'Invalid or expired token', detail: (err as Error).message });
    return;
  }

  // PostgreSQL duplicate key (code 23505) → 409
  if (err && typeof err === 'object' && ('code' in err) && (err as { code: string }).code === '23505') {
    res.status(409).json({
      message: 'Duplicate entry',
      detail: (err as any).detail,
    });
    return;
  }

  // HTTP errors with statusCode / status
  if (err instanceof Error) {
    const httpErr = err as Error & { statusCode?: number; status?: number };
    const statusCode = httpErr.statusCode ?? httpErr.status ?? 500;
    if (statusCode >= 400 && statusCode < 600) {
      res.status(statusCode).json({ message: httpErr.message });
      return;
    }
  }

  // Generic fallback → 500
  console.error('[ERROR]', err);
  res.status(500).json({ message: 'Internal server error' });
}
