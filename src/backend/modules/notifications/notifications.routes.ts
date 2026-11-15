import { Router } from 'express';
import { ROLES } from '../../../shared/constants';
import { authenticate, requireRole } from '../../auth/auth.middleware';
import { list } from './notifications.controller';

// notification records contain phone numbers, so admins only
export const createNotificationRouter = (): Router => {
  const router = Router();
  router.use(authenticate, requireRole(ROLES.ADMIN));
  router.get('/', list);
  return router;
};