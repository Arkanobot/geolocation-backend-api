import { ERROR_CODES } from '../constants';

export type HttpError = Error & { status: number; code: string };

export const createHttpError = (status: number, code: string, message: string): HttpError =>
  Object.assign(new Error(message), { status, code });

export const isHttpError = (err: unknown): err is HttpError =>
  err instanceof Error &&
  typeof (err as HttpError).status === 'number' &&
  typeof (err as HttpError).code === 'string';

// shortcuts for the errors every module throws
export const notFoundError = (message: string) => createHttpError(404, ERROR_CODES.NOT_FOUND, message);
export const conflictError = (message: string) => createHttpError(409, ERROR_CODES.CONFLICT, message);