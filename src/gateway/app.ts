import express, { type Express } from 'express';
import { type GatewayConfig, routes } from './config';
import { requireApiKey, createRateLimiter } from './middleware';
import { createServiceProxy } from './proxy';
import { setupSwagger } from './swagger';
import { notFound, errorHandler } from '../shared/middleware';

export const createGatewayApp = (config: GatewayConfig): Express => {
  const app = express();
  app.disable('x-powered-by');

  // public routes: no API key needed
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'gateway' });
  });
  setupSwagger(app);

  // everything under /api needs a valid key and is rate limited
  app.use('/api', requireApiKey(config.apiKeys), createRateLimiter(config.rateLimit));

  routes.forEach(({ prefix, service }) =>
    app.use(createServiceProxy(prefix, config.services[service])),
  );

  app.use(notFound);
  app.use(errorHandler);
  return app;
};