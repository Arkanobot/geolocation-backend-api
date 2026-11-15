import { NOTIFICATION_STATUS, type NotificationStatus, type NotificationType } from '../../../shared/constants';
import { findAdminPhones } from '../users/users.repository';
import { insertNotification, listNotifications } from './notifications.repository';
import type { SmsProvider } from './sms.provider';
import type { ListNotificationsFilter, NotificationDto, NotificationRow } from './notifications.types';

export type NotificationEvent = { vehicleId: string; type: NotificationType; message: string };

// the one function other modules call to raise an alert
export type Notifier = (event: NotificationEvent) => Promise<void>;

export const toNotificationDto = (row: NotificationRow): NotificationDto => ({
  id: row.id,
  vehicleId: row.vehicle_id,
  recipient: row.recipient,
  type: row.type,
  message: row.message,
  status: row.status,
  createdAt: row.created_at,
});

const sendAndRecord = async (smsProvider: SmsProvider, event: NotificationEvent, phone: string) => {
  let status: NotificationStatus = NOTIFICATION_STATUS.SENT;
  try {
    await smsProvider(phone, event.message);
  } catch (err) {
    status = NOTIFICATION_STATUS.FAILED;
    console.error(`SMS to ${phone} failed:`, err instanceof Error ? err.message : err);
  }
  await insertNotification({ vehicleId: event.vehicleId, recipient: phone, type: event.type, message: event.message, status });
};

// texts every admin and records sent/failed per recipient.
// Never throws: a broken SMS service must not fail the request that triggered the alert.
export const createNotifier =
  (smsProvider: SmsProvider): Notifier =>
  async (event) => {
    try {
      const phones = await findAdminPhones();
      await Promise.all(phones.map((phone) => sendAndRecord(smsProvider, event, phone)));
    } catch (err) {
      console.error('Notification pipeline failed:', err);
    }
  };

export const getNotifications = async (filter: ListNotificationsFilter): Promise<NotificationDto[]> =>
  (await listNotifications(filter)).map(toNotificationDto);