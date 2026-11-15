import { Router } from 'express';
import { authenticate } from '../../auth/auth.middleware';
import type { Notifier } from '../notifications/notifications.service';
import { list, submit } from './telemetry.controller';

export const createTelemetryRouter = ({ notify }: { notify: Notifier }): Router => {
  const router = Router();
  router.use(authenticate);
  router.post('/', submit(notify));
  router.get('/', list);
  return router;
};