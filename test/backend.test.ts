import { expect } from 'chai';
import request from 'supertest';
import { createApp } from '../src/backend/app';

describe('Backend skeleton', () => {
  const app = createApp();

  it('GET /health returns 200', async () => {
    const res = await request(app).get('/health').expect(200);
    expect(res.body.service).to.equal('backend');
  });

  it('unknown route returns 404 in the error shape', async () => {
    const res = await request(app).get('/api/nope');
    expect(res.status).to.equal(404);
    expect(res.body.error.code).to.equal('NOT_FOUND');
  });

  it('malformed JSON returns 400', async () => {
    const res = await request(app)
      .post('/health')
      .set('content-type', 'application/json')
      .send('{bad');
    expect(res.status).to.equal(400);
    expect(res.body.error.code).to.equal('VALIDATION_ERROR');
  });
});