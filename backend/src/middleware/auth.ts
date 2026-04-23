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
const TEST_AUTH_KEY = typeof process.env.TEST_AUTH_KEY === 'string' ? process.env.TEST_AUTH_KEY : '';
const ALLOW_TEST_HEADERS = Boolean(TEST_AUTH_KEY && TEST_AUTH_KEY.trim());

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

  const headerUserId = (req.headers['x-user-id'] as string) || '';
  const role = req.headers['x-user-role'] as string;
  const testAuth = req.headers['x-test-auth'] as string;

  // Test-auth can (optionally) override JWT auth for `test_*` users.
  // This is gated by a shared secret and is meant for controlled testing only.
  const testAuthOk =
    ALLOW_TEST_HEADERS &&
    typeof testAuth === 'string' &&
    testAuth.trim().length > 0 &&
    testAuth.trim() === TEST_AUTH_KEY.trim();
  const canUseHeaderTestIdentity = testAuthOk && typeof headerUserId === 'string' && headerUserId.startsWith('test_');

  // If test-auth is valid and caller provided a `test_*` identity, prefer it over JWT subject.
  const effectiveJwtUserId = canUseHeaderTestIdentity ? null : jwtUserId;
  const userId = (effectiveJwtUserId || headerUserId) as string;

  if (!userId) {
    req.auth = {
      userId: 'anonymous',
      role: 'user',
    };
    return next();
  }

  const headerRole = (role as AuthContext['role']) || 'user';
  const isTestUserId = typeof userId === 'string' && userId.startsWith('test_');
  const canUseTestHeaders =
    // Never allow header-based overrides when request is JWT-authenticated.
    !effectiveJwtUserId &&
    testAuthOk &&
    isTestUserId &&
    true;

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

      // Production-safe test auth: allow `test_*` users to carry a role via headers
      // only if the shared secret matches.
      if (canUseTestHeaders && headerRole && dbRole !== headerRole) {
        return prisma.user
          .upsert({
            where: { id: userId },
            update: { role: headerRole, lastActiveAt: new Date() },
            create: {
              id: userId,
              role: headerRole,
              name:
                headerRole === 'superadmin'
                  ? 'SuperAdmin'
                  : headerRole === 'admin'
                    ? 'Admin'
                    : headerRole === 'organizer'
                      ? 'Organizer'
                      : 'User',
            },
          })
          .then(() => {
            req.auth = { userId, role: headerRole };
            next();
          });
      }

      // If request is authenticated via JWT, ignore header role overrides.
      const resolvedRole = jwtUserId
        ? (dbRole || 'user')
        : ALLOW_DEV_ROLE_OVERRIDE
          ? (dbRole || headerRole)
          : (dbRole || 'user');
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
      const authHeader = req.headers['authorization'];
      const authHeaderStr =
        typeof authHeader === 'string'
          ? authHeader
          : Array.isArray(authHeader)
            ? String(authHeader[0] ?? '')
            : '';
      const hasBearer = /^Bearer\s+.+/i.test(authHeaderStr);

      const xUserId = req.headers['x-user-id'];
      const xUserRole = req.headers['x-user-role'];
      const xTestAuth = req.headers['x-test-auth'];

      return res.status(403).json({
        error: 'Forbidden',
        message: `Недостаточно прав. Нужна роль: ${roles.join(' или ')}. Сейчас: ${req.auth.role}.`,
        debug: {
          resolvedAuth: req.auth,
          hasBearer,
          headers: {
            'x-user-id': typeof xUserId === 'string' ? xUserId : Array.isArray(xUserId) ? xUserId[0] : null,
            'x-user-role': typeof xUserRole === 'string' ? xUserRole : Array.isArray(xUserRole) ? xUserRole[0] : null,
            'x-test-auth': typeof xTestAuth === 'string' ? (xTestAuth.trim() ? '[present]' : '[empty]') : Array.isArray(xTestAuth) ? '[present-array]' : null,
          },
        },
      });
    }
    next();
  };
};
