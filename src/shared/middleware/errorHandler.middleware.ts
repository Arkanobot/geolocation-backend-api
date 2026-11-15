import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ERROR_CODES } from '../constants';
import { isHttpError, sendError } from '../helpers';

export const notFound: RequestHandler = (req, res) => {
  sendError(res, 404, ERROR_CODES.NOT_FOUND, `Route ${req.method} ${req.originalUrl} not found`);
};

// must keep all 4 params or Express won't treat it as an error handler
export const errorHandler: ErrorRequestHandler = (err, _req, res, next) => {
  if (res.headersSent) return next(err);

  if (isHttpError(err)) {
    sendError(res, err.status, err.code, err.message);
    return;
  }
  // malformed JSON body from express.json()
  if (err?.type === 'entity.parse.failed') {
    sendError(res, 400, ERROR_CODES.VALIDATION_ERROR, 'Request body is not valid JSON');
    return;
  }

  console.error(err); // log the real error, never send it to the client
  sendError(res, 500, ERROR_CODES.INTERNAL_SERVER_ERROR, 'Internal server error');
};