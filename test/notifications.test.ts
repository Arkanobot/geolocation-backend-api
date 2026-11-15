import { expect } from 'chai';
import sinon from 'sinon';
import request from 'supertest';
import { createApp } from '../src/backend/app';
import { ROLES } from '../src/shared/constants';
import { createTestUser, resetDb, createRecordingSmsProvider, createVehicleAs } from './helpers';

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

describe('Status updates and notifications', () => {
  beforeEach(resetDb);

  const changeStatus = (app: ReturnType<typeof createApp>, token: string, vehicleId: string, status: string) =>
    request(app).patch(`/api/vehicles/${vehicleId}/status`).set(auth(token)).send({ status });

  it('texts the admins when a vehicle status changes, and records it as sent', async () => {
    const { provider, sent } = createRecordingSmsProvider();
    const app = createApp({ smsProvider: provider });
    const operator = await createTestUser(ROLES.OPERATOR);
    const admin = await createTestUser(ROLES.ADMIN);
    const { body: vehicle } = await createVehicleAs(app, operator.token);

    await changeStatus(app, operator.token, vehicle.id, 'maintenance').expect(200);

    expect(sent).to.have.length(1);
    expect(sent[0]!.message).to.include('KA19AB1234').and.to.include('active').and.to.include('maintenance');

    const records = await request(app).get('/api/notifications').set(auth(admin.token));
    expect(records.status).to.equal(200);
    expect(records.body.data).to.have.length(1);
    expect(records.body.data[0]).to.include({ type: 'STATUS_CHANGE', status: 'sent', vehicleId: vehicle.id });
  });

  it('sends one SMS per admin', async () => {
    const { provider, sent } = createRecordingSmsProvider();
    const app = createApp({ smsProvider: provider });
    const operator = await createTestUser(ROLES.OPERATOR);
    await createTestUser(ROLES.ADMIN);
    await createTestUser(ROLES.ADMIN);
    const { body: vehicle } = await createVehicleAs(app, operator.token);

    await changeStatus(app, operator.token, vehicle.id, 'inactive').expect(200);
    expect(sent).to.have.length(2);
  });

  it('does not notify when the status did not actually change', async () => {
    const { provider, sent } = createRecordingSmsProvider();
    const app = createApp({ smsProvider: provider });
    const operator = await createTestUser(ROLES.OPERATOR);
    await createTestUser(ROLES.ADMIN);
    const { body: vehicle } = await createVehicleAs(app, operator.token);

    await changeStatus(app, operator.token, vehicle.id, 'active').expect(200); // already active
    expect(sent).to.have.length(0);
  });

  it('still succeeds when there is nobody to notify', async () => {
    const { provider, sent } = createRecordingSmsProvider();
    const app = createApp({ smsProvider: provider });
    const operator = await createTestUser(ROLES.OPERATOR); // no admins exist
    const { body: vehicle } = await createVehicleAs(app, operator.token);

    await changeStatus(app, operator.token, vehicle.id, 'maintenance').expect(200);
    expect(sent).to.have.length(0);
  });

  it('records the notification as failed when the SMS provider is down, without failing the request', async () => {
    const consoleError = sinon.stub(console, 'error'); // the failure is logged on purpose; keep test output clean
    try {
      const { provider } = createRecordingSmsProvider({ fail: true });
      const app = createApp({ smsProvider: provider });
      const operator = await createTestUser(ROLES.OPERATOR);
      const admin = await createTestUser(ROLES.ADMIN);
      const { body: vehicle } = await createVehicleAs(app, operator.token);

      await changeStatus(app, operator.token, vehicle.id, 'maintenance').expect(200);

      const records = await request(app).get('/api/notifications?status=failed').set(auth(admin.token));
      expect(records.body.data).to.have.length(1);
      expect(records.body.data[0].status).to.equal('failed');
    } finally {
      consoleError.restore();
    }
  });

  it('lets only admins read the notification records, with filters', async () => {
    const { provider } = createRecordingSmsProvider();
    const app = createApp({ smsProvider: provider });
    const operator = await createTestUser(ROLES.OPERATOR);
    const admin = await createTestUser(ROLES.ADMIN);
    const { body: vehicle } = await createVehicleAs(app, operator.token);
    await changeStatus(app, operator.token, vehicle.id, 'maintenance').expect(200);

    await request(app).get('/api/notifications').expect(401);
    const forbidden = await request(app).get('/api/notifications').set(auth(operator.token));
    expect(forbidden.status).to.equal(403);

    const byType = await request(app).get('/api/notifications?type=STATUS_CHANGE').set(auth(admin.token));
    expect(byType.body.data).to.have.length(1);
    const other = await request(app).get('/api/notifications?type=ENGINE_FAULT').set(auth(admin.token));
    expect(other.body.data).to.have.length(0);
    await request(app).get('/api/notifications?status=bogus').set(auth(admin.token)).expect(400);
  });
});