import { Router } from 'express';
import { authenticate } from '../../auth/auth.middleware';
import type { Geocoder } from './geocoder';
import { geocode, nearby } from './maps.controller';

export const createMapsRouter = ({ geocoder }: { geocoder: Geocoder }): Router => {
  const router = Router();
  router.use(authenticate);
  router.get('/geocode', geocode(geocoder));
  router.get('/nearby', nearby(geocoder));
  return router;
};