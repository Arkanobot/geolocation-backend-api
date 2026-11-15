import { Router } from 'express';
import { ROLES } from '../../../shared/constants';
import { authenticate, requireRole } from '../../auth/auth.middleware';
import { create, getById, list, remove, updateStatus } from './vehicles.controller';
import type { Notifier } from '../notifications/notifications.service';
import type { Geocoder } from '../maps/geocoder';

export const createVehicleRouter = ({ notify, geocoder }: { notify: Notifier, geocoder: Geocoder }): Router => {
  const router = Router();
  router.use(authenticate); // every vehicle route needs a valid JWT

  router.post('/', create(geocoder));
  router.get('/', list);
  router.get('/:id', getById);
  router.patch('/:id/status', updateStatus(notify));
  router.delete('/:id', requireRole(ROLES.ADMIN), remove); // admin only
  return router;
};