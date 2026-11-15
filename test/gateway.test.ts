import type http from 'http';
import { expect } from 'chai';
import request from 'supertest';
import { createGatewayApp } from '../src/gateway/app';
import type { GatewayConfig } from '../src/gateway/config';
import { startFakeUpstream } from './helpers/fakeUpstream.helper';

const KEY = 'test-key';

const makeConfig = (url: string, max = 100): GatewayConfig => ({
  port: 0,
  apiKeys: [KEY],
  rateLimit: { windowMs: 60_000, max },
  services: { users: url, vehicles: url, telemetry: url, maps: url, notifications: url },
});

describe('API Gateway', () => {
  let upstream: http.Server;
  let upstreamUrl: string;

  before(async () => {
    ({ server: upstream, url: upstreamUrl } = await startFakeUpstream());
  });
  after(() => void upstream.close());

  it('serves /health and Swagger UI without an API key', async () => {
    const app = createGatewayApp(makeConfig(upstreamUrl));
    await request(app).get('/health').expect(200);
    await request(app).get('/docs/').expect(200);
    const spec = await request(app).get('/docs.json').expect(200);
    expect(spec.body.openapi).to.equal('3.0.3');
  });

  it('returns 401 when the API key is missing', async () => {
    const res = await request(createGatewayApp(makeConfig(upstreamUrl))).get('/api/vehicles');
    expect(res.status).to.equal(401);
    expect(res.body.error.code).to.equal('UNAUTHORIZED');
  });

  it('returns 403 when the API key is wrong', async () => {
    const res = await request(createGatewayApp(makeConfig(upstreamUrl)))
      .get('/api/vehicles')
      .set('x-api-key', 'nope');
    expect(res.status).to.equal(403);
    expect(res.body.error.code).to.equal('FORBIDDEN');
  });

  it('routes to the backend, keeps the full path, strips the API key', async () => {
    const app = createGatewayApp(makeConfig(upstreamUrl));
    const res = await request(app).get('/api/vehicles/42?x=1').set('x-api-key', KEY);
    expect(res.status).to.equal(200);
    expect(res.body.path).to.equal('/api/vehicles/42?x=1');
    expect(res.body.leakedKey).to.equal(null);
  });

  it('returns 429 once the rate limit is exceeded', async () => {
    const app = createGatewayApp(makeConfig(upstreamUrl, 3));
    for (let i = 0; i < 3; i++) {
      await request(app).get('/api/users').set('x-api-key', KEY).expect(200);
    }
    const res = await request(app).get('/api/users').set('x-api-key', KEY);
    expect(res.status).to.equal(429);
    expect(res.body.error.code).to.equal('RATE_LIMIT_EXCEEDED');
  });

  it('returns 503 when the backend is down', async () => {
    const app = createGatewayApp(makeConfig('http://127.0.0.1:1')); // nothing listens on port 1
    const res = await request(app).get('/api/telemetry').set('x-api-key', KEY);
    expect(res.status).to.equal(503);
    expect(res.body.error.code).to.equal('SERVICE_UNAVAILABLE');
  });

  it('returns 404 for unknown routes', async () => {
    const res = await request(createGatewayApp(makeConfig(upstreamUrl)))
      .get('/api/unknown')
      .set('x-api-key', KEY);
    expect(res.status).to.equal(404);
    expect(res.body.error.code).to.equal('NOT_FOUND');
  });
});