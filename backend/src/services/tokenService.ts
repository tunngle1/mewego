import crypto from 'crypto';

export const createOpaqueToken = (size = 32) => crypto.randomBytes(size).toString('base64url');

export const hashOpaqueToken = (token: string) => crypto.createHash('sha256').update(token).digest('hex');

export const buildAbsoluteUrl = (path: string) => {
  const baseUrl = (process.env.APP_WEB_URL || process.env.APP_PUBLIC_URL || 'http://localhost:3000').trim().replace(/\/$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${normalizedPath}`;
};
