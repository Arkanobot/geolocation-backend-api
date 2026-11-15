import { expect } from 'chai';
import request from 'supertest';
import { createApp } from '../src/backend/app';
import { ROLES } from '../src/shared/constants';
import { createTestUser } from './helpers/auth.helper';
import { resetDb } from './helpers/db.helper';
import { createVehicleAs, sampleVehicle } from './helpers/vehicles.helper';

const app = createApp();
const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

describe('Vehicles API', () => {
  beforeEach(resetDb);

  describe('Vehicle registration and retrieval', () => {
    it('registers a vehicle, then fetches it by id and finds it in the list', async () => {
      const { token } = await createTestUser();

      const created = await createVehicleAs(app, token);
      expect(created.status).to.equal(201);
      expect(created.body.registrationNumber).to.equal('KA19AB1234'); // normalised
      expect(created.body.status).to.equal('active'); // default
      expect(created.body.latitude).to.equal(12.8698);

      const fetched = await request(app).get(`/api/vehicles/${created.body.id}`).set(auth(token));
      expect(fetched.status).to.equal(200);
      expect(fetched.body).to.deep.equal(created.body);

      const list = await request(app).get('/api/vehicles').set(auth(token));
      expect(list.status).to.equal(200);
      expect(list.body.data).to.have.length(1);
      expect(list.body.data[0].id).to.equal(created.body.id);
    });

    it('requires authentication', async () => {
      await request(app).post('/api/vehicles').send(sampleVehicle).expect(401);
      await request(app).get('/api/vehicles').expect(401);
    });

    it('returns 409 for a duplicate registration number', async () => {
      const { token } = await createTestUser();
      await createVehicleAs(app, token).expect(201);
      const res = await createVehicleAs(app, token, { ...sampleVehicle, registrationNumber: 'KA19AB1234' });
      expect(res.status).to.equal(409);
      expect(res.body.error.code).to.equal('CONFLICT');
    });

    it('returns 400 for invalid input', async () => {
      const { token } = await createTestUser();
      const cases = [
        {},
        { registrationNumber: 'KA01' }, // no model
        { ...sampleVehicle, status: 'flying' },
        { ...sampleVehicle, latitude: 95 },
        { registrationNumber: 'KA01', model: 'X', latitude: 12.5 }, // lat without lng
      ];
      for (const body of cases) {
        const res = await createVehicleAs(app, token, body);
        expect(res.status, JSON.stringify(body)).to.equal(400);
        expect(res.body.error.code).to.equal('VALIDATION_ERROR');
      }
    });

    it('returns 400 for a malformed id and 404 for an unknown one', async () => {
      const { token } = await createTestUser();
      await request(app).get('/api/vehicles/not-a-uuid').set(auth(token)).expect(400);
      const res = await request(app)
        .get('/api/vehicles/3f2b8c1e-5d4a-4e7b-9a10-2c6f8d0e1b34')
        .set(auth(token));
      expect(res.status).to.equal(404);
      expect(res.body.error.code).to.equal('NOT_FOUND');
    });

    it('filters the list by status and paginates', async () => {
      const { token } = await createTestUser();
      await createVehicleAs(app, token, { registrationNumber: 'A1', model: 'M' }).expect(201);
      await createVehicleAs(app, token, { registrationNumber: 'A2', model: 'M', status: 'maintenance' }).expect(201);
      await createVehicleAs(app, token, { registrationNumber: 'A3', model: 'M' }).expect(201);

      const maintenance = await request(app).get('/api/vehicles?status=maintenance').set(auth(token));
      expect(maintenance.body.data.map((v: { registrationNumber: string }) => v.registrationNumber)).to.deep.equal(['A2']);

      const page = await request(app).get('/api/vehicles?limit=2').set(auth(token));
      expect(page.body.data).to.have.length(2);

      await request(app).get('/api/vehicles?status=nope').set(auth(token)).expect(400);
      await request(app).get('/api/vehicles?limit=abc').set(auth(token)).expect(400);
    });
  });

  describe('PATCH /api/vehicles/:id/status', () => {
    it('updates the status', async () => {
      const { token } = await createTestUser();
      const { body: vehicle } = await createVehicleAs(app, token);

      const res = await request(app)
        .patch(`/api/vehicles/${vehicle.id}/status`)
        .set(auth(token))
        .send({ status: 'maintenance' });
      expect(res.status).to.equal(200);
      expect(res.body.status).to.equal('maintenance');
      expect(new Date(res.body.updatedAt).getTime()).to.be.at.least(new Date(vehicle.updatedAt).getTime());
    });

    it('rejects an invalid status and an unknown vehicle', async () => {
      const { token } = await createTestUser();
      const { body: vehicle } = await createVehicleAs(app, token);
      await request(app).patch(`/api/vehicles/${vehicle.id}/status`).set(auth(token)).send({ status: 'x' }).expect(400);
      await request(app)
        .patch('/api/vehicles/3f2b8c1e-5d4a-4e7b-9a10-2c6f8d0e1b34/status')
        .set(auth(token))
        .send({ status: 'inactive' })
        .expect(404);
    });
  });

  describe('Role-based access control on delete', () => {
    it('forbids an operator from deleting a vehicle (403) and leaves it in place', async () => {
      const operator = await createTestUser(ROLES.OPERATOR);
      const { body: vehicle } = await createVehicleAs(app, operator.token);

      const res = await request(app).delete(`/api/vehicles/${vehicle.id}`).set(auth(operator.token));
      expect(res.status).to.equal(403);
      expect(res.body.error.code).to.equal('FORBIDDEN');

      await request(app).get(`/api/vehicles/${vehicle.id}`).set(auth(operator.token)).expect(200);
    });

    it('rejects a delete with no token (401)', async () => {
      await request(app).delete('/api/vehicles/3f2b8c1e-5d4a-4e7b-9a10-2c6f8d0e1b34').expect(401);
    });

    it('lets an admin delete a vehicle (204), after which it is gone', async () => {
      const admin = await createTestUser(ROLES.ADMIN);
      const { body: vehicle } = await createVehicleAs(app, admin.token);

      await request(app).delete(`/api/vehicles/${vehicle.id}`).set(auth(admin.token)).expect(204);
      await request(app).get(`/api/vehicles/${vehicle.id}`).set(auth(admin.token)).expect(404);
      await request(app).delete(`/api/vehicles/${vehicle.id}`).set(auth(admin.token)).expect(404);
    });
  });
});