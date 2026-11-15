import express from 'express';
import { expect } from 'chai';
import request from 'supertest';
import { authenticate, requireRole } from '../src/backend/auth/auth.middleware';
import { ROLES } from '../src/shared/constants';
import { errorHandler } from '../src/shared/middleware';
import { resetDb } from './helpers/db.helper';
import { createTestUser } from './helpers/auth.helper';

// tiny app with one admin-only route, to test the middleware in isolation
const app = express();
app.delete('/admin-only', authenticate, requireRole(ROLES.ADMIN), (_req, res) => {
  res.json({ ok: true });
});
app.use(errorHandler);

describe('Role-based access control', () => {
  beforeEach(resetDb);

  it('lets an admin through', async () => {
    const { token } = await createTestUser(ROLES.ADMIN);
    await request(app).delete('/admin-only').set('Authorization', `Bearer ${token}`).expect(200);
  });

  it('returns 403 for an operator', async () => {
    const { token } = await createTestUser(ROLES.OPERATOR);
    const res = await request(app).delete('/admin-only').set('Authorization', `Bearer ${token}`);
    expect(res.status).to.equal(403);
    expect(res.body.error.code).to.equal('FORBIDDEN');
  });

  it('returns 401 with no token', async () => {
    await request(app).delete('/admin-only').expect(401);
  });
});