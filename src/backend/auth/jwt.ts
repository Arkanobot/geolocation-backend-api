import { sign, verify } from 'jsonwebtoken';
import { config } from '../config';
import { isRole, type Role } from '../../shared/constants';

export type AuthUser = { id: string; email: string; role: Role };

export const signToken = (user: AuthUser): string =>
  sign({ email: user.email, role: user.role }, config.jwtSecret, {
    subject: user.id,
    expiresIn: config.jwtExpiresInSeconds,
    algorithm: 'HS256',
  });

// throws if the token is invalid, expired or has an unexpected payload
export const verifyToken = (token: string): AuthUser => {
  const payload = verify(token, config.jwtSecret, { algorithms: ['HS256'] });
  if (
    typeof payload === 'string' ||
    typeof payload.sub !== 'string' ||
    typeof payload.email !== 'string' ||
    !isRole(payload.role)
  ) {
    throw new Error('Malformed token payload');
  }
  return { id: payload.sub, email: payload.email, role: payload.role };
};