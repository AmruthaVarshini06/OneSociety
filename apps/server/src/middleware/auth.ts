import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthPayload {
  userId: string;
  role: string;
  societyId: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Missing or malformed Authorization header' });
    return;
  }

  const token = authHeader.slice(7);
  const secret = process.env.JWT_ACCESS_SECRET;

  if (!secret) {
    res.status(500).json({ message: 'Server misconfiguration: JWT secret missing' });
    return;
  }

  try {
    const payload = jwt.verify(token, secret) as AuthPayload;
    req.user = {
      userId: payload.userId,
      role: payload.role,
      societyId: payload.societyId,
    };
    next();
  } catch {
    res.status(401).json({ message: 'Invalid or expired access token' });
  }
}
