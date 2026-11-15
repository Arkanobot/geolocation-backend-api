import { createProxyMiddleware } from 'http-proxy-middleware';
import { ERROR_CODES } from '../shared/constants';
import { errorBody } from '../shared/helpers';

const matchesPrefix = (prefix: string) => (pathname: string) =>
  pathname === prefix || pathname.startsWith(prefix + '/');

const unavailableCodes = new Set(['ECONNREFUSED', 'ENOTFOUND', 'ECONNRESET']);

export const createServiceProxy = (prefix: string, target: string) =>
  createProxyMiddleware({
    target,
    changeOrigin: true,
    proxyTimeout: 10_000,
    pathFilter: matchesPrefix(prefix),
    on: {
      proxyReq: (proxyReq) => proxyReq.removeHeader('x-api-key'),
      error: (err, _req, res) => {
        if (!('writeHead' in res) || res.headersSent) return;
        const down = unavailableCodes.has((err as NodeJS.ErrnoException).code ?? '');
        const status = down ? 503 : 502;
        const body = down
          ? errorBody(ERROR_CODES.SERVICE_UNAVAILABLE, 'Upstream service is unavailable')
          : errorBody(ERROR_CODES.BAD_GATEWAY, 'Upstream service failed or timed out');
        res.writeHead(status, { 'content-type': 'application/json' });
        res.end(JSON.stringify(body));
      },
    },
  });