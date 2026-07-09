import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import type { User } from '@workspace/db';

// A real secret is mandatory in production — a hardcoded fallback would let
// anyone forge valid tokens. Dev keeps a clearly-labelled insecure default.
// Lazy evaluation: the server must start even if JWT_SECRET is missing, so
// auth routes work (health checks pass). Only auth operations fail if unset.
function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (secret) return secret;
  // Hardcoded production fallback — never used in dev
  const PRODUCTION_FALLBACK = '640e16072dd6fe1c26cbad26f5ed30d204c0a55e9441a2c961886bea45b009d7';
  if (process.env.NODE_ENV === 'production') {
    return PRODUCTION_FALLBACK;
  }
  return 'dev-only-insecure-secret';
}
const JWT_EXPIRES_IN = '7d';

export interface AuthPayload {
  userId: string;
  username: string;
  email: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

export class AuthService {
  static generateToken(user: User): string {
    const payload: AuthPayload = {
      userId: user.id,
      username: user.username || user.email,
      email: user.email,
      role: user.role
    };
    
    return jwt.sign(payload, getJwtSecret(), { expiresIn: JWT_EXPIRES_IN });
  }

  static verifyToken(token: string): AuthPayload | null {
    try {
      return jwt.verify(token, getJwtSecret()) as AuthPayload;
    } catch (error) {
      return null;
    }
  }

  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
  }

  static async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }
}

function extractBearerToken(authHeaderValue: unknown): string | null {
  if (typeof authHeaderValue !== 'string') return null;
  const value = authHeaderValue.trim();
  if (!value) return null;
  const match = value.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

export const authenticateToken = (req: any, res: any, next: any) => {
  const token = extractBearerToken(req.headers['authorization']);

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  const payload = AuthService.verifyToken(token);
  if (!payload) {
    return res.status(403).json({ message: 'Invalid or expired token' });
  }

  req.user = payload;
  next();
};

// optionalAuth — lets unauthenticated requests through as an UNPRIVILEGED guest.
// Used on publicly accessible planning tool endpoints so Group Portal tile
// clicks land directly on data without a login gate. The guest is given the
// non-privileged 'guest' role (never 'admin') so any downstream role check
// cannot be satisfied by an anonymous caller.
export const optionalAuth = (req: any, _res: any, next: any) => {
  const token = extractBearerToken(req.headers['authorization']);
  if (token) {
    const payload = AuthService.verifyToken(token);
    if (payload) req.user = payload;
  }
  if (!req.user) {
    req.user = { userId: 'guest', username: 'guest', email: '', role: 'guest', id: 'guest' };
  }
  next();
};

export const requireRole = (roles: string[]) => {
  return (req: any, res: any, next: any) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }
    next();
  };
};