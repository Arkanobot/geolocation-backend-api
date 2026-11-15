import { ERROR_CODES } from '../constants';
import { createHttpError } from './createHttpError.helper';

const invalid = (message: string) => createHttpError(400, ERROR_CODES.VALIDATION_ERROR, message);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function assertValid(condition: unknown, message: string): asserts condition {
  if (!condition) throw invalid(message);
}

// req.body is undefined in Express 5 when nothing was parsed, hence the `?? {}`
export const requireFields = (body: unknown, fields: string[]): void => {
  const data = (body ?? {}) as Record<string, unknown>;
  const missing = fields.filter((f) => data[f] === undefined || data[f] === null || data[f] === '');
  assertValid(missing.length === 0, `Missing required fields: ${missing.join(', ')}`);
};

// accepts numbers or numeric strings (query params), returns the parsed number
export const parseNumberInRange = (value: unknown, name: string, min: number, max: number): number => {
  const n =
    typeof value === 'number' ? value : typeof value === 'string' && value.trim() !== '' ? Number(value) : NaN;
  assertValid(Number.isFinite(n) && n >= min && n <= max, `${name} must be a number between ${min} and ${max}`);
  return n;
};

export const parseIntegerInRange = (value: unknown, name: string, min: number, max: number): number => {
  const n = parseNumberInRange(value, name, min, max);
  assertValid(Number.isInteger(n), `${name} must be a whole number`);
  return n;
};

// Postgres throws on a malformed uuid, so check before it reaches a query (otherwise: 500)
export const parseUuid = (value: unknown, name = 'id'): string => {
  assertValid(typeof value === 'string' && UUID_RE.test(value), `${name} must be a valid UUID`);
  return value;
};

export const parsePagination = (query: Record<string, unknown>, defaultLimit = 50, maxLimit = 100) => {
  const limit = query.limit === undefined ? defaultLimit : parseNumberInRange(query.limit, 'limit', 1, maxLimit);
  const offset = query.offset === undefined ? 0 : parseNumberInRange(query.offset, 'offset', 0, 1_000_000);
  assertValid(Number.isInteger(limit) && Number.isInteger(offset), 'limit and offset must be whole numbers');
  return { limit, offset };
};