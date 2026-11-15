import type { RequestHandler } from 'express';
import rateLimit from 'express-rate-limit';
import { ERROR_CODES } from '../shared/constants';
import { sendError } from '../shared/helpers';

// missing key -> 401, wrong key -> 403
export const requireApiKey =
  (validKeys: string[]): RequestHandler =>
  (req, res, next) => {
    const key = req.header('x-api-key');
    if (!key) {
      sendError(res, 401, ERROR_CODES.UNAUTHORIZED, 'x-api-key header is required');
      return;
    }
    if (!validKeys.includes(key)) {
      sendError(res, 403, ERROR_CODES.FORBIDDEN, 'Invalid API key');
      return;
    }
    next();
  };

// keyed by API key (not IP) so every client gets its own bucket.
export const createRateLimiter = ({ windowMs, max }: { windowMs: number; max: number }) =>
  rateLimit({
    windowMs,
    limit: max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.header('x-api-key') as string,
    handler: (_req, res) =>
      void sendError(res, 429, ERROR_CODES.RATE_LIMIT_EXCEEDED, 'Too many requests, slow down'),
  });