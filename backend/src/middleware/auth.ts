import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

export interface AuthContext {
  userId: string;
  role: 'user' | 'organizer' | 'admin' | 'superadmin';
}

const prisma = new PrismaClient();

const ALLOW_DEV_HEADERS = process.env.ALLOW_DEV_HEADERS === 'true' && process.env.NODE_ENV !== 'production';
const ALLOW_DEV_ROLE_OVERRIDE = process.env.ALLOW_DEV_ROLE_OVERRIDE === 'true' && ALLOW_DEV_HEADERS;
const ALLOW_DEV_SUPERADMIN_BOOTSTRAP = process.env.ALLOW_DEV_SUPERADMIN_BOOTSTRAP === 'true' && ALLOW_DEV_HEADERS;

const AUTH_JWT_SECRET = process.env.AUTH_JWT_SECRET || '';

const tryGetBearerToken = (req: Request): string | null => {
  const header = req.headers['authorization'];
  if (!header || typeof header !== 'string') return null;
  const m = header.match(/^Bearer\s+(.+)$/i);
  return m?.[1] ? m[1].trim() : null;
};

const verifyJwtAndGetUserId = (token: string): string | null => {
  if (!AUTH_JWT_SECRET) return null;
  try {
    const payload = jwt.verify(token, AUTH_JWT_SECRET) as any;
    const sub = payload?.sub;
    return typeof sub === 'string' && sub ? sub : null;
  } catch {
    return null;
  }
};

declare global {
  namespace Express {
    interface Request {
      auth?: AuthContext;
    }
  }
}

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const bearer = tryGetBearerToken(req);
  const jwtUserId = bearer ? verifyJwtAndGetUserId(bearer) : null;

  const userId = (jwtUserId || (req.headers['x-user-id'] as string)) as string;
  const role = req.headers['x-user-role'] as string;

  if (!userId) {
    req.auth = {
      userId: 'anonymous',
      role: 'user',
    };
    return next();
  }

  const headerRole = (role as AuthContext['role']) || 'user';

  prisma.user
    .findUnique({ where: { id: userId }, select: { role: true } })
    .then((u) => {
      const dbRole = u?.role as AuthContext['role'] | undefined;

      if (!u) {
        return prisma.user
          .upsert({
            where: { id: userId },
            update: { lastActiveAt: new Date() },
            create: { id: userId, role: 'user', name: 'User' },
          })
          .then(() => {
            req.auth = { userId, role: 'user' };
            next();
          });
      }

      if (ALLOW_DEV_SUPERADMIN_BOOTSTRAP && headerRole === 'superadmin' && dbRole !== 'superadmin') {
        return prisma.user
          .upsert({
            where: { id: userId },
            update: { role: 'superadmin', lastActiveAt: new Date() },
            create: { id: userId, role: 'superadmin', name: 'SuperAdmin' },
          })
          .then(() => {
            req.auth = { userId, role: 'superadmin' };
            next();
          });
      }

      // If request is authenticated via JWT, ignore header role overrides.
      const resolvedRole = jwtUserId ? (dbRole || 'user') : ALLOW_DEV_ROLE_OVERRIDE ? (dbRole || headerRole) : (dbRole || 'user');
      req.auth = {
        userId,
        role: resolvedRole,
      };
      next();
    })
    .catch(() => {
      req.auth = {
        userId,
        role: jwtUserId ? 'user' : ALLOW_DEV_ROLE_OVERRIDE ? headerRole : 'user',
      };
      next();
    });
};

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.auth || req.auth.userId === 'anonymous') {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

export const requireRole = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.auth) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // superadmin has access to everything
    if (req.auth.role === 'superadmin') {
      return next();
    }

    if (!roles.includes(req.auth.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
};
