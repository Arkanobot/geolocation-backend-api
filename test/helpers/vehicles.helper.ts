import request from 'supertest';
import type { Express } from 'express';

export const sampleVehicle = {
  registrationNumber: 'ka19ab1234',
  model: 'Tata Ace',
  address: 'Hampankatta, Mangaluru',
  latitude: 12.8698,
  longitude: 74.8431,
};

// creates a vehicle through the API as the given user
export const createVehicleAs = (app: Express, token: string, body: object = sampleVehicle) =>
  request(app).post('/api/vehicles').set('Authorization', `Bearer ${token}`).send(body);