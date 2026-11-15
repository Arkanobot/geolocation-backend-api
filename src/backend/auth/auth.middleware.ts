import type { RequestHandler } from 'express';
import { ERROR_CODES } from '../../shared/constants';
import type { Role } from '../../shared/constants';
import { createHttpError } from '../../shared/helpers';
import { verifyToken, type AuthUser } from './jwt';

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

const unauthorized = (message: string) => createHttpError(401, ERROR_CODES.UNAUTHORIZED, message);

// reads `Authorization: Bearer <jwt>`, puts the user on req.user
export const authenticate: RequestHandler = (req, _res, next) => {
  const [scheme, token] = (req.header('authorization') ?? '').split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) throw unauthorized('Bearer token required');

  try {
    req.user = verifyToken(token);
  } catch {
    throw unauthorized('Invalid or expired token');
  }
  next();
};

// use AFTER authenticate: requireRole(ROLES.ADMIN)
export const requireRole =
  (...allowed: Role[]): RequestHandler =>
  (req, _res, next) => {
    if (!req.user) throw unauthorized('Authentication required');
    if (!allowed.includes(req.user.role)) {
      throw createHttpError(403, ERROR_CODES.FORBIDDEN, 'You do not have permission to do this');
    }
    next();
  };