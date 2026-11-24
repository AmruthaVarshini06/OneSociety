import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { ROLES, type Role } from '../shared/auth/roles';

/**
 * Role-check middleware factory.
 * Must be used AFTER authenticate() (req.user is already set).
 * Returns a single middleware — not an array — for clean route definitions.
 */
export function requireRole(...roles: Role[]): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthenticated' });
      return;
    }

    if (!roles.includes(req.user.role as Role)) {
      res.status(403).json({
        message: 'Forbidden: insufficient role',
        required: roles,
        current: req.user.role,
      });
      return;
    }

    next();
  };
}

// Satisfy TS — ROLES is used in import chains; re-export for convenience
export { ROLES };

