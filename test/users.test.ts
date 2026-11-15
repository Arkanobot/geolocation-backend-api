import { expect } from 'chai';
import { sign } from 'jsonwebtoken';
import request from 'supertest';
import { createApp } from '../src/backend/app';
import { config } from '../src/backend/config';
import { resetDb } from './helpers/db.helper';
import { createTestUser } from './helpers/auth.helper';

const app = createApp();
const validUser = { name: 'Shreyas Bhat K', email: 'Shreyas@Example.com', password: 'Password123', phone: '+919876543210' };

describe('Users API', () => {
  beforeEach(resetDb);

  describe('POST /api/users/register', () => {
    it('creates an operator and never returns the password', async () => {
      const res = await request(app).post('/api/users/register').send(validUser);
      expect(res.status).to.equal(201);
      expect(res.body.email).to.equal('Shreyas@example.com'); // normalised
      expect(res.body.role).to.equal('operator');
      expect(res.body).to.not.have.property('password');
      expect(res.body).to.not.have.property('passwordHash');
      expect(res.body).to.not.have.property('password_hash');
    });

    it('ignores a role sent by the client', async () => {
      const res = await request(app).post('/api/users/register').send({ ...validUser, role: 'admin' });
      expect(res.body.role).to.equal('operator');
    });

    it('returns 409 for a duplicate email', async () => {
      await request(app).post('/api/users/register').send(validUser).expect(201);
      const res = await request(app).post('/api/users/register').send(validUser);
      expect(res.status).to.equal(409);
      expect(res.body.error.code).to.equal('CONFLICT');
    });

    it('returns 400 for missing or invalid fields', async () => {
      const cases = [
        {},
        { ...validUser, email: 'not-an-email' },
        { ...validUser, password: 'short' },
        { ...validUser, phone: '12345' },
      ];
      for (const body of cases) {
        const res = await request(app).post('/api/users/register').send(body);
        expect(res.status, JSON.stringify(body)).to.equal(400);
        expect(res.body.error.code).to.equal('VALIDATION_ERROR');
      }
    });
  });

  describe('Login and JWT verification', () => {
    it('logs in and the returned token is accepted by GET /me', async () => {
      await request(app).post('/api/users/register').send(validUser).expect(201);

      const login = await request(app)
        .post('/api/users/login')
        .send({ email: 'Shreyas@example.com', password: 'Password123' });
      expect(login.status).to.equal(200);
      expect(login.body.token).to.be.a('string');
      expect(login.body.user.email).to.equal('Shreyas@example.com');

      const me = await request(app).get('/api/users/me').set('Authorization', `Bearer ${login.body.token}`);
      expect(me.status).to.equal(200);
      expect(me.body.id).to.equal(login.body.user.id);
    });

    it('returns 401 with the same message for a wrong password and an unknown email', async () => {
      await request(app).post('/api/users/register').send(validUser).expect(201);
      const wrongPassword = await request(app)
        .post('/api/users/login')
        .send({ email: 'Shreyas@example.com', password: 'WrongPassword1' });
      const unknownEmail = await request(app)
        .post('/api/users/login')
        .send({ email: 'ghost@example.com', password: 'Password123' });
      expect(wrongPassword.status).to.equal(401);
      expect(unknownEmail.status).to.equal(401);
      expect(wrongPassword.body.error.message).to.equal(unknownEmail.body.error.message);
    });

    it('rejects missing, malformed, tampered and expired tokens', async () => {
      const { user, token } = await createTestUser();

      await request(app).get('/api/users/me').expect(401);
      await request(app).get('/api/users/me').set('Authorization', 'Bearer garbage').expect(401);
      await request(app).get('/api/users/me').set('Authorization', `Bearer ${token}x`).expect(401);

      const expired = sign({ email: user.email, role: user.role }, config.jwtSecret, {
        subject: user.id,
        expiresIn: -10,
      });
      const res = await request(app).get('/api/users/me').set('Authorization', `Bearer ${expired}`);
      expect(res.status).to.equal(401);
      expect(res.body.error.code).to.equal('UNAUTHORIZED');
    });
  });
});