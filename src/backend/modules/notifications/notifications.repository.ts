import { query, queryOne } from '../../db';
import type { ListNotificationsFilter, NewNotification, NotificationRow } from './notifications.types';

export const insertNotification = (n: NewNotification) =>
  queryOne<NotificationRow>(
    `INSERT INTO notifications (vehicle_id, recipient, type, message, status)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [n.vehicleId, n.recipient, n.type, n.message, n.status],
  ) as Promise<NotificationRow>;

export const listNotifications = ({ vehicleId, status, type, limit, offset }: ListNotificationsFilter) =>
  query<NotificationRow>(
    `SELECT * FROM notifications
     WHERE ($1::uuid IS NULL OR vehicle_id = $1)
       AND ($2::text IS NULL OR status = $2)
       AND ($3::text IS NULL OR type = $3)
     ORDER BY created_at DESC
     LIMIT $4 OFFSET $5`,
    [vehicleId ?? null, status ?? null, type ?? null, limit, offset],
  );