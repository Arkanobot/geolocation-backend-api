import { assertValid, requireFields } from '../../../shared/helpers';
import type { LoginInput, RegisterInput } from './users.types';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+[1-9]\d{7,14}$/; // international format, e.g. +919876543210

export const parseRegisterInput = (body: unknown): RegisterInput => {
  requireFields(body, ['name', 'email', 'password']);
  const { name, email, password, phone } = body as Record<string, unknown>;

  assertValid(typeof name === 'string' && name.trim().length > 0, 'name must be a non-empty string');
  assertValid(typeof email === 'string' && EMAIL_RE.test(email.trim()), 'email must be a valid email address');
  assertValid(typeof password === 'string' && password.length >= 8, 'password must be at least 8 characters');
  assertValid(
    phone === undefined || (typeof phone === 'string' && PHONE_RE.test(phone)),
    'phone must be in international format, e.g. +919876543210',
  );

  return { name: name.trim(), email: email.trim().toLowerCase(), password, ...(phone ? { phone } : {}) };
};

export const parseLoginInput = (body: unknown): LoginInput => {
  requireFields(body, ['email', 'password']);
  const { email, password } = body as Record<string, unknown>;
  assertValid(typeof email === 'string' && typeof password === 'string', 'email and password must be strings');
  return { email: email.trim().toLowerCase(), password };
};