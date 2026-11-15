import { Router } from 'express';
import { authenticate } from '../../auth/auth.middleware';
import { login, me, register } from './users.controller';

export const createUserRouter = (): Router => {
  const router = Router();
  router.post('/register', register);
  router.post('/login', login);
  router.get('/me', authenticate, me);
  return router;
};