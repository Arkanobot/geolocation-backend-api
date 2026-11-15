import { expect } from 'chai';
import request from 'supertest';
import { createApp } from '../src/backend/app';
import { detectCriticalEvents } from '../src/backend/modules/telemetry/telemetry.events';
import { ROLES } from '../src/shared/constants';
import { createTestUser, resetDb, createRecordingSmsProvider, createVehicleAs} from './helpers';

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

describe('detectCriticalEvents (pure function)', () => {
  it('returns nothing for a normal reading', () => {
    expect(detectCriticalEvents({ engineFault: false, emergencyStop: false, batteryLevel: 80 })).to.deep.equal([]);
    expect(detectCriticalEvents({ engineFault: false, emergencyStop: false, batteryLevel: null })).to.deep.equal([]);
  });

  it('flags each critical condition, and treats exactly 20% battery as fine', () => {
    const types = (r: Parameters<typeof detectCriticalEvents>[0]) => detectCriticalEvents(r).map((e) => e.type);
    expect(types({ engineFault: true, emergencyStop: false, batteryLevel: 50 })).to.deep.equal(['ENGINE_FAULT']);
    expect(types({ engineFault: false, emergencyStop: true, batteryLevel: 50 })).to.deep.equal(['EMERGENCY_STOP']);
    expect(types({ engineFault: false, emergencyStop: false, batteryLevel: 19 })).to.deep.equal(['LOW_BATTERY']);
    expect(types({ engineFault: false, emergencyStop: false, batteryLevel: 20 })).to.deep.equal([]);
    expect(types({ engineFault: true, emergencyStop: true, batteryLevel: 5 })).to.have.length(3);
  });
});

describe('Telemetry API', () => {
  const { provider, sent } = createRecordingSmsProvider();
  const app = createApp({ smsProvider: provider });

  beforeEach(async () => {
    await resetDb();
    sent.length = 0;
  });

  // an operator, an admin (the SMS recipient) and one registered vehicle
  const setup = async () => {
    const operator = await createTestUser(ROLES.OPERATOR);
    await createTestUser(ROLES.ADMIN);
    const { body: vehicle } = await createVehicleAs(app, operator.token, {
      registrationNumber: 'KA19AB1234',
      model: 'Tata Ace',
      latitude: 12.9,
      longitude: 74.8,
    });
    return { token: operator.token, vehicle };
  };

  const submit = (token: string, body: object) =>
    request(app).post('/api/telemetry').set(auth(token)).send(body);

  describe('Telemetry submission and storage', () => {
    it('stores a reading, returns it, and lists it back', async () => {
      const { token, vehicle } = await setup();

      const res = await submit(token, {
        vehicleId: vehicle.id,
        latitude: 12.8698,
        longitude: 74.8431,
        speed: 42.5,
        batteryLevel: 87,
      });
      expect(res.status).to.equal(201);
      expect(res.body).to.include({ vehicleId: vehicle.id, latitude: 12.8698, batteryLevel: 87, engineFault: false });
      expect(res.body.alerts).to.deep.equal([]);

      const list = await request(app).get(`/api/telemetry?vehicleId=${vehicle.id}`).set(auth(token));
      expect(list.status).to.equal(200);
      expect(list.body.data).to.have.length(1);
      expect(list.body.data[0].id).to.equal(res.body.id);
    });

    it("moves the vehicle's last known position to the reported coordinates", async () => {
      const { token, vehicle } = await setup();
      await submit(token, { vehicleId: vehicle.id, latitude: 13.0827, longitude: 80.2707 }).expect(201);

      const after = await request(app).get(`/api/vehicles/${vehicle.id}`).set(auth(token));
      expect(after.body.latitude).to.equal(13.0827);
      expect(after.body.longitude).to.equal(80.2707);
    });

    it('sends no SMS for a normal reading', async () => {
      const { token, vehicle } = await setup();
      await submit(token, { vehicleId: vehicle.id, latitude: 12.9, longitude: 74.8, batteryLevel: 90 }).expect(201);
      expect(sent).to.have.length(0);
    });

    it('requires authentication', async () => {
      await request(app).post('/api/telemetry').send({}).expect(401);
      await request(app).get('/api/telemetry').expect(401);
    });

    it('returns 400 for invalid readings', async () => {
      const { token, vehicle } = await setup();
      const ok = { vehicleId: vehicle.id, latitude: 12.9, longitude: 74.8 };
      const cases = [
        {},
        { ...ok, vehicleId: 'nope' },
        { ...ok, latitude: 91 },
        { ...ok, longitude: -181 },
        { ...ok, batteryLevel: 101 },
        { ...ok, batteryLevel: 50.5 },
        { ...ok, speed: -3 },
        { ...ok, engineFault: 'yes' },
      ];
      for (const body of cases) {
        const res = await submit(token, body);
        expect(res.status, JSON.stringify(body)).to.equal(400);
        expect(res.body.error.code).to.equal('VALIDATION_ERROR');
      }
    });

    it('returns 404 for an unknown vehicle', async () => {
      const { token } = await setup();
      const res = await submit(token, {
        vehicleId: '3f2b8c1e-5d4a-4e7b-9a10-2c6f8d0e1b34',
        latitude: 12.9,
        longitude: 74.8,
      });
      expect(res.status).to.equal(404);
    });
  });

  describe('Critical events raise SMS alerts', () => {
    it('texts the admin about an engine fault and reports the alert in the response', async () => {
      const { token, vehicle } = await setup();
      const res = await submit(token, { vehicleId: vehicle.id, latitude: 12.9, longitude: 74.8, engineFault: true });

      expect(res.body.alerts).to.deep.equal(['ENGINE_FAULT']);
      expect(sent).to.have.length(1);
      expect(sent[0]!.to).to.equal('+919876543210');
      expect(sent[0]!.message).to.include('KA19AB1234').and.to.include('engine fault');
    });

    it('raises one alert per condition (engine fault + low battery + emergency stop)', async () => {
      const { token, vehicle } = await setup();
      const res = await submit(token, {
        vehicleId: vehicle.id,
        latitude: 12.9,
        longitude: 74.8,
        engineFault: true,
        batteryLevel: 10,
        emergencyStop: true,
      });
      expect(res.body.alerts).to.have.members(['ENGINE_FAULT', 'LOW_BATTERY', 'EMERGENCY_STOP']);
      expect(sent).to.have.length(3);
    });
  });
});