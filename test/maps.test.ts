import { expect } from 'chai';
import sinon from 'sinon';
import request from 'supertest';
import { createApp } from '../src/backend/app';
import { ROLES } from '../src/shared/constants';
import { createTestUser,resetDb, createFakeGeocoder, failingGeocoder ,createVehicleAs } from './helpers';


const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

// all distances are from Hampankatta, Mangaluru
const HAMPANKATTA = { latitude: 12.8698, longitude: 74.8431 };
const places = {
  kadri: { registrationNumber: 'KADRI', model: 'M', latitude: 12.8858, longitude: 74.8553 }, // ~2.2 km
  surathkal: { registrationNumber: 'SURATHKAL', model: 'M', latitude: 13.0108, longitude: 74.794 }, // ~16.6 km
  udupi: { registrationNumber: 'UDUPI', model: 'M', latitude: 13.3409, longitude: 74.7421 }, // ~53.5 km
  bengaluru: { registrationNumber: 'BENGALURU', model: 'M', latitude: 12.9716, longitude: 77.5946 }, // ~298 km
};

describe('Maps API', () => {
  const { geocoder, calls } = createFakeGeocoder({
    'Hampankatta, Mangaluru': HAMPANKATTA,
    'Bangalore Palace': { latitude: 12.9988, longitude: 77.592 },
  });
  const app = createApp({ geocoder });

  beforeEach(async () => {
    await resetDb();
    calls.length = 0;
  });

  const seedFleet = async (token: string) => {
    for (const body of Object.values(places)) await createVehicleAs(app, token, body).expect(201);
    await createVehicleAs(app, token, { registrationNumber: 'NOPOSITION', model: 'M' }).expect(201); // never reported a position
  };

  describe('GET /api/maps/geocode', () => {
    it('turns an address into coordinates', async () => {
      const { token } = await createTestUser();
      const res = await request(app).get('/api/maps/geocode').query({ address: 'Hampankatta, Mangaluru' }).set(auth(token));
      expect(res.status).to.equal(200);
      expect(res.body).to.include({ address: 'Hampankatta, Mangaluru', latitude: 12.8698, longitude: 74.8431 });
    });

    it('returns 404 for an address that does not exist', async () => {
      const { token } = await createTestUser();
      const res = await request(app).get('/api/maps/geocode').query({ address: 'Atlantis' }).set(auth(token));
      expect(res.status).to.equal(404);
      expect(res.body.error.code).to.equal('NOT_FOUND');
    });

    it('returns 400 without an address and 401 without a token', async () => {
      const { token } = await createTestUser();
      await request(app).get('/api/maps/geocode').set(auth(token)).expect(400);
      await request(app).get('/api/maps/geocode').query({ address: 'x' }).expect(401);
    });

    it('returns 502 when the geocoding service is down', async () => {
      const consoleError = sinon.stub(console, 'error');
      try {
        const brokenApp = createApp({ geocoder: failingGeocoder });
        const { token } = await createTestUser();
        const res = await request(brokenApp).get('/api/maps/geocode').query({ address: 'x' }).set(auth(token));
        expect(res.status).to.equal(502);
        expect(res.body.error.code).to.equal('BAD_GATEWAY');
      } finally {
        consoleError.restore();
      }
    });
  });

  describe('GET /api/maps/nearby (vehicles within X km)', () => {
    it('returns only vehicles inside the radius, nearest first, with distances', async () => {
      const { token } = await createTestUser();
      await seedFleet(token);

      const res = await request(app)
        .get('/api/maps/nearby')
        .query({ ...HAMPANKATTA, radiusKm: 20 })
        .set(auth(token));

      expect(res.status).to.equal(200);
      expect(res.body.data.map((v: { registrationNumber: string }) => v.registrationNumber)).to.deep.equal(['KADRI', 'SURATHKAL']);
      expect(res.body.data[0].distanceKm).to.be.closeTo(2.22, 0.05);
      expect(res.body.data[1].distanceKm).to.be.closeTo(16.56, 0.05);
      expect(res.body.count).to.equal(2);
      expect(res.body.radiusKm).to.equal(20);
      expect(res.body.data[0].mapUrl).to.match(/^https:\/\/www\.openstreetmap\.org\//);
    });

    it('widens with the radius, and never returns vehicles that have no position', async () => {
      const { token } = await createTestUser();
      await seedFleet(token);

      const wide = await request(app).get('/api/maps/nearby').query({ ...HAMPANKATTA, radiusKm: 100 }).set(auth(token));
      expect(wide.body.data.map((v: { registrationNumber: string }) => v.registrationNumber)).to.deep.equal([
        'KADRI',
        'SURATHKAL',
        'UDUPI',
      ]);

      const huge = await request(app).get('/api/maps/nearby').query({ ...HAMPANKATTA, radiusKm: 1000 }).set(auth(token));
      expect(huge.body.count).to.equal(4); // all four with a position, not NOPOSITION

      const tiny = await request(app).get('/api/maps/nearby').query({ ...HAMPANKATTA, radiusKm: 1 }).set(auth(token));
      expect(tiny.body.count).to.equal(0);
    });

    it('accepts an address instead of coordinates and geocodes it', async () => {
      const { token } = await createTestUser();
      await seedFleet(token);

      const res = await request(app)
        .get('/api/maps/nearby')
        .query({ address: 'Hampankatta, Mangaluru', radiusKm: 20 })
        .set(auth(token));

      expect(res.status).to.equal(200);
      expect(res.body.center).to.include({ address: 'Hampankatta, Mangaluru', latitude: 12.8698 });
      expect(res.body.count).to.equal(2);
      expect(calls).to.include('Hampankatta, Mangaluru');
    });

    it('can filter by vehicle status', async () => {
      const { token } = await createTestUser();
      await createVehicleAs(app, token, { ...places.kadri, status: 'maintenance' }).expect(201);
      await createVehicleAs(app, token, places.surathkal).expect(201);

      const res = await request(app)
        .get('/api/maps/nearby')
        .query({ ...HAMPANKATTA, radiusKm: 20, status: 'maintenance' })
        .set(auth(token));
      expect(res.body.data.map((v: { registrationNumber: string }) => v.registrationNumber)).to.deep.equal(['KADRI']);
    });

    it("finds a vehicle once telemetry moves it into range (last known position)", async () => {
      const { token } = await createTestUser();
      const { body: vehicle } = await createVehicleAs(app, token, places.bengaluru).expect(201);

      const before = await request(app).get('/api/maps/nearby').query({ ...HAMPANKATTA, radiusKm: 20 }).set(auth(token));
      expect(before.body.count).to.equal(0);

      await request(app)
        .post('/api/telemetry')
        .set(auth(token))
        .send({ vehicleId: vehicle.id, latitude: 12.8858, longitude: 74.8553 }) // drove to Kadri
        .expect(201);

      const after = await request(app).get('/api/maps/nearby').query({ ...HAMPANKATTA, radiusKm: 20 }).set(auth(token));
      expect(after.body.count).to.equal(1);
      expect(after.body.data[0].id).to.equal(vehicle.id);
    });

    it('returns 404 when the address cannot be geocoded', async () => {
      const { token } = await createTestUser();
      const res = await request(app).get('/api/maps/nearby').query({ address: 'Atlantis', radiusKm: 5 }).set(auth(token));
      expect(res.status).to.equal(404);
    });

    it('returns 400 for invalid queries', async () => {
      const { token } = await createTestUser();
      const bad: Record<string, string | number>[] = [
        { ...HAMPANKATTA }, // no radius
        { radiusKm: 5 }, // no centre
        { latitude: 12.8, radiusKm: 5 }, // latitude without longitude
        { ...HAMPANKATTA, address: 'Hampankatta, Mangaluru', radiusKm: 5 }, // both address and coordinates
        { ...HAMPANKATTA, radiusKm: 0 },
        { ...HAMPANKATTA, radiusKm: 5000 },
        { ...HAMPANKATTA, radiusKm: 'far' },
        { latitude: 95, longitude: 74, radiusKm: 5 },
        { ...HAMPANKATTA, radiusKm: 5, status: 'flying' },
      ];
      for (const q of bad) {
        const res = await request(app).get('/api/maps/nearby').query(q).set(auth(token));
        expect(res.status, JSON.stringify(q)).to.equal(400);
        expect(res.body.error.code).to.equal('VALIDATION_ERROR');
      }
    });

    it('requires authentication', async () => {
      await request(app).get('/api/maps/nearby').query({ ...HAMPANKATTA, radiusKm: 5 }).expect(401);
    });
  });

  describe('Geocoding on vehicle registration', () => {
    it('fills in coordinates from the address when none are given', async () => {
      const { token } = await createTestUser(ROLES.OPERATOR);
      const res = await createVehicleAs(app, token, {
        registrationNumber: 'GEO1',
        model: 'M',
        address: 'Hampankatta, Mangaluru',
      });
      expect(res.status).to.equal(201);
      expect(res.body.latitude).to.equal(12.8698);
      expect(res.body.longitude).to.equal(74.8431);
    });

    it('does not geocode when coordinates are provided', async () => {
      const { token } = await createTestUser();
      await createVehicleAs(app, token, { registrationNumber: 'GEO2', model: 'M', address: 'Hampankatta, Mangaluru', latitude: 1, longitude: 2 }).expect(201);
      expect(calls).to.have.length(0);
    });

    it('still registers the vehicle (without a position) if the address is unknown', async () => {
      const { token } = await createTestUser();
      const res = await createVehicleAs(app, token, { registrationNumber: 'GEO3', model: 'M', address: 'Atlantis' });
      expect(res.status).to.equal(201);
      expect(res.body.latitude).to.equal(null);
    });

    it('still registers the vehicle if the geocoding service is down', async () => {
      const consoleError = sinon.stub(console, 'error');
      try {
        const brokenApp = createApp({ geocoder: failingGeocoder });
        const { token } = await createTestUser();
        const res = await createVehicleAs(brokenApp, token, { registrationNumber: 'GEO4', model: 'M', address: 'Anywhere' });
        expect(res.status).to.equal(201);
        expect(res.body.latitude).to.equal(null);
      } finally {
        consoleError.restore();
      }
    });
  });
});