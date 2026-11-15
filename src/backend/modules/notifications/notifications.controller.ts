import type { RequestHandler } from 'express';
import { parsePagination } from '../../../shared/helpers';
import { getNotifications } from './notifications.service';
import { parseNotificationFilters } from './notifications.validation';

export const list: RequestHandler = async (req, res) => {
  const { limit, offset } = parsePagination(req.query);
  const data = await getNotifications({ ...parseNotificationFilters(req.query), limit, offset });
  res.json({ data, limit, offset });
};