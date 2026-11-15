import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Express, RequestHandler } from 'express';
import swaggerUi from 'swagger-ui-express';
import { parse } from 'yaml';

const loadSpec = () => parse(readFileSync(join(process.cwd(), 'docs', 'openapi.yaml'), 'utf8'));

const serveUi: RequestHandler = (req, res, next) =>
  swaggerUi.setup(loadSpec(), { swaggerOptions: { persistAuthorization: true } })(req, res, next);

export const setupSwagger = (app: Express) => {
  app.get('/docs.json', (_req, res) => {
    res.json(loadSpec());
  });
  app.use('/docs', swaggerUi.serve, serveUi);
};